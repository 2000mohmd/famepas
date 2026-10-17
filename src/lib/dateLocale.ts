import { ar } from "date-fns/locale";
import i18n from "@/i18n";

/** date-fns options matching the current UI language: format(d, "PPP", dateOpts()). */
export const dateOpts = () => (i18n.language === "ar" ? { locale: ar } : undefined);
