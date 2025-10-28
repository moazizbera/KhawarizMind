import React, { useEffect, useMemo, useState } from "react";
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
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { useThemeMode } from "../context/ThemeContext";
import {
  useSettings,
  createDefaultIntegrations,
  createDefaultNotifications,
} from "../context/SettingsContext";

const a11yProps = (value) => ({
  id: `settings-tab-${value}`,
  "aria-controls": `settings-tabpanel-${value}`,
});

const formatTimestamp = (value, locale) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    const formatter = new Intl.DateTimeFormat(
      locale === "ar" ? "ar" : undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
    return formatter.format(date);
  } catch (error) {
    console.warn("Failed to format timestamp", error);
    return date.toLocaleString();
  }
};

function TabPanel({ current, value, children }) {
  return (
    <Box
      role="tabpanel"
      hidden={current !== value}
      id={`settings-tabpanel-${value}`}
      aria-labelledby={`settings-tab-${value}`}
      sx={{ pt: 3 }}
    >
      {current === value ? children : null}
    </Box>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { lang, setLanguage } = useLanguage();
  const { mode, setThemeMode } = useThemeMode();
  const {
    settings: settingsState,
    loading: settingsLoading,
    isHydrated: settingsHydrated,
    error: settingsError,
    clearError,
    saveSettings,
    auditLogs,
    auditLoading,
    appendAuditLog,
  } = useSettings();
  const isRtl = lang === "ar";

  const settingsLanguage = settingsState?.language ?? lang;
  const settingsTheme = settingsState?.theme ?? mode;
  const settingsNotifications = settingsState?.notifications;
  const settingsIntegrations = settingsState?.integrations;
  const userRoles = Array.isArray(settingsState?.userRoles)
    ? settingsState.userRoles
    : [];
  const requiredRoles = Array.isArray(settingsState?.requiredRoles)
    ? settingsState.requiredRoles
    : [];

  const [activeTab, setActiveTab] = useState("localization");
  const [savingSection, setSavingSection] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [dirty, setDirty] = useState({
    localization: false,
    theming: false,
    notifications: false,
    integrations: false,
  });
  const baseNotifications = useMemo(
    () => ({
      ...createDefaultNotifications(),
      ...(settingsNotifications || {}),
    }),
    [settingsNotifications]
  );
  const baseIntegrations = useMemo(
    () => ({
      ...createDefaultIntegrations(),
      ...(settingsIntegrations || {}),
    }),
    [settingsIntegrations]
  );
  const [form, setForm] = useState({
    language: settingsLanguage,
    theme: settingsTheme,
    notifications: baseNotifications,
    integrations: baseIntegrations,
  });

  const sectionLabels = useMemo(
    () => ({
      localization: t("LocalizationTab"),
      theming: t("ThemingTab"),
      notifications: t("NotificationsTab"),
      integrations: t("IntegrationsTab"),
      system: t("AuditLogSectionSystem"),
    }),
    [t]
  );

  const tabs = useMemo(
    () => [
      { value: "localization", label: t("LocalizationTab") },
      { value: "theming", label: t("ThemingTab") },
      { value: "notifications", label: t("NotificationsTab") },
      { value: "integrations", label: t("IntegrationsTab") },
    ],
    [t]
  );

  const {
    localization: isLocalizationDirty,
    theming: isThemingDirty,
    notifications: isNotificationsDirty,
    integrations: isIntegrationsDirty,
  } = dirty;

  useEffect(() => {
    if (!settingsHydrated) {
      return;
    }

    setForm((prev) => ({
      language: isLocalizationDirty ? prev.language : settingsLanguage,
      theme: isThemingDirty ? prev.theme : settingsTheme,
      notifications: isNotificationsDirty ? prev.notifications : baseNotifications,
      integrations: isIntegrationsDirty ? prev.integrations : baseIntegrations,
    }));
  }, [
    settingsHydrated,
    settingsLanguage,
    settingsTheme,
    baseNotifications,
    baseIntegrations,
    isLocalizationDirty,
    isThemingDirty,
    isNotificationsDirty,
    isIntegrationsDirty,
  ]);

  useEffect(() => {
    setForm((prev) => {
      if (isLocalizationDirty || prev.language === lang) {
        return prev;
      }
      return { ...prev, language: lang };
    });
  }, [lang, isLocalizationDirty]);

  useEffect(() => {
    setForm((prev) => {
      if (isThemingDirty || prev.theme === mode) {
        return prev;
      }
      return { ...prev, theme: mode };
    });
  }, [mode, isThemingDirty]);

  const canEdit = useMemo(() => {
    if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
      return true;
    }
    if (!Array.isArray(userRoles) || userRoles.length === 0) {
      return false;
    }
    return requiredRoles.some((role) => userRoles.includes(role));
  }, [requiredRoles, userRoles]);

  const missingRoles = useMemo(() => {
    if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
      return [];
    }
    return requiredRoles.filter(
      (role) => !(Array.isArray(userRoles) && userRoles.includes(role))
    );
  }, [requiredRoles, userRoles]);

  const handleTabChange = (event, value) => {
    setActiveTab(value);
  };

  const handleLanguageChange = (event) => {
    const nextLanguage = event.target.value;
    setForm((prev) => ({ ...prev, language: nextLanguage }));
    setDirty((prev) => ({ ...prev, localization: true }));
  };

  const handleThemeChange = (event) => {
    const nextTheme = event.target.value;
    setForm((prev) => ({ ...prev, theme: nextTheme }));
    setDirty((prev) => ({ ...prev, theming: true }));
  };

  const handleNotificationToggle = (key) => (event) => {
    const isEnabled = event.target.checked;
    setForm((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: isEnabled },
    }));
    setDirty((prev) => ({ ...prev, notifications: true }));
  };

  const handleIntegrationChange = (key) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, [key]: value },
    }));
    setDirty((prev) => ({ ...prev, integrations: true }));
  };

  const handleSave = async (section) => {
    if (!canEdit || savingSection) return;
    if (!dirty[section]) return;

    const payload = {};

    switch (section) {
      case "localization":
        payload.language = form.language;
        break;
      case "theming":
        payload.theme = form.theme;
        break;
      case "notifications":
        payload.notifications = form.notifications;
        break;
      case "integrations":
        payload.integrations = form.integrations;
        break;
      default:
        return;
    }

    setSavingSection(section);
    setFeedback({ type: "", message: "" });

    try {
      await saveSettings(payload);

      if (section === "localization") {
        await setLanguage(form.language, { persistToServer: false });
      }
      if (section === "theming") {
        await setThemeMode(form.theme, { persistToServer: false });
      }

      setDirty((prev) => ({ ...prev, [section]: false }));
      setFeedback({ type: "success", message: t("SettingsSaved") });

      const username =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("km-username") ||
            window.localStorage.getItem("km-username") ||
            t("GuestUser")
          : t("GuestUser");

      const actionLookup = {
        localization: t("AuditLogLocalizationUpdated"),
        theming: t("AuditLogThemingUpdated"),
        notifications: t("AuditLogNotificationsUpdated"),
        integrations: t("AuditLogIntegrationsUpdated"),
      };

      const auditEntry = {
        id: `${Date.now()}-${section}`,
        actor: username,
        section,
        action:
          actionLookup[section] ||
          t("AuditLogFallbackAction", { section: sectionLabels[section] || section }),
        timestamp: new Date().toISOString(),
        details: payload,
      };

      await appendAuditLog(auditEntry);
    } catch (error) {
      console.error("Failed to persist settings", error);
      clearError();
      setFeedback({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          t("SettingsSaveError"),
      });
    } finally {
      setSavingSection("");
    }
  };

  const renderSaveButton = (section) => (
    <Button
      variant="contained"
      onClick={() => handleSave(section)}
      disabled={
        !canEdit ||
        savingSection === section ||
        !dirty[section] ||
        settingsLoading
      }
      sx={{ alignSelf: isRtl ? "flex-start" : "flex-end", minWidth: 160 }}
    >
      {savingSection === section ? (
        <CircularProgress size={20} sx={{ color: "common.white" }} />
      ) : (
        t("SaveChanges")
      )}
    </Button>
  );

  const roleChips = useMemo(() => {
    if (!Array.isArray(requiredRoles)) return null;
    return requiredRoles.map((role) => {
      const hasRole = Array.isArray(userRoles) && userRoles.includes(role);
      return (
        <Chip
          key={role}
          label={role}
          size="small"
          color={hasRole ? "primary" : "default"}
          variant={hasRole ? "filled" : "outlined"}
          sx={{ mr: isRtl ? 0 : 1, ml: isRtl ? 1 : 0, mb: 1 }}
        />
      );
    });
  }, [requiredRoles, userRoles, isRtl]);

  return (
    <Paper
      sx={{ p: 3, textAlign: isRtl ? "right" : "left" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        {t("Settings")}
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 3 }}>
        {t("SettingsDescription")}
      </Typography>

      {settingsLoading && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            {t("SettingsLoading")}
          </Typography>
        </Stack>
      )}

      {settingsError && (
        <Alert
          severity="error"
          onClose={clearError}
          sx={{ mb: 2 }}
        >
          {settingsError?.response?.data?.message ||
            settingsError?.message ||
            t("SettingsLoadError")}
        </Alert>
      )}

      {feedback.message && (
        <Alert
          severity={feedback.type === "success" ? "success" : "error"}
          onClose={() => setFeedback({ type: "", message: "" })}
          sx={{ mb: 2 }}
        >
          {feedback.message}
        </Alert>
      )}

      {!canEdit && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("SettingsAccessDenied", {
            roles: (missingRoles.length ? missingRoles : requiredRoles).join(", "),
          })}
        </Alert>
      )}

      {Array.isArray(requiredRoles) && requiredRoles.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", mb: 1 }}>
            {t("SettingsRequiredRolesLabel")}
          </Typography>
          <Stack direction="row" flexWrap="wrap" sx={{ mt: 1 }}>
            {roleChips}
          </Stack>
        </Box>
      )}

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label={t("SettingsTabsAriaLabel")}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.value} label={tab.label} value={tab.value} {...a11yProps(tab.value)} />
        ))}
      </Tabs>

      <TabPanel current={activeTab} value="localization">
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {t("LocalizationDescription")}
          </Typography>
          <FormControl
            component="fieldset"
            disabled={!canEdit || savingSection === "localization"}
          >
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
          {renderSaveButton("localization")}
        </Stack>
      </TabPanel>

      <TabPanel current={activeTab} value="theming">
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {t("ThemingDescription")}
          </Typography>
          <FormControl
            component="fieldset"
            disabled={!canEdit || savingSection === "theming"}
          >
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
          {renderSaveButton("theming")}
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
          {renderSaveButton("notifications")}
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
          {renderSaveButton("integrations")}
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
        {auditLoading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              {t("SettingsLoading")}
            </Typography>
          </Stack>
        )}
        {auditLogs.length === 0 ? (
          <Typography color="text.secondary">{t("AuditLogEmpty")}</Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {auditLogs.map((entry) => {
              const sectionLabel = sectionLabels[entry.section] || entry.section;
              const action =
                entry.action ||
                t("AuditLogFallbackAction", { section: sectionLabel });
              let actor = entry.actor || "";
              if (!actor.trim()) {
                actor = t("AuditLogActorUnknown");
              } else if (actor.trim().toLowerCase() === "system") {
                actor = t("AuditLogActorSystem");
              }
              const timestamp = formatTimestamp(entry.timestamp, lang);
              const detailsValue = entry.details;
              let detailsSummary = null;
              if (detailsValue && typeof detailsValue === "object") {
                const keys = Object.keys(detailsValue);
                if (keys.length > 0) {
                  detailsSummary = JSON.stringify(detailsValue);
                }
              } else if (
                typeof detailsValue === "string" &&
                detailsValue.trim() !== ""
              ) {
                detailsSummary = detailsValue;
              } else if (
                typeof detailsValue === "number" ||
                typeof detailsValue === "boolean"
              ) {
                detailsSummary = String(detailsValue);
              }

              return (
                <ListItem key={entry.id} alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        <Typography variant="subtitle2">{action}</Typography>
                        <Chip
                          size="small"
                          label={sectionLabel}
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t("AuditLogSecondaryLine", {
                            actor,
                            time: timestamp,
                          })}
                        </Typography>
                        {detailsSummary ? (
                          <Typography
                            variant="caption"
                            sx={{ color: "text.disabled", wordBreak: "break-word" }}
                          >
                            {detailsSummary}
                          </Typography>
                        ) : null}
                      </Stack>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Paper>
  );
}
