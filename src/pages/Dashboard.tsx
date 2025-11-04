import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Car, Users, Leaf, MapPin, LogOut } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate("/auth");
        } else {
          setUser(session.user);
          fetchProfile(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    await fetchProfile(session.user.id);
    setLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }

    setProfile(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            RideMate Campus
          </h1>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Profile Status Alert */}
        {profile?.approval_status === "pending" && (
          <Card className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-amber-700 dark:text-amber-400">
                Profile Pending Approval
              </CardTitle>
              <CardDescription className="text-amber-600 dark:text-amber-500">
                Your account is being reviewed by our admin team. You'll receive an email once approved.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {profile?.approval_status === "rejected" && (
          <Card className="mb-6 border-destructive bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive">
                Profile Rejected
              </CardTitle>
              <CardDescription className="text-destructive/80">
                Unfortunately, your profile was not approved. Please contact support for more information.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.full_name || "User"}!
          </h2>
          <p className="text-muted-foreground">
            {profile?.is_driver ? "Ready to offer rides?" : "Looking for a ride?"}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-lg-primary transition-all"
            onClick={() => navigate("/find-rides")}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center text-primary-foreground mb-2">
                <Car className="w-6 h-6" />
              </div>
              <CardTitle>Find a Ride</CardTitle>
              <CardDescription>
                Browse available rides to your destination
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg-primary transition-all"
            onClick={() => navigate("/passenger-rides")}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center text-secondary-foreground mb-2">
                <Users className="w-6 h-6" />
              </div>
              <CardTitle>My Ride Requests</CardTitle>
              <CardDescription>
                View your requested rides and OTPs
              </CardDescription>
            </CardHeader>
          </Card>

          {profile?.is_driver && profile?.approval_status === "approved" && (
            <Card 
              className="cursor-pointer hover:shadow-lg-primary transition-all"
              onClick={() => navigate("/my-rides")}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center text-secondary-foreground mb-2">
                  <MapPin className="w-6 h-6" />
                </div>
                <CardTitle>My Rides</CardTitle>
                <CardDescription>
                  Manage your created rides and requests
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {profile?.is_driver && profile?.approval_status === "approved" && (
            <Card 
              className="cursor-pointer hover:shadow-lg-primary transition-all"
              onClick={() => navigate("/create-ride")}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center text-secondary-foreground mb-2">
                  <Car className="w-6 h-6" />
                </div>
                <CardTitle>Create a Ride</CardTitle>
                <CardDescription>
                  Offer a ride to fellow students
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card 
            className="cursor-pointer hover:shadow-lg-primary transition-all"
            onClick={() => navigate("/profile")}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center text-secondary-foreground mb-2">
                <Users className="w-6 h-6" />
              </div>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>
                Update your info and preferences
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg-primary transition-all"
            onClick={() => navigate("/eco-impact")}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-eco rounded-lg flex items-center justify-center text-success-foreground mb-2">
                <Leaf className="w-6 h-6" />
              </div>
              <CardTitle>Eco Impact</CardTitle>
              <CardDescription>
                View your environmental contribution
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Activity or Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Complete your profile to start sharing rides
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Set Your Primary Location</p>
                <p className="text-sm text-muted-foreground">
                  Add your home or campus location for better ride matching
                </p>
                <Button 
                  variant="link" 
                  className="p-0 h-auto mt-1"
                  onClick={() => navigate("/profile")}
                >
                  Go to Profile →
                </Button>
              </div>
            </div>

            {!profile?.is_driver && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Car className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <p className="font-medium">Become a Driver</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your license and verification documents to offer rides
                  </p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto mt-1"
                    onClick={() => navigate("/become-driver")}
                  >
                    Start Application →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
