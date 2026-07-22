import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import EscalationDraft from "./EscalationDraft";

// Scales marker radius with report count so bigger hotspots are visually
// obvious without needing a separate heat-layer dependency.
function radiusForCount(count) {
  return Math.min(12 + count * 4, 40);
}

function colorForHotspot(hotspot) {
  if (hotspot.escalationReady) return "#dc2626"; // red — ready to escalate
  if (hotspot.reportCount > 1) return "#f59e0b"; // amber — forming
  return "#3b82f6"; // blue — single report, not really a "hotspot" yet
}

export default function HotspotMap({ hotspots, center, cityName }) {
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Pollution Hotspots</h2>
        <p>Clusters of nearby, recent community reports — distinct from individual pins</p>
      </div>

      {hotspots.length === 0 ? (
        <p className="empty-filter-message">
          No hotspots yet — hotspots form once multiple nearby reports land within the same
          time window.
        </p>
      ) : (
        <div className="map-wrap">
          <MapContainer
            center={[center.lat, center.lon]}
            zoom={11}
            scrollWheelZoom={false}
            className="map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {hotspots.map((hotspot) => (
              <CircleMarker
                key={hotspot.id}
                center={[hotspot.centerLat, hotspot.centerLon]}
                radius={radiusForCount(hotspot.reportCount)}
                pathOptions={{
                  color: colorForHotspot(hotspot),
                  fillColor: colorForHotspot(hotspot),
                  fillOpacity: 0.35,
                }}
              >
                <Popup>
                  <strong>{hotspot.reportCount} reports clustered here</strong>
                  <br />
                  Avg. severity: {hotspot.averageSeverity.toFixed(1)}
                  <br />
                  {new Date(hotspot.earliestReportAt).toLocaleDateString()} –{" "}
                  {new Date(hotspot.latestReportAt).toLocaleDateString()}
                  <br />
                  {hotspot.escalationReady && (
                    <button type="button" onClick={() => setSelectedHotspot(hotspot)}>
                      Generate Complaint Draft
                    </button>
                  )}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {selectedHotspot && (
        <EscalationDraft
          hotspot={selectedHotspot}
          cityName={cityName}
          onClose={() => setSelectedHotspot(null)}
        />
      )}
    </section>
  );
}
