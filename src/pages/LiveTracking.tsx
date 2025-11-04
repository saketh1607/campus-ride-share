import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import EnhancedMap from "@/components/EnhancedMap";
import RideChat from "@/components/RideChat";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Navigation, 
  Clock, 
  Gauge, 
  Target, 
  AlertTriangle,
  Volume2,
  VolumeX,
  Smartphone,
  Zap,
  Share2,
  Camera
} from "lucide-react";

const LiveTracking = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ride, setRide] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [directions, setDirections] = useState<string[]>([]);
  const [pickupPoints, setPickupPoints] = useState<Array<{ lat: number; lng: number; address: string }>>([]);
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const locationIntervalRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastDirectionUpdateRef = useRef<[number, number] | null>(null);
  const endLocationRef = useRef<[number, number] | null>(null);
  
  // NEW FEATURES STATE
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [distanceTraveled, setDistanceTraveled] = useState<number>(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [averageSpeed, setAverageSpeed] = useState<number>(0);
  const [rideStartTime, setRideStartTime] = useState<number>(Date.now());
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [routeCached, setRouteCached] = useState(false);
  const [trafficWarnings, setTrafficWarnings] = useState<string[]>([]);
  const [nextTurnDistance, setNextTurnDistance] = useState<number>(0);
  const [checkpoints, setCheckpoints] = useState<Array<{ reached: boolean; name: string }>>([]);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(0);
  const [dataUsage, setDataUsage] = useState<number>(0);
  
  const lastLocationRef = useRef<[number, number] | null>(null);
  const midwaySentRef = useRef(false);
  const speedReadings = useRef<number[]>([]);
  const speechSynthesis = window.speechSynthesis;

  useEffect(() => {
    fetchRideDetails();
    checkBatteryStatus();
    checkNetworkStatus();
    
    return () => {
      if (locationIntervalRef.current) {
        window.clearInterval(locationIntervalRef.current);
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  // NEW FEATURE 1: Battery Monitoring
  const checkBatteryStatus = async () => {
    if ('getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        setBatteryLevel(Math.round(battery.level * 100));
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
          
          if (battery.level < 0.15) {
            toast({
              title: "⚠️ Low Battery",
              description: "Your battery is below 15%. Consider charging soon.",
              variant: "destructive",
            });
          }
        });
      } catch (error) {
        console.log("Battery API not supported");
      }
    }
  };

  // NEW FEATURE 2: Network Status Monitoring
  const checkNetworkStatus = () => {
    const updateOnlineStatus = () => {
      const offline = !navigator.onLine;
      setIsOfflineMode(offline);
      
      if (offline) {
        toast({
          title: "📵 Offline Mode",
          description: "Using cached route data. Some features may be limited.",
          variant: "destructive",
        });
      } else if (isOfflineMode) {
        toast({
          title: "📶 Back Online",
          description: "Connection restored. Syncing data...",
        });
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  };

  const fetchRideDetails = async () => {
    if (!rideId) return;

    const { data, error } = await supabase
      .from("rides")
      .select(`
        *,
        driver:profiles!rides_driver_id_fkey(full_name),
        ride_requests!inner(
          passenger:profiles!ride_requests_passenger_id_fkey(parent_phone_number, full_name),
          pickup_lat,
          pickup_lng,
          pickup_address
        )
      `)
      .eq("id", rideId)
      .eq("ride_requests.status", "accepted")
      .single();

    if (error) {
      console.error("Error fetching ride:", error);
      navigate("/my-rides");
    } else {
      setRide(data);
      setRideStartTime(Date.now());
      
      endLocationRef.current = [data.end_lat, data.end_lng];
      
      // Extract pickup points
      const pickups = data.ride_requests
        .map((req: any) => ({
          lat: req.pickup_lat,
          lng: req.pickup_lng,
          address: req.pickup_address,
          name: req.passenger?.full_name || "Passenger"
        }))
        .filter((p: any) => p.lat && p.lng && p.lat !== 0 && p.lng !== 0);
      
      setPickupPoints(pickups);
      
      // Initialize checkpoints
      const checkpointList = [
        { reached: false, name: "Start Point" },
        ...pickups.map((p: any) => ({ reached: false, name: `Pickup: ${p.name}` })),
        { reached: false, name: "Destination" }
      ];
      setCheckpoints(checkpointList);
      
      // Calculate total route distance
      const routeDistance = calculateDistance(
        data.start_lat,
        data.start_lng,
        data.end_lat,
        data.end_lng
      );
      setTotalDistance(routeDistance);
      
      loadCachedRoute();
      
      await supabase.from("rides").update({ status: "active" }).eq("id", rideId);
      await sendSmsToParents(data, 'started');
      await fetchDirections(data.start_lat, data.start_lng, data.end_lat, data.end_lng);
      
      lastDirectionUpdateRef.current = [data.start_lat, data.start_lng];
      lastLocationRef.current = [data.start_lat, data.start_lng];
      
      startGPSTracking();
    }
    setLoading(false);
  };

  const loadCachedRoute = () => {
    try {
      const cached = localStorage.getItem(`route_${rideId}`);
      if (cached) {
        const data = JSON.parse(cached);
        setDirections(data.directions || []);
        setRouteCached(true);
      }
    } catch (error) {
      console.error("Error loading cached route:", error);
    }
  };

  const cacheRouteData = (directions: string[]) => {
    try {
      localStorage.setItem(
        `route_${rideId}`,
        JSON.stringify({ directions, timestamp: Date.now() })
      );
    } catch (error) {
      console.error("Error caching route:", error);
    }
  };

  const sendSmsToParents = async (rideData: any, updateType: 'started' | 'midway' | 'completed') => {
    if (isOfflineMode) return;
    
    try {
      const parentPhoneNumbers = rideData.ride_requests
        .map((req: any) => req.passenger?.parent_phone_number)
        .filter(Boolean);

      const appUrl = window.location.origin;
      const driverName = rideData.driver?.full_name || "Driver";
      const trackingUrl = `${appUrl}/parent-tracking/${rideId}`;

      for (const phoneNumber of parentPhoneNumbers) {
        await supabase.functions.invoke("send-ride-update-sms", {
          body: {
            phoneNumber,
            rideId,
            driverName,
            updateType,
            location: trackingUrl,
          },
        });
        setDataUsage(prev => prev + 0.5); // Track approximate data usage
      }

      const messages = {
        started: "Ride started SMS sent to parents",
        midway: "Midway update SMS sent to parents",
        completed: "Ride completion SMS sent to parents",
      };

      toast({
        title: "Parents notified",
        description: messages[updateType],
      });
    } catch (error) {
      console.error("Error sending SMS:", error);
    }
  };

  const fetchDirections = async (startLat: number, startLng: number, endLat: number, endLng: number, isUpdate = false) => {
    if (isOfflineMode && routeCached) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('get-directions', {
        body: { startLat, startLng, endLat, endLng },
      });

      if (error) throw error;

      if (data.success && data.directions && data.directions.length > 0) {
        setDirections(data.directions);
        cacheRouteData(data.directions);
        setDataUsage(prev => prev + 1);
        
        if (!isUpdate && voiceGuidanceEnabled) {
          speakDirection(data.directions[0]);
        }
      } else {
        if (!isUpdate) {
          setDirections(['Head towards your destination', 'Follow the route on the map']);
        }
      }
    } catch (error) {
      console.error("Error fetching directions:", error);
      if (!isUpdate) {
        setDirections(['Head towards your destination', 'Follow the blue route on the map']);
      }
    }
  };

  // NEW FEATURE 3: Voice Navigation
  const speakDirection = (text: string) => {
    if (!voiceGuidanceEnabled || !speechSynthesis) return;
    
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // NEW FEATURE 4: Speed Tracking & ETA Calculation
  const calculateSpeedAndETA = (currentLat: number, currentLng: number) => {
    if (!lastLocationRef.current) return;

    const distance = calculateDistance(
      lastLocationRef.current[0],
      lastLocationRef.current[1],
      currentLat,
      currentLng
    );

    const timeElapsed = 5; // seconds (GPS updates every 5 seconds)
    const speed = (distance / timeElapsed) * 3.6; // Convert m/s to km/h
    
    if (speed > 0 && speed < 200) { // Filter out unrealistic speeds
      setCurrentSpeed(Math.round(speed));
      speedReadings.current.push(speed);
      
      if (speedReadings.current.length > 20) {
        speedReadings.current.shift();
      }
      
      const avgSpeed = speedReadings.current.reduce((a, b) => a + b, 0) / speedReadings.current.length;
      setAverageSpeed(Math.round(avgSpeed));
      
      // Calculate ETA
      if (endLocationRef.current) {
        const remainingDistance = calculateDistance(
          currentLat,
          currentLng,
          endLocationRef.current[0],
          endLocationRef.current[1]
        ) / 1000; // Convert to km
        
        const eta = avgSpeed > 0 ? (remainingDistance / avgSpeed) * 60 : 0; // In minutes
        setEstimatedTimeRemaining(Math.round(eta));
      }
    }
  };

  // NEW FEATURE 5: Checkpoint System
  const checkCheckpoints = (currentLat: number, currentLng: number) => {
    const threshold = 50; // 50 meters
    
    checkpoints.forEach((checkpoint, index) => {
      if (checkpoint.reached) return;
      
      let checkpointLat, checkpointLng;
      
      if (index === 0) {
        checkpointLat = ride.start_lat;
        checkpointLng = ride.start_lng;
      } else if (index === checkpoints.length - 1) {
        checkpointLat = ride.end_lat;
        checkpointLng = ride.end_lng;
      } else {
        const pickupIndex = index - 1;
        if (pickupPoints[pickupIndex]) {
          checkpointLat = pickupPoints[pickupIndex].lat;
          checkpointLng = pickupPoints[pickupIndex].lng;
        }
      }
      
      if (checkpointLat && checkpointLng) {
        const distance = calculateDistance(currentLat, currentLng, checkpointLat, checkpointLng);
        
        if (distance <= threshold) {
          const newCheckpoints = [...checkpoints];
          newCheckpoints[index].reached = true;
          setCheckpoints(newCheckpoints);
          
          toast({
            title: `✅ ${checkpoint.name}`,
            description: "Checkpoint reached!",
          });
          
          if (voiceGuidanceEnabled) {
            speakDirection(`Checkpoint reached: ${checkpoint.name}`);
          }
        }
      }
    });
  };

  const startGPSTracking = () => {
    if (!rideId) return;

    // Check for GPS permission
    if (!navigator.geolocation) {
      toast({
        title: "GPS not available",
        description: "Your device doesn't support GPS tracking",
        variant: "destructive",
      });
      return;
    }

    // Request permission
    navigator.permissions?.query({ name: 'geolocation' as any }).then((result) => {
      if (result.state === 'denied') {
        toast({
          title: "Location Permission Denied",
          description: "Please enable location access in browser settings",
          variant: "destructive",
        });
      }
    });

    let updateCount = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        updateCount++;
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        console.log(`🎯 GPS Update #${updateCount}:`, lat, lng, `Accuracy: ${accuracy}m`);
        
        setCurrentLocation([lat, lng]);
        setGpsAccuracy(Math.round(accuracy));

        // Calculate speed and ETA
        if (lastLocationRef.current) {
          calculateSpeedAndETA(lat, lng);
          
          const segmentDistance = calculateDistance(
            lastLocationRef.current[0],
            lastLocationRef.current[1],
            lat,
            lng
          );
          const newDistanceTraveled = distanceTraveled + segmentDistance;
          setDistanceTraveled(newDistanceTraveled);
          
          // Check checkpoints
          checkCheckpoints(lat, lng);
          
          // Midway SMS
          if (!midwaySentRef.current && totalDistance > 0) {
            const progress = (newDistanceTraveled / totalDistance) * 100;
            if (progress >= 45 && progress <= 55 && ride) {
              midwaySentRef.current = true;
              await sendSmsToParents(ride, 'midway');
            }
          }
        }
        
        lastLocationRef.current = [lat, lng];

        // Update directions every 100 meters
        if (endLocationRef.current && lastDirectionUpdateRef.current) {
          const distance = calculateDistance(
            lat, 
            lng, 
            lastDirectionUpdateRef.current[0], 
            lastDirectionUpdateRef.current[1]
          );
          
          if (distance > 100) {
            console.log(`Moved ${distance.toFixed(0)}m, updating directions...`);
            await fetchDirections(lat, lng, endLocationRef.current[0], endLocationRef.current[1], true);
            lastDirectionUpdateRef.current = [lat, lng];
            
            if (voiceGuidanceEnabled && directions.length > 0) {
              speakDirection(directions[0]);
            }
          }
          
          // Calculate next turn distance
          if (directions.length > 0) {
            setNextTurnDistance(Math.round(distance));
          }
        }

        // Publish location to Pusher
        if (!isOfflineMode) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      console.warn("No user token found");
      return;
    }

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rideId, lat, lng }),
    });

    setDataUsage((p) => p + 0.1);
  } catch (error) {
    console.error("Error publishing location:", error);
  }
}

        // Show GPS active notification every 20 updates
        if (updateCount % 20 === 0) {
          toast({
            title: "📡 GPS Active",
            description: `Location updated ${updateCount} times`,
          });
        }
      },
      (error) => {
        console.error("❌ GPS error:", error.code, error.message);
        toast({
          title: "GPS Error",
          description: `Error ${error.code}: ${error.message}`,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  const handleCompleteRide = async () => {
    if (!rideId || !ride) return;
    
    try {
      const { error } = await supabase.from("rides").update({ status: "completed" }).eq("id", rideId);
      if (error) throw error;
      
      await sendSmsToParents(ride, 'completed');
      localStorage.removeItem(`route_${rideId}`);
      
      // Show ride summary
      const duration = Math.round((Date.now() - rideStartTime) / 60000); // minutes
      toast({
        title: "🎉 Ride Completed!",
        description: `Duration: ${duration} min | Distance: ${(distanceTraveled / 1000).toFixed(1)} km | Avg Speed: ${averageSpeed} km/h`,
      });
      
      navigate("/my-rides");
    } catch (error) {
      console.error("Error completing ride:", error);
      toast({
        title: "Error",
        description: "Could not complete ride",
        variant: "destructive",
      });
    }
  };

  const handleSOS = async () => {
    if (!rideId || !ride || isSendingSOS) return;
    
    setIsSendingSOS(true);
    console.log("🚨 SOS button clicked - initiating emergency alert");
    
    try {
      const parentPhoneNumbers = ride.ride_requests
        .map((req: any) => req.passenger?.parent_phone_number)
        .filter(Boolean);

      if (parentPhoneNumbers.length === 0) {
        throw new Error("No parent phone numbers found");
      }

      const locationText = currentLocation 
        ? `https://www.google.com/maps?q=${currentLocation[0]},${currentLocation[1]}`
        : "Location unavailable";

      const driverName = ride.driver?.full_name || "Driver";

      for (const phoneNumber of parentPhoneNumbers) {
        const { data, error } = await supabase.functions.invoke("send-sos-sms", {
          body: {
            phoneNumber,
            driverName,
            location: locationText,
            rideId,
          },
        });

        if (error) throw error;
      }

      toast({
        title: "🚨 SOS Alert Sent",
        description: "Emergency notification sent to all parents",
      });
      
      if (voiceGuidanceEnabled) {
        speakDirection("Emergency SOS alert has been sent to all parents");
      }
    } catch (error: any) {
      console.error("Error sending SOS:", error);
      toast({
        title: "SOS Failed",
        description: error.message || "Could not send emergency alert",
        variant: "destructive",
      });
    } finally {
      setIsSendingSOS(false);
    }
  };

  // NEW FEATURE 6: Share Location
  const handleShareLocation = async () => {
    if (!currentLocation) return;
    
    const shareUrl = `https://www.google.com/maps?q=${currentLocation[0]},${currentLocation[1]}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Current Location',
          text: `I'm currently here during my ride`,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Location link copied to clipboard",
      });
    }
  };

  const progressPercentage = totalDistance > 0 ? Math.min((distanceTraveled / totalDistance) * 100, 100) : 0;
  const checkpointsReached = checkpoints.filter(c => c.reached).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading ride details...</p>
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-semibold mb-4">Ride not found</p>
            <Button onClick={() => navigate("/my-rides")}>
              Back to My Rides
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Enhanced Header with Status Indicators */}
      <header className="border-b bg-card shadow-sm flex-shrink-0 sticky top-0 z-50">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/my-rides")}>
                ← Back
              </Button>
              <h1 className="text-base sm:text-xl font-bold">🚗 Live Tracking</h1>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleShareLocation}
                className="hidden sm:flex"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant={voiceGuidanceEnabled ? "default" : "outline"}
                onClick={() => {
                  setVoiceGuidanceEnabled(!voiceGuidanceEnabled);
                  toast({
                    title: voiceGuidanceEnabled ? "🔇 Voice Off" : "🔊 Voice On",
                    description: voiceGuidanceEnabled ? "Voice guidance disabled" : "Voice guidance enabled",
                  });
                }}
              >
                {voiceGuidanceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleSOS}
                disabled={isSendingSOS}
                className="bg-red-600 hover:bg-red-700 animate-pulse"
              >
                {isSendingSOS ? "Sending..." : "🚨 SOS"}
              </Button>
              <Button size="sm" onClick={handleCompleteRide} className="bg-green-600 hover:bg-green-700">
                ✓ Complete
              </Button>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs flex-wrap">
            <Badge variant={isOfflineMode ? "destructive" : "default"} className="gap-1">
              <Smartphone className="h-3 w-3" />
              {isOfflineMode ? "Offline" : "Online"}
            </Badge>
            
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              {batteryLevel}%
            </Badge>
            
            <Badge variant="outline" className="gap-1">
              <Gauge className="h-3 w-3" />
              {currentSpeed} km/h
            </Badge>
            
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              ETA: {estimatedTimeRemaining} min
            </Badge>
            
            <Badge variant="outline" className="gap-1">
              <Target className="h-3 w-3" />
              {gpsAccuracy}m accuracy
            </Badge>
            
            {batteryLevel < 20 && (
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                Low Battery
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto px-2 sm:px-4 py-4 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Main Content */}
            <section className="lg:col-span-2 flex flex-col gap-4 min-h-0">
              {/* Progress Card */}
              <Card className="flex-shrink-0">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Journey Progress</span>
                      <span className="text-muted-foreground">
                        {(distanceTraveled / 1000).toFixed(1)} / {(totalDistance / 1000).toFixed(1)} km
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Checkpoints: {checkpointsReached}/{checkpoints.length}</span>
                      <span>Avg Speed: {averageSpeed} km/h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Chat Card */}
              <Card className="flex-shrink-0 h-[250px] lg:h-[300px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">💬 Ride Chat</CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 h-[calc(100%-4rem)]">
                  <RideChat rideId={rideId!} />
                </CardContent>
              </Card>

              {/* Map Card */}
              <Card className="flex-1 min-h-0">
                <CardContent className="p-0 h-full">
                  <div className="p-2 sm:p-3 border-b bg-muted/30 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 bg-green-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      GPS Active
                    </span>
                    {nextTurnDistance > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Navigation className="h-3 w-3" />
                        Next turn: {nextTurnDistance}m
                      </Badge>
                    )}
                  </div>
                  <div className="h-[calc(100%-3rem)]">
                    <EnhancedMap
                      start={[ride.start_lat, ride.start_lng]}
                      end={[ride.end_lat, ride.end_lng]}
                      pickupPoints={pickupPoints}
                      currentLocation={currentLocation}
                      showDirections={true}
                      height={400}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Turn-by-Turn Directions */}
              {directions.length > 0 && (
                <Card className="flex-shrink-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      🧭 Turn-by-Turn Navigation
                      {voiceGuidanceEnabled && (
                        <Badge variant="outline" className="text-xs">
                          <Volume2 className="h-3 w-3 mr-1" />
                          Voice On
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2 pr-4">
                        {directions.slice(0, 5).map((direction, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-start gap-2 p-3 rounded-lg transition-all ${
                              idx === 0 
                                ? 'bg-primary text-primary-foreground font-semibold shadow-lg' 
                                : 'bg-muted/50'
                            }`}
                          >
                            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              idx === 0 
                                ? 'bg-primary-foreground text-primary' 
                                : 'bg-primary text-primary-foreground'
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm">{direction}</p>
                              {idx === 0 && nextTurnDistance > 0 && (
                                <p className="text-xs mt-1 opacity-80">
                                  In {nextTurnDistance} meters
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {directions.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center pt-2">
                            + {directions.length - 5} more steps
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Sidebar */}
            <aside className="space-y-4 overflow-y-auto">
              {/* Ride Details Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">📍 Ride Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">From</p>
                    <p className="font-medium text-xs sm:text-sm">{ride.start_address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">To</p>
                    <p className="font-medium text-xs sm:text-sm">{ride.end_address}</p>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground mb-1">Distance</p>
                        <p className="font-semibold">{(distanceTraveled / 1000).toFixed(1)} km</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Duration</p>
                        <p className="font-semibold">
                          {Math.round((Date.now() - rideStartTime) / 60000)} min
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Avg Speed</p>
                        <p className="font-semibold">{averageSpeed} km/h</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">ETA</p>
                        <p className="font-semibold">{estimatedTimeRemaining} min</p>
                      </div>
                    </div>
                  </div>
                  {currentLocation && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Current GPS</p>
                      <p className="text-xs font-mono break-all">
                        {currentLocation[0].toFixed(6)}, {currentLocation[1].toFixed(6)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Accuracy: ±{gpsAccuracy}m
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Checkpoints Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                    <span>🎯 Checkpoints</span>
                    <Badge variant="outline">{checkpointsReached}/{checkpoints.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {checkpoints.map((checkpoint, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                          checkpoint.reached 
                            ? 'bg-success/10 border border-success/20' 
                            : 'bg-muted/30'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          checkpoint.reached 
                            ? 'bg-success text-success-foreground' 
                            : 'bg-muted-foreground/20'
                        }`}>
                          {checkpoint.reached ? '✓' : idx + 1}
                        </div>
                        <span className={`text-sm flex-1 ${
                          checkpoint.reached ? 'font-medium' : 'text-muted-foreground'
                        }`}>
                          {checkpoint.name}
                        </span>
                        {checkpoint.reached && (
                          <span className="text-xs text-success">Done</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* System Status Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">⚙️ System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className={`h-4 w-4 ${batteryLevel < 20 ? 'text-destructive' : 'text-success'}`} />
                        <span className="text-sm">Battery</span>
                      </div>
                      <Badge variant={batteryLevel < 20 ? "destructive" : "outline"}>
                        {batteryLevel}%
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className={`h-4 w-4 ${isOfflineMode ? 'text-destructive' : 'text-success'}`} />
                        <span className="text-sm">Network</span>
                      </div>
                      <Badge variant={isOfflineMode ? "destructive" : "outline"}>
                        {isOfflineMode ? 'Offline' : 'Online'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-sm">GPS Accuracy</span>
                      </div>
                      <Badge variant="outline">±{gpsAccuracy}m</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-primary" />
                        <span className="text-sm">Data Usage</span>
                      </div>
                      <Badge variant="outline">{dataUsage.toFixed(1)} MB</Badge>
                    </div>

                    {routeCached && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                          Offline route data available
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Map Legend Card */}
              <Card className="hidden lg:block">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">🚦 Map Legend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🟢</span>
                      <span>Start Point</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🔴</span>
                      <span>Destination</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🔵</span>
                      <span>Pickup Points</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🚗</span>
                      <span>Your Position</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-0.5 bg-teal-500 rounded"></div>
                      <span>Route Path</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Safety Tips Card */}
              <Card className="hidden lg:block">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">🛡️ Safety Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Follow all traffic rules and speed limits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Verify passenger identity with OTP before pickup</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Keep your phone charged and accessible</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Use SOS button only in emergencies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Complete ride only after all passengers dropped</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Stay focused on driving, not the app</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">⚡ Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={handleShareLocation}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share My Location
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => {
                      if (directions.length > 0 && voiceGuidanceEnabled) {
                        speakDirection(directions[0]);
                      }
                    }}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Repeat Direction
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => {
                      const message = `I'm on my way! Current location: https://www.google.com/maps?q=${currentLocation?.[0]},${currentLocation?.[1]}`;
                      navigator.clipboard.writeText(message);
                      toast({
                        title: "Copied!",
                        description: "Message copied to clipboard",
                      });
                    }}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Copy Status Message
                  </Button>
                </CardContent>
              </Card>

              {/* Traffic Warnings (if any) */}
              {trafficWarnings.length > 0 && (
                <Card className="border-warning">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-warning">
                      <AlertTriangle className="h-5 w-5" />
                      Traffic Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {trafficWarnings.map((warning, idx) => (
                        <div key={idx} className="p-2 bg-warning/10 rounded-lg text-sm">
                          {warning}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* Floating Speed Indicator (Mobile) */}
      <div className="fixed bottom-4 right-4 lg:hidden z-40">
        <div className="bg-card border-2 border-primary shadow-lg rounded-full p-4 text-center">
          <div className="text-2xl font-bold text-primary">{currentSpeed}</div>
          <div className="text-xs text-muted-foreground">km/h</div>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;