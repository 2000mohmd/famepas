/** Delivery stages of a booking, in the words Adnan's spec uses. */
export const DELIVERY_LABEL: Record<string, string> = {
  booked: "Booked",
  visited: "Visited — post due",
  posted: "Posted",
  late: "Posted late",
  verified: "Verified",
  no_show: "No-show",
  missed: "Missed",
  cancelled: "Cancelled",
};

export const DELIVERY_TONE: Record<string, string> = {
  booked: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  visited: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  posted: "bg-gold/15 text-gold border-gold/30",
  late: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  verified: "bg-success/15 text-success border-success/30",
  no_show: "bg-destructive/15 text-destructive border-destructive/30",
  missed: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

/** Stages that count as a delivered post, for post rate. */
export const DELIVERED = new Set(["posted", "late", "verified"]);
/** Stages where the creator was at the venue. */
export const VISITED = new Set(["visited", "posted", "late", "verified", "missed"]);
