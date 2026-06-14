import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GoogleMapsProvider } from "@/contexts/GoogleMapsContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import VenueSignup from "./pages/VenueSignup";
import InfluencerSignup from "./pages/InfluencerSignup";
import Welcome from "./pages/Welcome";
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
import AdminUsers from "./pages/admin/AdminUsers";
import AdminChatbot from "./pages/admin/AdminChatbot";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminRedemptions from "./pages/admin/AdminRedemptions";
import EventAttendeesPage from "./pages/EventAttendeesPage";
import VenueDashboard from "./pages/venue/VenueDashboard";
import VenueOffers from "./pages/venue/VenueOffers";
import VenueBriefs from "./pages/venue/VenueBriefs";
import VenueBriefCreate from "./pages/venue/VenueBriefCreate";
import VenueDiscover from "./pages/venue/VenueDiscover";
import VenueInvitations from "./pages/venue/VenueInvitations";
import VenueBookings from "./pages/venue/VenueBookings";
import VenueRedemptions from "./pages/venue/VenueRedemptions";
import VenueReports from "./pages/venue/VenueReports";
import VenueContent from "./pages/venue/VenueContent";
import VenueCampaigns from "./pages/venue/VenueCampaigns";
import VenueCampaignCreate from "./pages/venue/VenueCampaignCreate";
import VenueLocations from "./pages/venue/VenueLocations";
import AdminCulturalEvents from "./pages/admin/AdminCulturalEvents";

import VenueEvents from "./pages/venue/VenueEvents";
import VenueAnalytics from "./pages/venue/VenueAnalytics";
import VenueSettings from "./pages/venue/VenueSettings";
import InfluencerDashboard from "./pages/influencer/InfluencerDashboard";
import InfluencerExplore from "./pages/influencer/InfluencerExplore";
import InfluencerInvitations from "./pages/influencer/InfluencerInvitations";
import InfluencerBookings from "./pages/influencer/InfluencerBookings";

