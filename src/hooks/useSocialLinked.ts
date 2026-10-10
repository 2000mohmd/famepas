import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Whether the signed-in creator has a connected Instagram or TikTok. null while loading. */
export const useSocialLinked = () => {
  const { user } = useAuth();
  const [linked, setLinked] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("social_integrations").select("id").eq("influencer_id", user.id).eq("status", "connected").limit(1)
      .then(({ data }) => setLinked(!!data?.length));
  }, [user]);

  return linked;
};
