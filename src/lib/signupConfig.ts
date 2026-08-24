import { supabase } from "@/integrations/supabase/client";

export type SignupConfig = {
  settings: Record<string, unknown>;
  categories: string[];
  countries: string[];
};

let cache: SignupConfig | null = null;
let inflight: Promise<SignupConfig> | null = null;

/**
 * Signup screens run unauthenticated, and the catalog/settings tables are
 * authenticated-only, so this whitelisted subset comes from a public edge function.
 */
export const fetchSignupConfig = async (): Promise<SignupConfig> => {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("public-signup-config");
        if (error || !data) throw error ?? new Error("no data");
        cache = {
          settings: (data as SignupConfig).settings ?? {},
          categories: (data as SignupConfig).categories ?? [],
          countries: (data as SignupConfig).countries ?? [],
        };
      } catch {
        cache = { settings: {}, categories: [], countries: [] };
      }
      return cache;
    })();
  }
  const result = await inflight;
  inflight = null;
  return result;
};

export const isRegistrationOpen = (config: SignupConfig, key: string) => {
  const v = config.settings[key];
  return !(v === false || v === "false");
};
