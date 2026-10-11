import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
    if (!user || role !== "admin") { setPermissions(new Set()); return; }
    supabase.from("admin_user_permissions").select("permission").eq("user_id", user.id)
      .then(({ data }) => setPermissions(new Set((data ?? []).map((r: any) => r.permission))));
  }, [user, role]);

  return permissions;
};

export const hasAdminPermission = (permissions: Set<string> | null, permission: string) =>
  permissions === null ? true : permissions.has(permission);
