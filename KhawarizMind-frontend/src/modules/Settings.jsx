import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  List,
  ListItem,
  ListItemText,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { useSettings } from "../context/SettingsContext";
import { getErrorMessage } from "../services/api";

function TabPanel({ value, current, children }) {
  if (value !== current) {
    return null;
  }
  return (
    <Box role="tabpanel" sx={{ py: 3 }}>
      {children}
    </Box>
  );
}

function formatTimestamp(value, lang) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const locale = lang === "ar" ? "ar" : "en";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function Settings() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const {
    loading,
    error,
    updateSection,
    savingSection,
    preferences,
    notifications,
    integrations,
    auditLogs,
    canEdit,
    requiredRoles,
    missingRoles,
  } = useSettings();

  const isRtl = lang === "ar";

  const [activeTab, setActiveTab] = useState("localization");
  const [toast, setToast] = useState({ open: false, severity: "info", message: "" });
  const [form, setForm] = useState({
    language: "en",
    theme: "light",
    notifications: { email: false, sms: false, push: false },
    integrations: { slackWebhook: "", teamsWebhook: "", apiKey: "" },
  });

  useEffect(() => {
    setForm({
      language: preferences.language || "en",
      theme: preferences.theme || "light",
      notifications: {
        email: Boolean(notifications.email),
        sms: Boolean(notifications.sms),
        push: Boolean(notifications.push),
      },
      integrations: {
        slackWebhook: integrations.slackWebhook || "",
        teamsWebhook: integrations.teamsWebhook || "",
        apiKey: integrations.apiKey || "",
      },
    });
  }, [preferences, notifications, integrations]);

  const tabs = useMemo(
    () => [
      { value: "localization", label: t("SettingsTabLocalization") },
      { value: "theming", label: t("SettingsTabTheming") },
      { value: "notifications", label: t("SettingsTabNotifications") },
      { value: "integrations", label: t("SettingsTabIntegrations") },
    ],
    [t]
  );

  const sectionLabels = useMemo(
    () => ({
      localization: t("SettingsTabLocalization"),
      theming: t("SettingsTabTheming"),
      notifications: t("SettingsTabNotifications"),
      integrations: t("SettingsTabIntegrations"),
    }),
    [t]
  );

  const handleTabChange = useCallback((_, value) => {
    setActiveTab(value);
  }, []);

  const handleLanguageChange = useCallback((event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, language: value }));
  }, []);

  const handleThemeChange = useCallback((event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, theme: value }));
  }, []);

  const handleNotificationToggle = useCallback(
    (key) => (_, checked) => {
      setForm((prev) => ({
        ...prev,
        notifications: { ...prev.notifications, [key]: checked },
      }));
    },
    []
  );

  const handleIntegrationChange = useCallback(
    (key) => (event) => {
      const value = event.target.value;
      setForm((prev) => ({
        ...prev,
        integrations: { ...prev.integrations, [key]: value },
      }));
    },
    []
  );

  const showToast = useCallback((severity, message) => {
    setToast({ open: true, severity, message });
  }, []);

  const handleSave = useCallback(
    async (section) => {
      try {
        let payload = {};
        if (section === "localization") {
          payload = { language: form.language };
        } else if (section === "theming") {
          payload = { theme: form.theme };
        } else if (section === "notifications") {
          payload = { notifications: form.notifications };
        } else if (section === "integrations") {
          payload = { integrations: form.integrations };
        }
        await updateSection(section, payload);
        showToast("success", t("SettingsSaveSuccess"));
      } catch (err) {
        showToast("error", getErrorMessage(err, t("SettingsSaveError")));
      }
    },
    [form, showToast, t, updateSection]
  );

  const auditEntries = auditLogs.map((entry) => ({
    ...entry,
    sectionLabel: sectionLabels[entry.section] || entry.section,
  }));

  return (
    <Paper sx={{ p: 3 }} dir={isRtl ? "rtl" : "ltr"}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        {t("Settings")}
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>
        {t("SettingsDescription")}
      </Typography>

      {loading && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ mt: 2, mb: 2 }}
        >
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            {t("SettingsLoading")}
          </Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {(() => {
        const deniedRoles = (Array.isArray(missingRoles) && missingRoles.length > 0)
          ? missingRoles
          : Array.isArray(requiredRoles)
          ? requiredRoles
          : [];
        return !canEdit && deniedRoles.length > 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t("SettingsAccessDenied", {
              roles: deniedRoles.join(", "),
            })}
          </Alert>
        ) : null;
      })()}

      {Array.isArray(requiredRoles) && requiredRoles.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", mb: 1 }}>
            {t("SettingsRequiredRolesLabel")}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
            {requiredRoles.map((role) => (
              <Chip key={role} label={role} color="primary" variant="outlined" />
            ))}
          </Stack>
        </Box>
      )}

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label={t("SettingsTabsAriaLabel")}
        sx={{ borderBottom: 1, borderColor: "divider", mt: 3 }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.value} label={tab.label} value={tab.value} />
        ))}
      </Tabs>

      <TabPanel current={activeTab} value="localization">
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {t("LocalizationDescription")}
          </Typography>
          <FormControl component="fieldset" disabled={!canEdit || savingSection === "localization"}>
            <FormLabel>{t("LocalizationLanguageLabel")}</FormLabel>
            <RadioGroup
              row
              value={form.language}
              onChange={handleLanguageChange}
              sx={{ mt: 1 }}
            >
              <FormControlLabel
                value="en"
                control={<Radio />}
                label={t("LanguageEnglish")}
              />
              <FormControlLabel
                value="ar"
                control={<Radio />}
                label={t("LanguageArabic")}
              />
            </RadioGroup>
          </FormControl>
          <Box>
            <Button
              variant="contained"
              onClick={() => handleSave("localization")}
              disabled={!canEdit || savingSection === "localization"}
            >
              {savingSection === "localization"
                ? t("SettingsSaving")
                : t("SettingsSaveAction")}
            </Button>
          </Box>
        </Stack>
      </TabPanel>

      <TabPanel current={activeTab} value="theming">
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {t("ThemingDescription")}
          </Typography>
          <FormControl component="fieldset" disabled={!canEdit || savingSection === "theming"}>
            <FormLabel>{t("ThemingModeLabel")}</FormLabel>
            <RadioGroup
              row
              value={form.theme}
              onChange={handleThemeChange}
              sx={{ mt: 1 }}
            >
              <FormControlLabel
                value="light"
                control={<Radio />}
                label={t("ThemeLight")}
              />
              <FormControlLabel
                value="dark"
                control={<Radio />}
                label={t("ThemeDark")}
              />
            </RadioGroup>
          </FormControl>
          <Box>
            <Button
              variant="contained"
              onClick={() => handleSave("theming")}
              disabled={!canEdit || savingSection === "theming"}
            >
              {savingSection === "theming"
                ? t("SettingsSaving")
                : t("SettingsSaveAction")}
            </Button>
          </Box>
        </Stack>
      </TabPanel>

      <TabPanel current={activeTab} value="notifications">
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            {t("NotificationsDescription")}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.notifications.email)}
                onChange={handleNotificationToggle("email")}
                disabled={!canEdit || savingSection === "notifications"}
              />
            }
            label={t("NotificationEmail")}
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.notifications.sms)}
                onChange={handleNotificationToggle("sms")}
                disabled={!canEdit || savingSection === "notifications"}
              />
            }
            label={t("NotificationSMS")}
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.notifications.push)}
                onChange={handleNotificationToggle("push")}
                disabled={!canEdit || savingSection === "notifications"}
              />
            }
            label={t("NotificationPush")}
          />
          <Box>
            <Button
              variant="contained"
              onClick={() => handleSave("notifications")}
              disabled={!canEdit || savingSection === "notifications"}
            >
              {savingSection === "notifications"
                ? t("SettingsSaving")
                : t("SettingsSaveAction")}
            </Button>
          </Box>
        </Stack>
      </TabPanel>

      <TabPanel current={activeTab} value="integrations">
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {t("IntegrationsDescription")}
          </Typography>
          <TextField
            label={t("IntegrationsSlackWebhook")}
            value={form.integrations.slackWebhook}
            onChange={handleIntegrationChange("slackWebhook")}
            disabled={!canEdit || savingSection === "integrations"}
            fullWidth
            autoComplete="off"
          />
          <TextField
            label={t("IntegrationsTeamsWebhook")}
            value={form.integrations.teamsWebhook}
            onChange={handleIntegrationChange("teamsWebhook")}
            disabled={!canEdit || savingSection === "integrations"}
            fullWidth
            autoComplete="off"
          />
          <TextField
            label={t("IntegrationsApiKey")}
            value={form.integrations.apiKey}
            onChange={handleIntegrationChange("apiKey")}
            disabled={!canEdit || savingSection === "integrations"}
            fullWidth
            autoComplete="off"
            type="password"
            helperText={t("IntegrationsSecurityNote")}
          />
          <Box>
            <Button
              variant="contained"
              onClick={() => handleSave("integrations")}
              disabled={!canEdit || savingSection === "integrations"}
            >
              {savingSection === "integrations"
                ? t("SettingsSaving")
                : t("SettingsSaveAction")}
            </Button>
          </Box>
        </Stack>
      </TabPanel>

      <Divider sx={{ my: 4 }} />

      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t("AuditLogTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("AuditLogSubtitle")}
        </Typography>
        {auditEntries.length === 0 ? (
          <Typography color="text.secondary">
            {t("AuditLogEmpty")}
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {auditEntries.map((entry) => (
              <ListItem key={entry.id} alignItems="flex-start" sx={{ px: 0 }}>
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Typography variant="subtitle2">{entry.action}</Typography>
                      <Chip
                        size="small"
                        label={entry.sectionLabel}
                        color="primary"
                        variant="outlined"
                      />
                    </Stack>
                  }
                  secondary={
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t("AuditLogSecondaryLine", {
                          actor:
                            entry.actor && entry.actor.trim()
                              ? entry.actor
                              : t("AuditLogActorUnknown"),
                          time: formatTimestamp(entry.timestamp, lang),
                        })}
                      </Typography>
                      {entry.details ? (
                        <Typography
                          variant="caption"
                          sx={{ color: "text.disabled", wordBreak: "break-word" }}
                        >
                          {typeof entry.details === "string"
                            ? entry.details
                            : JSON.stringify(entry.details)}
                        </Typography>
                      ) : null}
                    </Stack>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: isRtl ? "left" : "right" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
