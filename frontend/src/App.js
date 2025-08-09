import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issue with Webpack
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function App() {
  const [buses, setBuses] = useState([]);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const sydneyPosition = [-33.8688, 151.2093]; // Fallback

  useEffect(() => {
    // Get user's location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.error("Error getting location:", error);
        setUserLocation(sydneyPosition); // fallback
      }
    );
  }, []);

  useEffect(() => {
    const fetchBusData = async () => {
      try {
        const response = await fetch('/api/buses');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const parsedBuses = data.entity.map(entity => {
          console.log(entity)
          if (entity.vehicle && entity.vehicle.position) {
            return {
              id: entity.id,
              latitude: entity.vehicle.position.latitude,
              longitude: entity.vehicle.position.longitude,
              routeId: entity.vehicle.trip.routeId,
            };
          }
          return null;
        }).filter(Boolean);

        setBuses(parsedBuses);
      } catch (error) {
        console.error("Error fetching bus data:", error);
        setError(error.message);
      }
    };

    fetchBusData();
    const interval = setInterval(fetchBusData, 10000); // Fetch every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getColorForRoute = (routeId) => {
    let hash = 0;
    for (let i = 0; i < routeId.length; i++) {
      hash = routeId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${hash % 360}, 100%, 50%)`;
  };

  const createMarkerIcon = (color, highlight = false) => {
    const size = highlight ? 20 : 12;
    const border = highlight ? '3px solid red' : '2px solid white';

    return L.divIcon({
      className: 'custom-marker-icon',
      html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: ${border};"></div>`,
      iconSize: [size, size],
    });
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      {error && <div style={{ color: 'red', padding: '10px' }}>Error: {error}</div>}
      <MapContainer center={userLocation || sydneyPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {/* Bus markers */}
        {buses.map(bus => {
          //console.log(bus)
          const distance = userLocation
            ? getDistanceFromLatLonInKm(userLocation[0], userLocation[1], bus.latitude, bus.longitude)
            : Infinity;

          const isNearby = distance <= 5;
          const color = getColorForRoute(bus.routeId);
          const icon = createMarkerIcon(color, isNearby);

          return (
            <Marker key={bus.id} position={[bus.latitude, bus.longitude]} icon={icon}>
              <Popup>
                <strong>Bus ID:</strong> {bus.id}<br />
                <strong>Route:</strong> {bus.routeId}<br />
                <strong>Distance:</strong> {distance.toFixed(2)} km
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default App;
