
from shapely.geometry import Point, Polygon
from django.core.mail import send_mail
from apps.sensors.models import SensorGeofence  # Adjust model import as needed

def is_point_inside_geofence(lat: float, lon: float, polygon_coords: list) -> bool:
    """
    Checks if a given latitude and longitude lie inside the specified polygon coordinates.
    polygon_coords should be a list of [lat, lon] pairs.
    """
    point = Point(lon, lat)  # Shapely expects (longitude, latitude)
    transformed_coords = [(coord[1], coord[0]) for coord in polygon_coords]
    polygon = Polygon(transformed_coords)
    return polygon.contains(point)

def process_sensor_telemetry(sensor_id: str, current_lat: float, current_lon: float):
    """
    Processes incoming telemetry data and triggers an alert if the sensor breaches its geofence.
    """
    try:
        geofence = SensorGeofence.objects.get(sensor_id=sensor_id, is_active=True)
    except SensorGeofence.DoesNotExist:
        return  # No geofence configured for this sensor

    inside = is_point_inside_geofence(current_lat, current_lon, geofence.boundary_polygon)

    if not inside:
        trigger_geofence_breach_alert(geofence, current_lat, current_lon)

def trigger_geofence_breach_alert(geofence, lat, lon):
    """
    Dispatches an email alert when a geofence breach is detected.
    """
    subject = f"ALERT: Sensor {geofence.sensor_name} ({geofence.sensor_id}) Breached Geofence!"
    message = (
        f"Warning: Sensor {geofence.sensor_name} has moved outside its designated boundary.\n\n"
        f"Current Coordinates: Latitude {lat}, Longitude {lon}\n"
        f"Please investigate immediately."
    )
    
    send_mail(
        subject=subject,
        message=message,
        from_email="alerts@pollutioncontrolhub.internal",
        recipient_list=[geofence.contact_email],
        fail_silently=False,
    )
