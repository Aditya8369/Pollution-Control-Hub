/**
 * @fileoverview Validates, sanitizes, and transforms incoming raw MQTT payloads.
 */

/**
 * Parses and validates raw MQTT sensor data.
 * @param {string} sensorId - The ID of the originating sensor.
 * @param {Object} payload - The raw JSON payload from the MQTT topic.
 * @returns {Object|null} Sanitized telemetry object or null if invalid.
 */
const parseSensorData = (sensorId, payload) => {
    try {
        // Ensure payload is an object
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

        // Basic validation of required fields
        if (!data || typeof data !== 'object') {
            console.warn(`Invalid payload format from sensor ${sensorId}`);
            return null;
        }

        // Sanitize and coerce types
        const sanitized = {
            sensorId,
            timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
            pm25: typeof data.pm25 === 'number' ? data.pm25 : null,
            pm10: typeof data.pm10 === 'number' ? data.pm10 : null,
            temperature: typeof data.temperature === 'number' ? data.temperature : null,
            humidity: typeof data.humidity === 'number' ? data.humidity : null,
            rawPayload: data, // Keep original for debugging
        };

        // Business logic validation: PM values cannot be negative
        if ((sanitized.pm25 !== null && sanitized.pm25 < 0) || (sanitized.pm10 !== null && sanitized.pm10 < 0)) {
            console.warn(`Negative pollutant values detected from sensor ${sensorId}`);
            return null;
        }

        return sanitized;
    } catch (error) {
        console.error(`Error parsing MQTT payload for sensor ${sensorId}:`, error);
        return null;
    }
};

module.exports = { parseSensorData };
