import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, CheckCircle2, XCircle, LogOut } from "lucide-react";

interface Result {
  ok: boolean;
  reason?: string;
  creator_name?: string | null;
  avatar_url?: string | null;
  instagram_handle?: string | null;
  offer_title?: string;
  offer_description?: string | null;
  post_due_at?: string;
}

/** Location only when the browser already allows it — Adnan's call that a
 *  permission prompt at the door isn't worth the friction. */
const quietLocation = async (): Promise<{ lat: number; lng: number } | null> => {
  try {
    const perm = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (perm?.state !== "granted") return null;
    return await new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 4000, maximumAge: 60000 },
      ));
  } catch {
    return null;
  }
};

const ScanCheckIn = () => {
  const { signOut, role } = useAuth();
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoSubmitted = useRef(false);

  // Android Chrome can decode QR codes in the page. Everyone else — iPhones
  // included — scans with the phone's own camera app, which opens this page
  // with the code already in the link.
  const canScanInPage = typeof window !== "undefined" && "BarcodeDetector" in window;

  const submit = async (raw: string) => {
    const value = raw.trim();
    if (!value || busy) return;
    setBusy(true);
    setResult(null);
    const loc = await quietLocation();
    const { data, error } = await (supabase as any).rpc("check_in_booking", {
      _code: value, _lat: loc?.lat ?? null, _lng: loc?.lng ?? null,
    });
    setBusy(false);
    setResult(error ? { ok: false, reason: error.message } : (data as Result));
    setCode("");
    if (params.get("code")) setParams({}, { replace: true });
  };

  useEffect(() => {
    const fromLink = params.get("code");
    if (fromLink && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void submit(fromLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => stopCamera, []);

  const startCamera = async () => {
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      requestAnimationFrame(async () => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (!streamRef.current || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (found?.[0]?.rawValue) {
              stopCamera();
              void submit(found[0].rawValue);
              return;
            }
          } catch { /* frame not ready yet */ }
          setTimeout(tick, 250);
        };
        void tick();
      });
    } catch {
      setResult({ ok: false, reason: "Couldn't open the camera. Type the 6-character code instead." });
      stopCamera();
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Check in a <span className="text-gold">creator</span>
          </h1>
          {role === "venue_staff" && (
            <button onClick={() => void signOut()} className="text-sm text-muted-foreground flex items-center gap-1">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          )}
        </div>

        {result && (
          <div className={`rounded-2xl border p-5 mb-5 ${result.ok ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"}`}>
            {result.ok ? (
              <div className="text-center">
                {result.avatar_url ? (
                  <img src={result.avatar_url} alt="" className="w-28 h-28 rounded-full object-cover mx-auto mb-3 border-4 border-success/40" />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-muted-foreground">
                    {(result.creator_name || "?")[0]}
                  </div>
                )}
                <p className="text-xl font-bold text-foreground">{result.creator_name || "Creator"}</p>
                {result.instagram_handle && (
                  <p className="text-muted-foreground">@{result.instagram_handle.replace(/^@/, "")}</p>
                )}
                <p className="flex items-center justify-center gap-1.5 text-success font-semibold text-lg mt-3">
                  <CheckCircle2 className="w-5 h-5" /> Checked in
                </p>
                <div className="mt-4 rounded-xl bg-card border border-border p-3 text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Their offer</p>
                  <p className="font-medium text-foreground">{result.offer_title}</p>
                  {result.offer_description && <p className="text-sm text-muted-foreground mt-0.5">{result.offer_description}</p>}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Make sure the face matches the photo — a forwarded screenshot shows someone else.
                </p>
              </div>
            ) : (
              <p className="flex items-start gap-2 text-destructive font-medium">
                <XCircle className="w-5 h-5 shrink-0 mt-0.5" /> {result.reason}
              </p>
            )}
          </div>
        )}

        {scanning ? (
          <div className="space-y-3">
            <video ref={videoRef} playsInline muted className="w-full rounded-2xl bg-black aspect-square object-cover" />
            <Button variant="outline" className="w-full" onClick={stopCamera}>Cancel</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {canScanInPage ? (
              <Button onClick={() => void startCamera()} disabled={busy} className="w-full h-14 text-base gradient-gold text-accent-foreground font-semibold">
                <Camera className="w-5 h-5 mr-2" /> Scan creator
              </Button>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                <Camera className="w-5 h-5 inline mr-1.5 -mt-0.5 text-gold" />
                Point your phone's camera at the creator's QR code and tap the link that appears — it checks them in here.
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground mb-2">Or type the 6-character code under their QR</p>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") void submit(code); }}
                  placeholder="ABC123"
                  maxLength={8}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  className="text-center text-xl tracking-[0.3em] font-mono h-12"
                />
                <Button onClick={() => void submit(code)} disabled={busy || code.trim().length < 6} className="h-12">
                  {busy ? "…" : "Check in"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanCheckIn;
