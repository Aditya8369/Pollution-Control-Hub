export const POLLUTION_SOURCES = [
  // Delhi
  {
    id: "delhi-gazipur-landfill",
    name: "Ghazipur Landfill",
    type: "waste_disposal",
    lat: 28.6251,
    lon: 77.3276,
    city: "Delhi",
    details: "One of India's largest garbage dumps. Source of methane emissions and frequent waste fires."
  },
  {
    id: "delhi-wazirpur-industrial",
    name: "Wazirpur Industrial Area",
    type: "industrial_zone",
    lat: 28.6970,
    lon: 77.1685,
    city: "Delhi",
    details: "Cluster of metal finishing and steel industries. Associated with high particulate matter and chemical waste."
  },
  {
    id: "delhi-ito-crossing",
    name: "ITO Traffic Corridor",
    type: "high_traffic",
    lat: 28.6272,
    lon: 77.2402,
    city: "Delhi",
    details: "Extremely busy intersection in central Delhi with high vehicular density and elevated nitrogen dioxide levels."
  },
  
  // Mumbai
  {
    id: "mumbai-deonar-dumpyard",
    name: "Deonar Dumpyard",
    type: "waste_disposal",
    lat: 19.0558,
    lon: 72.9324,
    city: "Mumbai",
    details: "Oldest and largest landfill in India. Causes severe smoke and health hazards for nearby residential suburbs."
  },
  {
    id: "mumbai-chembur-refineries",
    name: "Chembur Industrial Belt",
    type: "industrial_zone",
    lat: 19.0150,
    lon: 72.8950,
    city: "Mumbai",
    details: "Nicknamed 'Gas Chamber' historically due to the presence of petroleum refineries and fertilizer plants."
  },

  // Bengaluru
  {
    id: "blr-silkboard-junction",
    name: "Central Silk Board Junction",
    type: "high_traffic",
    lat: 12.9176,
    lon: 77.6244,
    city: "Bengaluru",
    details: "Infamous congestion point with massive daily bumper-to-bumper vehicle queues and local soot accumulation."
  },
  {
    id: "blr-peenya-industrial",
    name: "Peenya Industrial Estate",
    type: "industrial_zone",
    lat: 13.0285,
    lon: 77.5195,
    city: "Bengaluru",
    details: "One of the largest industrial hubs in South Asia, containing engineering, chemical, and manufacturing units."
  },

  // New York
  {
    id: "ny-brooklyn-navy-yard",
    name: "Brooklyn Navy Yard Industrial",
    type: "industrial_zone",
    lat: 40.7020,
    lon: -73.9710,
    city: "New York",
    details: "Urban industrial park with manufacturing, shipping, and local power plants generating carbon emissions."
  },
  {
    id: "ny-holland-tunnel",
    name: "Holland Tunnel Entrance",
    type: "high_traffic",
    lat: 40.7275,
    lon: -74.0110,
    city: "New York",
    details: "Crucial commuter tunnel between NY and NJ with dense traffic congestion and diesel exhaust concentration."
  },

  // London
  {
    id: "london-north-circular",
    name: "North Circular Road (A406)",
    type: "high_traffic",
    lat: 51.5890,
    lon: -0.1560,
    city: "London",
    details: "Busy ring road with continuous heavy vehicle traffic, violating national air quality standards for NO2."
  },
  {
    id: "london-edmonton-waste",
    name: "Edmonton EcoPark Incinerator",
    type: "waste_disposal",
    lat: 51.6150,
    lon: -0.0380,
    city: "London",
    details: "Energy-from-waste facility processing municipal garbage, associated with debate over carbon and particulate output."
  }
];
