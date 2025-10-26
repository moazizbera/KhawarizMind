import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeModeContext = createContext();

export function ThemeModeProvider({ children }) {
  const getInitial = () => {
    const saved = localStorage.getItem("themeMode");
    if (saved) return saved;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    return prefersDark ? "dark" : "light";
  };

  const [mode, setMode] = useState(getInitial);

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
    document.documentElement.setAttribute("data-theme", mode);
  }, [mode]);

  const toggleTheme = () => setMode((m) => (m === "light" ? "dark" : "light"));
  const value = useMemo(() => ({ mode, toggleTheme }), [mode]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
