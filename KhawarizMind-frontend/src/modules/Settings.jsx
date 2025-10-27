import React, { useEffect, useMemo, useRef, useState } from "react";
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
  appendSettingsAuditLog,
  getSettings,
  getSettingsAuditLogs,
  updateSettings,
} from "../services/api";

const REQUIRED_ROLE_FALLBACK = ["admin", "config-manager"];

const createDefaultNotifications = () => ({
  email: true,
  sms: false,
  push: true,
});

const createDefaultIntegrations = () => ({
  slackWebhook: "",
  teamsWebhook: "",
  apiKey: "",
});

const FALLBACK_AUDIT_LOGS = [
  {
    id: "seed-initial",
    actor: "System",
    section: "system",
    action: "",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    details: { language: "en", theme: "light" },
  },
];

const normalizeAuditLogs = (payload) => {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
    ? payload
    : [];

  return items
    .map((entry, index) => ({
      id: entry.id || entry.auditId || `${entry.timestamp || index}-${index}`,
      actor:
        entry.actor || entry.user || entry.username || entry.principal || "",
      action: entry.action || entry.message || entry.description || "",
      section: entry.section || entry.category || entry.area || "system",
      timestamp:
        entry.timestamp || entry.createdAt || entry.date || entry.time ||
        new Date().toISOString(),
      details: entry.details || entry.changes || entry.metadata || entry.payload || {},
    }))
    .sort((a, b) => {
      const aTime = Date.parse(a.timestamp);
      const bTime = Date.parse(b.timestamp);
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return 0;
      }
      return bTime - aTime;
    });
};

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
  const isRtl = lang === "ar";

  const initialLanguageRef = useRef(lang);
  const initialThemeRef = useRef(mode);
  const langRef = useRef(lang);
  const modeRef = useRef(mode);
  const tRef = useRef(t);

  const [activeTab, setActiveTab] = useState("localization");
  const [loading, setLoading] = useState(false);
  const [savingSection, setSavingSection] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [auditLogs, setAuditLogs] = useState(FALLBACK_AUDIT_LOGS);
  const [userRoles, setUserRoles] = useState([]);
  const [requiredRoles, setRequiredRoles] = useState(REQUIRED_ROLE_FALLBACK);
  const [dirty, setDirty] = useState({
    localization: false,
    theming: false,
    notifications: false,
    integrations: false,
  });
  const [form, setForm] = useState({
    language: lang,
    theme: mode,
    notifications: createDefaultNotifications(),
    integrations: createDefaultIntegrations(),
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

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      setLoading(true);
      try {
        const data = await getSettings();
        if (ignore) return;

        const preferences = data?.preferences || {};
        const serverLanguage =
          preferences.language || data?.language || initialLanguageRef.current;
        const serverTheme =
          preferences.theme || data?.theme || initialThemeRef.current;
        const serverNotifications = {
          ...createDefaultNotifications(),
          ...(preferences.notifications || data?.notifications || {}),
        };
        const serverIntegrations = {
          ...createDefaultIntegrations(),
          ...(data?.integrations || preferences.integrations || {}),
        };

        setForm({
          language: serverLanguage,
          theme: serverTheme,
          notifications: serverNotifications,
          integrations: serverIntegrations,
        });
        setDirty({
          localization: false,
          theming: false,
          notifications: false,
          integrations: false,
        });

        const roles = Array.isArray(data?.currentUser?.roles)
          ? data.currentUser.roles
          : Array.isArray(data?.user?.roles)
          ? data.user.roles
          : [];
        setUserRoles(roles);

        const allowedRoles = Array.isArray(data?.policy?.allowedRoles)
          ? data.policy.allowedRoles
          : Array.isArray(data?.allowedRoles)
          ? data.allowedRoles
          : REQUIRED_ROLE_FALLBACK;
        setRequiredRoles(
          allowedRoles && allowedRoles.length
            ? allowedRoles
            : REQUIRED_ROLE_FALLBACK
        );

        if (serverLanguage && serverLanguage !== langRef.current) {
          setLanguage(serverLanguage, { persistToServer: false });
        }
        if (serverTheme && serverTheme !== modeRef.current) {
          setThemeMode(serverTheme, { persistToServer: false });
        }
      } catch (error) {
        if (ignore) return;
        console.error("Failed to load settings", error);
        const defaultMessage =
          tRef.current?.("SettingsLoadError") ||
          "Unable to load settings from the server.";
        setFeedback({
          type: "error",
          message:
            error?.response?.data?.message || error?.message || defaultMessage,
        });
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      ignore = true;
    };
  }, [setLanguage, setThemeMode]);

  useEffect(() => {
    let ignore = false;

    async function loadAuditLogs() {
      try {
        const data = await getSettingsAuditLogs();
        if (ignore) return;
        const normalized = normalizeAuditLogs(data);
        if (normalized.length) {
          setAuditLogs(normalized);
        }
      } catch (error) {
        if (!ignore) {
          console.warn("Failed to load audit logs", error);
        }
      }
    }

    loadAuditLogs();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setForm((prev) => {
      if (dirty.localization || prev.language === lang) {
        return prev;
      }
      return { ...prev, language: lang };
    });
  }, [lang, dirty.localization]);

  useEffect(() => {
    setForm((prev) => {
      if (dirty.theming || prev.theme === mode) {
        return prev;
      }
      return { ...prev, theme: mode };
    });
  }, [mode, dirty.theming]);

  const canEdit = useMemo(
    () =>
      requiredRoles.some((role) =>
        Array.isArray(userRoles) ? userRoles.includes(role) : false
      ),
    [requiredRoles, userRoles]
  );

  const missingRoles = useMemo(() => {
    if (!Array.isArray(requiredRoles)) return [];
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
      await updateSettings(payload);

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

      setAuditLogs((prev) => [auditEntry, ...prev].slice(0, 50));

      try {
        await appendSettingsAuditLog(auditEntry);
      } catch (auditError) {
        console.warn("Failed to append audit log", auditError);
      }
    } catch (error) {
      console.error("Failed to persist settings", error);
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
      disabled={!canEdit || savingSection === section || !dirty[section]}
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

      {loading && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            {t("SettingsLoading")}
          </Typography>
        </Stack>
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
