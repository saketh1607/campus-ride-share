import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, MapPin, Calendar, Users, Car } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const FindRides = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);
  const [searchLocation, setSearchLocation] = useState("");
  const [searchLat, setSearchLat] = useState<number | null>(null);
  const [searchLng, setSearchLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [driverRatings, setDriverRatings] = useState<Record<string, { average_rating: number; total_ratings: number }>>({});

  useEffect(() => {
    fetchRides();
  }, []);

  useEffect(() => {
    if (rides.length > 0) {
      fetchDriverRatings();
    }
  }, [rides]);

  const fetchDriverRatings = async () => {
    const driverIds = rides.map(r => r.driver_id).filter(Boolean);
    if (driverIds.length === 0) return;

    const { data, error } = await supabase
      .from("driver_ratings")
      .select("*")
      .in("driver_id", driverIds);

    if (!error && data) {
      const ratingsMap: Record<string, any> = {};
      data.forEach((rating: any) => {
        ratingsMap[rating.driver_id] = rating;
      });
      setDriverRatings(ratingsMap);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const fetchRides = async () => {
    const { data, error } = await supabase
      .from("rides")
      .select(`
        *,
        driver:profiles!rides_driver_id_fkey(full_name, photo_url, phone_number)
      `)
      .eq("status", "scheduled")
      .gte("scheduled_time", new Date().toISOString())
      .order("scheduled_time", { ascending: true });

    if (error) {
      console.error("Error fetching rides:", error);
      toast({
        title: "Error",
        description: "Failed to load rides",
        variant: "destructive",
      });
    } else {
      let processedRides = data || [];
      
      // If user has searched for a destination, calculate distances and sort
      if (searchLat && searchLng) {
        processedRides = processedRides.map(ride => ({
          ...ride,
          distance: calculateDistance(searchLat, searchLng, ride.end_lat, ride.end_lng)
        })).sort((a, b) => a.distance - b.distance);
      }
      
      setRides(processedRides);
    }
    setLoading(false);
  };

  const handleSearchGeocode = async () => {
    if (!searchLocation.trim()) {
      toast({
        title: "Enter a location",
        description: "Please enter a destination to search",
        variant: "destructive",
      });
      return;
    }

    setGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchLocation)}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setSearchLat(lat);
        setSearchLng(lng);
        toast({
          title: "Location found!",
          description: `Searching rides near ${searchLocation}`,
        });
        // Refetch rides with new search coordinates
        await fetchRides();
      } else {
        toast({
          title: "Location not found",
          description: "Could not find coordinates for this location",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search location",
        variant: "destructive",
      });
    } finally {
      setGeocoding(false);
    }
  };

  const handleRequestRide = async (rideId: string, rideEndLat: number, rideEndLng: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Get user's profile for pickup location
    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_location_lat, primary_location_lng, primary_location_address")
      .eq("id", session.user.id)
      .single();

    const pickupLat = profile?.primary_location_lat || searchLat || 0;
    const pickupLng = profile?.primary_location_lng || searchLng || 0;

    // Calculate distance for fare
    const distanceKm = calculateDistance(pickupLat, pickupLng, rideEndLat, rideEndLng);
    const fareAmount = Math.round(distanceKm * 8); // 8 rs per km

    const { error } = await supabase.from("ride_requests").insert({
      ride_id: rideId,
      passenger_id: session.user.id,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      pickup_address: profile?.primary_location_address || searchLocation || "To be set",
      distance_km: distanceKm,
      fare_amount: fareAmount,
      payment_status: 'pending'
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Request sent!",
        description: `Estimated fare: ₹${fareAmount} for ${distanceKm.toFixed(2)}km`,
      });
      fetchRides();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Find a Ride</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Label htmlFor="search">Search by destination</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="search"
              placeholder="Enter destination to find nearby rides..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchGeocode()}
            />
            <Button 
              onClick={handleSearchGeocode}
              disabled={geocoding}
              variant="outline"
            >
              {geocoding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </Button>
          </div>
          {searchLat && searchLng && (
            <p className="text-xs text-muted-foreground mt-2">
              ✓ Showing rides sorted by distance from {searchLocation}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {rides.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">No rides available</p>
                <p className="text-muted-foreground">
                  Check back later for available rides
                </p>
              </CardContent>
            </Card>
          ) : (
            rides.map((ride) => (
              <Card key={ride.id} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {ride.driver?.photo_url ? (
                        <img
                          src={ride.driver.photo_url}
                          alt={ride.driver.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                          {ride.driver?.full_name?.[0] || "?"}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          {ride.driver?.full_name || "Driver"}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <span>{ride.vehicle_model || "Vehicle details not provided"}</span>
                          {driverRatings[ride.driver_id] && (
                            <span className="flex items-center gap-1 text-yellow-500 font-medium">
                              ⭐ {driverRatings[ride.driver_id].average_rating}
                              <span className="text-xs text-muted-foreground">
                                ({driverRatings[ride.driver_id].total_ratings})
                              </span>
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Button onClick={() => handleRequestRide(ride.id, ride.end_lat, ride.end_lng)}>
                      Request Ride
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium">From:</span>
                    <span className="text-muted-foreground">
                      {ride.start_address}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-destructive" />
                    <span className="font-medium">To:</span>
                    <span className="text-muted-foreground">
                      {ride.end_address}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDistanceToNow(new Date(ride.scheduled_time), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{ride.available_seats} seats available</span>
                    </div>
                  </div>
                   {ride.is_recurring && (
                    <div className="text-sm text-muted-foreground">
                      ♻️ Recurring ride
                    </div>
                  )}
                  {ride.distance && (
                    <div className="text-sm text-primary font-medium">
                      📍 {ride.distance.toFixed(1)} km from your destination
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FindRides;
