import { useEffect, useState } from "react";
import QRCode from "qrcode";

const CACHE_KEY = "fp_checkin_qr";

const readCache = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
};

/**
 * The QR is a link to /scan?code=…, so venue staff can scan it with any phone
 * camera. The rendered image is cached on the device, so it still shows when
 * the creator has no signal at the venue.
 */
const CheckInCode = ({ code }: { code: string }) => {
  const [src, setSrc] = useState<string | null>(() => readCache()[code] ?? null);

  useEffect(() => {
    if (src) return;
    QRCode.toDataURL(`${window.location.origin}/scan?code=${code}`, { margin: 1, width: 240 })
      .then((url) => {
        setSrc(url);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), [code]: url })); } catch { /* storage full or blocked */ }
      })
      .catch(() => setSrc(null));
  }, [code, src]);

  return (
    <div className="mt-3 inline-flex flex-col items-center rounded-xl border border-gold/30 bg-white p-3">
      <p className="text-[11px] font-medium text-neutral-600 mb-2">Show this at the venue</p>
      {src ? (
        <img src={src} alt={`Check-in QR code ${code}`} className="w-40 h-40" />
      ) : (
        <div className="w-40 h-40 flex items-center justify-center text-xs text-neutral-400">QR unavailable</div>
      )}
      <p className="font-mono text-lg font-bold tracking-[0.3em] text-neutral-900 mt-2">{code}</p>
      <p className="text-[10px] text-neutral-500">Backup code if the scan fails</p>
    </div>
  );
};

export default CheckInCode;
