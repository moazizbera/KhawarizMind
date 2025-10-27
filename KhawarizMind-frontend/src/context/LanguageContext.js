import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getSettings, updateSettings } from "../services/api";

const LanguageContext = createContext();

const DEFAULT_LANGUAGE = "en";

export function LanguageProvider({ children }) {
  const getInitialLanguage = () => {
    if (typeof window === "undefined") {
      return DEFAULT_LANGUAGE;
    }
    return window.localStorage.getItem("lang") || DEFAULT_LANGUAGE;
  };

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
    let cancelled = false;

    async function syncWithServer() {
      try {
        const data = await getSettings();
        if (cancelled) return;

        const serverLanguage =
          data?.preferences?.language || data?.language || null;

        if (serverLanguage && serverLanguage !== langRef.current) {
          setLangState(serverLanguage);
        }
      } catch (error) {
        console.warn("Failed to hydrate language from settings", error);
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    syncWithServer();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistLanguage = useCallback(async (nextLanguage, options = {}) => {
    const { persistToServer = true } = options;
    const previous = langRef.current;

    setLangState(nextLanguage);
    langRef.current = nextLanguage;

    if (!persistToServer) {
      return nextLanguage;
    }

    try {
      await updateSettings({ language: nextLanguage });
      return nextLanguage;
    } catch (error) {
      console.error("Failed to update language preference", error);
      setLangState(previous);
      langRef.current = previous;
      throw error;
    }
  }, []);

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
