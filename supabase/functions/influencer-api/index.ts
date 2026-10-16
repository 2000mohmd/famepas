import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getAuthUser(req: Request, supabase: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  return user;
}


const pick = (src: any, keys: string[]) => {
  const out: Record<string, unknown> = {};
  if (src && typeof src === "object") for (const k of keys) if (k in src) out[k] = src[k];
  return out;
};
const PROFILE_FIELDS = ["full_name", "avatar_url", "phone", "bio", "city", "country", "cover_image_url", "niche"];
const DELIVERABLE_FIELDS = ["booking_id", "content_type", "content_url", "post_url", "platform", "caption", "media_url", "thumbnail_url", "posted_at"];
const MESSAGE_FIELDS = ["receiver_id", "venue_id", "booking_id", "content", "media_url"];
const REVIEW_FIELDS = ["reviewed_id", "venue_id", "booking_id", "rating", "review_text", "is_public"];
// Venue columns creators may read (contact details etc. are column-locked).
const VENUE_PUBLIC = "id, name, description, category, categories, address, city, country, latitude, longitude, website, logo_url, cover_image_url";
// Offers still running: no end date, or not ended yet (same rule as the web).
const notExpired = () => `ends_at.is.null,ends_at.gte.${new Date().toISOString()}`;

const MEDIA_KIT_FIELDS = ["title", "tagline", "portfolio_urls", "audience_demographics", "engagement_rate", "avg_views", "avg_likes", "brands_worked_with", "pdf_url"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const user = await getAuthUser(req, createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    }));

    const url = new URL(req.url);
    const path = url.pathname.replace("/influencer-api", "");
    const method = req.method;

    // ==========================================
    // AUTH ROUTES (no auth required)
    // ==========================================

    if (path === "/auth/signup" && method === "POST") {
      const { email, password, full_name, instagram_handle, phone } = await req.json();
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name },
      });
      if (error) return errorResponse(error.message);

      // Assign influencer role
      await supabaseAdmin.from("user_roles").insert({ user_id: data.user.id, role: "influencer" });
      
      // Update profile with extra info
      if (instagram_handle || phone) {
        await supabaseAdmin.from("profiles").update({
          instagram_handle, phone,
        }).eq("user_id", data.user.id);
      }

      // Sign in to get tokens
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({ email, password });
      // Note: signInWithPassword via admin client won't work; return user and let client sign in
      return jsonResponse({ user: data.user, message: "Account created. Please sign in." });
    }

    if (path === "/auth/login" && method === "POST") {
      const { email, password } = await req.json();
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await authClient.auth.signInWithPassword({ email, password });
      if (error) return errorResponse(error.message, 401);
      
      // Check influencer role
      const { data: roleData } = await supabaseAdmin.from("user_roles")
        .select("role").eq("user_id", data.user.id).eq("role", "influencer").maybeSingle();
      if (!roleData) return errorResponse("Not an influencer account", 403);

      return jsonResponse({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: data.user,
      });
    }

    if (path === "/auth/refresh" && method === "POST") {
      const { refresh_token } = await req.json();
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await authClient.auth.refreshSession({ refresh_token });
      if (error) return errorResponse(error.message, 401);
      return jsonResponse({
        access_token: data.session!.access_token,
        refresh_token: data.session!.refresh_token,
        expires_at: data.session!.expires_at,
      });
    }

    // ==========================================
    // ALL ROUTES BELOW REQUIRE AUTH
    // ==========================================
    if (!user) return errorResponse("Unauthorized", 401);
    const userId = user.id;

    // Only approved, non-suspended creators may use the API. Login still issues
    // tokens so the app can read GET /profile and show the right approval screen.
    const [{ data: gateRole }, { data: gate }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "influencer").maybeSingle(),
      supabaseAdmin.from("profiles").select("approval_status, is_suspended, suspended_until").eq("user_id", userId).maybeSingle(),
    ]);
    if (!gateRole) return errorResponse("Not an influencer account", 403);
    const suspended = !!gate?.is_suspended && (!gate.suspended_until || new Date(gate.suspended_until) > new Date());
    const accountState = suspended ? "suspended" : (gate?.approval_status ?? "pending");
    if (accountState !== "approved" && !(path === "/profile" && method === "GET")) {
      const why = accountState === "suspended" ? "Your account is suspended." : accountState === "rejected" ? "Your application wasn't approved." : "Your account is waiting for approval.";
      return jsonResponse({ error: why, code: accountState.toUpperCase() }, 403);
    }

    // Calls the shared email function as this creator (same as the web's notifyEmail).
    const notify = (payload: Record<string, unknown>) =>
      fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
        method: "POST", headers: { Authorization: authHeader, apikey: supabaseAnonKey, "Content-Type": "application/json" }, body: JSON.stringify(payload),
      }).then(() => true).catch(() => false);

    // Apply to an offer exactly like the web: a pending application the venue reviews.
    const applyToOffer = async (offerId: string) => {
      if (!offerId) return errorResponse("offer_id required");
      const { data: offer } = await supabase.from("offers").select("id").eq("id", offerId).eq("is_active", true).or(notExpired()).maybeSingle();
      if (!offer) return errorResponse("Offer not found, inactive or expired", 404);
      const { data: existing } = await supabase.from("offer_redemptions").select("id").eq("offer_id", offerId).eq("influencer_id", userId).maybeSingle();
      if (existing) return errorResponse("You have already applied to this offer");
      const { data: redemption, error } = await supabase.from("offer_redemptions")
        .insert({ offer_id: offerId, influencer_id: userId, status: "pending" }).select().single();
      if (error) return errorResponse(error.message);
      await notify({ event: "application_submitted", redemption_id: redemption.id });
      return jsonResponse({ redemption, message: "Application submitted. The venue will review it." });
    };

    // ==========================================
    // PROFILE
    // ==========================================
    if (path === "/profile" && method === "GET") {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
      return jsonResponse({ profile: data });
    }

    if (path === "/profile" && method === "PUT") {
      const body = await req.json();
      const { data, error } = await supabase.from("profiles").update(pick(body, PROFILE_FIELDS)).eq("user_id", userId).select().single();
      if (error) return errorResponse(error.message);
      return jsonResponse({ profile: data });
    }

    // ==========================================
    // HOME / DASHBOARD (mobile home screen)
    // ==========================================
    if (path === "/home" && method === "GET") {
      const [categoriesRes, offersRes, venuesRes, profileRes, points] = await Promise.all([
        supabase.from("categories").select("*").eq("is_active", true).order("name"),
        supabase.from("offers")
          .select("*, venues(id, name, city, logo_url, cover_image_url, latitude, longitude), categories!category_id(id, name, icon, color)")
          .eq("is_active", true)
          .or(notExpired())
          .limit(60)
          .order("created_at", { ascending: false }),
        supabase.from("venues")
          .select("id, name, city, logo_url, cover_image_url, category, latitude, longitude")
          .eq("is_active", true)
          .eq("approval_status", "approved")
          .limit(30),
        supabase.from("profiles").select("full_name, avatar_url, badge, influencer_score").eq("user_id", userId).single(),
        supabase.from("reward_points").select("points, tier").eq("user_id", userId).maybeSingle(),
      ]);
      const categories = categoriesRes.data || [];
      const allOffers = offersRes.data || [];
      const offersByCategory: Record<string, any[]> = {};
      for (const cat of categories) {
        offersByCategory[cat.id] = allOffers.filter((o: any) => o.category_id === cat.id).slice(0, 12);
      }
      return jsonResponse({
        profile: profileRes.data,
        rewards: { points: points.data?.points ?? 0, tier: points.data?.tier ?? "bronze" },
        categories,
        featured_offers: allOffers.slice(0, 10),
        venues: venuesRes.data || [],
        offers_by_category: offersByCategory,
      });
    }

    if (path === "/categories" && method === "GET") {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("name");
      if (error) return errorResponse(error.message);
      return jsonResponse({ categories: data });
    }

    if (path === "/dashboard" && method === "GET") {
      const [invitations, bookings, completedBookings, earnings, rewardPoints] = await Promise.all([
        supabase.from("invitations").select("id", { count: "exact", head: true }).eq("influencer_id", userId).eq("status", "pending"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("influencer_id", userId).eq("status", "upcoming"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("influencer_id", userId).eq("status", "completed"),
        supabase.from("earnings").select("net_amount").eq("influencer_id", userId).in("status", ["confirmed", "paid"]),
        supabase.from("reward_points").select("points, tier").eq("user_id", userId).single(),
      ]);

      const totalEarnings = (earnings.data || []).reduce((sum: number, e: any) => sum + Number(e.net_amount), 0);

      return jsonResponse({
        active_invitations: invitations.count || 0,
        upcoming_bookings: bookings.count || 0,
        completed_visits: completedBookings.count || 0,
        total_earnings: totalEarnings,
        reward_points: rewardPoints.data?.points || 0,
        reward_tier: rewardPoints.data?.tier || "bronze",
      });
    }

    // ==========================================
    // SAVED OFFERS (mobile favourites)
    // ==========================================
    if (path === "/saved-offers" && method === "GET") {
      const { data, error } = await supabase.from("saved_offers")
        .select("*, offers(*, venues(id, name, city, logo_url, cover_image_url))")
        .eq("influencer_id", userId)
        .order("created_at", { ascending: false });
      if (error) return errorResponse(error.message);
      return jsonResponse({ saved: data });
    }

    if (path.match(/^\/saved-offers\/[^/]+$/) && method === "POST") {
      const offerId = path.split("/")[2];
      const { error } = await supabase.from("saved_offers")
        .insert({ influencer_id: userId, offer_id: offerId });
      if (error && !error.message.includes("duplicate")) return errorResponse(error.message);
      return jsonResponse({ ok: true });
    }

    if (path.match(/^\/saved-offers\/[^/]+$/) && method === "DELETE") {
      const offerId = path.split("/")[2];
      const { error } = await supabase.from("saved_offers")
        .delete().eq("influencer_id", userId).eq("offer_id", offerId);
      if (error) return errorResponse(error.message);
      return jsonResponse({ ok: true });
    }


    // ==========================================
    // EXPLORE OPPORTUNITIES (Offers)
    // ==========================================
    if (path === "/offers" && method === "GET") {
      let query = supabase.from("offers").select("*, venues(id, name, city, address, latitude, longitude, logo_url, cover_image_url), categories!category_id(id, name, color)")
        .eq("is_active", true)
        .or(notExpired());

      const category = url.searchParams.get("category");
      const city = url.searchParams.get("city");
      const offer_type = url.searchParams.get("offer_type");
      const min_followers = url.searchParams.get("min_followers");
      const search = url.searchParams.get("search");

      // category = category id. Filtering on the joined venue didn't narrow the list.
      if (category) query = query.eq("category_id", category);
      if (offer_type) query = query.eq("offer_type", offer_type);
      if (min_followers) query = query.lte("min_followers", parseInt(min_followers));

      // Sanitize the free-text search once; strip PostgREST operator characters.
      const safeSearch = search ? search.replace(/[,()%*]/g, "").slice(0, 80).trim() : "";

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) return errorResponse(error.message);

      // Search matches the offer title OR the venue name OR the venue city, so
      // creators can search "by location or venue name" (not just offer title).
      // Done in JS because the match spans the joined `venues` table.
      let searched = data || [];
      // City matches the venue's city; done here because it lives on the joined table.
      if (city) {
        const c = city.toLowerCase().trim();
        searched = searched.filter((o: any) => (o.venues?.city || "").toLowerCase().includes(c));
      }
      if (safeSearch) {
        const q = safeSearch.toLowerCase();
        searched = searched.filter((o: any) => {
          const title = (o.title || "").toLowerCase();
          const venueName = (o.venues?.name || "").toLowerCase();
          const venueCity = (o.venues?.city || "").toLowerCase();
          const venueAddr = (o.venues?.address || "").toLowerCase();
          return title.includes(q) || venueName.includes(q) || venueCity.includes(q) || venueAddr.includes(q);
        });
      }

      // Location-based filtering (lat, lng, radius_km)
      const lat = url.searchParams.get("lat");
      const lng = url.searchParams.get("lng");
      const radiusKm = parseFloat(url.searchParams.get("radius_km") || "50");

      let offers = searched;
      if (lat && lng) {
        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        offers = offers.filter((o: any) => {
          if (!o.venues?.latitude || !o.venues?.longitude) return false;
          const dist = haversineDistance(userLat, userLng, o.venues.latitude, o.venues.longitude);
          (o as any).distance_km = Math.round(dist * 10) / 10;
          return dist <= radiusKm;
        });
        offers.sort((a: any, b: any) => (a.distance_km || 0) - (b.distance_km || 0));
      }

      return jsonResponse({ offers });
    }

    if (path.match(/^\/offers\/[^/]+$/) && method === "GET") {
      const offerId = path.split("/")[2];
      const { data, error } = await supabase.from("offers")
        .select("*, venues(id, name, description, category, city, country, address, latitude, longitude, logo_url, cover_image_url, website), categories!category_id(id, name, icon, color)")
        .eq("id", offerId).single();
      if (error) return errorResponse(error.message);
      const [redemption, saved, reviews] = await Promise.all([
        supabase.from("offer_redemptions").select("id, status, qr_code, qr_expires_at, redeemed_at")
          .eq("offer_id", offerId).eq("influencer_id", userId).maybeSingle(),
        supabase.from("saved_offers").select("id").eq("offer_id", offerId).eq("influencer_id", userId).maybeSingle(),
        supabase.from("reviews").select("rating, comment, created_at")
          .eq("venue_id", (data as any)?.venue_id).eq("review_type", "influencer_to_venue").eq("is_public", true)
          .limit(10).order("created_at", { ascending: false }),
      ]);
      return jsonResponse({
        offer: data,
        my_redemption: redemption.data,
        is_saved: !!saved.data,
        venue_reviews: reviews.data || [],
      });
    }


    // Kept for older app builds: now the same as POST /redeem. It used to create an
    // "upcoming" booking at once (skipping the venue's review) and return a random
    // QR code venues couldn't scan; real codes come from GET /bookings.
    if (path.match(/^\/offers\/[^/]+\/accept$/) && method === "POST") {
      return await applyToOffer(path.split("/")[2]);
    }

    // ==========================================
    // INVITATIONS
    // ==========================================
    if (path === "/invitations" && method === "GET") {
      const status = url.searchParams.get("status");
      let query = supabase.from("invitations")
        .select("*, venues(id, name, logo_url, category, city), offers(id, title, offer_type, discount_value)")
        .eq("influencer_id", userId);
      if (status) query = query.eq("status", status);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) return errorResponse(error.message);
      return jsonResponse({ invitations: data });
    }

    if (path.match(/^\/invitations\/[^/]+\/respond$/) && method === "POST") {
      const invitationId = path.split("/")[2];
      const { action } = await req.json(); // "accepted" or "declined"
      if (!["accepted", "declined"].includes(action)) return errorResponse("Invalid action");
      
      const { data, error } = await supabase.from("invitations")
        .update({ status: action }).eq("id", invitationId).eq("influencer_id", userId).select().single();
      if (error) return errorResponse(error.message);

      // Auto-create booking if accepted
      if (action === "accepted" && data) {
        const qrCode = crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
        await supabase.from("bookings").insert({
          influencer_id: userId,
          venue_id: data.venue_id,
          offer_id: data.offer_id,
          invitation_id: data.id,
          scheduled_date: data.scheduled_at || new Date().toISOString(),
        });
        await supabase.from("invitations").update({ qr_code: qrCode }).eq("id", invitationId);
      }

      return jsonResponse({ invitation: data });
    }

    // ==========================================
    // BOOKINGS
    // ==========================================
    if (path === "/bookings" && method === "GET") {
      const status = url.searchParams.get("status");
      let query = supabase.from("bookings")
        .select("*, venues(id, name, logo_url, category, city, address), offers(id, title, offer_type)")
        .eq("influencer_id", userId);
      if (status) query = query.eq("status", status);
      const { data, error } = await query.order("scheduled_date", { ascending: true });
      if (error) return errorResponse(error.message);
      // The code the venue scans at check-in (booking_checkin_codes, per application).
      const rIds = (data || []).map((b: any) => b.redemption_id).filter(Boolean);
      const { data: codes } = rIds.length
        ? await supabase.from("booking_checkin_codes").select("redemption_id, code").in("redemption_id", rIds)
        : { data: [] as any[] };
      const codeOf = new Map((codes || []).map((c: any) => [c.redemption_id, c.code]));
      const bookings = (data || []).map((b: any) => {
        const code = codeOf.get(b.redemption_id) ?? null;
        return { ...b, checkin_code: code, checkin_url: code ? `https://famepass.app/scan?code=${code}` : null };
      });
      return jsonResponse({ bookings });
    }

    // Bookings come from a venue approving an application (or an accepted
    // invitation), and check-in happens when the venue scans the creator's code.
    // Creators can't create bookings or check themselves in.
    if ((path === "/bookings" && method === "POST") || (path.match(/^\/bookings\/[^/]+\/checkin$/) && method === "POST")) {
      return errorResponse("Not available: apply to an offer instead, and the venue scans your code at check-in.", 410);
    }

    // ==========================================
    // DELIVERABLES
    // ==========================================
    if (path === "/deliverables" && method === "GET") {
      const booking_id = url.searchParams.get("booking_id");
      let query = supabase.from("deliverables").select("*").eq("influencer_id", userId);
      if (booking_id) query = query.eq("booking_id", booking_id);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) return errorResponse(error.message);
      return jsonResponse({ deliverables: data });
    }

    if (path === "/deliverables" && method === "POST") {
      const body = await req.json();
      const fields = pick(body, DELIVERABLE_FIELDS) as Record<string, any>;
      const { data: booking } = await supabase.from("bookings").select("id, redemption_id")
        .eq("id", fields.booking_id ?? "").eq("influencer_id", userId).maybeSingle();
      if (!booking) return errorResponse("Booking not found", 404);
      const postUrl = String(fields.post_url || fields.content_url || "").trim() || null;
      const { data, error } = await supabase.from("deliverables").insert({
        ...fields,
        post_url: postUrl, content_url: fields.content_url ?? postUrl,
        influencer_id: userId,
        submitted_at: new Date().toISOString(),
        status: "submitted",
      }).select().single();
      if (error) return errorResponse(error.message);
      // Same as the web: the link is the delivery proof that stops the post
      // deadline from marking the visit Missed; then the email and post metrics.
      let delivery: any = null;
      if (postUrl && booking.redemption_id) {
        const { data: res } = await supabase.rpc("submit_booking_post", { _redemption_id: booking.redemption_id, _url: postUrl });
        delivery = res ?? null;
      }
      await Promise.allSettled([
        notify({ event: "content_submitted", deliverable_id: data.id }),
        postUrl && /instagram\.com|tiktok\.com/.test(postUrl)
          ? fetch(`${supabaseUrl}/functions/v1/fetch-post-metrics`, {
              method: "POST", headers: { Authorization: authHeader, apikey: supabaseAnonKey, "Content-Type": "application/json" },
              body: JSON.stringify({ deliverable_id: data.id, post_url: postUrl }),
            })
          : Promise.resolve(),
      ]);
      return jsonResponse({ deliverable: data, delivery });
    }

    // ==========================================
    // MESSAGES
    // ==========================================
    if (path === "/conversations" && method === "GET") {
      // Get unique conversations
      const { data, error } = await supabase.from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) return errorResponse(error.message);

      // Group by conversation partner
      const conversations = new Map();
      for (const msg of data || []) {
        const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!conversations.has(partnerId)) {
          conversations.set(partnerId, {
            partner_id: partnerId,
            venue_id: msg.venue_id,
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: msg.receiver_id === userId && !msg.is_read ? 1 : 0,
          });
        } else if (msg.receiver_id === userId && !msg.is_read) {
          conversations.get(partnerId).unread_count++;
        }
      }

      // Fetch partner profiles
      const partnerIds = [...conversations.keys()];
      if (partnerIds.length > 0) {
        const { data: profiles } = await supabaseAdmin.from("profiles")
          .select("user_id, full_name, avatar_url").in("user_id", partnerIds);
        for (const profile of profiles || []) {
          if (conversations.has(profile.user_id)) {
            conversations.get(profile.user_id).partner_name = profile.full_name;
            conversations.get(profile.user_id).partner_avatar = profile.avatar_url;
          }
        }
      }

      return jsonResponse({ conversations: [...conversations.values()] });
    }

    if (path === "/messages" && method === "GET") {
      const partner_id = url.searchParams.get("partner_id");
      if (!partner_id) return errorResponse("partner_id required");
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(partner_id)) return errorResponse("Invalid partner_id", 400);

      const { data, error } = await supabase.from("messages")
        .select("*")
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${partner_id}),and(sender_id.eq.${partner_id},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: true });
      if (error) return errorResponse(error.message);

      // Mark as read
      await supabase.from("messages").update({ is_read: true })
        .eq("sender_id", partner_id).eq("receiver_id", userId).eq("is_read", false);

      return jsonResponse({ messages: data });
    }

    if (path === "/messages" && method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from("messages").insert({
        ...pick(body, MESSAGE_FIELDS),
        message_type: "text",
        sender_id: userId,
      }).select().single();
      if (error) return errorResponse(error.message);
      return jsonResponse({ message: data });
    }

    // ==========================================
    // EARNINGS & WALLET
    // ==========================================
    if (path === "/wallet" && method === "GET") {
      const [earnings, withdrawals] = await Promise.all([
        supabase.from("earnings").select("*").eq("influencer_id", userId).order("created_at", { ascending: false }),
        supabase.from("withdrawal_requests").select("*").eq("influencer_id", userId).order("created_at", { ascending: false }),
      ]);

      const totalEarned = (earnings.data || []).reduce((sum: number, e: any) => sum + Number(e.net_amount), 0);
      const totalWithdrawn = (withdrawals.data || [])
        .filter((w: any) => w.status === "completed")
        .reduce((sum: number, w: any) => sum + Number(w.amount), 0);
      const pendingWithdrawals = (withdrawals.data || [])
        .filter((w: any) => w.status === "pending" || w.status === "processing")
        .reduce((sum: number, w: any) => sum + Number(w.amount), 0);

      return jsonResponse({
        balance: totalEarned - totalWithdrawn - pendingWithdrawals,
        total_earned: totalEarned,
        total_withdrawn: totalWithdrawn,
        pending_withdrawals: pendingWithdrawals,
        transactions: earnings.data || [],
        withdrawal_requests: withdrawals.data || [],
      });
    }

    if (path === "/wallet/withdraw" && method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from("withdrawal_requests").insert({
        influencer_id: userId,
        amount: body.amount,
        payment_method: body.payment_method,
        payment_details: body.payment_details,
      }).select().single();
      if (error) return errorResponse(error.message);
      return jsonResponse({ withdrawal: data });
    }

    // ==========================================
    // ANALYTICS / PERFORMANCE
    // ==========================================
    if (path === "/analytics" && method === "GET") {
      const [bookings, deliverables, reviewsReceived, profile, rewardPoints] = await Promise.all([
        supabase.from("bookings").select("*, venues(name)").eq("influencer_id", userId),
        supabase.from("deliverables").select("*").eq("influencer_id", userId),
        supabase.from("reviews").select("*").eq("reviewed_id", userId).eq("review_type", "venue_to_influencer"),
        supabase.from("profiles").select("influencer_score, badge").eq("user_id", userId).single(),
        supabase.from("reward_points").select("*").eq("user_id", userId).single(),
      ]);

      const avgRating = (reviewsReceived.data || []).length > 0
        ? (reviewsReceived.data || []).reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsReceived.data!.length
        : 0;

      return jsonResponse({
        total_bookings: (bookings.data || []).length,
        completed_visits: (bookings.data || []).filter((b: any) => b.status === "completed").length,
        total_deliverables: (deliverables.data || []).length,
        approved_deliverables: (deliverables.data || []).filter((d: any) => d.status === "approved").length,
        avg_venue_rating: Math.round(avgRating * 10) / 10,
        total_reviews: (reviewsReceived.data || []).length,
        influencer_score: profile.data?.influencer_score || 0,
        badge: profile.data?.badge || "bronze",
        reward_points: rewardPoints.data?.points || 0,
        reward_tier: rewardPoints.data?.tier || "bronze",
      });
    }

    // ==========================================
    // REVIEWS
    // ==========================================
    if (path === "/reviews" && method === "GET") {
      const type = url.searchParams.get("type"); // "received" or "given"
      let query;
      if (type === "given") {
        query = supabase.from("reviews").select("*, venues(name, logo_url)").eq("reviewer_id", userId);
      } else {
        query = supabase.from("reviews").select("*").eq("reviewed_id", userId);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) return errorResponse(error.message);
      return jsonResponse({ reviews: data });
    }

    if (path === "/reviews" && method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from("reviews").insert({
        ...pick(body, REVIEW_FIELDS),
        reviewer_id: userId,
        review_type: "influencer_to_venue",
      }).select().single();
      if (error) return errorResponse(error.message);
      return jsonResponse({ review: data });
    }

    // ==========================================
    // REWARDS & LEADERBOARD
    // ==========================================
    if (path === "/rewards" && method === "GET") {
      const { data: points } = await supabase.from("reward_points").select("*").eq("user_id", userId).single();
      const { data: profile } = await supabase.from("profiles").select("influencer_score, badge").eq("user_id", userId).single();
      return jsonResponse({
        points: points?.points || 0,
        tier: points?.tier || "bronze",
        influencer_score: profile?.influencer_score || 0,
        badge: profile?.badge || "bronze",
      });
    }

    if (path === "/leaderboard" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const { data, error } = await supabaseAdmin.rpc("get_leaderboard", { limit_count: limit });
      if (error) return errorResponse(error.message);
      return jsonResponse({ leaderboard: data });
    }

    // ==========================================
    // MEDIA KIT
    // ==========================================
    if (path === "/media-kit" && method === "GET") {
      const { data } = await supabase.from("media_kits").select("*").eq("influencer_id", userId).single();
      return jsonResponse({ media_kit: data });
    }

    if (path === "/media-kit" && method === "PUT") {
      const body = await req.json();
      const { data: existing } = await supabase.from("media_kits").select("id").eq("influencer_id", userId).single();
      
      let result;
      if (existing) {
        result = await supabase.from("media_kits").update(pick(body, MEDIA_KIT_FIELDS)).eq("influencer_id", userId).select().single();
      } else {
        result = await supabase.from("media_kits").insert({ ...pick(body, MEDIA_KIT_FIELDS), influencer_id: userId }).select().single();
      }
      if (result.error) return errorResponse(result.error.message);
      return jsonResponse({ media_kit: result.data });
    }

    // ==========================================
    // SETTINGS
    // ==========================================
    if (path === "/settings" && method === "GET") {
      const { data } = await supabase.from("influencer_settings").select("*").eq("influencer_id", userId).single();
      return jsonResponse({ settings: data });
    }

    if (path === "/settings" && method === "PUT") {
      const body = await req.json();
      const { data, error } = await supabase.from("influencer_settings").update(body).eq("influencer_id", userId).select().single();
      if (error) return errorResponse(error.message);
      return jsonResponse({ settings: data });
    }

    // ==========================================
    // VENUES (for browsing)
    // ==========================================
    if (path === "/venues" && method === "GET") {
      let query = supabase.from("venues").select(VENUE_PUBLIC).eq("is_active", true).eq("approval_status", "approved");
      const category = url.searchParams.get("category");
      const city = url.searchParams.get("city");
      if (category) query = query.eq("category", category);
      if (city) query = query.eq("city", city);
      const { data, error } = await query.order("name");
      if (error) return errorResponse(error.message);
      return jsonResponse({ venues: data });
    }

    if (path.match(/^\/venues\/[^/]+$/) && method === "GET") {
      const venueId = path.split("/")[2];
      const { data, error } = await supabase.from("venues").select(VENUE_PUBLIC).eq("id", venueId).eq("is_active", true).eq("approval_status", "approved").maybeSingle();
      if (error) return errorResponse(error.message);
      if (!data) return errorResponse("Venue not found", 404);
      
      // Get venue's active offers
      const { data: offers } = await supabase.from("offers").select("*").eq("venue_id", venueId).eq("is_active", true).or(notExpired());
      // Get venue's upcoming events
      const { data: events } = await supabase.from("events").select("*").eq("venue_id", venueId).eq("is_active", true);
      // Get venue reviews
      const { data: reviews } = await supabase.from("reviews").select("*").eq("venue_id", venueId).eq("review_type", "influencer_to_venue").eq("is_public", true);

      return jsonResponse({ venue: data, offers, events, reviews });
    }

    // ==========================================
    // EVENTS
    // ==========================================
    if (path === "/events" && method === "GET") {
      const { data, error } = await supabase.from("events")
        .select("*, venues(id, name, logo_url, city)")
        .eq("is_active", true)
        .order("starts_at", { ascending: true });
      if (error) return errorResponse(error.message);
      return jsonResponse({ events: data });
    }

    // ==========================================
    // OFFER REDEMPTIONS
    // ==========================================
    if (path === "/redeem" && method === "POST") {
      const { offer_id } = await req.json().catch(() => ({}));
      return await applyToOffer(typeof offer_id === "string" ? offer_id : "");
    }

    if (path === "/redemptions" && method === "GET") {
      const { data, error } = await supabase.from("offer_redemptions")
        .select("*, offers(*, venues(id, name, logo_url))")
        .eq("influencer_id", userId)
        .order("created_at", { ascending: false });
      if (error) return errorResponse(error.message);
      const ids = (data || []).map((r: any) => r.id);
      const { data: codes } = ids.length
        ? await supabase.from("booking_checkin_codes").select("redemption_id, code").in("redemption_id", ids)
        : { data: [] as any[] };
      const codeOf = new Map((codes || []).map((c: any) => [c.redemption_id, c.code]));
      return jsonResponse({ redemptions: (data || []).map((r: any) => ({ ...r, checkin_code: codeOf.get(r.id) ?? null })) });
    }

    return errorResponse("Not found", 404);

  } catch (err) {
    console.error("influencer-api error", err instanceof Error ? err.message : String(err));
    return errorResponse("Something went wrong. Please try again.", 500);
  }
});
