

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import RideDemo from "./pages/RideDemo";
import Profile from "./pages/Profile";
import BecomeDriver from "./pages/BecomeDriver";
import FindRides from "./pages/FindRides";
import CreateRide from "./pages/CreateRide";
import AdminDashboard from "./pages/AdminDashboard";
import EcoImpact from "./pages/EcoImpact";
import NotFound from "./pages/NotFound";
import MyRides from "./pages/MyRides";
import LiveTracking from "./pages/LiveTracking";
import PassengerRides from "./pages/PassengerRides";
import ParentTracking from "./pages/ParentTracking";
import "./App.css";
const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/become-driver" element={<BecomeDriver />} />
          <Route path="/find-rides" element={<FindRides />} />
          <Route path="/create-ride" element={<CreateRide />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/eco-impact" element={<EcoImpact />} />
          <Route path="/ride-demo" element={<RideDemo />} />
          <Route path="/my-rides" element={<MyRides />} />
          <Route path="/passenger-rides" element={<PassengerRides />} />
          <Route path="/live-tracking/:rideId" element={<LiveTracking />} />
          <Route path="/parent-tracking/:rideId" element={<ParentTracking />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
