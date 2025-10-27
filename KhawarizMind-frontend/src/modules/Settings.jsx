import React from "react";
import { Paper, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

export default function Settings() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  return (
    <Paper sx={{ p: 3 }} dir={isRtl ? "rtl" : "ltr"}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        {t("Settings")}
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>
        {t("SettingsDescription")}
      </Typography>
    </Paper>
  );
}
