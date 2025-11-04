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
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";

const BecomeDriver = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [driverDetails, setDriverDetails] = useState<any>(null);
  const [formData, setFormData] = useState({
    license_number: "",
    license_photo_url: "",
    parent_phone_number: "",
    confirmation_letter_url: "",
    vehicle_model: "",
    vehicle_number: "",
    vehicle_type: "four_wheeler" as "two_wheeler" | "four_wheeler",
  });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    setProfile(profileData);

    // Check if already applied
    const { data: driverData } = await supabase
      .from("driver_details")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    setDriverDetails(driverData);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Validate required fields
    if (
      !formData.license_number ||
      !formData.license_photo_url ||
      !formData.parent_phone_number ||
      !formData.confirmation_letter_url
    ) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and upload all documents",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Insert driver details
    const { error: driverError } = await supabase
      .from("driver_details")
      .insert({
        user_id: session.user.id,
        ...formData,
      });

    if (driverError) {
      toast({
        title: "Error",
        description: driverError.message,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Update profile to mark as driver
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ is_driver: true })
      .eq("id", session.user.id);

    if (profileError) {
      toast({
        title: "Error",
        description: profileError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Application submitted!",
        description: "Your driver application is pending admin approval.",
      });
      navigate("/dashboard");
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (driverDetails) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Driver Application</h1>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Application Submitted</CardTitle>
                  <CardDescription>
                    Status: {driverDetails.approval_status}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your driver application has been submitted and is being reviewed by our admin team.
                You'll receive an email notification once your application is processed.
              </p>
              <div className="mt-4">
                <Button onClick={() => navigate("/dashboard")}>
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
          <h1 className="text-2xl font-bold">Become a Driver</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Driver Application</CardTitle>
            <CardDescription>
              Complete the form below to apply as a verified driver
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="license_number">Driving License Number *</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) =>
                    setFormData({ ...formData, license_number: e.target.value })
                  }
                  required
                />
              </div>

              <FileUpload
                bucket="driver-documents"
                path={profile?.id || ""}
                accept="image/*,.pdf"
                label="Upload License Photo *"
                currentFile={formData.license_photo_url}
                onUploadComplete={(url) =>
                  setFormData({ ...formData, license_photo_url: url })
                }
              />

              <div className="space-y-2">
                <Label htmlFor="parent_phone">Parent's Phone Number *</Label>
                <Input
                  id="parent_phone"
                  type="tel"
                  value={formData.parent_phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, parent_phone_number: e.target.value })
                  }
                  required
                />
              </div>

              <FileUpload
                bucket="driver-documents"
                path={profile?.id || ""}
                accept="image/*,.pdf"
                label="Upload Confirmation Letter *"
                currentFile={formData.confirmation_letter_url}
                onUploadComplete={(url) =>
                  setFormData({ ...formData, confirmation_letter_url: url })
                }
              />

              <div className="space-y-2">
                <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(value: "two_wheeler" | "four_wheeler") =>
                    setFormData({ ...formData, vehicle_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="two_wheeler">2-Wheeler (Bike/Scooter)</SelectItem>
                    <SelectItem value="four_wheeler">4-Wheeler (Car)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_model">Vehicle Model (Optional)</Label>
                <Input
                  id="vehicle_model"
                  value={formData.vehicle_model}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_model: e.target.value })
                  }
                  placeholder="e.g., Toyota Corolla 2020"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_number">Vehicle Number (Optional)</Label>
                <Input
                  id="vehicle_number"
                  value={formData.vehicle_number}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_number: e.target.value })
                  }
                  placeholder="e.g., ABC-1234"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BecomeDriver;
