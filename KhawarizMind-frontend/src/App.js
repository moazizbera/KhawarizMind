import React, { useMemo, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Hero from "./components/Hero";
import LoginCard from "./components/LoginCard";
import DashboardShell from "./components/DashboardShell";

import { useTranslation } from "react-i18next";
import "./i18n";

import {
  CssBaseline,
  ThemeProvider,
  IconButton,
  Box,
  createTheme,
  Tooltip,
  Alert,
  Snackbar,
} from "@mui/material";

import { AnimatePresence } from "framer-motion";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import TranslateIcon from "@mui/icons-material/Translate";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

import { SettingsProvider } from "./context/SettingsContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { ThemeModeProvider, useThemeMode } from "./context/ThemeContext";

// Emotion cache for RTL/LTR
const createEmotionCache = (isRtl) =>
  createCache({
    key: isRtl ? "mui-rtl" : "mui",
    stylisPlugins: isRtl ? [prefixer, rtlPlugin] : [prefixer],
  });

function AppContent() {
  const { lang, toggleLanguage, loading: languageLoading, error: languageError } =
    useLanguage();
  const { mode, toggleTheme, loading: themeLoading, error: themeError } =
    useThemeMode();
  const { t, i18n } = useTranslation();

  const isRtl = lang === "ar";

  // keep i18n + document direction synchronized with LanguageContext
  useEffect(() => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.body.dir = isRtl ? "rtl" : "ltr";
  }, [lang, i18n, isRtl]);

  const theme = useMemo(
    () =>
      createTheme({
        direction: isRtl ? "rtl" : "ltr",
        palette: {
          mode,
          ...(mode === "dark"
            ? {
                primary: { main: "#2563eb" },
                background: { default: "#0b1221", paper: "#0f1b33" },
                text: { primary: "#ffffff", secondary: "rgba(255,255,255,0.7)" },
              }
            : {
                primary: { main: "#1e3a8a" },
                background: { default: "#f3f4f6", paper: "#ffffff" },
                text: { primary: "#0d1b2a", secondary: "#415a77" },
              }),
        },
        typography: {
          fontFamily: isRtl ? "'Cairo', sans-serif" : "'Roboto', sans-serif",
        },
        shape: { borderRadius: 12 },
      }),
    [isRtl, mode]
  );

  const cache = useMemo(() => createEmotionCache(isRtl), [isRtl]);

  const hasToggleError = Boolean(languageError || themeError);
  const toggleErrorMessage = languageError || themeError || "";

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          {/* Floating controls (theme + language) */}
          <Box
            sx={{
              position: "fixed",
              top: 16,
              right: 16,
              zIndex: 9999,
              display: "flex",
              gap: 1,
            }}
          >
            <Tooltip
              title={
                themeLoading
                  ? t("Loading")
                  : mode === "dark"
                  ? t("SwitchToLight")
                  : t("SwitchToDark")
              }
            >
              <span>
                <IconButton
                  onClick={toggleTheme}
                  disabled={themeLoading || Boolean(themeError)}
                  sx={{
                    bgcolor: "primary.main",
                    color: "#fff",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={languageLoading ? t("Loading") : t("ToggleLanguage")}>
              <span>
                <IconButton
                  onClick={toggleLanguage}
                  disabled={languageLoading || Boolean(languageError)}
                  sx={{
                    bgcolor: "primary.main",
                    color: "#fff",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  <TranslateIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Hero />} />
              <Route path="/login" element={<LoginCard />} />
              <Route path="/dashboard/*" element={<DashboardShell />} />
            </Routes>
          </AnimatePresence>
        </Router>
        <Snackbar
          open={hasToggleError}
          autoHideDuration={6000}
          anchorOrigin={{ vertical: "bottom", horizontal: isRtl ? "left" : "right" }}
        >
          <Alert severity="error" variant="filled" sx={{ width: "100%" }}>
            {toggleErrorMessage}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    </CacheProvider>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <LanguageProvider>
        <ThemeModeProvider>
          <AppContent />
        </ThemeModeProvider>
      </LanguageProvider>
    </SettingsProvider>
  );
}
