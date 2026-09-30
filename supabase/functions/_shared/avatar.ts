// Copies a creator's social profile photo into our own "avatars" bucket so it
// never breaks when Instagram/TikTok CDN links expire.
// deno-lint-ignore no-explicit-any
type Admin = any;

/** Downloads `sourceUrl`, stores it at avatars/<userId>/social-<platform>.<ext>, returns the public URL (or null on failure). */
export async function mirrorAvatar(admin: Admin, userId: string, platform: string, sourceUrl: string | null | undefined): Promise<string | null> {
  if (!sourceUrl) return null;
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) return null;
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const path = `${userId}/social-${platform}.${ext}`;
    const { error } = await admin.storage.from("avatars").upload(path, bytes, { contentType: type, upsert: true });
    if (error) { console.error("avatar upload failed", error); return null; }
    const { data } = admin.storage.from("avatars").getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
  } catch (e) {
    console.error("mirrorAvatar error", e);
    return null;
  }
}

/** Sets profiles.avatar_url to `storedUrl` unless the creator already uploaded their own photo. */
export async function applyProfileAvatar(admin: Admin, userId: string, storedUrl: string | null) {
  if (!storedUrl) return;
  const { data } = await admin.from("profiles").select("avatar_url").eq("user_id", userId).maybeSingle();
  const current: string | null = data?.avatar_url ?? null;
  const isOwnUpload = !!current && current.includes("/storage/v1/object/public/avatars/") && !current.includes("/social-");
  if (isOwnUpload) return;
  await admin.from("profiles").update({ avatar_url: storedUrl }).eq("user_id", userId);
}
