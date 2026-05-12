import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import ro from "./locales/ro.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

const stored = typeof window !== "undefined" ? localStorage.getItem("ff_lang") : null;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ro: { translation: ro },
      es: { translation: es },
      fr: { translation: fr },
    },
    lng: stored || undefined,
    fallbackLng: "en",
    supportedLngs: ["en", "ro", "es", "fr"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "ff_lang",
      caches: ["localStorage"],
    },
  });

export default i18n;

export const LANGUAGES = [
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "ro", flag: "🇷🇴", name: "Română" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
];
