/**
 * Awair Local API connector. Awair Element/Omni/R2 devices can expose a
 * Local API on your home network (enable it in the Awair app: Settings ->
 * this device -> Local API). Once enabled, the device serves live readings
 * over plain HTTP at its LAN IP — no cloud account or API key needed, so
 * this also runs entirely client-side.
 *
 * Note: if this app is served over HTTPS, browsers may block fetching a
 * plain-HTTP local IP (mixed content). This works reliably when running the
 * app locally (`npm run dev`, http://localhost).
 */

export const id = "awair-local";
export const label = "Awair (Local API)";
export const suppliedFields = ["pm2_5", "co2", "voc"];
export const configFields = [
    { key: "deviceIp", label: "Device IP Address", placeholder: "e.g. 192.168.1.42" },
];

/**
 * @param {{ deviceIp: string }} config
 * @returns {Promise<{ pm2_5?: number, co2?: number, voc?: number }>}
 */
export async function fetchReading({ deviceIp } = {}) {
    if (!deviceIp) {
        throw new Error("Device IP address is required.");
    }

    const url = `http://${deviceIp}/air-data/latest`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Awair local request failed: ${response.status}`);
    }

    const data = await response.json();
    const reading = {};
    if (typeof data.pm25 === "number") reading.pm2_5 = data.pm25;
    if (typeof data.co2 === "number") reading.co2 = data.co2;
    if (typeof data.voc === "number") reading.voc = data.voc;

    if (Object.keys(reading).length === 0) {
        throw new Error("Awair device did not return any recognized readings.");
    }

    return reading;
}