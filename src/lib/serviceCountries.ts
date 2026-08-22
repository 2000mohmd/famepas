import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Maps country names (as stored in service_locations.country by admins) to
 * ISO 3166-1 alpha-2 codes used by Google Places autocomplete restrictions.
 * Keys are lowercased; several common aliases are included.
 */
const COUNTRY_CODES: Record<string, string> = {
  lebanon: "LB",
  lb: "LB",
  "united arab emirates": "AE",
  uae: "AE",
  ae: "AE",
  "saudi arabia": "SA",
  ksa: "SA",
  sa: "SA",
  qatar: "QA",
  qa: "QA",
  kuwait: "KW",
  kw: "KW",
  bahrain: "BH",
  bh: "BH",
  oman: "OM",
  om: "OM",
  jordan: "JO",
  jo: "JO",
  egypt: "EG",
  eg: "EG",
  turkey: "TR",
  türkiye: "TR",
  tr: "TR",
  cyprus: "CY",
  cy: "CY",
  france: "FR",
  fr: "FR",
  "united kingdom": "GB",
  uk: "GB",
  gb: "GB",
  "united states": "US",
  usa: "US",
  us: "US",
  canada: "CA",
  ca: "CA",
  germany: "DE",
  de: "DE",
  spain: "ES",
  es: "ES",
  italy: "IT",
  it: "IT",
  greece: "GR",
  gr: "GR",
};

export const countryToCode = (name?: string | null): string | null => {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (COUNTRY_CODES[key]) return COUNTRY_CODES[key];
  // already an ISO-2 code we don't know about
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase();
  return null;
};

/** Fallback while loading / when the admin has no active locations configured. */
export const DEFAULT_SERVICE_COUNTRY_CODES = ["LB"];

let cache: string[] | null = null;
let inflight: Promise<string[]> | null = null;

export const fetchServiceCountryCodes = async (): Promise<string[]> => {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase
      .from("service_locations")
      .select("country")
      .eq("is_active", true);
    const codes = Array.from(
      new Set(
        (data ?? [])
          .map((r: { country: string | null }) => countryToCode(r.country))
          .filter((c): c is string => !!c),
      ),
    );
    cache = codes.length ? codes : DEFAULT_SERVICE_COUNTRY_CODES;
    return cache;
  })();
  const result = await inflight;
  inflight = null;
  return result;
};

/** React hook returning the active ISO-2 country codes FamePass operates in. */
export const useServiceCountryCodes = (): string[] => {
  const [codes, setCodes] = useState<string[]>(cache ?? DEFAULT_SERVICE_COUNTRY_CODES);
  useEffect(() => {
    let alive = true;
    fetchServiceCountryCodes().then((c) => { if (alive) setCodes(c); });
    return () => { alive = false; };
  }, []);
  return codes;
};
