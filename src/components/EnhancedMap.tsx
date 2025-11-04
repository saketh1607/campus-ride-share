import { useEffect, useRef, useState } from "react";
import L, { LatLngExpression, Polyline as LeafletPolyline, Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";

interface EnhancedMapProps {
  start: [number, number];
  end: [number, number];
  pickupPoints?: Array<{ lat: number; lng: number; address: string }>;
  currentLocation?: [number, number] | null;
  showDirections?: boolean;
  height?: number;
}

const EnhancedMap = ({ 
  start, 
  end, 
  pickupPoints = [], 
  currentLocation,
  showDirections = false,
  height = 600 
}: EnhancedMapProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const routeRef = useRef<LeafletPolyline | null>(null);
  const carMarkerRef = useRef<LeafletMarker | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const lastRouteUpdateRef = useRef<[number, number] | null>(null);

  // Custom icons
  const greenIcon = L.icon({
    iconUrl: '/marker-green.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const redIcon = L.icon({
    iconUrl: '/marker-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const blueIcon = L.icon({
    iconUrl: '/marker-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const carIcon = L.divIcon({
    html: `<div style="font-size: 32px; line-height: 1;">🚗</div>`,
    className: 'car-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!leafletRef.current) {
      leafletRef.current = L.map(mapRef.current, {
        center: start as LatLngExpression,
        zoom: 13,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(leafletRef.current);

      // Add start marker (green)
      L.marker(start as LatLngExpression, { icon: greenIcon })
        .addTo(leafletRef.current)
        .bindPopup("Start Location");

      // Add end marker (red)
      L.marker(end as LatLngExpression, { icon: redIcon })
        .addTo(leafletRef.current)
        .bindPopup("Destination");

      // Add pickup points (blue) - only valid coordinates
      pickupPoints
        .filter(point => point.lat && point.lng && point.lat !== 0 && point.lng !== 0)
        .forEach((point, idx) => {
          L.marker([point.lat, point.lng] as LatLngExpression, { icon: blueIcon })
            .addTo(leafletRef.current!)
            .bindPopup(`Pickup ${idx + 1}: ${point.address}`);
        });
    }

    // Fetch route
    fetchRoute();

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [start[0], start[1], end[0], end[1]]);

  // Update car marker and route when currentLocation changes
  useEffect(() => {
    if (!leafletRef.current || !currentLocation) return;

    if (carMarkerRef.current) {
      carMarkerRef.current.setLatLng(currentLocation as LatLngExpression);
    } else {
      carMarkerRef.current = L.marker(currentLocation as LatLngExpression, { icon: carIcon })
        .addTo(leafletRef.current);
    }

    // Pan map to follow car
    leafletRef.current.panTo(currentLocation as LatLngExpression);

    // Calculate distance from last route update
    if (lastRouteUpdateRef.current) {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (lastRouteUpdateRef.current[0] * Math.PI) / 180;
      const φ2 = (currentLocation[0] * Math.PI) / 180;
      const Δφ = ((currentLocation[0] - lastRouteUpdateRef.current[0]) * Math.PI) / 180;
      const Δλ = ((currentLocation[1] - lastRouteUpdateRef.current[1]) * Math.PI) / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      // Update route if moved more than 150 meters
      if (distance > 150) {
        console.log(`Map: Moved ${distance.toFixed(0)}m, updating route...`);
        fetchRouteFromCurrentPosition();
        lastRouteUpdateRef.current = currentLocation;
      }
    } else {
      // First location update
      lastRouteUpdateRef.current = currentLocation;
      fetchRouteFromCurrentPosition();
    }
  }, [currentLocation]);

  const fetchRoute = async () => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("OSRM route request failed");
      const data = await res.json();
      const coords: [number, number][] = data.routes?.[0]?.geometry?.coordinates?.map(
        (c: number[]) => [c[1], c[0]]
      );
      
      if (!coords || coords.length === 0) return;

      setRouteCoords(coords);

      // Remove existing polyline
      if (routeRef.current) routeRef.current.remove();
      
      routeRef.current = L.polyline(coords as LatLngExpression[], {
        color: "#14B8A6",
        weight: 5,
        opacity: 0.7,
      }).addTo(leafletRef.current!);

      leafletRef.current!.fitBounds(routeRef.current.getBounds(), { padding: [50, 50] });
    } catch (e) {
      console.error("Route error", e);
    }
  };

  const fetchRouteFromCurrentPosition = async () => {
    if (!currentLocation) return;
    
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation[1]},${currentLocation[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("OSRM route request failed");
      const data = await res.json();
      const coords: [number, number][] = data.routes?.[0]?.geometry?.coordinates?.map(
        (c: number[]) => [c[1], c[0]]
      );
      
      if (!coords || coords.length === 0) return;

      setRouteCoords(coords);

      // Remove existing polyline
      if (routeRef.current) routeRef.current.remove();
      
      routeRef.current = L.polyline(coords as LatLngExpression[], {
        color: "#14B8A6",
        weight: 5,
        opacity: 0.7,
      }).addTo(leafletRef.current!);
    } catch (e) {
      console.error("Route update error", e);
    }
  };

  return (
    <div
      ref={mapRef}
      style={{ height: `${height}px`, width: "100%", borderRadius: 12, overflow: "hidden" }}
    />
  );
};

export default EnhancedMap;
