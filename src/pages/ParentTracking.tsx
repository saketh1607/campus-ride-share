import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import EnhancedMap from "@/components/EnhancedMap";
import Pusher from "pusher-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ParentTracking = () => {
  const { rideId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ride, setRide] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [pickupPoints, setPickupPoints] = useState<Array<{ lat: number; lng: number; address: string }>>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pusherRef = useRef<Pusher | null>(null);

  useEffect(() => {
    fetchRideDetails();
    setupPusher();

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [rideId]);

  const fetchRideDetails = async () => {
    if (!rideId) return;

    const { data, error } = await supabase
      .from("rides")
      .select(`
        *,
        driver:profiles!rides_driver_id_fkey(full_name, phone_number),
        ride_requests!inner(
          pickup_lat,
          pickup_lng,
          pickup_address,
          status
        )
      `)
      .eq("id", rideId)
      .eq("ride_requests.status", "accepted")
      .single();

    if (error) {
      console.error("Error fetching ride:", error);
    } else {
      setRide(data);
      
      // Extract pickup points - filter out invalid coordinates
      const pickups = data.ride_requests
        .map((req: any) => ({
          lat: req.pickup_lat,
          lng: req.pickup_lng,
          address: req.pickup_address,
        }))
        .filter((p: any) => p.lat && p.lng && p.lat !== 0 && p.lng !== 0);
      setPickupPoints(pickups);
    }
    setLoading(false);
  };

  const setupPusher = () => {
    if (!rideId) return;

    // Pusher public credentials (key and cluster are safe to expose)
    pusherRef.current = new Pusher("ce028935e04d0257ba24", {
      cluster: "ap2",
    });

    const channel = pusherRef.current.subscribe(`ride-${rideId}`);
    
    channel.bind("location-update", (data: { lat: number; lng: number }) => {
      setCurrentLocation([data.lat, data.lng]);
    });
  };

  const handleRefreshLocation = async () => {
    setIsRefreshing(true);
    try {
      // Fetch latest ride status which triggers a location update
      const { data, error } = await supabase
        .from("rides")
        .select("status")
        .eq("id", rideId)
        .single();

      if (error) throw error;

      toast({
        title: "Location refreshed",
        description: "Fetching latest location...",
      });
    } catch (error) {
      console.error("Error refreshing location:", error);
      toast({
        title: "Refresh failed",
        description: "Could not fetch latest location",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading ride information...</span>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="p-6 rounded-lg border bg-card">
          <p className="text-lg font-semibold mb-2">Ride not found</p>
          <p className="text-sm text-muted-foreground">This ride may have been completed or cancelled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">🚗 Live Ride Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your child's ride in real-time</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid md:grid-cols-3 gap-6">
          <section className="md:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Live Tracking Active
                  </span>
                  <Button
                    onClick={handleRefreshLocation}
                    disabled={isRefreshing}
                    size="sm"
                    variant="outline"
                  >
                    {isRefreshing ? "Refreshing..." : "Refresh Location"}
                  </Button>
                </div>
                <EnhancedMap
                  start={[ride.start_lat, ride.start_lng]}
                  end={[ride.end_lat, ride.end_lng]}
                  pickupPoints={pickupPoints}
                  currentLocation={currentLocation}
                  height={540}
                />
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📍 Ride Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Pickup Location</p>
                  <p className="font-medium text-sm">{ride.start_address}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Drop-off Location</p>
                  <p className="font-medium text-sm">{ride.end_address}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Ride Status</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <p className="font-medium text-green-600 capitalize">{ride.status}</p>
                  </div>
                </div>
                {ride.driver && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Driver</p>
                    <p className="font-medium text-sm">{ride.driver.full_name}</p>
                    {ride.driver.phone_number && (
                      <p className="text-sm text-muted-foreground">{ride.driver.phone_number}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ℹ️ Parent Information</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>This page updates automatically with the driver's location</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>The blue route shows the planned path</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>You'll receive updates when the ride is completed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Keep this page open to track the ride</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default ParentTracking;
