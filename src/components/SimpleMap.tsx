import { useEffect, useRef } from "react";
import L, { LatLngExpression, Polyline as LeafletPolyline, Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";

interface SimpleMapProps {
  start: [number, number]; // [lat, lng]
  end: [number, number];   // [lat, lng]
  simulateMovement?: boolean;
  height?: number; // px
}

const SimpleMap = ({ start, end, simulateMovement = true, height = 600 }: SimpleMapProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const routeRef = useRef<LeafletPolyline | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map once
    if (!leafletRef.current) {
      leafletRef.current = L.map(mapRef.current, {
        center: start as LatLngExpression,
        zoom: 13,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(leafletRef.current);

      // Add start/end markers
      L.marker(start as LatLngExpression).addTo(leafletRef.current).bindPopup("Start");
      L.marker(end as LatLngExpression).addTo(leafletRef.current).bindPopup("Destination");
    }

    // Fit bounds
    const bounds = L.latLngBounds([start, end]);
    leafletRef.current.fitBounds(bounds, { padding: [40, 40] });

    // Fetch route via OSRM and draw polyline
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("OSRM route request failed");
        const data = await res.json();
        const coords: [number, number][] = data.routes?.[0]?.geometry?.coordinates?.map((c: number[]) => [c[1], c[0]]);
        if (!coords || coords.length === 0) return;

        // Remove existing polyline
        if (routeRef.current) routeRef.current.remove();
        routeRef.current = L.polyline(coords as LatLngExpression[], {
          color: "#14B8A6",
          weight: 4,
          opacity: 0.8,
        }).addTo(leafletRef.current!);

        leafletRef.current!.fitBounds(routeRef.current.getBounds(), { padding: [40, 40] });

        // Simulate movement
        if (simulateMovement) {
          if (markerRef.current) markerRef.current.remove();
          markerRef.current = L.marker(coords[0] as LatLngExpression).addTo(leafletRef.current!);

          let i = 0;
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = window.setInterval(() => {
            i = Math.min(i + 1, coords.length - 1);
            markerRef.current!.setLatLng(coords[i] as LatLngExpression);
            if (i >= coords.length - 1 && timerRef.current) {
              window.clearInterval(timerRef.current);
            }
          }, 100);
        }
      } catch (e) {
        console.error("Route error", e);
      }
    };

    fetchRoute();

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [start[0], start[1], end[0], end[1], simulateMovement]);

  return (
    <div
      ref={mapRef}
      style={{ height: `${height}px`, width: "100%", borderRadius: 12, overflow: "hidden" }}
    />
  );
};

export default SimpleMap;
