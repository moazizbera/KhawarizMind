import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSettings } from "./SettingsContext";

const ThemeModeContext = createContext();

const DEFAULT_THEME_MODE = "light";

export function ThemeModeProvider({ children }) {
  const getInitial = () => {
    if (typeof window === "undefined") {
      return DEFAULT_THEME_MODE;
    }
    const saved = window.localStorage.getItem("themeMode");
    if (saved) return saved;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    return prefersDark ? "dark" : DEFAULT_THEME_MODE;
  };

  const {
    settings,
    saveSettings,
    isHydrated: settingsHydrated,
    error: settingsError,
  } = useSettings();
  const settingsTheme = settings?.theme;

  const [mode, setMode] = useState(getInitial);
  const [hydrated, setHydrated] = useState(false);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("themeMode", mode);
      document.documentElement.setAttribute("data-theme", mode);
    }
  }, [mode]);

  useEffect(() => {
    if (!settingsHydrated) {
      return;
    }

    if (!settingsError && settingsTheme && settingsTheme !== modeRef.current) {
      setMode(settingsTheme);
    }
    setHydrated(true);
  }, [settingsHydrated, settingsTheme, settingsError]);

  const persistMode = useCallback(
    async (nextMode, options = {}) => {
      const { persistToServer = true } = options;
      const previous = modeRef.current;

      setMode(nextMode);
      modeRef.current = nextMode;

      if (!persistToServer) {
        return nextMode;
      }

      try {
        await saveSettings({ theme: nextMode });
        return nextMode;
      } catch (error) {
        console.error("Failed to update theme preference", error);
        setMode(previous);
        modeRef.current = previous;
        if (typeof window !== "undefined") {
          document.documentElement.setAttribute("data-theme", previous);
        }
        throw error;
      }
    },
    [saveSettings]
  );

  const toggleTheme = useCallback(() => {
    const next = modeRef.current === "light" ? "dark" : "light";
    return persistMode(next);
  }, [persistMode]);

  const setThemeMode = useCallback(
    (nextMode, options) => persistMode(nextMode, options),
    [persistMode]
  );

  const value = useMemo(
    () => ({ mode, toggleTheme, setThemeMode, isHydrated: hydrated }),
    [mode, toggleTheme, setThemeMode, hydrated]
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
