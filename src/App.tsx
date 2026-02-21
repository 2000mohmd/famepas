import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVenues from "./pages/admin/AdminVenues";
import AdminInfluencers from "./pages/admin/AdminInfluencers";
import AdminOffers from "./pages/admin/AdminOffers";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminLocations from "./pages/admin/AdminLocations";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminModeration from "./pages/admin/AdminModeration";
import VenueDashboard from "./pages/venue/VenueDashboard";
import VenueOffers from "./pages/venue/VenueOffers";
import VenueDiscover from "./pages/venue/VenueDiscover";
import VenueInvitations from "./pages/venue/VenueInvitations";
import VenueBookings from "./pages/venue/VenueBookings";
import VenueRedemptions from "./pages/venue/VenueRedemptions";
import VenueMessages from "./pages/venue/VenueMessages";
import VenueEvents from "./pages/venue/VenueEvents";
import VenueAnalytics from "./pages/venue/VenueAnalytics";
import VenueSettings from "./pages/venue/VenueSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/venues" element={<ProtectedRoute allowedRoles={["admin"]}><AdminVenues /></ProtectedRoute>} />
            <Route path="/admin/influencers" element={<ProtectedRoute allowedRoles={["admin"]}><AdminInfluencers /></ProtectedRoute>} />
            <Route path="/admin/offers" element={<ProtectedRoute allowedRoles={["admin"]}><AdminOffers /></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEvents /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={["admin"]}><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCategories /></ProtectedRoute>} />
            <Route path="/admin/locations" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLocations /></ProtectedRoute>} />
            <Route path="/admin/billing" element={<ProtectedRoute allowedRoles={["admin"]}><AdminBilling /></ProtectedRoute>} />
            <Route path="/admin/moderation" element={<ProtectedRoute allowedRoles={["admin"]}><AdminModeration /></ProtectedRoute>} />

            {/* Venue Routes */}
            <Route path="/venue" element={<ProtectedRoute allowedRoles={["venue"]}><VenueDashboard /></ProtectedRoute>} />
            <Route path="/venue/offers" element={<ProtectedRoute allowedRoles={["venue"]}><VenueOffers /></ProtectedRoute>} />
            <Route path="/venue/discover" element={<ProtectedRoute allowedRoles={["venue"]}><VenueDiscover /></ProtectedRoute>} />
            <Route path="/venue/invitations" element={<ProtectedRoute allowedRoles={["venue"]}><VenueInvitations /></ProtectedRoute>} />
            <Route path="/venue/bookings" element={<ProtectedRoute allowedRoles={["venue"]}><VenueBookings /></ProtectedRoute>} />
            <Route path="/venue/redemptions" element={<ProtectedRoute allowedRoles={["venue"]}><VenueRedemptions /></ProtectedRoute>} />
            <Route path="/venue/messages" element={<ProtectedRoute allowedRoles={["venue"]}><VenueMessages /></ProtectedRoute>} />
            <Route path="/venue/events" element={<ProtectedRoute allowedRoles={["venue"]}><VenueEvents /></ProtectedRoute>} />
            <Route path="/venue/analytics" element={<ProtectedRoute allowedRoles={["venue"]}><VenueAnalytics /></ProtectedRoute>} />
            <Route path="/venue/settings" element={<ProtectedRoute allowedRoles={["venue"]}><VenueSettings /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
