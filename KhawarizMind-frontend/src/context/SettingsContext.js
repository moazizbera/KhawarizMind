import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getErrorMessage, getSettings, updateSettings } from "../services/api";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingSection, setSavingSection] = useState("");
  const refreshRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getSettings();
      setSettings(result);
    } catch (err) {
      const message = getErrorMessage(err, "Unable to load settings");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRef.current = load;
  }, [load]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const updateSection = useCallback(async (section, payload) => {
    setSavingSection(section);
    setError("");
    try {
      const result = await updateSettings(section, payload);
      setSettings(result);
      return result;
    } catch (err) {
      const message = getErrorMessage(err, "Failed to update settings");
      setError(message);
      throw err;
    } finally {
      setSavingSection("");
    }
  }, []);

  const refresh = useCallback(async () => {
    if (typeof refreshRef.current === "function") {
      return refreshRef.current();
    }
    return Promise.resolve();
  }, []);

  const value = useMemo(() => {
    const preferences = settings?.preferences ?? {};
    const notifications = settings?.notifications ?? {};
    const integrations = settings?.integrations ?? {};
    const auditLogs = Array.isArray(settings?.auditLogs)
      ? settings.auditLogs
      : [];
    const access = settings?.access ?? {};

    return {
      settings,
      loading,
      error,
      refresh,
      updateSection,
      savingSection,
      preferences,
      notifications,
      integrations,
      auditLogs,
      canEdit: Boolean(access.canEdit),
      requiredRoles: Array.isArray(access.requiredRoles)
        ? access.requiredRoles
        : [],
      missingRoles: Array.isArray(access.missingRoles)
        ? access.missingRoles
        : [],
    };
  }, [settings, loading, error, refresh, updateSection, savingSection]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
