import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;



interface RideMapProps {
  startCoords?: [number, number];
  endCoords?: [number, number];
  showRoute?: boolean;
  simulateMovement?: boolean;
}

const AnimatedMarker = ({ 
  routeCoords, 
  speed = 1000 
}: { 
  routeCoords: [number, number][]; 
  speed?: number;
}) => {
  const [position, setPosition] = useState(0);
  const map = useMap();

  useEffect(() => {
    if (!routeCoords || routeCoords.length === 0) return;

    const interval = setInterval(() => {
      setPosition((prev) => {
        const next = prev + 1;
        if (next >= routeCoords.length) {
          clearInterval(interval);
          return prev;
        }
        
        // Smoothly pan to follow the marker
        map.panTo(routeCoords[next], { animate: true, duration: 0.5 });
        return next;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [routeCoords, map, speed]);

  if (!routeCoords || routeCoords.length === 0) return null;

  const currentIcon = L.divIcon({
    className: "custom-moving-marker",
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background: linear-gradient(135deg, hsl(180 75% 45%), hsl(180 75% 35%));
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      "></div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  return (
    <Marker position={routeCoords[position]} icon={currentIcon}>
      <Popup>Current Location</Popup>
    </Marker>
  );
};

const RideMap = ({ 
  startCoords = [49.41461, 8.681495], 
  endCoords = [49.420318, 8.687872],
  showRoute = true,
  simulateMovement = false
}: RideMapProps) => {
  // Avoid toast usage here to prevent context issues during debugging
  const toast = (_?: any) => {};
  const [route, setRoute] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const fetchRoute = async () => {
    if (!showRoute) return;
    
    setLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`;
      const response = await fetch(url);

      if (!response.ok) throw new Error("Failed to fetch route");

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const coordinates = data.routes[0].geometry.coordinates; // [lng, lat]
        const routePoints = coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

        setRoute(routePoints);
        setDistance(data.routes[0].distance / 1000); // km
        setDuration(data.routes[0].duration / 60); // minutes
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startCoords, endCoords]);

  const center: [number, number] = [
    (startCoords[0] + endCoords[0]) / 2,
    (startCoords[1] + endCoords[1]) / 2,
  ];

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden shadow-lg-primary">
      <MapContainer
        center={center}
        zoom={13}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Start Marker */}
        <Marker position={startCoords}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">Start Location</p>
            </div>
          </Popup>
        </Marker>

        {/* End Marker */}
        <Marker position={endCoords}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">Destination</p>
            </div>
          </Popup>
        </Marker>

        {/* Route Polyline */}
        {route.length > 0 && (
          <Polyline
            positions={route}
            color="#14B8A6"
            weight={4}
            opacity={0.7}
          />
        )}

        {/* Animated Moving Marker */}
        {simulateMovement && route.length > 0 && (
          <AnimatedMarker routeCoords={route} speed={50} />
        )}
      </MapContainer>

      {/* Route Info Overlay */}
      {distance && duration && (
        <div className="absolute top-4 left-4 bg-card p-4 rounded-lg shadow-lg z-[1000]">
          <p className="text-sm font-semibold">Route Information</p>
          <p className="text-xs text-muted-foreground">
            Distance: {distance.toFixed(1)} km
          </p>
          <p className="text-xs text-muted-foreground">
            Duration: ~{Math.round(duration)} min
          </p>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-[1000]">
          <div className="bg-card p-4 rounded-lg">
            <p className="text-sm">Loading route...</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default RideMap;
