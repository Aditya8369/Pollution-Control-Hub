import {PieChart,Pie,Cell,Tooltip,Legend,ResponsiveContainer,} from "recharts";
import { useEffect, useState } from "react";
import "./CarbonFootprintCalculator.css";
import Swal from "sweetalert2";
export default function CarbonFootprintCalculator() {
const [carKm, setCarKm] = useState("");
const [bikeKm, setBikeKm] = useState("");
const [electricity, setElectricity] = useState("");
const [lpg, setLpg] = useState("");
const [flights, setFlights] = useState("");
const [vehicleType, setVehicleType] = useState("car");
const [fuelType, setFuelType] = useState("petrol");
const [result, setResult] = useState(null);
const [impact, setImpact] = useState("");
const [suggestions, setSuggestions] = useState([]);
const [breakdown, setBreakdown] = useState(null);
const chartData = breakdown
  ? [
      { name: "Car", value: Number(breakdown.car) },
      { name: "Bike", value: Number(breakdown.bike) },
      { name: "Electricity", value: Number(breakdown.electricity) },
      { name: "LPG", value: Number(breakdown.lpg) },
      { name: "Flights", value: Number(breakdown.flights) },
    ]
  : [];

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#AF19FF",
];
const handleCalculate = () => {
if (
  vehicleType === "car" &&
  !carKm &&
  !electricity &&
  !lpg &&
  !flights
) {
  Swal.fire({
  icon: "warning",
  title: "Missing Input",
  text: "Please enter at least one value before calculating your carbon footprint.",
  confirmButtonColor: "#16a34a",
  confirmButtonText: "OK"
});
  return;
}
if (
  vehicleType === "bike" &&
  !bikeKm &&
  !electricity &&
  !lpg &&
  !flights
) {
  Swal.fire({
  icon: "warning",
  title: "Missing Input",
  text: "Please enter at least one value before calculating your carbon footprint.",
  confirmButtonColor: "#16a34a",
  confirmButtonText: "OK"
});
  return;
}

if (
  Number(carKm) < 0 ||
  Number(bikeKm) < 0 ||
  Number(electricity) < 0 ||
  Number(lpg) < 0 ||
  Number(flights) < 0
) {
  Swal.fire({
  icon: "error",
  title: "Invalid Input",
  text: "Values cannot be negative.",
  confirmButtonColor: "#dc2626",
  confirmButtonText: "OK"
});
  return;
}


  let carFactor = 0;
let bikeFactor = 0;

if (fuelType === "petrol") {
  carFactor = 0.171;
} else if (fuelType === "diesel") {
  carFactor = 0.170;
} else if (fuelType === "cng") {
  carFactor = 0.145;
} else if (fuelType === "ev") {
  carFactor = 0.04;
}

if (fuelType === "petrol") {
  bikeFactor = 0.07;
} else if (fuelType === "ev") {
  bikeFactor = 0.02;
}

const carEmission =
  vehicleType === "car"
    ? Number(carKm) * carFactor * 30
    : 0;

const bikeEmission =
  vehicleType === "bike"
    ? Number(bikeKm) * bikeFactor * 30
    : 0;
  const electricityEmission = Number(electricity) * 0.82;

  const lpgEmission = Number(lpg) * 42;

  const flightEmission = Number(flights) * 90;

  const total =
    carEmission +
    bikeEmission +
    electricityEmission +
    lpgEmission +
    flightEmission;

  setResult(total.toFixed(2));

  setBreakdown({
  car: carEmission.toFixed(2),
  bike: bikeEmission.toFixed(2),
  electricity: electricityEmission.toFixed(2),
  lpg: lpgEmission.toFixed(2),
  flights: flightEmission.toFixed(2),
});

  if (total < 150) {

  setImpact("🟢 Low");

  setSuggestions([
  "Continue walking or cycling for short-distance travel whenever possible.",
  "Switch off lights, fans and appliances when they are not in use.",
  "Use LED bulbs and energy-efficient appliances to reduce electricity consumption.",
  "Carry a reusable water bottle and shopping bag to minimize plastic waste.",
  "Maintain your current sustainable lifestyle and encourage others to adopt eco-friendly habits."
]);

} else if (total < 350) {

  setImpact("🟡 Moderate");

  setSuggestions([
  "Use public transport, carpool or the metro at least 2–3 days a week.",
  "Reduce unnecessary air conditioner usage by maintaining the temperature around 24–26°C.",
  "Unplug chargers and electronic devices when they are not being used.",
  "Plan trips efficiently to reduce unnecessary vehicle travel.",
  "Plant native trees or participate in local environmental awareness campaigns."
]);

} else {

  setImpact("🔴 High");

  setSuggestions([
  "Reduce daily private vehicle usage by switching to public transport or carpooling.",
  "Consider using an electric vehicle or fuel-efficient vehicle for regular commuting.",
  "Install rooftop solar panels or choose renewable electricity where available.",
  "Limit non-essential air travel and prefer trains for shorter journeys.",
  "Regularly monitor your electricity consumption and replace old appliances with energy-efficient models.",
  "Support tree plantation drives and offset your carbon footprint through verified environmental initiatives."
]);

}
const calculatedImpact =
  total < 150
    ? "🟢 Low"
    : total < 350
    ? "🟡 Moderate"
    : "🔴 High";

localStorage.setItem(
  "carbonFootprintData",
  JSON.stringify({
    carKm,
    bikeKm,
    electricity,
    lpg,
    flights,
    result: total.toFixed(2),
    impact: calculatedImpact,
    breakdown: {
      car: carEmission.toFixed(2),
      bike: bikeEmission.toFixed(2),
      electricity: electricityEmission.toFixed(2),
      lpg: lpgEmission.toFixed(2),
      flights: flightEmission.toFixed(2),
    },
  })
);
};

