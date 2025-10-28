import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useSettings } from "./SettingsContext";
import { getErrorMessage } from "../services/api";

const LanguageContext = createContext();

const DEFAULT_LANGUAGE = "en";

export function LanguageProvider({ children }) {
  const {
    preferences,
    updateSection,
    loading,
    error: settingsError,
  } = useSettings();

  const lang = preferences.language || DEFAULT_LANGUAGE;

  const setLanguage = useCallback(
    async (nextLanguage, options = {}) => {
      if (!nextLanguage) return lang;
      const shouldPersist = options?.persist !== false;
      if (!shouldPersist) {
        return nextLanguage;
      }
      try {
        await updateSection("localization", { language: nextLanguage });
        return nextLanguage;
      } catch (err) {
        const message = getErrorMessage(err, "Failed to update language");
        console.error(message, err);
        throw err;
      }
    },
    [lang, updateSection]
  );

  const toggleLanguage = useCallback(() => {
    const next = lang === "en" ? "ar" : "en";
    return setLanguage(next);
  }, [lang, setLanguage]);

  const value = useMemo(
    () => ({
      lang,
      setLanguage,
      toggleLanguage,
      isHydrated: !loading,
      loading,
      error: settingsError,
    }),
    [lang, setLanguage, toggleLanguage, loading, settingsError]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
