import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Adnan, recap E10: referral link + app-download QR in the venue sidebar.
 * VP7 resolved to web app only (no native build), so the QR points at the
 * public FamePass site rather than an app store link.
 */
const VenueReferralCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const referralLink = user ? `${window.location.origin}/signup/business?ref=${user.id}` : "";
  const appLink = window.location.origin;

  useEffect(() => {
    QRCode.toDataURL(appLink, { margin: 1, width: 96 }).then(setQrSrc).catch(() => setQrSrc(null));
  }, [appLink]);

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Couldn't copy", description: referralLink, variant: "destructive" });
    }
  };

  if (!user) return null;

  return (
    <div className="mx-3 mb-3 rounded-xl border border-border bg-secondary/40 p-3">
      <p className="text-[11px] font-semibold text-card-foreground mb-2">Invite a venue</p>
      <div className="flex items-center gap-2">
        {qrSrc && <img src={qrSrc} alt="FamePass QR code" className="w-12 h-12 rounded-md border border-border bg-white shrink-0" />}
        <button
          onClick={copyLink}
          className="flex-1 min-w-0 flex items-center justify-between gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] text-card-foreground/70 hover:border-primary hover:text-primary transition-colors"
        >
          <span className="truncate">{copied ? "Link copied!" : "Copy referral link"}</span>
          {copied ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
        </button>
      </div>
    </div>
  );
};

export default VenueReferralCard;
