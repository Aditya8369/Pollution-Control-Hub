import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

export default function LocationMap({ center, nearbyPoints }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Location-Based Tracking</h2>
        <p>Nearby pollution intensity map and hotspots</p>
      </div>

      <div className="map-wrap">
        <MapContainer center={[center.lat, center.lon]} zoom={11} scrollWheelZoom={false} className="map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {nearbyPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lon]}
              radius={Math.max(12, point.aqi / 8)}
              pathOptions={{
                color: point.aqi > 150 ? '#b91c1c' : point.aqi > 100 ? '#f97316' : '#16a34a',
                fillOpacity: 0.55
              }}
            >
              <Popup>
                <strong>{point.areaName}</strong>
                <br />AQI: {point.aqi}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="hotspots">
        <h3>Most Polluted Areas Near You</h3>
        <ul>
          {nearbyPoints
            .slice()
            .sort((a, b) => b.aqi - a.aqi)
            .slice(0, 3)
            .map((point) => (
              <li key={`hot-${point.id}`}>
                <span>{point.areaName}</span>
                <strong>AQI {point.aqi}</strong>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
