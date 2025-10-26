import React from "react";
import { motion } from "framer-motion";
import { Box, Button, Stack, Typography } from "@mui/material";
import { PlayArrow, GitHub } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

export default function Hero() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const navigate = useNavigate();

  return (
    <Box
      dir={isAr ? "rtl" : "ltr"}
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #000, #0f172a, #1e3a8a)",
        color: "#fff",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
      }}
    >
      <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
        <Typography variant="h2" fontWeight="bold" gutterBottom>
          {t("Welcome")}
        </Typography>
      </motion.div>

      <Typography variant="h6" sx={{ mb: 4, maxWidth: 900 }}>
        {t("HeroSubtitle")}
      </Typography>

      <Stack direction="row" spacing={3} justifyContent="center">
        <Button variant="contained" startIcon={<PlayArrow />} onClick={() => navigate("/login")}>
          {t("GetStarted")}
        </Button>
        <Button
          variant="outlined"
          startIcon={<GitHub />}
          href="https://github.com/moazizbera/KhawarizMind"
          target="_blank"
        >
          {t("ViewOnGitHub")}
        </Button>
      </Stack>
    </Box>
  );
}
