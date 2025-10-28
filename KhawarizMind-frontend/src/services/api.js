import axios from "axios";

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== "undefined" ? window.__KM_API_BASE_URL__ : null) ||
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

const unwrapEnvelope = (data) => {
  if (data == null) {
    return { payload: data, meta: null };
  }

  const payload =
    data?.payload ??
    data?.data ??
    data?.result ??
    data?.items ??
    data?.value ??
    data;

  const meta = data?.meta ?? data?.pagination ?? data?.page ?? null;

  return { payload, meta };
};

const ensureObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "1", "yes", "on"].includes(normalized);
  }
  return Boolean(value);
};

const normalizeAuditLog = (entry = {}) => ({
  id:
    entry.id ||
    entry.logId ||
    entry.auditId ||
    `${entry.section || entry.area || "general"}-${
      entry.timestamp || entry.performedAt || entry.createdAt || Date.now()
    }`,
  section: entry.section || entry.area || "general",
  action: entry.action || entry.event || entry.change || "",
  actor: entry.actor || entry.user || entry.username || "",
  timestamp: entry.timestamp || entry.performedAt || entry.createdAt || null,
  details: entry.details ?? entry.changes ?? entry.payload ?? null,
});

const normalizeSettingsResponse = (payload = {}) => {
  const preferences = ensureObject(payload.preferences);
  const notifications = ensureObject(payload.notifications);
  const integrations = ensureObject(payload.integrations);
  const access = ensureObject(payload.access);

  return {
    preferences: {
      language:
        preferences.language ??
        payload.language ??
        (preferences.locale ? preferences.locale : "en"),
      theme:
        preferences.theme ??
        preferences.mode ??
        payload.theme ??
        "light",
    },
    notifications: {
      email: toBoolean(notifications.email),
      sms: toBoolean(notifications.sms),
      push: toBoolean(notifications.push),
    },
    integrations: {
      slackWebhook: integrations.slackWebhook ?? integrations.slack ?? "",
      teamsWebhook: integrations.teamsWebhook ?? integrations.teams ?? "",
      apiKey: integrations.apiKey ?? integrations.token ?? "",
    },
    auditLogs: Array.isArray(payload.auditLogs)
      ? payload.auditLogs.map(normalizeAuditLog)
      : [],
    access: {
      canEdit:
        access.canEdit ??
        access.editable ??
        payload.canEdit ??
        payload.editable ??
        false,
      requiredRoles: Array.isArray(access.requiredRoles)
        ? access.requiredRoles
        : Array.isArray(payload.requiredRoles)
        ? payload.requiredRoles
        : [],
      missingRoles: Array.isArray(access.missingRoles)
        ? access.missingRoles
        : Array.isArray(payload.missingRoles)
        ? payload.missingRoles
        : [],
    },
    metadata: ensureObject(payload.metadata),
  };
};

const normalizeDocument = (doc = {}) => {
  const name =
    doc.name || doc.fileName || doc.title || doc.documentName || "Untitled";
  const type = doc.type || doc.mimeType || doc.extension || "";
  const url =
    doc.url || doc.downloadUrl || doc.previewUrl || doc.link || doc.path || "";

  return {
    id:
      doc.id ||
      doc.documentId ||
      doc.externalId ||
      doc.fileId ||
      `${name}-${doc.createdAt || Date.now()}`,
    name,
    type,
    url,
    status: doc.status || doc.state || "available",
    createdAt: doc.createdAt || doc.created_on || doc.created || null,
    updatedAt: doc.updatedAt || doc.modifiedAt || doc.lastModified || null,
    owner: doc.owner || doc.createdBy || doc.uploader || null,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    pipeline: ensureObject(doc.pipeline),
  };
};

const normalizePipeline = (pipeline = {}) => {
  if (Array.isArray(pipeline)) {
    return pipeline.map((step, index) => ({
      id: step.id || step.key || `step-${index}`,
      key: step.key || step.id || `step-${index}`,
      label: step.label || step.name || `Step ${index + 1}`,
      status: step.status || step.state || "pending",
      detail: step.detail || step.description || "",
    }));
  }

  if (Array.isArray(pipeline.steps)) {
    return normalizePipeline(pipeline.steps);
  }

  return [];
};

const normalizeDocumentsResponse = (payload = {}) => {
  const collection = Array.isArray(payload.documents)
    ? payload.documents
    : Array.isArray(payload.items)
    ? payload.items
    : [];

  return {
    items: collection.map(normalizeDocument),
    pipeline: normalizePipeline(payload.pipeline || payload.processing),
    pagination: ensureObject(payload.pagination ?? payload.meta),
  };
};

const normalizeAuthResponse = (payload = {}) => {
  const user = ensureObject(payload.user);
  const permissions = Array.isArray(user.permissions)
    ? user.permissions
    : Array.isArray(payload.permissions)
    ? payload.permissions
    : [];

  return {
    token: payload.token ?? payload.accessToken ?? "",
    refreshToken: payload.refreshToken ?? null,
    expiresAt: payload.expiresAt ?? payload.expiration ?? null,
    user: {
      id: user.id ?? user.userId ?? payload.userId ?? null,
      username: user.username ?? payload.username ?? "",
      displayName:
        user.displayName ?? user.name ?? payload.displayName ?? payload.username ?? "",
      roles: Array.isArray(user.roles)
        ? user.roles
        : Array.isArray(payload.roles)
        ? payload.roles
        : [],
      permissions,
      email: user.email ?? null,
    },
    metadata: ensureObject(payload.metadata),
  };
};

