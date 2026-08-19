import * as purpleAir from "./purpleAir";
import * as awairLocal from "./awairLocal";
import * as airthings from "./airthings";

/**
 * Registry of supported indoor air quality device connectors (issue #836).
 * Each connector exports:
 *   - id, label
 *   - suppliedFields: which of pm2_5/co2/voc it can provide
 *   - configFields: form fields IndoorTracker needs to collect to connect
 *   - fetchReading(config): Promise<partial reading>
 */
export const DEVICE_CONNECTORS = [purpleAir, awairLocal, airthings];

export function getConnector(connectorId) {
    return DEVICE_CONNECTORS.find((c) => c.id === connectorId) || null;
}