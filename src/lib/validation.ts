export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export const isValidEmail = (v: string) => EMAIL_REGEX.test(v.trim());

/** Minimum-length name check (trimmed). */
export const isValidName = (v: string, min = 2) => v.trim().length >= min;

/** A person's full name: at least `min` chars and a first + last name. */
export const isValidFullName = (v: string, min = 3) => {
  const t = v.trim();
  return t.length >= min && /\S+\s+\S+/.test(t);
};

/** Handle is acceptable when empty (optional) or has >= 2 alphanumeric chars. */
export const isValidOptionalHandle = (normalized: string, raw: string) => {
  if (!raw.trim()) return true;
  return (normalized.match(/[a-zA-Z0-9]/g)?.length ?? 0) >= 2;
};
