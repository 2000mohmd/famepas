import { useState } from "react";

/** Creator photo that falls back to initials when the URL is missing or dead
 * (older avatars are expiring TikTok CDN links). */
const CreatorPhoto = ({ src, name, className = "", style, initialsClassName = "" }: {
  src?: string | null; name?: string | null; className?: string; style?: React.CSSProperties; initialsClassName?: string;
}) => {
  const [broken, setBroken] = useState(false);
  if (src && !broken) return <img src={src} alt={name ?? ""} loading="lazy" className={className} style={style} onError={() => setBroken(true)} />;
  return (
    <span className={`${className} ${initialsClassName} flex items-center justify-center font-bold bg-muted text-muted-foreground`} style={style}>
      {(name || "FP").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
    </span>
  );
};

export default CreatorPhoto;
