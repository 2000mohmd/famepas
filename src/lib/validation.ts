export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export const isValidEmail = (v: string) => EMAIL_REGEX.test(v.trim());

/** Minimum-length name check (trimmed). */
export const isValidName = (v: string, min = 2) => v.trim().length >= min;

/** A person's full name: at least `min` chars and a first + last name. */
export const isValidFullName = (v: string, min = 3) => {
  const t = v.trim();
  return t.length >= min && /\S+\s+\S+/.test(t);
};

/** Real handle shape: letters/numbers/dots/underscores only, 2-30 chars — no URLs, no spaces. */
export const HANDLE_REGEX = /^[a-zA-Z0-9._]{2,30}$/;

/** Handle is acceptable when empty (optional) or matches a real handle's shape. */
export const isValidOptionalHandle = (normalized: string, raw: string) => {
  if (!raw.trim()) return true;
  return HANDLE_REGEX.test(normalized);
};

/**
 * Normalize a phone number to E.164 (+<country><number>). Lebanon (+961) is
 * the default country: "03 123 456" / "76566388" -> "+9613123456" / "+96176566388";
 * "00<cc>..." -> "+<cc>...". Returns null if it can't be made valid.
 */
export function normalizePhone(raw: string, defaultCc = "961"): string | null {
  const s = (raw || "").trim();
  if (!s) return null;
  let d = s.replace(/\D/g, "");
  if (s.startsWith("+")) { /* already international */ }
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith(defaultCc) && d.length > defaultCc.length + 6) { /* has cc */ }
  else d = defaultCc + d.replace(/^0+/, "");
  return d.length >= 8 && d.length <= 15 ? `+${d}` : null;
}

export const isValidPhoneNumber = (v: string) => normalizePhone(v) !== null;
