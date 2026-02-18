

# Implementation Plan

This plan covers 4 changes you requested:

---

## 1. Seed Admin User (admin@admin.com)

Create the admin user account with email `admin@admin.com` and password `admin` using a backend function call. This will:
- Create the user in the authentication system
- Assign the "admin" role in the `user_roles` table

**Note:** A 6-character minimum password is required, so we'll use "admin1" or similar if "admin" is rejected. We'll invoke the existing `create-user` edge function or use a one-time SQL seed.

---

## 2. Admin-Managed Categories and Locations

Create two new database tables that the admin can manage:

- **`categories`** table: `id`, `name`, `icon` (optional), `is_active`, `created_at`
- **`service_locations`** table: `id`, `city`, `country`, `is_active`, `created_at`

Add two new admin pages:
- **Admin Categories** (`/admin/categories`) -- CRUD for venue categories (dining, nightlife, hotels, etc.)
- **Admin Locations** (`/admin/locations`) -- CRUD for cities/regions the app operates in

Update the venue creation form and venue settings to use these dynamic lists (via `<Select>` dropdowns) instead of hardcoded values.

Add sidebar links for "Categories" and "Locations" in the admin panel.

---

## 3. Fix Venue Dashboard Quick Actions

The quick action buttons on the venue dashboard are `<div>` elements with no navigation. Wrap them with `react-router-dom`'s `useNavigate` or `<Link>` so clicking them actually navigates to the correct page (`/venue/offers`, `/venue/redemptions`, `/venue/events`).

---

## 4. Signup Form for Venues and Influencers

Replace the login-only page with a login/signup page that has a toggle or tab to switch between "Sign In" and "Sign Up."

The **Sign Up** form will:
- Let the user choose their role: **Venue** or **Influencer**
- If **Venue**: collect venue name, category (from dynamic list), city (from dynamic list), email, password
- If **Influencer**: collect full name, phone number, Instagram handle, TikTok followers, social media links (Instagram, TikTok, YouTube, etc.), profile image upload, email, password

On signup:
- Create the auth user
- Insert into `profiles` (handled by existing trigger)
- For influencers: update profile with social info, upload avatar to storage, assign "influencer" role via a new edge function (since role assignment needs service role key)
- For venues: use existing `create-user` pattern or a new public signup edge function

A new **`signup-user`** edge function will handle role assignment and profile setup securely on the server side.

---

## Technical Details

### Database Migrations

```text
-- New tables
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
-- Anyone can read, only admins can manage
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE public.service_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  country text DEFAULT 'UAE',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read locations" ON public.service_locations FOR SELECT USING (true);
CREATE POLICY "Admins manage locations" ON public.service_locations FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Add tiktok_handle and social_links to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tiktok_followers integer DEFAULT 0;
```

### New Files
- `src/pages/admin/AdminCategories.tsx` -- Categories CRUD page
- `src/pages/admin/AdminLocations.tsx` -- Locations CRUD page
- `supabase/functions/signup-user/index.ts` -- Handles public signup with role assignment

### Modified Files
- `src/pages/Login.tsx` -- Add signup tab with role selection and influencer/venue forms
- `src/pages/venue/VenueDashboard.tsx` -- Fix quick action buttons to use navigation
- `src/components/DashboardLayout.tsx` -- Add Categories and Locations links to admin sidebar
- `src/App.tsx` -- Add routes for `/admin/categories` and `/admin/locations`
- `src/pages/admin/AdminVenues.tsx` -- Use dynamic categories/locations from DB
- `src/contexts/AuthContext.tsx` -- Add signUp flow that calls the new edge function

### Admin Seeding
- Use the `create-user` edge function or direct SQL to seed `admin@admin.com` with password `admin123` (minimum 6 chars) and assign the admin role.

