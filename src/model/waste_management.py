from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any

@dataclass
class MethaneFluxRecord:
    sensor_id: str
    timestamp: datetime
    ch4_flux_rate: float  # kg/hr
    atmospheric_pressure: float  # hPa
    soil_temperature: float  # Celsius

@dataclass
class LeachateContaminationEvent:
    sensor_id: str
    timestamp: datetime
    ph_level: float
    heavy_metals_ppm: float
    percolation_index: float

@dataclass
class HotspotAlert:
    alert_id: str
    latitude: float
    longitude: float
    severity_score: float
    fire_risk_probability: float
    timestamp: datetime = field(default_factory=datetime.utcnow)
