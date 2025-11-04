import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/FileUpload";
import { Loader2, ArrowLeft, MapPin } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState<{
    full_name: string;
    phone_number: string;
    gender: "male" | "female" | "other" | "prefer_not_to_say" | "";
    photo_url: string;
    primary_location_address: string;
    primary_location_lat: number | null;
    primary_location_lng: number | null;
    user_type: "student" | "faculty";
    current_year: number | null;
  }>({
    full_name: "",
    phone_number: "",
    gender: "",
    photo_url: "",
    primary_location_address: "",
    primary_location_lat: null,
    primary_location_lng: null,
    user_type: "student",
    current_year: null,
  });
  
  const [ridePreferences, setRidePreferences] = useState({
    accept_opposite_gender: true,
    accept_seniors: true,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else if (data) {
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        phone_number: data.phone_number || "",
        gender: data.gender || "",
        photo_url: data.photo_url || "",
        primary_location_address: data.primary_location_address || "",
        primary_location_lat: data.primary_location_lat,
        primary_location_lng: data.primary_location_lng,
        user_type: data.user_type || "student",
        current_year: data.current_year,
      });
    }

    // Fetch ride preferences
    const { data: prefData } = await supabase
      .from("ride_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (prefData) {
      setRidePreferences({
        accept_opposite_gender: prefData.accept_opposite_gender,
        accept_seniors: prefData.accept_seniors,
      });
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Build update object with proper typing
    const updateData: {
      full_name: string;
      phone_number: string;
      gender?: "male" | "female" | "other" | "prefer_not_to_say";
      photo_url: string;
      primary_location_address: string;
      primary_location_lat: number | null;
      primary_location_lng: number | null;
      user_type: "student" | "faculty";
      current_year: number | null;
    } = {
      full_name: formData.full_name,
      phone_number: formData.phone_number,
      photo_url: formData.photo_url,
      primary_location_address: formData.primary_location_address,
      primary_location_lat: formData.primary_location_lat,
      primary_location_lng: formData.primary_location_lng,
      user_type: formData.user_type,
      current_year: formData.current_year,
    };

    // Only add gender if it's set
    if (formData.gender) {
      updateData.gender = formData.gender;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", session.user.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    // Update ride preferences
    const { error: prefError } = await supabase
      .from("ride_preferences")
      .upsert({
        user_id: session.user.id,
        accept_opposite_gender: ridePreferences.accept_opposite_gender,
        accept_seniors: ridePreferences.accept_seniors,
      });

    if (prefError) {
      toast({
        title: "Error updating preferences",
        description: prefError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: "Profile updated successfully.",
      });
      fetchProfile();
    }
    setSaving(false);
  };

  const geocodeAddress = async () => {
    if (!formData.primary_location_address) {
      toast({
        title: "Error",
        description: "Please enter an address first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          formData.primary_location_address
        )}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setFormData({
          ...formData,
          primary_location_lat: parseFloat(data[0].lat),
          primary_location_lng: parseFloat(data[0].lon),
        });
        toast({
          title: "Location found!",
          description: "Coordinates set successfully.",
        });
      } else {
        toast({
          title: "Not found",
          description: "Could not find coordinates for this address",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to geocode address",
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
          <h1 className="text-2xl font-bold">My Profile</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your profile details and primary location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FileUpload
              bucket="profile-photos"
              path={profile?.id || ""}
              accept="image/*"
              label="Profile Photo"
              currentFile={formData.photo_url}
              onUploadComplete={(url) =>
                setFormData({ ...formData, photo_url: url })
              }
            />

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, gender: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">
                    Prefer not to say
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_type">I am a</Label>
              <Select
                value={formData.user_type}
                onValueChange={(value: "student" | "faculty") =>
                  setFormData({ ...formData, user_type: value, current_year: value === "faculty" ? null : formData.current_year })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.user_type === "student" && (
              <div className="space-y-2">
                <Label htmlFor="current_year">Current Year</Label>
                <Select
                  value={formData.current_year?.toString() || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, current_year: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="address">Primary Location Address</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  value={formData.primary_location_address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primary_location_address: e.target.value,
                    })
                  }
                  placeholder="Enter your primary location"
                />
                <Button
                  variant="outline"
                  onClick={geocodeAddress}
                  size="icon"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              {formData.primary_location_lat && formData.primary_location_lng && (
                <p className="text-sm text-muted-foreground">
                  Coordinates: {formData.primary_location_lat.toFixed(6)},{" "}
                  {formData.primary_location_lng.toFixed(6)}
                </p>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Ride Matching Preferences</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="opposite_gender" className="cursor-pointer">
                    Accept rides with opposite gender
                  </Label>
                  <input
                    id="opposite_gender"
                    type="checkbox"
                    checked={ridePreferences.accept_opposite_gender}
                    onChange={(e) =>
                      setRidePreferences({
                        ...ridePreferences,
                        accept_opposite_gender: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="seniors" className="cursor-pointer">
                    Accept rides with seniors (3rd & 4th year)
                  </Label>
                  <input
                    id="seniors"
                    type="checkbox"
                    checked={ridePreferences.accept_seniors}
                    onChange={(e) =>
                      setRidePreferences({
                        ...ridePreferences,
                        accept_seniors: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>

        {profile?.is_driver && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Driver Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You are registered as a driver. 
                {profile.approval_status === "approved"
                  ? " You can now create rides!"
                  : " Your driver application is pending approval."}
              </p>
            </CardContent>
          </Card>
        )}

        {!profile?.is_driver && (
          <Card className="mt-6 border-primary/50">
            <CardHeader>
              <CardTitle>Want to become a driver?</CardTitle>
              <CardDescription>
                Share rides with students and staff on your route
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/become-driver")}
                variant="default"
              >
                Apply to Become a Driver
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Profile;
