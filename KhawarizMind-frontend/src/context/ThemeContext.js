import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useSettings } from "./SettingsContext";
import { getErrorMessage } from "../services/api";

const ThemeModeContext = createContext();

const DEFAULT_THEME_MODE = "light";

export function ThemeModeProvider({ children }) {
  const {
    preferences,
    updateSection,
    loading,
    error: settingsError,
  } = useSettings();

  const mode = preferences.theme || DEFAULT_THEME_MODE;

  const setThemeMode = useCallback(
    async (nextMode, options = {}) => {
      if (!nextMode) return mode;
      const shouldPersist = options?.persist !== false;
      if (!shouldPersist) {
        return nextMode;
      }
      try {
        await updateSection("theming", { theme: nextMode });
        return nextMode;
      } catch (err) {
        const message = getErrorMessage(err, "Failed to update theme");
        console.error(message, err);
        throw err;
      }
    },
    [mode, updateSection]
  );

  const toggleTheme = useCallback(() => {
    const next = mode === "light" ? "dark" : "light";
    return setThemeMode(next);
  }, [mode, setThemeMode]);

  const value = useMemo(
    () => ({
      mode,
      setThemeMode,
      toggleTheme,
      isHydrated: !loading,
      loading,
      error: settingsError,
    }),
    [mode, setThemeMode, toggleTheme, loading, settingsError]
  );

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
