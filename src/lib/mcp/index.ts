import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listOffers from "./tools/list-offers";
import getOffer from "./tools/get-offer";
import listMyBookings from "./tools/list-my-bookings";
import applyToOffer from "./tools/apply-to-offer";
import getMyProfile from "./tools/get-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "remix-of-connect-create-platform",
  title: "Remix of Connect & Create Platform",
  version: "0.1.0",
  instructions:
    "Tools for the FamePass platform, which connects influencers with venues. Use `list_offers` and `get_offer` to browse venue campaigns, `apply_to_offer` to apply as the signed-in influencer, `list_my_bookings` to track bookings, and `get_my_profile` for the signed-in user's profile and venues. All data is scoped to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listOffers, getOffer, applyToOffer, listMyBookings, getMyProfile],
});
