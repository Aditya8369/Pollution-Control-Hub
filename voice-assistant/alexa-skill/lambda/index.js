import Alexa from 'ask-sdk-core';
import { getAQIForSite } from '../../shared/voiceService.js';

export const GetAQIIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetAQIIntent';
  },
  async handle(handlerInput) {
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const siteSlot = slots && slots.site ? slots.site.value : null;

    if (!siteSlot || siteSlot.trim() === '') {
      return handlerInput.responseBuilder
        .speak('Please provide a location name.')
        .reprompt('What location would you like to check the AQI for?')
        .getResponse();
    }

    const result = await getAQIForSite(siteSlot);

    return handlerInput.responseBuilder
      .speak(result.message)
      .getResponse();
  }
};

export const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Welcome to the Pollution Control Hub. You can ask me, what is the AQI at Bangalore?')
      .reprompt('Which location would you like to check the AQI for?')
      .getResponse();
  }
};

export const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('You can ask for the current air quality at any site. For example, say: what is the AQI at Bangalore?')
      .reprompt('Which location would you like to check?')
      .getResponse();
  }
};

export const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Goodbye!')
      .getResponse();
  }
};

export const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    // Any cleanup logic goes here
    return handlerInput.responseBuilder.getResponse();
  }
};

export const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Error handled by Alexa ErrorHandler:', error);
    return handlerInput.responseBuilder
      .speak("Sorry, I couldn't retrieve the air quality data at the moment.")
      .getResponse();
  }
};

export const handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    GetAQIIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
