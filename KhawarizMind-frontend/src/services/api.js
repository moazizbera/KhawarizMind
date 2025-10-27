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

export async function getWorkflows(params = {}) {
  const { data } = await apiClient.get("/api/workflows", { params });
  return data;
}

export async function getWorkflowById(id) {
  const { data } = await apiClient.get(`/api/workflows/${id}`);
  return data;
}

export async function saveWorkflow(payload) {
  if (payload?.id) {
    const { id, ...body } = payload;
    const { data } = await apiClient.put(`/api/workflows/${id}`, body);
    return data;
  }
  const { data } = await apiClient.post("/api/workflows", payload);
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

export default apiClient;
