import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAQIForSite } from '../../voice-assistant/shared/voiceService.js';
import { handler as alexaHandler } from '../../voice-assistant/alexa-skill/lambda/index.js';
import { fulfillmentHandler as googleHandler } from '../../voice-assistant/google-action/fulfillment/index.js';
import { cacheStore } from '../utils/cacheStore.js';

// Mock Vite-specific worker import
vi.mock('../workers/apiWorker?worker', () => {
  return {
    default: class MockWorker {
      constructor() {}
      postMessage() {}
      terminate() {}
    }
  };
});

describe('Voice Assistant - Issue #765', () => {
  beforeEach(async () => {
    // Clear mock functions and caching tier before each test
    await cacheStore.invalidate();
    vi.restoreAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
  });

  // Helper to mock successful fetch call responses
  const setupMockFetch = (geocodingData, aqiData, options = { geocodingOk: true, aqiOk: true }) => {
    const fetchSpy = vi.fn().mockImplementation(async (url) => {
      const urlString = url.toString();
      if (urlString.includes('geocoding-api.open-meteo.com')) {
        if (!options.geocodingOk) {
          return { ok: false, status: 500, json: async () => ({}) };
        }
        return { ok: true, json: async () => ({ results: geocodingData }) };
      }
      if (urlString.includes('air-quality-api.open-meteo.com')) {
        if (!options.aqiOk) {
          return { ok: false, status: 500, json: async () => ({}) };
        }
        return { ok: true, json: async () => aqiData };
      }
      return { ok: false, status: 404 };
    });
    vi.stubGlobal('fetch', fetchSpy);
  };

  describe('Shared Voice Service (voiceService.js)', () => {
    it('returns error when site/location is missing', async () => {
      const result = await getAQIForSite('');
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('MISSING_SITE');
      expect(result.message).toContain('Please provide a location name.');
    });

    it('returns error when site is unknown / not found in geocoding', async () => {
      setupMockFetch(null, null);
      const result = await getAQIForSite('UnknownSite');
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('UNKNOWN_SITE');
      expect(result.message).toContain("Sorry, I couldn't find any location named UnknownSite.");
    });

    it('returns successful air quality message for a valid site', async () => {
      const geoResult = [
        { name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946 }
      ];
      const aqiResult = {
        utc_offset_seconds: 19800,
        hourly: {
          time: ['2026-08-17T11:00'],
          us_aqi: [82],
          pm2_5: [15]
        }
      };
      setupMockFetch(geoResult, aqiResult);

      const result = await getAQIForSite('Bangalore');
      expect(result.success).toBe(true);
      expect(result.site).toBe('Bengaluru');
      expect(result.aqi).toBe(82);
      expect(result.band).toBe('moderate');
      expect(result.message).toBe('The current AQI at Bengaluru is 82, which is considered moderate.');
    });

    it('handles geocoding or AQI API lookup failures gracefully', async () => {
      setupMockFetch(null, null, { geocodingOk: false, aqiOk: true });
      const result = await getAQIForSite('Delhi');
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('API_FAILURE');
      expect(result.message).toContain("Sorry, I couldn't retrieve the air quality data at the moment.");
    });
  });

  describe('Amazon Alexa Skill Handler (alexa-skill/lambda/index.js)', () => {
    // Helper to generate Alexa Request envelope structure
    const createAlexaRequestEnvelope = (type, intentName, slots = {}) => ({
      request: {
        type,
        ...(type === 'IntentRequest' ? { intent: { name: intentName, slots } } : {})
      },
      context: { System: {} }
    });

    // Helper to promise-wrap Alexa callback-based handler
    const invokeAlexa = (requestEnvelope) => {
      return new Promise((resolve, reject) => {
        alexaHandler(requestEnvelope, {}, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    };

    it('routes LaunchRequest correctly and returns welcome speech prompt', async () => {
      const request = createAlexaRequestEnvelope('LaunchRequest');
      const response = await invokeAlexa(request);
      expect(response.response.outputSpeech.ssml).toContain('Welcome to the Pollution Control Hub');
    });

    it('prompts the user if GetAQIIntent has a missing site slot', async () => {
      const request = createAlexaRequestEnvelope('IntentRequest', 'GetAQIIntent', {
        site: { name: 'site', value: '' }
      });
      const response = await invokeAlexa(request);
      expect(response.response.outputSpeech.ssml).toContain('Please provide a location name.');
    });

    it('returns natural language response speech on success', async () => {
      const geoResult = [{ name: 'Delhi', latitude: 28.6139, longitude: 77.209 }];
      const aqiResult = {
        utc_offset_seconds: 19800,
        hourly: {
          time: ['2026-08-17T11:00'],
          us_aqi: [168]
        }
      };
      setupMockFetch(geoResult, aqiResult);

      const request = createAlexaRequestEnvelope('IntentRequest', 'GetAQIIntent', {
        site: { name: 'site', value: 'Delhi' }
      });
      const response = await invokeAlexa(request);
      expect(response.response.outputSpeech.ssml).toContain('The current AQI at Delhi is 168, which is considered unhealthy.');
    });
  });

  describe('Google Assistant Fulfillment Webhook (google-action/fulfillment/index.js)', () => {
    // Helper to create Dialogflow Request payload structure
    const createDialogflowRequest = (intentName, parameters = {}) => ({
      body: {
        queryResult: {
          intent: { displayName: intentName },
          parameters
        }
      }
    });

    // Helper to mock express-style response objects
    const createMockResponseObj = () => {
      const responseObj = {
        statusCode: 200,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          return this;
        }
      };
      return responseObj;
    };

    it('prompts the user if GetAQI intent has a missing site parameter', async () => {
      const req = createDialogflowRequest('GetAQIIntent', { site: '' });
      const res = createMockResponseObj();

      await googleHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.fulfillmentText).toContain('Please provide a location name.');
    });

    it('returns natural spoken response on success', async () => {
      const geoResult = [{ name: 'Mumbai', latitude: 19.076, longitude: 72.8777 }];
      const aqiResult = {
        utc_offset_seconds: 19800,
        hourly: {
          time: ['2026-08-17T11:00'],
          us_aqi: [42]
        }
      };
      setupMockFetch(geoResult, aqiResult);

      const req = createDialogflowRequest('GetAQIIntent', { site: 'Mumbai' });
      const res = createMockResponseObj();

      await googleHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.fulfillmentText).toContain('The current AQI at Mumbai is 42, which is considered good.');
    });

    it('handles unknown sites gracefully returning fulfillment text message', async () => {
      setupMockFetch(null, null);
      const req = createDialogflowRequest('GetAQIIntent', { site: 'UnknownCity' });
      const res = createMockResponseObj();

      await googleHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.fulfillmentText).toContain("Sorry, I couldn't find any location named UnknownCity.");
    });
  });
});
