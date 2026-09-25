/** Follower tier — venues use this to decide which offer suits which creator (per Adnan's Sept 24 audit). */
export type CreatorTier = "Nano" | "Micro" | "Macro";

export const creatorTier = (maxFollowers: number): CreatorTier =>
  maxFollowers >= 100_000 ? "Macro" : maxFollowers >= 10_000 ? "Micro" : "Nano";

export const tierBadgeClass: Record<CreatorTier, string> = {
  Nano: "bg-secondary text-muted-foreground border-border",
  Micro: "bg-primary/20 text-primary border-primary/30",
  Macro: "bg-gold/20 text-gold border-gold/30",
};

/** Below this, an approval is almost certainly a fake/test account rather than a real creator. */
export const LOW_FOLLOWER_THRESHOLD = 100;
