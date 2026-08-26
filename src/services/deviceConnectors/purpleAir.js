/**
 * PurpleAir sensor connector. PurpleAir's public API supports direct browser
 * reads via a per-account "read" API key (sent as the X-API-Key header), so
 * this runs entirely client-side — no backend proxy needed.
 *
 * Register a key at https://develop.purpleair.com/ and find your sensor's
 * numeric ID on https://map.purpleair.com/ (click a sensor -> the URL
 * contains ?select=<sensorId>).
 *
 * PurpleAir sensors measure particulate matter only — this connector never
 * supplies co2 or voc, so those stay manual-entry fields in IndoorTracker.
 */

export const id = "purpleair";
export const label = "PurpleAir Sensor";
export const suppliedFields = ["pm2_5"];
export const configFields = [
    { key: "sensorId", label: "Sensor ID", placeholder: "e.g. 12345" },
    { key: "apiKey", label: "Read API Key", placeholder: "PurpleAir read key", type: "password" },
];

/**
 * @param {{ sensorId: string, apiKey: string }} config
 * @returns {Promise<{ pm2_5: number }>}
 */
export async function fetchReading({ sensorId, apiKey } = {}) {
    if (!sensorId || !apiKey) {
        throw new Error("Sensor ID and API key are required.");
    }

    const url = `https://api.purpleair.com/v1/sensors/${encodeURIComponent(sensorId)}?fields=pm2.5_atm`;
    try {
        const response = await fetch(url, {
            headers: { "X-API-Key": apiKey },
        });

        if (!response.ok) {
            throw new Error(`PurpleAir request failed: ${response.status}`);
        }

        const data = await response.json();
        const pm25 = data?.sensor?.["pm2.5_atm"];
        if (typeof pm25 !== "number") {
            throw new Error("PurpleAir response did not include a PM2.5 reading.");
        }

        return { pm2_5: Math.round(pm25 * 10) / 10 };
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to connect to PurpleAir sensor API.");
    }
}