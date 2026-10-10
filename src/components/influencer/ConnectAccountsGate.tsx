import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialLinked } from "@/hooks/useSocialLinked";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Instagram, Music2, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    if (linked !== false) return;
    if (!sessionStorage.getItem(SHOWN_KEY)) {
      setOpen(true);
      sessionStorage.setItem(SHOWN_KEY, "1");
    }
  }, [linked]);

  const connect = async (platform: "instagram" | "tiktok") => {
    setBusy(platform);
    const { data, error } = await supabase.functions.invoke(`${platform}-oauth`, { body: { action: "initiate" } });
    setBusy(null);
    if (error || !(data as any)?.url) {
      toast({ title: "Couldn't start connection", description: (data as any)?.error || "Try again later.", variant: "destructive" });
      return;
    }
    window.location.href = (data as any).url;
  };

  if (linked !== false || !user) return null;

  return (
    <>
      {!bannerDismissed && (
        <div className="flex items-center justify-between gap-3 bg-primary/10 border border-primary/30 text-sm text-foreground px-4 py-2.5 rounded-lg mb-4">
          <span>Connect Instagram or TikTok so venues can see your real followers.</span>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => setOpen(true)}>Connect</Button>
            <button onClick={() => setBannerDismissed(true)} aria-label="Dismiss" className="text-foreground/50 hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect your accounts</DialogTitle>
            <DialogDescription>
              Link your Instagram or TikTok to start using FamePass. Venues see your real followers and the results of the videos you deliver.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button className="w-full" onClick={() => connect("instagram")} disabled={!!busy}>
              {busy === "instagram" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Instagram className="w-4 h-4 mr-2" />}
              Connect Instagram
            </Button>
            <Button className="w-full" variant="outline" onClick={() => connect("tiktok")} disabled={!!busy}>
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
