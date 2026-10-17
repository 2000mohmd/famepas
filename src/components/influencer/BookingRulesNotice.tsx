import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const extraGuests = maxGuests && maxGuests > 1 ? maxGuests - 1 : 0;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-semibold text-foreground">{t("creator.shared.beforeApply")}</p>
      <ul className="text-xs text-muted-foreground space-y-1 list-disc ps-4">
        <li>{t("creator.shared.ruleDeadline", { n: rules.post_deadline_hours })}</li>
        <li>{extraGuests > 0 ? t("creator.shared.ruleGuests", { n: extraGuests }) : t("creator.shared.ruleSolo")}</li>
        {requirements && <li>{requirements}</li>}
        <li>{t("creator.shared.ruleStrikes", { n: rules.strikes_to_suspend })}</li>
      </ul>
      <label className="flex items-start gap-2 text-xs pt-1 cursor-pointer">
        <Checkbox checked={accepted} onCheckedChange={(v) => onAcceptedChange(!!v)} className="mt-0.5" />
        <span>{t("creator.shared.acceptRules")}</span>
      </label>
    </div>
  );
};

export default BookingRulesNotice;