const normalizeAiResponse = (payload = {}) => {
  const messages = Array.isArray(payload.messages)
    ? payload.messages
    : Array.isArray(payload.history)
    ? payload.history
    : [];
  const followUps = Array.isArray(payload.followUps)
    ? payload.followUps
    : Array.isArray(payload.suggestions)
    ? payload.suggestions
    : [];

  let answer = payload.answer || payload.message || "";
  if (!answer && Array.isArray(payload.responses)) {
    answer = payload.responses.join("\n\n");
  }

  return {
    answer,
    messages,
    followUps,
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    conversationId: payload.conversationId ?? payload.sessionId ?? null,
    usage: ensureObject(payload.usage ?? payload.metrics),
  };
};

const normalizeWorkflow = (workflow = {}, index = 0) => {
  const steps = Array.isArray(workflow.steps) ? workflow.steps : [];

  return {
    id:
      workflow.id ||
      workflow.workflowId ||
      workflow.key ||
      `workflow-${index}`,
    name: workflow.name || workflow.displayName || `Workflow ${index + 1}`,
    description: workflow.description || workflow.summary || "",
    status: workflow.status || workflow.state || "inactive",
    owners: Array.isArray(workflow.owners) ? workflow.owners : [],
    trigger: workflow.trigger || workflow.entrypoint || null,
    updatedAt: workflow.updatedAt || workflow.modifiedOn || workflow.modifiedAt || null,
    steps: steps.map((step, stepIndex) => ({
      id: step.id || step.key || `step-${stepIndex}`,
      name: step.name || step.label || `Step ${stepIndex + 1}`,
      type: step.type || step.kind || "",
      description: step.description || "",
      assignee: step.assignee || step.owner || null,
      status: step.status || step.state || "pending",
    })),
  };
};

const normalizeWorkflowsResponse = (payload = {}) => {
  const definitions = Array.isArray(payload.workflows)
    ? payload.workflows
    : Array.isArray(payload.definitions)
    ? payload.definitions
    : [];

  return {
    workflows: definitions.map((workflow, index) =>
      normalizeWorkflow(workflow, index)
    ),
    summary: {
      total: payload.total ?? definitions.length,
      active:
        payload.active ??
        definitions.filter((workflow) =>
          (workflow.status || workflow.state) === "active"
        ).length,
      paused:
        payload.paused ??
        definitions.filter((workflow) =>
          (workflow.status || workflow.state) === "paused"
        ).length,
    },
  };
};

export async function login(username, password) {
  const response = await apiClient.post("/api/auth/login", {
    username,
    password,
  });

  const { payload, meta } = unwrapEnvelope(response.data);
  const normalized = normalizeAuthResponse(payload || {});
  return { ...normalized, meta };
}

export async function getSettings() {
  const response = await apiClient.get("/api/settings");
  const { payload, meta } = unwrapEnvelope(response.data);
  const normalized = normalizeSettingsResponse(payload || {});
  return { ...normalized, meta };
}

export async function updateSettings(section, settingsPatch = {}) {
  const response = await apiClient.put(`/api/settings/${section}`, settingsPatch);
  const { payload, meta } = unwrapEnvelope(response.data);
  const normalized = normalizeSettingsResponse(payload || {});
  return { ...normalized, meta };
}

export async function getDocuments(params = {}) {
  const response = await apiClient.get("/api/documents", { params });
  const { payload, meta } = unwrapEnvelope(response.data);
  const normalized = normalizeDocumentsResponse(payload || {});
  return { ...normalized, meta: normalized.pagination || meta };
}

export async function uploadDocument(file, metadata = {}) {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  const response = await apiClient.post("/api/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const { payload } = unwrapEnvelope(response.data);
  return normalizeDocument(payload || {});
}

export async function queryAI(prompt, options = {}) {
  const payload = {
    prompt,
    ...options,
  };
  const response = await apiClient.post("/api/ai/query", payload);
  const { payload: result, meta } = unwrapEnvelope(response.data);
  const normalized = normalizeAiResponse(result || {});
  return { ...normalized, meta };
}

export async function fetchAiActions(options = {}) {
  const response = await apiClient.post("/api/ai/actions", options);
  const { payload: result, meta } = unwrapEnvelope(response.data);
  const payload = Array.isArray(result)
    ? { followUps: result }
    : ensureObject(result);
  const normalized = normalizeAiResponse(payload);
  const actions = normalized.followUps || [];
  return {
    ...normalized,
    actions,
    suggestions: actions,
    raw: result,
    meta,
  };
}

export async function summarizeAI(options = {}) {
  const response = await apiClient.post("/api/ai/summarize", options);
  const { payload: result, meta } = unwrapEnvelope(response.data);
  const payload =
    typeof result === "string"
      ? { summary: result, answer: result }
      : ensureObject(result);
  const normalized = normalizeAiResponse(payload);
  const summary =
    payload.summary ||
    normalized.answer ||
    (typeof result === "string" ? result : "");
  return {
    ...normalized,
    summary,
    raw: result,
    meta,
  };
}

export async function getWorkflows(params = {}) {
  const response = await apiClient.get("/api/workflows", { params });
  const { payload, meta } = unwrapEnvelope(response.data);
  const normalized = normalizeWorkflowsResponse(payload || {});
  return { ...normalized, meta };
}

export function setAuthToken(token, persist = false) {
  if (typeof window === "undefined") return;
  const storage = persist ? window.localStorage : window.sessionStorage;
  if (token) {
    storage.setItem("km-token", token);
    if (!persist) {
      window.localStorage.removeItem("km-token");
    }
  } else {
    storage.removeItem("km-token");
  }
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem("km-token");
  window.localStorage.removeItem("km-token");
}

export function getErrorMessage(error, fallback = "Something went wrong") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.error?.message)
    return error.response.data.error.message;
  if (error?.response?.data?.error)
    return error.response.data.error;
  if (error?.message) return error.message;
  return fallback;
}

export default apiClient;