import InfluencerEarnings from "./pages/influencer/InfluencerEarnings";
import InfluencerProfile from "./pages/influencer/InfluencerProfile";
import InfluencerReviews from "./pages/influencer/InfluencerReviews";
import InfluencerRewards from "./pages/influencer/InfluencerRewards";
import InfluencerSettings from "./pages/influencer/InfluencerSettings";
import InfluencerHome from "./pages/influencer/InfluencerHome";
import VenuesPage from "./pages/public/VenuesPage";
import OffersPage from "./pages/public/OffersPage";
import CategoriesPage from "./pages/public/CategoriesPage";
import InfluencersPage from "./pages/public/InfluencersPage";
import AboutPage from "./pages/public/AboutPage";
import ContactPage from "./pages/public/ContactPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <GoogleMapsProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/venues" element={<VenuesPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/influencers" element={<InfluencersPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/signup" element={<Welcome />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/signup/business" element={<VenueSignup />} />
            <Route path="/signup/influencer" element={<InfluencerSignup />} />
            <Route path="/signup/creator" element={<Navigate to="/signup/influencer" replace />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/venues" element={<ProtectedRoute allowedRoles={["admin"]}><AdminVenues /></ProtectedRoute>} />
            <Route path="/admin/influencers" element={<ProtectedRoute allowedRoles={["admin"]}><AdminInfluencers /></ProtectedRoute>} />
            <Route path="/admin/offers" element={<ProtectedRoute allowedRoles={["admin"]}><AdminOffers /></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEvents /></ProtectedRoute>} />
            <Route path="/admin/redemptions" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRedemptions /></ProtectedRoute>} />
            <Route path="/admin/event-attendees" element={<ProtectedRoute allowedRoles={["admin"]}><EventAttendeesPage type="admin" /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={["admin"]}><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCategories /></ProtectedRoute>} />
            <Route path="/admin/locations" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLocations /></ProtectedRoute>} />
            <Route path="/admin/billing" element={<ProtectedRoute allowedRoles={["admin"]}><AdminBilling /></ProtectedRoute>} />
            <Route path="/admin/moderation" element={<ProtectedRoute allowedRoles={["admin"]}><AdminModeration /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/chatbot" element={<ProtectedRoute allowedRoles={["admin"]}><AdminChatbot /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/cultural-events" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCulturalEvents /></ProtectedRoute>} />

            {/* Venue Routes */}
            <Route path="/venue" element={<ProtectedRoute allowedRoles={["venue"]}><VenueReports /></ProtectedRoute>} />
            <Route path="/venue/dashboard" element={<ProtectedRoute allowedRoles={["venue"]}><VenueDashboard /></ProtectedRoute>} />
            <Route path="/venue/content" element={<ProtectedRoute allowedRoles={["venue"]}><VenueContent /></ProtectedRoute>} />
            <Route path="/venue/campaigns" element={<ProtectedRoute allowedRoles={["venue"]}><VenueCampaigns /></ProtectedRoute>} />
            <Route path="/venue/campaigns/new" element={<ProtectedRoute allowedRoles={["venue"]}><VenueCampaignCreate /></ProtectedRoute>} />
            <Route path="/venue/campaigns/:id/edit" element={<ProtectedRoute allowedRoles={["venue"]}><VenueCampaignCreate /></ProtectedRoute>} />
            <Route path="/venue/locations" element={<ProtectedRoute allowedRoles={["venue"]}><VenueLocations /></ProtectedRoute>} />
            <Route path="/venue/offers" element={<ProtectedRoute allowedRoles={["venue"]}><VenueOffers /></ProtectedRoute>} />
            <Route path="/venue/briefs" element={<ProtectedRoute allowedRoles={["venue"]}><VenueBriefs /></ProtectedRoute>} />
            <Route path="/venue/discover" element={<ProtectedRoute allowedRoles={["venue"]}><VenueDiscover /></ProtectedRoute>} />
            <Route path="/venue/invitations" element={<ProtectedRoute allowedRoles={["venue"]}><VenueInvitations /></ProtectedRoute>} />
            <Route path="/venue/bookings" element={<ProtectedRoute allowedRoles={["venue"]}><VenueBookings /></ProtectedRoute>} />
            <Route path="/venue/redemptions" element={<ProtectedRoute allowedRoles={["venue"]}><VenueRedemptions /></ProtectedRoute>} />
            
            <Route path="/venue/events" element={<ProtectedRoute allowedRoles={["venue"]}><VenueEvents /></ProtectedRoute>} />
            <Route path="/venue/event-attendees" element={<ProtectedRoute allowedRoles={["venue"]}><EventAttendeesPage type="venue" /></ProtectedRoute>} />
            <Route path="/venue/analytics" element={<ProtectedRoute allowedRoles={["venue"]}><VenueAnalytics /></ProtectedRoute>} />
            <Route path="/venue/settings" element={<ProtectedRoute allowedRoles={["venue"]}><VenueSettings /></ProtectedRoute>} />

            {/* Influencer Routes */}
            <Route path="/influencer" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerDashboard /></ProtectedRoute>} />
            <Route path="/influencer/home" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerHome /></ProtectedRoute>} />
            <Route path="/influencer/explore" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerExplore /></ProtectedRoute>} />
            <Route path="/influencer/invitations" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerInvitations /></ProtectedRoute>} />
            <Route path="/influencer/bookings" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerBookings /></ProtectedRoute>} />
            
            <Route path="/influencer/earnings" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerEarnings /></ProtectedRoute>} />
            <Route path="/influencer/profile" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerProfile /></ProtectedRoute>} />
            <Route path="/influencer/reviews" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerReviews /></ProtectedRoute>} />
            <Route path="/influencer/rewards" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerRewards /></ProtectedRoute>} />
            <Route path="/influencer/settings" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerSettings /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </GoogleMapsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
