/** The official FamePass mark (emblem + wordmark), same files the homepage uses.
 * `tone="gold"` for burgundy/dark backgrounds, `"burgundy"` for light ones. */
const BrandLogo = ({ tone = "burgundy", size = 32, emblem = true, className = "" }: {
  tone?: "gold" | "burgundy";
  size?: number;
  emblem?: boolean;
  className?: string;
}) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    {emblem && <img src={`/website/images/emblem-${tone}.webp`} alt="" style={{ height: size * 1.6, width: "auto" }} />}
    <img src={`/website/images/wordmark-${tone}.webp`} alt="FamePass" style={{ height: size * 0.8, width: "auto" }} />
  </span>
);

export default BrandLogo;
