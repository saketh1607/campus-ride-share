import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingProfiles, setPendingProfiles] = useState<any[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast({
        title: "Access Denied",
        description: "You don't have admin permissions",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    await fetchPendingApprovals();
    setLoading(false);
  };

  const fetchPendingApprovals = async () => {
    // Fetch pending profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });

    setPendingProfiles(profiles || []);

    // Fetch pending driver applications
    const { data: drivers } = await supabase
      .from("driver_details")
      .select(`
        *,
        profile:profiles(full_name, email)
      `)
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });

    setPendingDrivers(drivers || []);
  };

  const handleProfileApproval = async (profileId: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: status })
      .eq("id", profileId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Profile ${status}`,
      });
      fetchPendingApprovals();
    }
  };

  const handleDriverApproval = async (driverId: string, userId: string, status: "approved" | "rejected") => {
    const { error: driverError } = await supabase
      .from("driver_details")
      .update({ approval_status: status })
      .eq("id", driverId);

    if (driverError) {
      toast({
        title: "Error",
        description: driverError.message,
        variant: "destructive",
      });
      return;
    }

    // If approved, also approve the profile
    if (status === "approved") {
      await supabase
        .from("profiles")
        .update({ approval_status: "approved" })
        .eq("id", userId);
    }

    toast({
      title: "Success",
      description: `Driver application ${status}`,
    });
    fetchPendingApprovals();
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
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="profiles" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profiles">
              User Profiles ({pendingProfiles.length})
            </TabsTrigger>
            <TabsTrigger value="drivers">
              Driver Applications ({pendingDrivers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profiles" className="space-y-4 mt-6">
            {pendingProfiles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <p className="text-lg font-semibold">All caught up!</p>
                  <p className="text-muted-foreground">No pending profile approvals</p>
                </CardContent>
              </Card>
            ) : (
              pendingProfiles.map((profile) => (
                <Card key={profile.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{profile.full_name}</CardTitle>
                        <CardDescription>{profile.email}</CardDescription>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {profile.phone_number && (
                        <p className="text-sm">
                          <span className="font-medium">Phone:</span> {profile.phone_number}
                        </p>
                      )}
                      {profile.gender && (
                        <p className="text-sm">
                          <span className="font-medium">Gender:</span> {profile.gender}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Registered: {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleProfileApproval(profile.id, "approved")}
                        className="flex-1"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleProfileApproval(profile.id, "rejected")}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="drivers" className="space-y-4 mt-6">
            {pendingDrivers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <p className="text-lg font-semibold">All caught up!</p>
                  <p className="text-muted-foreground">No pending driver applications</p>
                </CardContent>
              </Card>
            ) : (
              pendingDrivers.map((driver) => (
                <Card key={driver.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{driver.profile?.full_name}</CardTitle>
                        <CardDescription>{driver.profile?.email}</CardDescription>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm">
                        <span className="font-medium">License Number:</span> {driver.license_number}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Parent's Phone:</span> {driver.parent_phone_number}
                      </p>
                      {driver.vehicle_model && (
                        <p className="text-sm">
                          <span className="font-medium">Vehicle:</span> {driver.vehicle_model}
                          {driver.vehicle_number && ` (${driver.vehicle_number})`}
                        </p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <a
                          href={driver.license_photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View License Photo →
                        </a>
                        <a
                          href={driver.confirmation_letter_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View Confirmation Letter →
                        </a>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDriverApproval(driver.id, driver.user_id, "approved")}
                        className="flex-1"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleDriverApproval(driver.id, driver.user_id, "rejected")}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
