import { supabase } from "@/integrations/supabase/client";

/**
 * Phyllo Connect (getphyllo.com) for creators' Instagram / TikTok.
 *
 * Switch: VITE_SOCIAL_PROVIDER=phyllo in .env makes Phyllo the connect path for
 * everyone. Before that, open any page once with ?phyllo=1 to test it in this
 * browser tab only (kept for the session).
 */
export const phylloEnabled = (): boolean => {
  if (import.meta.env.VITE_SOCIAL_PROVIDER === "phyllo") return true;
  try {
    if (new URLSearchParams(window.location.search).get("phyllo") === "1") sessionStorage.setItem("famepass_phyllo_test", "1");
    return sessionStorage.getItem("famepass_phyllo_test") === "1";
  } catch { return false; }
};

const SDK_URL = "https://cdn.getphyllo.com/connect/v2/phyllo-connect.js";
let sdkLoading: Promise<void> | null = null;

const loadSdk = () => {
  if ((window as any).PhylloConnect) return Promise.resolve();
  sdkLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { sdkLoading = null; reject(new Error("Couldn't load the Phyllo connect window. Check your connection and try again.")); };
    document.head.appendChild(s);
  });
  return sdkLoading;
};

export type PhylloPlatform = "instagram" | "tiktok";

/** Opens Phyllo Connect for one platform; resolves once our server has saved the account. */
export async function connectWithPhyllo(platform: PhylloPlatform): Promise<{ handle: string | null }> {
  const { data: start, error } = await supabase.functions.invoke("phyllo", { body: { action: "start" } });
  if (error || !start?.sdk_token) throw new Error((start as any)?.error || "Couldn't start the connection. Try again in a moment.");
  await loadSdk();

  return new Promise((resolve, reject) => {
    let settled = false;
    let saving = false; // Phyllo may fire "exit" right after "accountConnected"; the save decides the outcome
    const done = (fn: () => void) => { if (!settled) { settled = true; fn(); } };
    const connect = (window as any).PhylloConnect.initialize({
      clientDisplayName: "FamePass",
      environment: start.environment,
      userId: start.user_id,
      token: start.sdk_token,
      workPlatformId: start.work_platforms?.[platform] ?? null,
    });
    connect.on("accountConnected", async (accountId: string) => {
      saving = true;
      const { data, error: saveErr } = await supabase.functions.invoke("phyllo", { body: { action: "account_connected", account_id: accountId } });
      if (saveErr || !data?.success) done(() => reject(new Error((data as any)?.error || "Connected, but we couldn't save it. Try again.")));
      else done(() => resolve({ handle: data.handle ?? null }));
    });
    connect.on("connectionFailure", (reason: string) => done(() => reject(new Error(reason ? `Connection failed: ${reason}` : "Connection failed."))));
    connect.on("tokenExpired", () => done(() => reject(new Error("The connection window expired. Please try again."))));
    // Closing the window without connecting is not an error.
    connect.on("exit", () => { if (!saving) done(() => reject(new Error("CANCELLED"))); });
    connect.on("accountDisconnected", () => { /* handled from our own Disconnect button */ });
    connect.open();
  });
}

export async function disconnectPhyllo(platform: PhylloPlatform) {
  const { data, error } = await supabase.functions.invoke("phyllo", { body: { action: "disconnect", platform } });
  if (error || !data?.success) throw new Error((data as any)?.error || "Couldn't disconnect. Try again.");
}
