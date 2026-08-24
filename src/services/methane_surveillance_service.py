from typing import List
from src.models.waste_management import MethaneFluxRecord, HotspotAlert
from datetime import datetime

class MethaneSurveillanceEngine:
    def __init__(self, ch4_threshold: float = 50.0):
        self.ch4_threshold = ch4_threshold

    def evaluate_flux(self, record: MethaneFluxRecord) -> bool:
        """Returns True if methane flux exceeds critical safety limit."""
        return record.ch4_flux_rate >= self.ch4_threshold

    def generate_hotspot_alert(self, record: MethaneFluxRecord, lat: float, lon: float) -> HotspotAlert:
        severity = (record.ch4_flux_rate / self.ch4_threshold) * 10.0
        fire_risk = min(1.0, record.soil_temperature / 100.0)
        return HotspotAlert(
            alert_id=f"ALERT-{record.sensor_id}-{int(datetime.utcnow().timestamp())}",
            latitude=lat,
            longitude=lon,
            severity_score=severity,
            fire_risk_probability=fire_risk
        )
