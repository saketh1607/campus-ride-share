import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, MapPin, Calendar, CheckCircle, XCircle, Clock, Key } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { RidePayment } from "@/components/RidePayment";
import FeedbackForm from "@/components/FeedbackForm";

const PassengerRides = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rideRequests, setRideRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchPassengerRides();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('ride-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests',
        },
        () => {
          fetchPassengerRides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPassengerRides = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: requests, error } = await supabase
      .from("ride_requests")
      .select(`
        *,
        ride:rides(
          *,
          driver:profiles!rides_driver_id_fkey(full_name, photo_url, phone_number)
        )
      `)
      .eq("passenger_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching ride requests:", error);
      toast({
        title: "Error",
        description: "Failed to load your ride requests",
        variant: "destructive",
      });
    } else {
      setRideRequests(requests || []);
    }
    setLoading(false);
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
          <h1 className="text-2xl font-bold">My Ride Requests</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {rideRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-lg font-semibold mb-2">No ride requests yet</p>
                <p className="text-muted-foreground mb-4">
                  Find and request rides to get started
                </p>
                <Button onClick={() => navigate("/find-rides")}>
                  Find Rides
                </Button>
              </CardContent>
            </Card>
          ) : (
            rideRequests.map((request) => (
              <Card key={request.id} className={
                request.status === "accepted" ? "border-green-500 shadow-lg" : ""
              }>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {request.ride?.start_address} → {request.ride?.end_address}
                        <span className={`text-xs px-2 py-1 rounded ${
                          request.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          request.status === "accepted" ? "bg-green-100 text-green-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {request.status}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(request.ride?.scheduled_time).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{request.pickup_address}</span>
                    </div>
                  </div>

                  {request.status === "accepted" && request.otp && (
                    <Card className="bg-gradient-primary/10 border-primary animate-pulse">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                            <Key className="h-6 w-6 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Your Ride OTP</p>
                            <p className="text-3xl font-bold text-primary">{request.otp}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Share this code with your driver to start the ride
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {request.distance_km && request.status === "accepted" && (
                    <RidePayment 
                      rideRequestId={request.id}
                      distanceKm={request.distance_km}
                      onPaymentComplete={() => fetchPassengerRides()}
                    />
                  )}

                  {request.ride?.status === "completed" && (
                    <FeedbackForm 
                      rideId={request.ride.id}
                      onSubmitSuccess={() => {
                        toast({
                          title: "Thank you!",
                          description: "Your feedback has been submitted",
                        });
                        fetchPassengerRides();
                      }}
                    />
                  )}

                  {request.ride?.driver && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      {request.ride.driver.photo_url ? (
                        <img
                          src={request.ride.driver.photo_url}
                          alt={request.ride.driver.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground">
                          {request.ride.driver.full_name?.[0] || "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">Driver: {request.ride.driver.full_name}</p>
                        {request.status === "accepted" && request.ride.driver.phone_number && (
                          <p className="text-sm text-muted-foreground">
                            📞 {request.ride.driver.phone_number}
                          </p>
                        )}
                      </div>
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

export default PassengerRides;
