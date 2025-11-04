import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditCard, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RidePaymentProps {
  rideRequestId: string;
  distanceKm: number;
  onPaymentComplete?: () => void;
}

const RATE_PER_KM = 8; // 8 rupees per km

export const RidePayment = ({ rideRequestId, distanceKm, onPaymentComplete }: RidePaymentProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fareAmount = Math.round(distanceKm * RATE_PER_KM);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // For now, just show the payment UI without actual payment
      toast({
        title: "Payment UI",
        description: `This would charge ₹${fareAmount} for ${distanceKm.toFixed(2)}km ride`,
      });

      // Update payment status to 'pending' in database
      const { error } = await supabase
        .from("ride_requests")
        .update({ 
          fare_amount: fareAmount,
          payment_status: 'pending'
        })
        .eq("id", rideRequestId);

      if (error) throw error;

      onPaymentComplete?.();
      
      // Uncomment below to enable actual Stripe payment
      /*
      const { data, error } = await supabase.functions.invoke("create-ride-payment", {
        body: { rideRequestId, fareAmount },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      */
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Distance</span>
          </div>
          <span className="text-sm font-bold">{distanceKm.toFixed(2)} km</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Fare (₹{RATE_PER_KM}/km)</span>
          </div>
          <span className="text-2xl font-bold text-primary">₹{fareAmount}</span>
        </div>

        <Button 
          onClick={handlePayment} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? "Processing..." : "Proceed to Payment"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Payment is currently in demo mode
        </p>
      </div>
    </Card>
  );
};
