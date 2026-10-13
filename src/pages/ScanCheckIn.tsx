import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/BrandLogo";
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

  const corner = "absolute w-10 h-10 border-[hsl(var(--primary))]";

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: "radial-gradient(120% 80% at 50% 0%, hsl(0 70% 22%), hsl(0 100% 12%))" }}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <BrandLogo tone="gold" size={20} />
          {role === "venue_staff" && (
            <button onClick={() => void signOut()} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold text-white/80 bg-white/10 hover:bg-white/15">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          )}
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "hsl(var(--gold-light))" }}>Door check-in</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight mb-6">Check in a creator</h1>

        {result && (
          result.ok ? (
            <div className="rounded-[2rem] bg-white p-6 mb-5 text-center shadow-2xl">
              <div className="relative w-32 h-32 mx-auto mb-4">
                {result.avatar_url
                  ? <img src={result.avatar_url} alt="" className="w-32 h-32 rounded-full object-cover border-4 border-emerald-400" />
                  : <div className="w-32 h-32 rounded-full bg-neutral-100 border-4 border-emerald-400 flex items-center justify-center text-4xl font-extrabold text-neutral-400">{(result.creator_name || "?")[0]}</div>}
                <span className="absolute -bottom-1 -right-1 w-11 h-11 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-white" /></span>
              </div>
              <p className="text-2xl font-extrabold text-neutral-900">{result.creator_name || "Creator"}</p>
              {result.instagram_handle && <p className="text-neutral-500">@{result.instagram_handle.replace(/^@/, "")}</p>}
              <p className="inline-flex items-center gap-1.5 mt-3 px-4 h-9 rounded-full bg-emerald-50 text-emerald-700 font-bold">Checked in</p>
              <div className="mt-5 rounded-2xl bg-neutral-50 border border-neutral-100 p-4 text-left">
                <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 mb-1">Their offer</p>
                <p className="font-bold text-neutral-900">{result.offer_title}</p>
                {result.offer_description && <p className="text-sm text-neutral-500 mt-0.5">{result.offer_description}</p>}
              </div>
              <p className="text-xs text-neutral-500 mt-4">Make sure the face matches the photo — a forwarded screenshot shows someone else.</p>
              <button type="button" onClick={() => setResult(null)} className="mt-5 w-full h-12 rounded-full font-bold" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>Check in the next creator</button>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-5 mb-5 flex items-start gap-3 shadow-xl">
              <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0"><XCircle className="w-5 h-5 text-red-600" /></span>
              <div>
                <p className="font-extrabold text-neutral-900">Couldn't check in</p>
                <p className="text-sm text-neutral-600 mt-0.5">{result.reason}</p>
              </div>
            </div>
          )
        )}

        {!result?.ok && (
          scanning ? (
            <div className="space-y-4">
              <div className="relative rounded-[2rem] overflow-hidden bg-black aspect-square">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                <span className={`${corner} left-6 top-6 border-l-4 border-t-4 rounded-tl-2xl`} />
                <span className={`${corner} right-6 top-6 border-r-4 border-t-4 rounded-tr-2xl`} />
                <span className={`${corner} left-6 bottom-6 border-l-4 border-b-4 rounded-bl-2xl`} />
                <span className={`${corner} right-6 bottom-6 border-r-4 border-b-4 rounded-br-2xl`} />
                <p className="absolute inset-x-0 bottom-3 text-center text-sm font-semibold text-white/85">Point at the creator's QR code</p>
              </div>
              <button type="button" onClick={stopCamera} className="w-full h-12 rounded-full font-bold text-white bg-white/10 hover:bg-white/15">Cancel</button>
            </div>
          ) : (
            <div className="space-y-4">
              {canScanInPage ? (
                <button type="button" onClick={() => void startCamera()} disabled={busy}
                  className="w-full rounded-[2rem] p-6 flex items-center gap-5 text-left transition hover:brightness-105 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, hsl(var(--gold-light)), hsl(var(--primary)))", color: "hsl(var(--venue-brand))" }}>
                  <span className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--venue-brand))" }}>
                    <Camera className="w-7 h-7" style={{ color: "hsl(var(--primary))" }} />
                  </span>
                  <span>
                    <span className="block text-2xl font-extrabold">Scan QR code</span>
                    <span className="block text-sm opacity-80">Opens your camera</span>
                  </span>
                </button>
              ) : (
                <div className="rounded-[2rem] p-5 flex items-start gap-4 text-white bg-white/10 border border-white/15">
                  <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary))" }}><Camera className="w-6 h-6" style={{ color: "hsl(var(--venue-brand))" }} /></span>
                  <p className="text-sm leading-relaxed text-white/85">Point your phone's camera at the creator's QR code and tap the link that appears — it checks them in right here.</p>
                </div>
              )}

              <div className="rounded-[2rem] bg-white p-5 shadow-xl">
                <p className="text-sm font-bold text-neutral-900">Or type the code</p>
                <p className="text-xs text-neutral-500 mb-3">The 6 characters under their QR code</p>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") void submit(code); }}
                  placeholder="ABC123"
                  maxLength={8}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  className="text-center text-2xl tracking-[0.4em] font-mono h-16 rounded-2xl bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-300"
                />
                <button type="button" onClick={() => void submit(code)} disabled={busy || code.trim().length < 6}
                  className="mt-3 w-full h-14 rounded-full font-bold text-base disabled:opacity-40" style={{ background: "hsl(var(--venue-brand))", color: "hsl(var(--venue-brand-foreground))" }}>
                  {busy ? "Checking…" : "Check in"}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ScanCheckIn;
