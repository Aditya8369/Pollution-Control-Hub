import { getAQIForSite } from '../../shared/voiceService.js';

/**
 * Dialogflow Fulfillment Webhook handler.
 * Processes Dialogflow V2 JSON requests and returns webhook response.
 *
 * @param {Object} req - Express-style request object.
 * @param {Object} res - Express-style response object.
 */
export async function fulfillmentHandler(req, res) {
  try {
    const body = req.body;
    const intentName = body?.queryResult?.intent?.displayName;
    const parameters = body?.queryResult?.parameters || {};
    // Extract site from expected parameter names
    const siteParam = parameters.site || parameters.location || parameters['geo-city'];

    if (intentName === 'GetAQIIntent' || intentName === 'GetAQI') {
      if (!siteParam || siteParam.trim() === '') {
        return res.status(200).json({
          fulfillmentText: 'Please provide a location name.'
        });
      }

      const result = await getAQIForSite(siteParam);
      return res.status(200).json({
        fulfillmentText: result.message
      });
    }

    // Default fallback text
    return res.status(200).json({
      fulfillmentText: 'Welcome to the Pollution Control Hub. You can ask for the AQI at Bangalore.'
    });
  } catch (error) {
    console.error('Error in Google fulfillment handler:', error);
    return res.status(200).json({
      fulfillmentText: "Sorry, I couldn't retrieve the air quality data at the moment."
    });
  }
}

export default fulfillmentHandler;
