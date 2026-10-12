import { useTranslation } from "react-i18next";
import { setLanguage } from "@/i18n";
import { Languages } from "lucide-react";

const LanguageSwitcher = ({ className = "" }: { className?: string }) => {
  const { i18n } = useTranslation();
  const next = i18n.language === "ar" ? "en" : "ar";

  return (
    <button
      onClick={() => setLanguage(next)}
      className={`inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground ${className}`}
      aria-label="Switch language"
    >
      <Languages className="w-4 h-4" />
      {next === "ar" ? "العربية" : "English"}
    </button>
  );
};

export default LanguageSwitcher;
