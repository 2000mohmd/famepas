import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Instagram, Music2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Creators must link Instagram or TikTok before using the dashboard.
 * Until they do, any click on the dashboard opens this popup.
 * The Settings page and the OAuth callbacks stay usable.
 */
const ConnectAccountsGate = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [linked, setLinked] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"instagram" | "tiktok" | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("social_integrations").select("id").eq("influencer_id", user.id).eq("status", "connected").limit(1)
      .then(({ data }) => {
        const has = !!data?.length;
        setLinked(has);
        if (!has) setOpen(true);
      });
  }, [user, location.pathname]);

  const blocked = linked === false;

  useEffect(() => {
    if (!blocked) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-connect-gate]") || t.closest("[data-allow-without-link]")) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [blocked]);

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

  if (!blocked) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-connect-gate className="sm:max-w-md">
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
  );
};

export default ConnectAccountsGate;
