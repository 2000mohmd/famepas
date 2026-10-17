import { Link } from "react-router-dom";
import { MapPin, Users, Sparkles } from "lucide-react";
import { prettyLabel } from "@/lib/format";
import { useTranslation } from "react-i18next";

/** Photo-led offer card for the creator side (Dashboard, Home, Explore). */
const OfferTile = ({ offer, className = "", footer, corner }: { offer: any; className?: string; footer?: React.ReactNode; corner?: React.ReactNode }) => {
  const { t } = useTranslation();
  const cover = offer.cover_image_url || offer.image_url || offer.venues?.cover_image_url;
  const slots = offer.max_redemptions ? offer.max_redemptions - (offer.current_redemptions ?? 0) : null;
  return (
    <div className={`group relative rounded-3xl bg-card border border-border p-2.5 shadow-[var(--venue-shadow)] hover:shadow-[0_16px_40px_-20px_hsl(0_35%_16%/.45)] transition ${className}`}>
      <Link to={`/influencer/offers/${offer.id}`} className="block">
        <div className="relative rounded-[1.4rem] overflow-hidden aspect-[4/5] bg-muted">
          {cover
            ? <img src={cover} alt={offer.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.04] transition duration-500" />
            : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--venue-brand)), hsl(0 60% 26%))" }}><Sparkles className="w-10 h-10" style={{ color: "hsl(var(--primary))" }} /></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          {offer.offer_type && (
            <span className="absolute start-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: "hsl(var(--primary))", color: "hsl(var(--venue-brand))" }}>
              {t(`creator.offerTypes.${offer.offer_type}`, { defaultValue: prettyLabel(offer.offer_type) })}
            </span>
          )}
          {!corner && slots != null && slots > 0 && slots <= 5 && (
            <span className="absolute end-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold bg-white/90 text-neutral-900">{t("creator.offer.left", { n: slots })}</span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              {offer.venues?.logo_url
                ? <img src={offer.venues.logo_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/80 bg-white" />
                : <span className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/60" />}
              <span className="text-sm font-semibold truncate">{offer.venues?.name}</span>
            </div>
            <h3 className="text-lg font-extrabold leading-tight line-clamp-2">{offer.title}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-white/80">
              {offer.venues?.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{offer.venues.city}</span>}
              {offer.min_followers > 0 && <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{Number(offer.min_followers).toLocaleString()}+</span>}
            </div>
          </div>
        </div>
      </Link>
      {corner && <div className="absolute end-5 top-5 z-10">{corner}</div>}
      {footer && <div className="px-2 pt-3 pb-1">{footer}</div>}
    </div>
  );
};

export default OfferTile;
