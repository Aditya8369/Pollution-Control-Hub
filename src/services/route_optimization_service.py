from typing import List, Tuple
from src.models.waste_management import HotspotAlert

class RouteOptimizationService:
    def __init__(self, base_routes: Dict[str, List[Tuple[float, float]]]):
        self.base_routes = base_routes

    def reroute_collection_truck(self, truck_id: str, active_hotspots: List[HotspotAlert]) -> List[Tuple[float, float]]:
        """Dynamically re-routes waste trucks away from active hazard hotspots."""
        original_route = self.base_routes.get(truck_id, [])
        safe_route = []
        
        for point in original_route:
            lat, lon = point
            is_compromised = any(
                abs(h.latitude - lat) < 0.01 and abs(h.longitude - lon) < 0.01 
                for h in active_hotspots
            )
            if not is_compromised:
                safe_route.append(point)
            else:
                # Add bypass waypoint offset
                safe_route.append((lat + 0.015, lon + 0.015))
                
        return safe_route
