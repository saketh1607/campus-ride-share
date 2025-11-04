import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, MapPin, Calendar, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MyRides = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);
  const [rideRequests, setRideRequests] = useState<any[]>([]);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    fetchMyRides();
  }, []);

  const fetchMyRides = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Fetch rides where user is the driver
    const { data: driverRides, error: ridesError } = await supabase
      .from("rides")
      .select("*")
      .eq("driver_id", session.user.id)
      .order("scheduled_time", { ascending: false });

    if (ridesError) {
      console.error("Error fetching rides:", ridesError);
    } else {
      setRides(driverRides || []);
      
      // Fetch ride requests for driver's rides
      const rideIds = driverRides?.map(r => r.id) || [];
      if (rideIds.length > 0) {
        const { data: requests, error: requestsError } = await supabase
          .from("ride_requests")
          .select(`
            *,
            passenger:profiles!ride_requests_passenger_id_fkey(full_name, photo_url, phone_number, parent_phone_number)
          `)
          .in("ride_id", rideIds);

        if (!requestsError) {
          setRideRequests(requests || []);
        }
      }
    }
    setLoading(false);
  };

  const handleAcceptRequest = async (requestId: string, rideId: string) => {
    // Generate 2-digit OTP for this passenger
    const otp = Math.floor(10 + Math.random() * 90).toString(); // 2-digit random number
    
    const { error: updateError } = await supabase
      .from("ride_requests")
      .update({ status: "accepted", otp: otp })
      .eq("id", requestId);

    if (updateError) {
      toast({
        title: "Error",
        description: updateError.message,
        variant: "destructive",
      });
      return;
    }

    // Decrease available seats
    const ride = rides.find(r => r.id === rideId);
    if (ride && ride.available_seats > 0) {
      const { error: seatError } = await supabase
        .from("rides")
        .update({ available_seats: ride.available_seats - 1 })
        .eq("id", rideId);

      if (seatError) {
        console.error("Error updating seats:", seatError);
      }
    }

    toast({
      title: "Request accepted!",
      description: "Passenger will receive their OTP. Wait for all passengers to share their OTPs before starting the ride.",
    });
    fetchMyRides();
  };

  const handleRejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("ride_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Request rejected",
      });
      fetchMyRides();
    }
  };

  const handleStartRide = (ride: any) => {
    setSelectedRide(ride);
    setShowOtpDialog(true);
  };

  const handleOtpSubmit = async () => {
    // Get all accepted requests for this ride
    const acceptedRequests = rideRequests.filter(
      r => r.ride_id === selectedRide.id && r.status === "accepted"
    );
    
    // Concatenate all OTPs
    const expectedOtp = acceptedRequests.map(r => r.otp).join("");
    
    if (otp === expectedOtp) {
      setShowOtpDialog(false);
      
      // Send SMS to all passengers' parents
      try {
        for (const request of acceptedRequests) {
          if (request.passenger?.parent_phone_number) {
            const trackingUrl = `${window.location.origin}/live-tracking/${selectedRide.id}`;
            await supabase.functions.invoke('send-location-sms', {
              body: {
                phoneNumber: request.passenger.parent_phone_number,
                rideId: selectedRide.id,
                driverName: "Driver",
                trackingUrl: trackingUrl
              }
            });
          }
        }
      } catch (error) {
        console.error("Error sending SMS:", error);
      }
      
      navigate(`/live-tracking/${selectedRide.id}`);
    } else {
      toast({
        title: "Invalid OTP",
        description: `Please enter the correct ${expectedOtp.length}-digit OTP`,
        variant: "destructive",
      });
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
          <h1 className="text-2xl font-bold">My Rides</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {rides.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-lg font-semibold mb-2">No rides yet</p>
                <p className="text-muted-foreground mb-4">
                  Create your first ride to start sharing
                </p>
                <Button onClick={() => navigate("/create-ride")}>
                  Create Ride
                </Button>
              </CardContent>
            </Card>
          ) : (
            rides.map((ride) => {
              const requests = rideRequests.filter(r => r.ride_id === ride.id);
              
              return (
                <Card key={ride.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {ride.start_address} → {ride.end_address}
                          <span className={`text-xs px-2 py-1 rounded ${
                            ride.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                            ride.status === "active" ? "bg-green-100 text-green-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {ride.status}
                          </span>
                        </CardTitle>
                        <CardDescription>
                          {formatDistanceToNow(new Date(ride.scheduled_time), { addSuffix: true })}
                        </CardDescription>
                      </div>
                      {ride.status === "scheduled" && requests.some(r => r.status === "accepted") && (
                        <Button onClick={() => handleStartRide(ride)} variant="default" className="bg-green-600 hover:bg-green-700">
                          Verify OTP & Start Ride
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(ride.scheduled_time).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{ride.available_seats} seats</span>
                      </div>
                    </div>

                    {requests.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Ride Requests</h3>
                        <div className="space-y-3">
                          {requests.map((request) => (
                            <div
                              key={request.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {request.passenger?.photo_url ? (
                                  <img
                                    src={request.passenger.photo_url}
                                    alt={request.passenger.full_name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground">
                                    {request.passenger?.full_name?.[0] || "?"}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{request.passenger?.full_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Pickup: {request.pickup_address}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {request.status === "pending" ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAcceptRequest(request.id, ride.id)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRejectRequest(request.id)}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                ) : (
                                  <span className={`text-sm px-3 py-1 rounded ${
                                    request.status === "accepted" ? "bg-green-100 text-green-700" :
                                    "bg-red-100 text-red-700"
                                  }`}>
                                    {request.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">🔐 Verify Passengers</DialogTitle>
            <DialogDescription>
              Ask each passenger for their 2-digit OTP and enter them in order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <p className="text-sm font-medium mb-3">Accepted Passengers:</p>
              <div className="space-y-2">
                {rideRequests
                  .filter(r => r.ride_id === selectedRide?.id && r.status === "accepted")
                  .map((request, index) => (
                    <div key={request.id} className="flex items-center gap-2 text-sm">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                        {index + 1}
                      </span>
                      <span className="font-medium">{request.passenger?.full_name}</span>
                      <span className="text-muted-foreground">• Needs to share 2-digit code</span>
                    </div>
                  ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="otp" className="text-base">Enter Combined OTP</Label>
              <Input
                id="otp"
                placeholder={`Enter ${rideRequests.filter(r => r.ride_id === selectedRide?.id && r.status === "accepted").length * 2} digits`}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                type="text"
                maxLength={rideRequests.filter(r => r.ride_id === selectedRide?.id && r.status === "accepted").length * 2}
                className="text-2xl text-center tracking-wider font-mono h-16"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {rideRequests.filter(r => r.ride_id === selectedRide?.id && r.status === "accepted").length} passengers × 2 digits = {rideRequests.filter(r => r.ride_id === selectedRide?.id && r.status === "accepted").length * 2} total digits
              </p>
            </div>
            
            <Button 
              onClick={handleOtpSubmit} 
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
              disabled={otp.length !== rideRequests.filter(r => r.ride_id === selectedRide?.id && r.status === "accepted").length * 2}
            >
              Verify & Start Ride 🚗
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyRides;
