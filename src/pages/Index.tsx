import { Button } from "@/components/ui/button";
import { Car, Shield, Users, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
              RideMate Campus
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Share rides safely with verified campus students and staff. Save money, reduce carbon, build community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg shadow-lg-primary"
                onClick={() => navigate("/auth")}
              >
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Why Choose RideMate?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Shield className="w-10 h-10" />}
              title="Verified Profiles"
              description="All users verified with college email and admin approval. Drivers undergo additional verification."
            />
            <FeatureCard
              icon={<Users className="w-10 h-10" />}
              title="Smart Matching"
              description="Advanced algorithm matches you with compatible riders based on preferences and route proximity."
            />
            <FeatureCard
              icon={<Car className="w-10 h-10" />}
              title="Real-time Tracking"
              description="Live route visualization and location updates for peace of mind throughout your journey."
            />
            <FeatureCard
              icon={<Leaf className="w-10 h-10" />}
              title="Eco Impact"
              description="Track your environmental contribution with personalized carbon reduction and fuel savings dashboard."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center bg-card rounded-2xl p-12 shadow-lg-primary">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Start Sharing Rides?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join your campus community in making transportation smarter, safer, and more sustainable.
            </p>
            <Button 
              size="lg" 
              className="text-lg shadow-lg-primary"
              onClick={() => navigate("/auth")}
            >
              Sign Up Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) => {
  return (
    <div className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg-primary transition-all duration-300">
      <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center text-primary-foreground mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;
