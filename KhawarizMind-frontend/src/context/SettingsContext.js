import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  appendSettingsAuditLog,
  getSettings,
  getSettingsAuditLogs,
  updateSettings,
} from "../services/api";

const SettingsContext = createContext(null);

export const REQUIRED_ROLE_FALLBACK = ["admin", "config-manager"];

export const createDefaultNotifications = () => ({
  email: true,
  sms: false,
  push: true,
});

export const createDefaultIntegrations = () => ({
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
      actor: entry.actor || entry.user || entry.username || entry.principal || "",
      action: entry.action || entry.message || entry.description || "",
      section: entry.section || entry.category || entry.area || "system",
      timestamp:
        entry.timestamp ||
        entry.createdAt ||
        entry.date ||
        entry.time ||
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

const cloneSettings = (settings) => ({
  language: settings?.language || "en",
  theme: settings?.theme || "light",
  notifications: {
    ...createDefaultNotifications(),
    ...(settings?.notifications || {}),
  },
  integrations: {
    ...createDefaultIntegrations(),
    ...(settings?.integrations || {}),
  },
  userRoles: Array.isArray(settings?.userRoles) ? [...settings.userRoles] : [],
  requiredRoles: Array.isArray(settings?.requiredRoles)
    ? [...settings.requiredRoles]
    : [...REQUIRED_ROLE_FALLBACK],
  raw: {
    ...(settings?.raw || {}),
    preferences: {
      ...(settings?.raw?.preferences || {}),
      notifications: {
        ...(settings?.raw?.preferences?.notifications || {}),
      },
      integrations: {
        ...(settings?.raw?.preferences?.integrations || {}),
      },
    },
    notifications: {
      ...(settings?.raw?.notifications || {}),
    },
    integrations: {
      ...(settings?.raw?.integrations || {}),
    },
  },
});

const normalizeSettings = (payload = {}) => {
  const preferences = payload.preferences || {};

  const notifications = {
    ...createDefaultNotifications(),
    ...(preferences.notifications || {}),
    ...(payload.notifications || {}),
  };

  const integrations = {
    ...createDefaultIntegrations(),
    ...(preferences.integrations || {}),
    ...(payload.integrations || {}),
  };

  const language = preferences.language || payload.language || "en";
  const theme = preferences.theme || payload.theme || "light";

  const userRoles = Array.isArray(payload.currentUser?.roles)
    ? payload.currentUser.roles
    : Array.isArray(payload.user?.roles)
    ? payload.user.roles
    : [];

  const requiredRoles = Array.isArray(payload.policy?.allowedRoles)
    ? payload.policy.allowedRoles
    : Array.isArray(payload.allowedRoles)
    ? payload.allowedRoles
    : REQUIRED_ROLE_FALLBACK;

  return {
    language,
    theme,
    notifications,
    integrations,
    userRoles,
    requiredRoles: requiredRoles && requiredRoles.length
      ? requiredRoles
      : REQUIRED_ROLE_FALLBACK,
    raw: {
      ...payload,
      preferences: {
        ...preferences,
        language,
        theme,
        notifications: { ...notifications },
        integrations: { ...integrations },
      },
      notifications: { ...notifications },
      integrations: { ...integrations },
    },
  };
};

const applySettingsPatch = (settings, patch) => {
  const next = cloneSettings(settings);

  if (Object.prototype.hasOwnProperty.call(patch, "language")) {
    next.language = patch.language;
    next.raw.language = patch.language;
    next.raw.preferences.language = patch.language;
  }

  if (Object.prototype.hasOwnProperty.call(patch, "theme")) {
    next.theme = patch.theme;
    next.raw.theme = patch.theme;
    next.raw.preferences.theme = patch.theme;
  }

  if (patch.notifications) {
    next.notifications = {
      ...createDefaultNotifications(),
      ...next.notifications,
      ...patch.notifications,
    };
    next.raw.notifications = {
      ...next.raw.notifications,
      ...patch.notifications,
    };
    next.raw.preferences.notifications = {
      ...next.raw.preferences.notifications,
      ...patch.notifications,
    };
  }

  if (patch.integrations) {
    next.integrations = {
      ...createDefaultIntegrations(),
      ...next.integrations,
      ...patch.integrations,
    };
    next.raw.integrations = {
      ...next.raw.integrations,
      ...patch.integrations,
    };
    next.raw.preferences.integrations = {
      ...next.raw.preferences.integrations,
      ...patch.integrations,
    };
  }

  return next;
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => normalizeSettings());
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState(null);
  const [auditLogs, setAuditLogs] = useState(FALLBACK_AUDIT_LOGS);
  const [auditLoading, setAuditLoading] = useState(false);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings(normalizeSettings(data));
      setError(null);
    } catch (err) {
      console.error("Failed to load settings", err);
      setError(err);
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await getSettingsAuditLogs();
      const normalized = normalizeAuditLogs(data);
      if (normalized.length) {
        setAuditLogs(normalized);
      }
    } catch (err) {
      console.warn("Failed to load audit logs", err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuditLogs();
  }, [refreshAuditLogs]);

  const save = useCallback(
    async (patch) => {
      if (!patch || typeof patch !== "object") {
        throw new Error("Settings update payload must be an object");
      }

      const previous = cloneSettings(settingsRef.current);
      const optimistic = applySettingsPatch(settingsRef.current, patch);
      setSettings(optimistic);

      try {
        const result = await updateSettings(patch);
        if (result && typeof result === "object" && Object.keys(result).length > 0) {
          setSettings(normalizeSettings({ ...previous.raw, ...result }));
        } else {
          await refresh();
        }
        setError(null);
        return true;
      } catch (err) {
        console.error("Failed to persist settings", err);
        setSettings(previous);
        setError(err);
        throw err;
      }
    },
    [refresh]
  );

  const appendAuditLog = useCallback(async (entry, options = {}) => {
    const { persist = true } = options;
    if (!entry || typeof entry !== "object") {
      return null;
    }

    setAuditLogs((prev) => [entry, ...prev].slice(0, 50));

    if (!persist) {
      return entry;
    }

    try {
      await appendSettingsAuditLog(entry);
      return entry;
    } catch (err) {
      console.warn("Failed to append audit log", err);
      setAuditLogs((prev) => prev.filter((log) => log.id !== entry.id));
      return null;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      settings,
      loading,
      isHydrated: hydrated,
      error,
      refresh,
      saveSettings: save,
      clearError,
      auditLogs,
      auditLoading,
      refreshAuditLogs,
      appendAuditLog,
    }),
    [
      settings,
      loading,
      hydrated,
      error,
      refresh,
      save,
      clearError,
      auditLogs,
      auditLoading,
      refreshAuditLogs,
      appendAuditLog,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

export { normalizeAuditLogs };
