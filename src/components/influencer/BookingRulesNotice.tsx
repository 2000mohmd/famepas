import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";

export const useBookingRules = () => {
  const [rules, setRules] = useState({ post_deadline_hours: 72, strikes_to_suspend: 2 });
  useEffect(() => {
    (supabase as any).rpc("get_booking_disclosure_rules").then(({ data }: any) => {
      if (data) setRules(data);
    });
  }, []);
  return rules;
};

/** Adnan, "Influencer Portal" item 56: disclose post deadline, +1 policy,
 * and the no-show penalty before a creator can confirm an application. */
const BookingRulesNotice = ({
  maxGuests,
  requirements,
  accepted,
  onAcceptedChange,
}: {
  maxGuests?: number | null;
  requirements?: string | null;
  accepted: boolean;
  onAcceptedChange: (v: boolean) => void;
}) => {
  const rules = useBookingRules();
  const extraGuests = maxGuests && maxGuests > 1 ? maxGuests - 1 : 0;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-semibold text-foreground">Before you apply</p>
      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
        <li>Post your content within {rules.post_deadline_hours} hours of your visit (or of delivery, for Create From Home offers).</li>
        <li>{extraGuests > 0 ? `You may bring up to ${extraGuests} guest${extraGuests > 1 ? "s" : ""}.` : "This offer is for you only — no additional guests."}</li>
        {requirements && <li>{requirements}</li>}
        <li>Missing the post deadline or not showing up counts as a strike — {rules.strikes_to_suspend} strikes suspends your account.</li>
      </ul>
      <label className="flex items-start gap-2 text-xs pt-1 cursor-pointer">
        <Checkbox checked={accepted} onCheckedChange={(v) => onAcceptedChange(!!v)} className="mt-0.5" />
        <span>I understand and accept these booking rules.</span>
      </label>
    </div>
  );
};

export default BookingRulesNotice;
