// Real-time heat-map broadcast server (issue #754).
//
// Periodically fetches current AQI for each tracked city from the same public
// Open-Meteo endpoint the app uses, and broadcasts the readings as heat points
// to every connected WebSocket client. The frontend's useLiveHeatmap hook
// consumes this; if a client can't connect, it falls back to REST polling.
//
// Run with: npm run ws-server
// Configure with: PORT (default 8081), BROADCAST_INTERVAL_MS (default 15000)

import { WebSocketServer } from "ws";
import { CITY_COORDINATES } from "../src/constants/cities.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8081;
const BROADCAST_INTERVAL_MS = process.env.BROADCAST_INTERVAL_MS
    ? Number(process.env.BROADCAST_INTERVAL_MS)
    : 15000;

async function fetchCityAqi(city) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&hourly=us_aqi&timezone=auto&forecast_days=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const times = data.hourly?.time || [];
    const nowHour = new Date().toISOString().slice(0, 13);
    const idx = times.findIndex((t) => t.startsWith(nowHour));
    const useIdx = idx === -1 ? 0 : idx;
    const value = data.hourly?.us_aqi?.[useIdx];
    return typeof value === "number" ? Math.round(value) : null;
}

async function buildHeatPoints() {
    const readings = await Promise.all(
        CITY_COORDINATES.map(async (city) => {
            const aqi = await fetchCityAqi(city);
            return aqi === null ? null : { lat: city.lat, lon: city.lon, aqi, name: city.name };
        })
    );
    return readings.filter(Boolean);
}

const wss = new WebSocketServer({ port: PORT });
console.log(`Heat-map WebSocket server listening on ws://localhost:${PORT}`);

let latestPoints = [];

function broadcast(points) {
    const message = JSON.stringify({
        type: "heatmap-update",
        points,
        timestamp: new Date().toISOString(),
    });
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    });
}

async function refreshAndBroadcast() {
    try {
        latestPoints = await buildHeatPoints();
        broadcast(latestPoints);
    } catch (err) {
        console.error("Failed to refresh heat-map readings:", err);
    }
}

wss.on("connection", (socket) => {
    // Send the most recent snapshot immediately so a new client doesn't wait
    // for the next broadcast interval.
    if (latestPoints.length > 0) {
        socket.send(
            JSON.stringify({ type: "heatmap-update", points: latestPoints, timestamp: new Date().toISOString() })
        );
    }
});

refreshAndBroadcast();
setInterval(refreshAndBroadcast, BROADCAST_INTERVAL_MS);