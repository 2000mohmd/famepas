import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GoogleMapsProvider } from "@/contexts/GoogleMapsContext";
import ProtectedRoute from "@/components/ProtectedRoute";
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const VenueSignup = lazy(() => import("./pages/VenueSignup"));
const InfluencerSignup = lazy(() => import("./pages/InfluencerSignup"));
const Welcome = lazy(() => import("./pages/Welcome"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminVenues = lazy(() => import("./pages/admin/AdminVenues"));
const AdminInfluencers = lazy(() => import("./pages/admin/AdminInfluencers"));
const AdminOffers = lazy(() => import("./pages/admin/AdminOffers"));
const AdminEvents = lazy(() => import("./pages/admin/AdminEvents"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminAnalyticsDeep = lazy(() => import("./pages/admin/AdminAnalyticsDeep"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminLocations = lazy(() => import("./pages/admin/AdminLocations"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const AdminModeration = lazy(() => import("./pages/admin/AdminModeration"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminChatbot = lazy(() => import("./pages/admin/AdminChatbot"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminRedemptions = lazy(() => import("./pages/admin/AdminRedemptions"));
const EventAttendeesPage = lazy(() => import("./pages/EventAttendeesPage"));
const VenueBriefs = lazy(() => import("./pages/venue/VenueBriefs"));
const VenueBriefCreate = lazy(() => import("./pages/venue/VenueBriefCreate"));
const VenueBookings = lazy(() => import("./pages/venue/VenueBookings"));
const VenueReports = lazy(() => import("./pages/venue/VenueReports"));
const VenueContent = lazy(() => import("./pages/venue/VenueContent"));
const VenueCampaigns = lazy(() => import("./pages/venue/VenueCampaigns"));
const VenueCampaignCreate = lazy(() => import("./pages/venue/VenueCampaignCreate"));
const VenueLocations = lazy(() => import("./pages/venue/VenueLocations"));
const AdminCulturalEvents = lazy(() => import("./pages/admin/AdminCulturalEvents"));
const VenueSettings = lazy(() => import("./pages/venue/VenueSettings"));
const InfluencerDashboard = lazy(() => import("./pages/influencer/InfluencerDashboard"));
const InfluencerExplore = lazy(() => import("./pages/influencer/InfluencerExplore"));
const InfluencerInvitations = lazy(() => import("./pages/influencer/InfluencerInvitations"));
const InfluencerBookings = lazy(() => import("./pages/influencer/InfluencerBookings"));
const InfluencerEarnings = lazy(() => import("./pages/influencer/InfluencerEarnings"));
const InfluencerProfile = lazy(() => import("./pages/influencer/InfluencerProfile"));
const InfluencerReviews = lazy(() => import("./pages/influencer/InfluencerReviews"));
const InfluencerRewards = lazy(() => import("./pages/influencer/InfluencerRewards"));
const InfluencerSettings = lazy(() => import("./pages/influencer/InfluencerSettings"));
const InfluencerHome = lazy(() => import("./pages/influencer/InfluencerHome"));
const InfluencerOffer = lazy(() => import("./pages/influencer/InfluencerOffer"));
const MarketingPage = lazy(() => import("./pages/MarketingPage"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="animate-pulse font-display text-xl text-gold">Loading…</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <GoogleMapsProvider>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public marketing site (Framer static, served from /public/site). */}
            <Route path="/" element={<MarketingPage path="" />} />
            <Route path="/about" element={<MarketingPage path="about" />} />
            <Route path="/pricing" element={<MarketingPage path="pricing" />} />
            <Route path="/contact" element={<MarketingPage path="contact" />} />
            <Route path="/legal/privacy-policy" element={<MarketingPage path="legal/privacy-policy" />} />
            <Route path="/legal/terms-condition" element={<MarketingPage path="legal/terms-condition" />} />
            <Route path="/casestudy" element={<MarketingPage path="casestudy" />} />
            <Route path="/casestudy/:slug" element={<MarketingPage dynamicSegment="casestudy" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route path="/admin/analytics/deep" element={<ProtectedRoute allowedRoles={["admin"]}><AdminAnalyticsDeep /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCategories /></ProtectedRoute>} />
            <Route path="/admin/locations" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLocations /></ProtectedRoute>} />
            <Route path="/admin/billing" element={<ProtectedRoute allowedRoles={["admin"]}><AdminBilling /></ProtectedRoute>} />
            <Route path="/admin/moderation" element={<ProtectedRoute allowedRoles={["admin"]}><AdminModeration /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/chatbot" element={<ProtectedRoute allowedRoles={["admin"]}><AdminChatbot /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/cultural-events" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCulturalEvents /></ProtectedRoute>} />

            {/* Venue Routes */}
            <Route path="/venue" element={<ProtectedRoute allowedRoles={["venue"]}><Navigate to="/venue/campaigns" replace /></ProtectedRoute>} />
            <Route path="/venue/reports" element={<ProtectedRoute allowedRoles={["venue"]}><VenueReports /></ProtectedRoute>} />
            <Route path="/venue/content" element={<ProtectedRoute allowedRoles={["venue"]}><VenueContent /></ProtectedRoute>} />
            <Route path="/venue/campaigns" element={<ProtectedRoute allowedRoles={["venue"]}><VenueCampaigns /></ProtectedRoute>} />
            <Route path="/venue/campaigns/new" element={<ProtectedRoute allowedRoles={["venue"]}><VenueCampaignCreate /></ProtectedRoute>} />
            <Route path="/venue/campaigns/:id/edit" element={<ProtectedRoute allowedRoles={["venue"]}><VenueCampaignCreate /></ProtectedRoute>} />
            <Route path="/venue/bookings" element={<ProtectedRoute allowedRoles={["venue"]}><VenueBookings /></ProtectedRoute>} />
            <Route path="/venue/briefs" element={<ProtectedRoute allowedRoles={["venue"]}><VenueBriefs /></ProtectedRoute>} />
            <Route path="/venue/briefs/new" element={<ProtectedRoute allowedRoles={["venue"]}><VenueBriefCreate /></ProtectedRoute>} />
            <Route path="/venue/briefs/:id/edit" element={<ProtectedRoute allowedRoles={["venue"]}><VenueBriefCreate /></ProtectedRoute>} />
            <Route path="/venue/locations" element={<ProtectedRoute allowedRoles={["venue"]}><VenueLocations /></ProtectedRoute>} />
            <Route path="/venue/settings" element={<ProtectedRoute allowedRoles={["venue"]}><VenueSettings /></ProtectedRoute>} />

            {/* Legacy venue paths → redirect to Reports */}
            <Route path="/venue/dashboard" element={<Navigate to="/venue" replace />} />
            <Route path="/venue/offers" element={<Navigate to="/venue/campaigns" replace />} />
            <Route path="/venue/discover" element={<Navigate to="/venue" replace />} />
            <Route path="/venue/invitations" element={<Navigate to="/venue/bookings" replace />} />
            <Route path="/venue/redemptions" element={<Navigate to="/venue/bookings" replace />} />
            <Route path="/venue/events" element={<Navigate to="/venue" replace />} />
            <Route path="/venue/event-attendees" element={<Navigate to="/venue" replace />} />
            <Route path="/venue/analytics" element={<Navigate to="/venue" replace />} />

            {/* Influencer Routes */}
            <Route path="/influencer" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerDashboard /></ProtectedRoute>} />
            <Route path="/influencer/home" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerHome /></ProtectedRoute>} />
            <Route path="/influencer/explore" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerExplore /></ProtectedRoute>} />
            <Route path="/influencer/offers/:id" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerOffer /></ProtectedRoute>} />
            <Route path="/influencer/invitations" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerInvitations /></ProtectedRoute>} />
            <Route path="/influencer/bookings" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerBookings /></ProtectedRoute>} />
            <Route path="/influencer/earnings" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerEarnings /></ProtectedRoute>} />
            <Route path="/influencer/profile" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerProfile /></ProtectedRoute>} />
            <Route path="/influencer/reviews" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerReviews /></ProtectedRoute>} />
            <Route path="/influencer/rewards" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerRewards /></ProtectedRoute>} />
            <Route path="/influencer/settings" element={<ProtectedRoute allowedRoles={["influencer"]}><InfluencerSettings /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </GoogleMapsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
