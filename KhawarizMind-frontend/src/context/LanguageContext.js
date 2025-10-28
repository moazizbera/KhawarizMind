import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSettings } from "./SettingsContext";

const LanguageContext = createContext();

const DEFAULT_LANGUAGE = "en";

export function LanguageProvider({ children }) {
  const getInitialLanguage = () => {
    if (typeof window === "undefined") {
      return DEFAULT_LANGUAGE;
    }
    return window.localStorage.getItem("lang") || DEFAULT_LANGUAGE;
  };

  const {
    settings,
    saveSettings,
    isHydrated: settingsHydrated,
    error: settingsError,
  } = useSettings();
  const settingsLanguage = settings?.language;

  const [lang, setLangState] = useState(getInitialLanguage);
  const [hydrated, setHydrated] = useState(false);
  const langRef = useRef(lang);

  useEffect(() => {
    langRef.current = lang;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lang", lang);
    }
  }, [lang]);

  useEffect(() => {
    if (!settingsHydrated) {
      return;
    }

    if (!settingsError && settingsLanguage && settingsLanguage !== langRef.current) {
      setLangState(settingsLanguage);
    }
    setHydrated(true);
  }, [settingsHydrated, settingsLanguage, settingsError]);

  const persistLanguage = useCallback(async (nextLanguage, options = {}) => {
    const { persistToServer = true } = options;
    const previous = langRef.current;

    setLangState(nextLanguage);
    langRef.current = nextLanguage;

    if (!persistToServer) {
      return nextLanguage;
    }

    try {
      await saveSettings({ language: nextLanguage });
      return nextLanguage;
    } catch (error) {
      console.error("Failed to update language preference", error);
      setLangState(previous);
      langRef.current = previous;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lang", previous);
      }
      throw error;
    }
  }, [saveSettings]);

  const toggleLanguage = useCallback(() => {
    const next = langRef.current === "en" ? "ar" : "en";
    return persistLanguage(next);
  }, [persistLanguage]);

  const setLanguage = useCallback(
    (nextLanguage, options) => persistLanguage(nextLanguage, options),
    [persistLanguage]
  );

  return (
    <LanguageContext.Provider
      value={{ lang, toggleLanguage, setLanguage, isHydrated: hydrated }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
