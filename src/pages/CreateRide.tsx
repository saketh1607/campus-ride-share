import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, MapPin, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Hyderabad city center coordinates
const HYDERABAD_CENTER = {
  lat: 17.3850,
  lng: 78.4867,
};

// Maximum allowed radius in kilometers
const MAX_RADIUS_KM = 100;

const CreateRide = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [locationWarning, setLocationWarning] = useState<{
    type: 'start' | 'end' | null;
    message: string;
  }>({ type: null, message: "" });
  
  const [formData, setFormData] = useState({
    start_address: "",
    start_lat: 0,
    start_lng: 0,
    end_address: "",
    end_lat: 0,
    end_lng: 0,
    scheduled_time: "",
    available_seats: 3,
    is_recurring: false,
  });

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  // Check if coordinates are within Hyderabad geofence
  const isWithinGeofence = (lat: number, lng: number): boolean => {
    const distance = calculateDistance(
      HYDERABAD_CENTER.lat,
      HYDERABAD_CENTER.lng,
      lat,
      lng
    );
    return distance <= MAX_RADIUS_KM;
  };

  // Get distance from Hyderabad center
  const getDistanceFromHyderabad = (lat: number, lng: number): number => {
    return calculateDistance(
      HYDERABAD_CENTER.lat,
      HYDERABAD_CENTER.lng,
      lat,
      lng
    );
  };

  const geocodeAddress = async (address: string, type: "start" | "end") => {
    if (!address.trim()) {
      toast({
        title: "Empty address",
        description: "Please enter an address first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const distance = getDistanceFromHyderabad(lat, lng);
        
        // Check if location is within geofence
        if (!isWithinGeofence(lat, lng)) {
          setLocationWarning({
            type,
            message: `This location is ${distance.toFixed(1)} km from Hyderabad center. Only locations within ${MAX_RADIUS_KM} km are allowed.`
          });
          
          toast({
            title: "Location outside service area",
            description: `This location is ${distance.toFixed(1)} km from Hyderabad. Please choose a location within ${MAX_RADIUS_KM} km radius.`,
            variant: "destructive",
          });
          return;
        }

        // Location is valid - clear any warnings and set coordinates
        setLocationWarning({ type: null, message: "" });
        
        if (type === "start") {
          setFormData({
            ...formData,
            start_lat: lat,
            start_lng: lng,
          });
        } else {
          setFormData({
            ...formData,
            end_lat: lat,
            end_lng: lng,
          });
        }
        
        toast({
          title: "✓ Location verified!",
          description: `${type === "start" ? "Start" : "Destination"} is ${distance.toFixed(1)} km from Hyderabad center (within service area)`,
        });
      } else {
        toast({
          title: "Location not found",
          description: "Could not find coordinates for this address. Try being more specific.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        title: "Error",
        description: "Failed to verify location. Please try again.",
        variant: "destructive",
      });
    }
  };

  const validateGeofence = (): boolean => {
    // Check start location
    if (!isWithinGeofence(formData.start_lat, formData.start_lng)) {
      const distance = getDistanceFromHyderabad(formData.start_lat, formData.start_lng);
      toast({
        title: "Start location outside service area",
        description: `Start location is ${distance.toFixed(1)} km from Hyderabad. Maximum allowed is ${MAX_RADIUS_KM} km.`,
        variant: "destructive",
      });
      return false;
    }

    // Check end location
    if (!isWithinGeofence(formData.end_lat, formData.end_lng)) {
      const distance = getDistanceFromHyderabad(formData.end_lat, formData.end_lng);
      toast({
        title: "Destination outside service area",
        description: `Destination is ${distance.toFixed(1)} km from Hyderabad. Maximum allowed is ${MAX_RADIUS_KM} km.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setCreating(false);
      return;
    }

    // Validate coordinates are set
    if (formData.start_lat === 0 || formData.end_lat === 0) {
      toast({
        title: "Missing coordinates",
        description: "Please geocode both start and end locations using the map pin buttons",
        variant: "destructive",
      });
      setCreating(false);
      return;
    }

    // Validate scheduled time is in the future
    const scheduledTime = new Date(formData.scheduled_time);
    if (scheduledTime <= new Date()) {
      toast({
        title: "Invalid time",
        description: "Scheduled time must be in the future",
        variant: "destructive",
      });
      setCreating(false);
      return;
    }

    // CRITICAL: Validate geofence before creating ride
    if (!validateGeofence()) {
      setCreating(false);
      return;
    }

    // All validations passed - create the ride
    const { error } = await supabase.from("rides").insert({
      driver_id: session.user.id,
      ...formData,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const startDistance = getDistanceFromHyderabad(formData.start_lat, formData.start_lng);
      const endDistance = getDistanceFromHyderabad(formData.end_lat, formData.end_lng);
      
      toast({
        title: "🎉 Ride created successfully!",
        description: `Your ride is now available for requests within Hyderabad region`,
      });
      navigate("/my-rides");
    }
    setCreating(false);
  };

  // Helper to get minimum datetime for input (current time + 30 minutes)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Create a Ride</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Service Area Information */}
        <Alert className="mb-6 border-primary/50 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Service Area:</strong> RideMate Campus operates within {MAX_RADIUS_KM} km radius of Hyderabad city center. 
            Both pickup and drop-off locations must be within this area.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Ride Details</CardTitle>
            <CardDescription>
              Share your ride with fellow students and staff in Hyderabad region
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Start Location */}
              <div className="space-y-2">
                <Label htmlFor="start_address">Start Location *</Label>
                <div className="flex gap-2">
                  <Input
                    id="start_address"
                    value={formData.start_address}
                    onChange={(e) =>
                      setFormData({ ...formData, start_address: e.target.value })
                    }
                    placeholder="e.g., HITEC City, Hyderabad"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => geocodeAddress(formData.start_address, "start")}
                    disabled={!formData.start_address.trim()}
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
                {formData.start_lat !== 0 && formData.start_lng !== 0 && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-success flex items-center gap-1">
                        ✓ Coordinates: {formData.start_lat.toFixed(6)}, {formData.start_lng.toFixed(6)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Distance from Hyderabad: {getDistanceFromHyderabad(formData.start_lat, formData.start_lng).toFixed(1)} km
                      </p>
                    </div>
                  </div>
                )}
                {locationWarning.type === 'start' && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {locationWarning.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* End Location */}
              <div className="space-y-2">
                <Label htmlFor="end_address">Destination *</Label>
                <div className="flex gap-2">
                  <Input
                    id="end_address"
                    value={formData.end_address}
                    onChange={(e) =>
                      setFormData({ ...formData, end_address: e.target.value })
                    }
                    placeholder="e.g., Secunderabad Railway Station"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => geocodeAddress(formData.end_address, "end")}
                    disabled={!formData.end_address.trim()}
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
                {formData.end_lat !== 0 && formData.end_lng !== 0 && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-success flex items-center gap-1">
                        ✓ Coordinates: {formData.end_lat.toFixed(6)}, {formData.end_lng.toFixed(6)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Distance from Hyderabad: {getDistanceFromHyderabad(formData.end_lat, formData.end_lng).toFixed(1)} km
                      </p>
                    </div>
                  </div>
                )}
                {locationWarning.type === 'end' && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {locationWarning.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Route Distance Display */}
              {formData.start_lat !== 0 && formData.end_lat !== 0 && (
                <Alert className="bg-muted/50">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Route Distance:</strong>{" "}
                    {calculateDistance(
                      formData.start_lat,
                      formData.start_lng,
                      formData.end_lat,
                      formData.end_lng
                    ).toFixed(1)}{" "}
                    km
                  </AlertDescription>
                </Alert>
              )}

              {/* Scheduled Time */}
              <div className="space-y-2">
                <Label htmlFor="scheduled_time">Scheduled Time *</Label>
                <Input
                  id="scheduled_time"
                  type="datetime-local"
                  value={formData.scheduled_time}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduled_time: e.target.value })
                  }
                  min={getMinDateTime()}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 30 minutes from now
                </p>
              </div>

              {/* Available Seats */}
              <div className="space-y-2">
                <Label htmlFor="available_seats">Available Seats *</Label>
                <Input
                  id="available_seats"
                  type="number"
                  min="1"
                  max="7"
                  value={formData.available_seats}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      available_seats: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Number of passengers you can accommodate (1-7)
                </p>
              </div>

              {/* Recurring Ride */}
              <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg">
                <Checkbox
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_recurring: checked as boolean })
                  }
                />
                <Label htmlFor="is_recurring" className="cursor-pointer text-sm">
                  This is a recurring ride (same route, same time regularly)
                </Label>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={
                  creating || 
                  formData.start_lat === 0 || 
                  formData.end_lat === 0 ||
                  locationWarning.type !== null
                } 
                className="w-full"
                size="lg"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Ride...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Create Ride
                  </>
                )}
              </Button>

              {/* Help Text */}
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <p className="font-medium">📍 Tips for creating a successful ride:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Be specific with addresses (include landmarks)</li>
                  <li>Click the map pin button to verify each location</li>
                  <li>Both locations must be within {MAX_RADIUS_KM} km of Hyderabad</li>
                  <li>Schedule at least 30 minutes in advance</li>
                  <li>Mark as recurring if you travel this route regularly</li>
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Popular Routes Suggestion */}
        <Card className="mt-6 bg-gradient-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">📌 Popular Routes in Hyderabad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-background rounded-lg border">
                <p className="font-medium">HITEC City → Secunderabad</p>
                <p className="text-xs text-muted-foreground">~15 km</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <p className="font-medium">Gachibowli → Uppal</p>
                <p className="text-xs text-muted-foreground">~25 km</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <p className="font-medium">Jubilee Hills → LB Nagar</p>
                <p className="text-xs text-muted-foreground">~20 km</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <p className="font-medium">Miyapur → Dilsukhnagar</p>
                <p className="text-xs text-muted-foreground">~28 km</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateRide;