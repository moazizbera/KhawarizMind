import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== "undefined"
    ? window.__KM_API_BASE_URL__
    : null) ||
  "http://localhost:5000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000,
});

apiClient.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("km-token") ||
        window.localStorage.getItem("km-token")
      : null;

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("km-token");
        window.localStorage.removeItem("km-token");
      }
    }
    return Promise.reject(error);
  }
);

export async function login(username, password) {
  const { data } = await apiClient.post("/api/auth/login", {
    username,
    password,
  });
  return data;
}

export async function getDocuments(params = {}) {
  const { data } = await apiClient.get("/api/documents", { params });
  return data;
}

export async function uploadDocument(file, metadata = {}) {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  const { data } = await apiClient.post("/api/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
}

export async function queryAI(prompt, options = {}) {
  const payload = {
    prompt,
    ...options,
  };
  const { data } = await apiClient.post("/api/ai/query", payload);
  return data;
}

export function setAuthToken(token, persist = false) {
  if (typeof window === "undefined") return;
  const storage = persist ? window.localStorage : window.sessionStorage;
  storage.setItem("km-token", token);
  if (!persist) {
    window.localStorage.removeItem("km-token");
  }
}

export async function getSettings(params = {}) {
  const config = Object.keys(params || {}).length
    ? { params }
    : undefined;
  const { data } = await apiClient.get("/api/settings", config);
  return data;
}

export async function updateSettings(payload = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Settings update payload must be an object");
  }

  try {
    const { data } = await apiClient.patch("/api/settings", payload);
    return data;
  } catch (error) {
    if (error?.response?.status === 405 || error?.response?.status === 404) {
      const { data } = await apiClient.put("/api/settings", payload);
      return data;
    }
    throw error;
  }
}

export async function getSettingsAuditLogs(params = {}) {
  const config = Object.keys(params || {}).length
    ? { params }
    : undefined;
  const { data } = await apiClient.get("/api/settings/audit", config);
  return data;
}

export async function appendSettingsAuditLog(entry) {
  const payload = entry && typeof entry === "object" ? entry : {};
  const { data } = await apiClient.post("/api/settings/audit", payload);
  return data;
}

export default apiClient;
