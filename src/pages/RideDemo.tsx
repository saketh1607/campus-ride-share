import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RideMap from "@/components/RideMap";
import { ArrowLeft, Play, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RideDemo = () => {
  const navigate = useNavigate();
  const [simulateMovement, setSimulateMovement] = useState(false);

  // Demo coordinates (Heidelberg example from user's curl)
  const demoStart: [number, number] = [49.41461, 8.681495];
  const demoEnd: [number, number] = [49.420318, 8.687872];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Live Ride Tracking Demo
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Real-time Route Visualization</CardTitle>
              <CardDescription>
                This demo shows how rides are tracked in real-time using OpenRouteService API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={() => setSimulateMovement(!simulateMovement)}
                  variant={simulateMovement ? "secondary" : "default"}
                >
                  {simulateMovement ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause Simulation
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Simulation
                    </>
                  )}
                </Button>
              </div>

              <RideMap
                startCoords={demoStart}
                endCoords={demoEnd}
                showRoute={true}
                simulateMovement={simulateMovement}
              />

              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Route Calculation</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>Uses OpenRouteService Directions API to calculate optimal routes between locations.</p>
                    <p className="mt-2">Considers real-time traffic and road conditions.</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Live Tracking</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>Real-time location updates show vehicle position along the route.</p>
                    <p className="mt-2">Parents can optionally receive location updates for safety.</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How the Matching Algorithm Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 font-semibold text-primary">
                  1
                </div>
                <div>
                  <p className="font-medium">Passenger Preferences</p>
                  <p className="text-muted-foreground">System checks gender and seniority preferences set by the passenger.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 font-semibold text-primary">
                  2
                </div>
                <div>
                  <p className="font-medium">Location Matching</p>
                  <p className="text-muted-foreground">Finds drivers with similar routes using OpenRouteService distance calculation.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 font-semibold text-primary">
                  3
                </div>
                <div>
                  <p className="font-medium">Compatibility Score</p>
                  <p className="text-muted-foreground">Ranks matches by route proximity, timing, and preferences in decreasing order.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 font-semibold text-primary">
                  4
                </div>
                <div>
                  <p className="font-medium">Sequential Suggestions</p>
                  <p className="text-muted-foreground">Presents best matches to passenger, who can accept or request next option.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RideDemo;
