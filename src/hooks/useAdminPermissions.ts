import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// A18: account_manager (and future staff_permissions-matrix roles) reuse the
// same admin pages, gated by the same AdminPermissionGate permission string
// -- but their access comes from staff_permissions/my_staff_access(), keyed
// by area, not admin_user_permissions. This translates area -> the matching
// admin permission flag so every existing AdminPermissionGate call site
// works for them without any per-page changes. Only areas with a real admin
// page behind the identical permission string are listed.
const STAFF_AREA_TO_PERMISSION: Record<string, string> = {
  venues: "manage_venues",
  offers: "manage_offers",
  offer_attendance: "manage_offers",
  events: "manage_events",
  billing: "manage_billing",
  analytics: "manage_analytics",
};

/**
 * Adnan, recap A1/A2/A19: admin_user_permissions switches existed but
 * nothing checked them outside the Admin Users page. This is the shared
 * read used everywhere else — nav gating, page guards, action gating.
 * Returns null while loading, then the set of permission keys the current
 * admin holds (empty set if they hold none, e.g. a non-admin role).
 */
export const useAdminPermissions = () => {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!user) { setPermissions(new Set()); return; }
    if (role === "admin") {
      supabase.from("admin_user_permissions").select("permission").eq("user_id", user.id)
        .then(({ data }) => setPermissions(new Set((data ?? []).map((r: any) => r.permission))));
      return;
    }
    if (role === "account_manager") {
      supabase.rpc("my_staff_access").then(({ data }) => {
        const access = (data ?? {}) as Record<string, string>;
        const granted = Object.entries(STAFF_AREA_TO_PERMISSION)
          .filter(([area]) => access[area] != null)
          .map(([, permission]) => permission);
        setPermissions(new Set(granted));
      });
      return;
    }
    setPermissions(new Set());
  }, [user, role]);

  return permissions;
};

export const hasAdminPermission = (permissions: Set<string> | null, permission: string) =>
  permissions === null ? true : permissions.has(permission);
