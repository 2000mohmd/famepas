import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

export const RTL_LANGS = ["ar"];
const STORAGE_KEY = "fp_lang";

const readStoredLang = (): string => {
  try { return localStorage.getItem(STORAGE_KEY) || "en"; } catch { return "en"; }
};

export const setLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* storage blocked */ }
};

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: readStoredLang(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

setLanguage(readStoredLang());

export default i18n;