const handleReset = () => {
  setCarKm("");
  setBikeKm("");
  setElectricity("");
  setLpg("");
  setFlights("");

  setResult(null);
  setImpact("");
  setBreakdown(null);
  setSuggestions([]);
};


  return (
    <div className="carbon-container">
    <div className="dashboard-layout">
  <div className="dashboard-card calculator-card">
<p className="carbon-subtitle">
  Track your monthly CO₂ emissions and make sustainable choices for a greener future.
</p>
        <div className="input-group">
  <label>🚗 Vehicle Type</label>

  <select
    value={vehicleType}
    onChange={(e) => setVehicleType(e.target.value)}
  >
    <option value="car">Car</option>
    <option value="bike">Bike</option>
  </select>
</div>

<div className="input-group">
  <label>⛽ Fuel Type</label>

  <select
    value={fuelType}
    onChange={(e) => setFuelType(e.target.value)}
  >
    <option value="petrol">Petrol</option>
    <option value="diesel">Diesel</option>
    <option value="cng">CNG</option>
    <option value="ev">Electric Vehicle (EV)</option>
  </select>
</div>
        {vehicleType === "car" && (
<div className="input-group">

<label>🚗 Daily Distance by Car Travel (km)</label>

<input
type="number"
min="0"
placeholder="e.g. 20"
value={carKm}
onChange={(e)=>setCarKm(e.target.value)}
/>

</div>
)}

  {vehicleType === "bike" && (
<div className="input-group">

<label>🏍 Daily Distance by Bike Travel (km)</label>

<input
type="number"
min="0"
placeholder="e.g. 15"
value={bikeKm}
onChange={(e)=>setBikeKm(e.target.value)}
/>

</div>
)}      

        <div className="input-group">
          <label>⚡ Monthly Electricity (kWh)</label>
          <input
           type="number"
           min="0"
          placeholder="e.g. 180"
          value={electricity}
         onChange={(e) => setElectricity(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>🔥 LPG Cylinders / Month</label>
          <input
             type="number"
             min="0"
             placeholder="e.g. 1"
             value={lpg}
             onChange={(e) => setLpg(e.target.value)}
              />
        </div>

        <div className="input-group">
          <label>✈ Flights / Month</label>
              <input
               type="number"
               min="0"
               placeholder="e.g. 0"
               value={flights}
               onChange={(e) => setFlights(e.target.value)}
                />
        </div>
<div className="button-group">

  <button
    className="calculate-btn"
    onClick={handleCalculate}
  >
    Calculate Carbon Footprint
  </button>

  <button
    className="reset-btn"
    onClick={handleReset}
  >
    Reset
  </button>

</div>
   </div> 
   <div className="dashboard-card chart-card">

  <h2>📊 Emission Distribution</h2>

  {breakdown ? (
    <ResponsiveContainer width="100%" height={650}>
      <PieChart>
        <Pie
          data={chartData}
          cx="45%"
          cy="45%"
          outerRadius={220}
          dataKey="value"
          label
        >
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>

        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  ) : (
    <p className="empty-card">
      Calculate your carbon footprint to view the emission distribution.
    </p>
  )}

</div>    

{result && (
  <div className="dashboard-card result-card full-width-card">
    <h2>🌍 Monthly Carbon Footprint</h2>

    <h1>{result} kg CO₂</h1>
    
    <div className="impact-badge">
    Impact Level: {impact}
</div>

  {breakdown && (
  <div className="breakdown-card">

    <h3>Emission Breakdown</h3>

    <div className="breakdown-grid">

      {Number(breakdown.car) > 0 && (
        <div className="break-item">
          <h4>🚗 Car</h4>
          <p>{breakdown.car} kg CO₂</p>
        </div>
      )}

      {Number(breakdown.bike) > 0 && (
        <div className="break-item">
          <h4>🏍 Bike</h4>
          <p>{breakdown.bike} kg CO₂</p>
        </div>
      )}

      <div className="break-item">
        <h4>⚡ Electricity</h4>
        <p>{breakdown.electricity} kg CO₂</p>
      </div>

      <div className="break-item">
        <h4>🔥 LPG</h4>
        <p>{breakdown.lpg} kg CO₂</p>
      </div>

      {Number(breakdown.flights) > 0 && (
        <div className="break-item">
          <h4>✈ Flights</h4>
          <p>{breakdown.flights} kg CO₂</p>
        </div>
      )}

    </div>

  </div>
)}

</div>
)}

{result && (
  <div className="dashboard-card full-width-card tips-card">
    <h2>💡 Recommended Actions</h2>
    <ul className="suggestion-list">
      {suggestions.map((item, index) => (
        <li key={index}>✅ {item}</li>
      ))}
    </ul>

  </div>
)}
      </div>
    </div>
  );
}