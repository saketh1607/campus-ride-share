import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Leaf, Droplet, TreeDeciduous } from "lucide-react";

const EcoImpact = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [impact, setImpact] = useState({
    totalDistance: 0,
    fuelSaved: 0,
    carbonReduced: 0,
    ridesShared: 0,
    ridesAsDriver: 0,
    ridesAsPassenger: 0,
  });

  useEffect(() => {
    fetchEcoImpact();
  }, []);

  const fetchEcoImpact = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    try {
      // Fetch rides where user is the driver (completed rides)
      const { data: driverRides, error: driverError } = await supabase
        .from("rides")
        .select(`
          *,
          ride_requests!inner(
            distance_km,
            status
          )
        `)
        .eq("driver_id", session.user.id)
        .eq("status", "completed")
        .eq("ride_requests.status", "accepted");

      // Fetch ride requests where user is the passenger (completed rides)
      const { data: passengerRequests, error: passengerError } = await supabase
        .from("ride_requests")
        .select(`
          *,
          ride:rides!inner(
            status
          )
        `)
        .eq("passenger_id", session.user.id)
        .eq("status", "accepted")
        .eq("ride.status", "completed");

      if (driverError) {
        console.error("Error fetching driver rides:", driverError);
      }

      if (passengerError) {
        console.error("Error fetching passenger rides:", passengerError);
      }

      let totalDistance = 0;
      let ridesAsDriver = 0;
      let ridesAsPassenger = 0;

      // Calculate from driver rides
      if (driverRides && driverRides.length > 0) {
        driverRides.forEach((ride) => {
          if (ride.ride_requests && ride.ride_requests.length > 0) {
            ride.ride_requests.forEach((request: any) => {
              if (request.distance_km) {
                totalDistance += request.distance_km;
              }
            });
            ridesAsDriver += 1;
          }
        });
      }

      // Calculate from passenger rides
      if (passengerRequests && passengerRequests.length > 0) {
        passengerRequests.forEach((request) => {
          if (request.distance_km) {
            totalDistance += request.distance_km;
          }
          ridesAsPassenger += 1;
        });
      }

      // Calculate eco metrics
      // Average fuel consumption: 0.08 liters per km (12.5 km/L)
      // By sharing, we save approximately 50% of fuel per person
      const fuelSaved = totalDistance * 0.08 * 0.5;
      
      // Carbon emissions: 2.3 kg CO2 per liter of gasoline
      const carbonReduced = fuelSaved * 2.3;

      setImpact({
        totalDistance: totalDistance,
        fuelSaved: fuelSaved,
        carbonReduced: carbonReduced,
        ridesShared: ridesAsDriver + ridesAsPassenger,
        ridesAsDriver: ridesAsDriver,
        ridesAsPassenger: ridesAsPassenger,
      });

      // If no data found, check the eco_impact table as fallback
      if (totalDistance === 0) {
        const { data: ecoData, error: ecoError } = await supabase
          .from("eco_impact")
          .select("*")
          .eq("user_id", session.user.id);

        if (!ecoError && ecoData && ecoData.length > 0) {
          const totals = ecoData.reduce(
            (acc, curr) => ({
              totalDistance: acc.totalDistance + (curr.distance_shared_km || 0),
              fuelSaved: acc.fuelSaved + (curr.fuel_saved_liters || 0),
              carbonReduced: acc.carbonReduced + (curr.carbon_reduced_kg || 0),
              ridesShared: acc.ridesShared + 1,
            }),
            { totalDistance: 0, fuelSaved: 0, carbonReduced: 0, ridesShared: 0 }
          );
          
          setImpact({
            ...totals,
            ridesAsDriver: 0,
            ridesAsPassenger: 0,
          });
        }
      }
    } catch (error) {
      console.error("Error calculating eco impact:", error);
      toast({
        title: "Error",
        description: "Failed to calculate eco impact",
        variant: "destructive",
      });
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
          <h1 className="text-2xl font-bold">Your Eco Impact</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {impact.ridesShared === 0 ? (
          <Card className="mb-8 border-primary/50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <Leaf className="h-8 w-8 text-primary" />
                Start Your Eco Journey
              </CardTitle>
              <CardDescription>
                Complete your first ride to see your environmental impact!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Every ride you share helps reduce carbon emissions and fuel consumption. 
                  Start making a difference today!
                </p>
                <div className="flex gap-4">
                  <Button onClick={() => navigate("/find-rides")}>
                    Find a Ride
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/create-ride")}>
                    Offer a Ride
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-8 bg-gradient-eco text-success-foreground">
              <CardHeader>
                <CardTitle className="text-3xl flex items-center gap-3">
                  <Leaf className="h-8 w-8" />
                  Making a Difference
                </CardTitle>
                <CardDescription className="text-success-foreground/80">
                  Your contribution to a sustainable campus
                </CardDescription>
              </CardHeader>
              <CardContent className="text-success-foreground/90">
                <div className="flex gap-4 text-sm">
                  <span>🚗 {impact.ridesAsDriver} rides as driver</span>
                  <span>👥 {impact.ridesAsPassenger} rides as passenger</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="hover:shadow-lg-primary transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Droplet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">
                        {impact.fuelSaved.toFixed(1)} L
                      </CardTitle>
                      <CardDescription>Fuel Saved</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Equivalent to {(impact.fuelSaved * 1.5).toFixed(0)} hours of driving
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    💰 Saved ₹{(impact.fuelSaved * 100).toFixed(0)} in fuel costs
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg-success transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-success/20 rounded-lg flex items-center justify-center">
                      <TreeDeciduous className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">
                        {impact.carbonReduced.toFixed(1)} kg
                      </CardTitle>
                      <CardDescription>CO₂ Reduced</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Equivalent to {(impact.carbonReduced / 20).toFixed(1)} trees planted
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    🌱 That's {(impact.carbonReduced / 0.4).toFixed(0)} km of tree growth!
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center">
                      <Leaf className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">
                        {impact.totalDistance.toFixed(0)} km
                      </CardTitle>
                      <CardDescription>Distance Shared</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Across {impact.ridesShared} shared rides
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    🗺️ That's like traveling from Delhi to {impact.totalDistance > 1000 ? 'Mumbai' : 'Jaipur'}!
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🚗</span>
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{impact.ridesShared}</CardTitle>
                      <CardDescription>Total Rides</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Building a sustainable community
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    🎉 Keep up the great work!
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Your Impact Breakdown</CardTitle>
                <CardDescription>
                  See how your contributions add up
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Average distance per ride</span>
                    <span className="text-sm text-muted-foreground">
                      {impact.ridesShared > 0 ? (impact.totalDistance / impact.ridesShared).toFixed(1) : 0} km
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">CO₂ saved per ride</span>
                    <span className="text-sm text-muted-foreground">
                      {impact.ridesShared > 0 ? (impact.carbonReduced / impact.ridesShared).toFixed(2) : 0} kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Fuel saved per ride</span>
                    <span className="text-sm text-muted-foreground">
                      {impact.ridesShared > 0 ? (impact.fuelSaved / impact.ridesShared).toFixed(2) : 0} L
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Keep It Up!</CardTitle>
            <CardDescription>
              Every shared ride makes a difference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">🎯 Your Next Goal</p>
                <p className="text-sm text-muted-foreground">
                  Share {impact.ridesShared === 0 ? 'your first ride' : `10 more rides to reach ${impact.ridesShared + 10} total rides`}!
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">🌍 Global Impact</p>
                <p className="text-sm text-muted-foreground">
                  Join thousands of students reducing their carbon footprint through ride-sharing
                </p>
              </div>
              <div className="p-4 bg-gradient-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium mb-2">💡 Did You Know?</p>
                <p className="text-sm text-muted-foreground">
                  If every student shared just one ride per week, we could reduce campus carbon emissions by 30%!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EcoImpact;