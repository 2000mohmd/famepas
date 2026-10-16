import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialLinked } from "@/hooks/useSocialLinked";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Instagram, Music2, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { connectWithPhyllo, phylloEnabled } from "@/lib/phylloConnect";

const SHOWN_KEY = "connectAccountsPromptShown";

/**
 * Creators without Instagram/TikTok connected see this once after login
 * (Adnan, "Creator Page fixes" #1). After that it's a dismissible banner,
 * not a page-blocking popup — only actions that actually need a connected
 * account (e.g. Apply) gate on useSocialLinked() themselves.
 */
const ConnectAccountsGate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const linked = useSocialLinked();
  const [open, setOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [busy, setBusy] = useState<"instagram" | "tiktok" | null>(null);
  const [justLinked, setJustLinked] = useState(false);

  useEffect(() => {
    if (linked !== false) return;
    if (!sessionStorage.getItem(SHOWN_KEY)) {
      setOpen(true);
      sessionStorage.setItem(SHOWN_KEY, "1");
    }
  }, [linked]);

  const connect = async (platform: "instagram" | "tiktok") => {
    setBusy(platform);
    if (phylloEnabled()) {
      // Phyllo opens its own window over this page; no redirect.
      try {
        const { handle } = await connectWithPhyllo(platform);
        toast({ title: `${platform === "instagram" ? "Instagram" : "TikTok"} connected ✓`, description: handle ? `@${handle} is now linked.` : "Your account is now linked." });
        setOpen(false);
        setJustLinked(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg !== "CANCELLED") toast({ title: "Couldn't connect", description: msg || "Try again later.", variant: "destructive" });
      }
      setBusy(null);
      return;
    }
    const { data, error } = await supabase.functions.invoke(`${platform}-oauth`, { body: { action: "initiate" } });
    setBusy(null);
    if (error || !(data as any)?.url) {
      toast({ title: "Couldn't start connection", description: (data as any)?.error || "Try again later.", variant: "destructive" });
      return;
    }
    window.location.href = (data as any).url;
  };

  if (linked !== false || !user || justLinked) return null;

  return (
    <>
      {!bannerDismissed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card border border-border px-5 py-3.5 mb-6 shadow-[var(--venue-shadow)]">
          <span className="flex items-center gap-3 text-sm font-semibold text-foreground">
            <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)" }}><Instagram className="w-5 h-5" /></span>
            Connect Instagram or TikTok so venues can see your real followers.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setOpen(true)} className="h-9 px-5 rounded-full text-xs font-bold" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>Connect</button>
            <button onClick={() => setBannerDismissed(true)} aria-label="Dismiss" className="text-foreground/50 hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold">Connect your accounts</DialogTitle>
            <DialogDescription>
              Link your Instagram or TikTok to start using FamePass. Venues see your real followers and the results of the videos you deliver.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button className="w-full h-12 rounded-full font-bold text-white border-0" style={{ background: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)" }} onClick={() => connect("instagram")} disabled={!!busy}>
              {busy === "instagram" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Instagram className="w-4 h-4 mr-2" />}
              Connect Instagram
            </Button>
            <Button className="w-full h-12 rounded-full font-bold text-white border-0 bg-black hover:bg-black/85" onClick={() => connect("tiktok")} disabled={!!busy}>
              {busy === "tiktok" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Music2 className="w-4 h-4 mr-2" />}
              Connect TikTok
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConnectAccountsGate;
