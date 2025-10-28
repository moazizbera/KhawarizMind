import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Divider,
  TextField,
  Button,
  Stack,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import IosShareIcon from "@mui/icons-material/IosShare";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { queryAI } from "../services/api";

function Bubble({ role, text, variant, caption }) {
  const isUser = role === "user";
  const isSystem = role === "system";
  return (
    <Stack direction="row" justifyContent={isUser ? "flex-end" : "flex-start"} sx={{ mb: 1 }}>
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1,
          maxWidth: "80%",
          bgcolor: isUser
            ? "primary.main"
            : variant === "summary"
            ? "info.light"
            : isSystem
            ? "background.default"
            : "background.paper",
          color: isUser ? "primary.contrastText" : "text.primary",
          border: isUser ? "none" : "1px solid",
          borderColor:
            isUser || variant === "summary" ? "transparent" : "divider",
          borderRadius: 2,
        }}
      >
        {caption && (
          <Typography
            variant="caption"
            sx={{ display: "block", color: "text.secondary", mb: 0.5 }}
          >
            {caption}
          </Typography>
        )}
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {text}
        </Typography>
      </Paper>
    </Stack>
  );
}

const buildMessage = (role, text, extra = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  text,
  createdAt: Date.now(),
  ...extra,
});

const HISTORY_STORAGE_PREFIX = "km-ai-history";

function sanitizeHistory(messages) {
  return messages
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({ role: msg.role, content: msg.text }));
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function streamQuery({ payload, signal, onToken }) {
  const headers = {
    "Content-Type": "application/json",
  };
  const token = getStoredAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/ai/query`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch AI response");
  }

  const contentType = response.headers.get("content-type") || "";
  const isEventStream = contentType.includes("text/event-stream");

  if (!response.body || typeof response.body.getReader !== "function") {
    if (contentType.includes("application/json")) {
      return response.json();
    }
    const text = await response.text();
    return { answer: text };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let aggregateText = "";
  let finalPayload = null;

  const updateFromPayload = (payloadChunk) => {
    if (!payloadChunk) return;
    let parsed;
    try {
      parsed = JSON.parse(payloadChunk);
    } catch (error) {
      parsed = null;
    }

    if (parsed && typeof parsed === "object") {
      finalPayload = { ...finalPayload, ...parsed };
      const tokenText =
        parsed.token || parsed.answer || parsed.message || parsed.data || "";
      if (tokenText) {
        aggregateText += tokenText;
        onToken?.(aggregateText);
      }
    } else {
      aggregateText += payloadChunk;
      onToken?.(aggregateText);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    buffer += decoder.decode(value, { stream: true });

    if (isEventStream) {
      let lastSplitIndex = buffer.lastIndexOf("\n\n");
      if (lastSplitIndex === -1) continue;
      const processable = buffer.slice(0, lastSplitIndex);
      buffer = buffer.slice(lastSplitIndex + 2);
      const segments = processable.split(/\n\n/).filter(Boolean);
      segments.forEach((segment) => {
        const dataLines = segment
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        dataLines.forEach((line) => {
          if (line.startsWith("data:")) {
            const payloadChunk = line.replace(/^data:\s*/, "");
            if (payloadChunk === "[DONE]") return;
            updateFromPayload(payloadChunk);
          }
        });
      });
    } else {
      updateFromPayload(buffer);
      buffer = "";
    }
  }

  if (buffer.trim()) {
    updateFromPayload(buffer.trim());
  }

  if (finalPayload) {
    if (!finalPayload.answer && aggregateText) {
      finalPayload.answer = aggregateText;
    }
    return finalPayload;
  }

  return { answer: aggregateText };
}

export default function AIAssistantPanel({
  open,
  onClose,
  contextId = "global",
  contextLabel,
  documentLanguage,
}) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState(() => [
    buildMessage("assistant", t("AIPanelWelcome"), { isWelcome: true }),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const abortControllerRef = useRef(null);

  const storageKey = useMemo(
    () => `${HISTORY_STORAGE_PREFIX}:${contextId}`,
    [contextId]
  );

  const welcomeMessage = useMemo(
    () => buildMessage("assistant", t("AIPanelWelcome"), { isWelcome: true }),
    [t]
  );

  useEffect(() => {
    // update welcome message on language change
    setMsgs([{ role: "assistant", text: t("AIPanelWelcome") }]);
  }, [t]);

  const send = async () => {
    if (!input.trim()) return;
    const prompt = input.trim();
    const userMsg = { role: "user", text: prompt };
    setMsgs((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const response = await queryAI(prompt);
      const assistantText =
        response?.answer ||
        response?.data ||
        response?.message ||
        t("AIStubResponse");
      setMsgs((m) => [...m, { role: "assistant", text: assistantText }]);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t("AIError");
      setError(message);
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          text: t("AIErrorMessage"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMsgs((prev) =>
      prev.map((msg) =>
        msg.isWelcome ? { ...msg, text: welcomeMessage.text } : msg
      )
    );
  }, [welcomeMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(msgs));
    } catch (error) {
      console.warn("Failed to persist AI history", error);
    }
  }, [msgs, storageKey]);

  const showToast = useCallback((message, severity = "info") => {
    setToast({ message, severity });
  }, []);

  const resetFollowUps = useCallback(() => {
    setFollowUps([]);
  }, []);

  const updateMessageText = useCallback((id, text, extra = {}) => {
    setMsgs((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, text, ...extra } : msg))
    );
  }, []);

  const appendMessage = useCallback((message) => {
    setMsgs((prev) => [...prev, message]);
  }, []);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [msgs, open, scrollToBottom]);

  useEffect(() => () => stopStreaming(), [stopStreaming]);

  const fetchFollowUpSuggestions = useCallback(
    async (latestAssistantText, historyOverride) => {
      resetFollowUps();
      setActionsLoading(true);
      try {
        const payload = {
          contextId,
          contextLabel,
          language: documentLanguage,
          history: (historyOverride || sanitizeHistory(msgs)).concat({
            role: "assistant",
            content: latestAssistantText,
          }),
        };
        const response = await fetchAiActions(payload);
        const suggestions =
          response?.actions ||
          response?.suggestions ||
          response?.data ||
          [];
        if (Array.isArray(suggestions)) {
          setFollowUps(suggestions.filter(Boolean));
        }
      } catch (error) {
        console.warn("Failed to load follow-up suggestions", error);
        showToast(
          error?.response?.data?.message ||
            error?.message ||
            t("AIActionError", { defaultValue: "Unable to load suggestions." }),
          "error"
        );
      } finally {
        setActionsLoading(false);
      }
    },
    [
      contextId,
      contextLabel,
      documentLanguage,
      msgs,
      resetFollowUps,
      showToast,
      t,
    ]
  );

  const handleSend = useCallback(
    async (value) => {
      if (loading) return;
      const prompt = (value ?? input).trim();
      if (!prompt) return;

      const userMsg = buildMessage("user", prompt);
      const assistantMsg = buildMessage("assistant", "", { streaming: true });
      appendMessage(userMsg);
      appendMessage(assistantMsg);
      setInput("");
      setLoading(true);
      resetFollowUps();
      const historyWithUser = sanitizeHistory(msgs).concat({
        role: "user",
        content: prompt,
      });

      const payload = {
        prompt,
        history: historyWithUser,
        contextId,
        contextLabel,
        language: documentLanguage,
      };

      try {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const response = await streamQuery({
          payload,
          signal: controller.signal,
          onToken: (text) => {
            updateMessageText(assistantMsg.id, text);
          },
        });

        const assistantText =
          response?.answer ||
          response?.data ||
          response?.message ||
          t("AIStubResponse");

        updateMessageText(assistantMsg.id, assistantText, {
          streaming: false,
        });

        await fetchFollowUpSuggestions(assistantText, historyWithUser);
      } catch (error) {
        console.error("AI query failed", error);
        updateMessageText(assistantMsg.id, t("AIErrorMessage"), {
          streaming: false,
        });
        showToast(
          error?.response?.data?.message ||
            error?.message ||
            t("AIError"),
          "error"
        );
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      appendMessage,
      fetchFollowUpSuggestions,
      input,
      loading,
      msgs,
      resetFollowUps,
      showToast,
      t,
      updateMessageText,
    ]
  );

  const handleSummarize = useCallback(async () => {
    if (summaryLoading) return;
    setSummaryLoading(true);
    resetFollowUps();

    try {
      const history = sanitizeHistory(msgs);
      const payload = {
        contextId,
        contextLabel,
        language: documentLanguage,
        history,
      };

      const response = await summarizeAI(payload);
      const summaryText =
        response?.summary ||
        response?.answer ||
        response?.data ||
        t("AISummaryFallback", {
          defaultValue: "Here's a brief summary of the latest content.",
        });

      appendMessage(
        buildMessage("assistant", summaryText, {
          variant: "summary",
          caption: t("AISummaryLabel", { defaultValue: "Summary" }),
        })
      );

      await fetchFollowUpSuggestions(summaryText, history);
    } catch (error) {
      console.error("AI summarize failed", error);
      showToast(
        error?.response?.data?.message ||
          error?.message ||
          t("AISummaryError", {
            defaultValue: "We couldn't generate a summary right now.",
          }),
        "error"
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [
    appendMessage,
    contextId,
    contextLabel,
    documentLanguage,
    fetchFollowUpSuggestions,
    msgs,
    resetFollowUps,
    showToast,
    summaryLoading,
    t,
  ]);

  const handleFollowUpClick = useCallback(
    (suggestion) => {
      setInput(suggestion);
      handleSend(suggestion);
    },
    [handleSend]
  );

  const handleCopyConversation = useCallback(async () => {
    const transcript = msgs
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.text}`)
      .join("\n\n");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(transcript);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      showToast(
        t("AIConversationCopied", {
          defaultValue: "Conversation copied to your clipboard.",
        }),
        "success"
      );
    } catch (error) {
      console.error("Copy failed", error);
      showToast(
        t("AIConversationCopyError", {
          defaultValue: "Unable to copy conversation.",
        }),
        "error"
      );
    }
  }, [msgs, showToast, t]);

  const handleDownloadConversation = useCallback(() => {
    const transcript = msgs
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.text}`)
      .join("\n\n");
    const fileName = `${contextId || "conversation"}.txt`;
    downloadText(fileName, transcript);
    showToast(
      t("AIConversationDownloaded", {
        defaultValue: "Conversation downloaded successfully.",
      }),
      "success"
    );
  }, [contextId, msgs, showToast, t]);

  const handleShareConversation = useCallback(async () => {
    const transcript = msgs
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.text}`)
      .join("\n\n");
    if (navigator.share) {
      try {
        await navigator.share({
          title:
            contextLabel ||
            t("AIConversationShareTitle", { defaultValue: "AI Conversation" }),
          text: transcript,
        });
        showToast(
          t("AIConversationShared", {
            defaultValue: "Conversation shared successfully.",
          }),
          "success"
        );
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error("Share failed", error);
          showToast(
            t("AIConversationShareError", {
              defaultValue: "Unable to share conversation.",
            }),
            "error"
          );
        }
      }
    } else {
      await handleCopyConversation();
    }
  }, [contextLabel, handleCopyConversation, msgs, showToast, t]);

  const conversationActions = (
    <Stack direction="row" spacing={1} alignItems="center">
      <Tooltip
        title={t("AISummarize", { defaultValue: "Summarize" })}
        placement={isRtl ? "bottom" : "bottom-start"}
      >
        <span>
          <IconButton
            size="small"
            onClick={handleSummarize}
            disabled={summaryLoading || loading}
            color="primary"
          >
            {summaryLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SummarizeOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip
        title={t("AIConversationOptions", { defaultValue: "Conversation options" })}
        placement={isRtl ? "bottom" : "bottom-start"}
      >
        <IconButton
          size="small"
          onClick={(event) => setMenuAnchorEl(event.currentTarget)}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: isRtl ? "left" : "right" }}
        transformOrigin={{ vertical: "top", horizontal: isRtl ? "left" : "right" }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchorEl(null);
            handleCopyConversation();
          }}
          sx={{ gap: 1 }}
        >
          <ContentCopyIcon fontSize="small" />
          {t("AICopyConversation", { defaultValue: "Copy conversation" })}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchorEl(null);
            handleDownloadConversation();
          }}
          sx={{ gap: 1 }}
        >
          <FileDownloadOutlinedIcon fontSize="small" />
          {t("AIDownloadConversation", { defaultValue: "Download" })}
        </MenuItem>
        <MenuItem
          onClick={async () => {
            setMenuAnchorEl(null);
            await handleShareConversation();
          }}
          sx={{ gap: 1 }}
        >
          <IosShareIcon fontSize="small" />
          {t("AIShareConversation", { defaultValue: "Share" })}
        </MenuItem>
      </Menu>
    </Stack>
  );

  const header = (
    <Box
      sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t("AI Assistant")}
        </Typography>
        {contextLabel && (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {contextLabel}
          </Typography>
        )}
      </Box>
      {conversationActions}
      {typeof onClose === "function" && typeof open === "boolean" && (
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      )}
    </Box>
  );

 const followUpSection = (
  <Box sx={{ mt: 1 }}>
    <Typography
      variant="caption"
      sx={{
        display: "block",
        mb: 0.5,
        color: "text.secondary",
        textAlign: isRtl ? "right" : "left",
      }}
    >
      {msgs.map((m, i) => (
        <Bubble key={`${m.role}-${i}`} role={m.role} text={m.text} />
      ))}
      {loading && (
        <Stack direction="row" justifyContent="flex-start" sx={{ mb: 1 }}>
          <Paper
            elevation={0}
            sx={{
              px: 2,
              py: 1,
              maxWidth: "80%",
              display: "flex",
              alignItems: "center",
              gap: 1,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CircularProgress size={16} />
            <Typography variant="body2">{t("AIThinking")}</Typography>
          </Paper>
        </Stack>
      )}
    </Typography>
    <Divider />
    <Box sx={{ p: 2 }} dir={isRtl ? "rtl" : "ltr"}>
      <Stack direction="row" spacing={1}>
        <TextField
          placeholder={t("AIInputPlaceholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          fullWidth
          size="small"
          onKeyDown={(e) => e.key === "Enter" && !loading && send()}
        />
        <Button variant="contained" onClick={send} disabled={loading}>
          {loading ? <CircularProgress size={18} color="inherit" /> : t("Send")}
        </Button>
      </Stack>
    </Box>
    <Snackbar
      open={Boolean(error)}
      autoHideDuration={6000}
      onClose={() => setError("")}
      anchorOrigin={{ vertical: "bottom", horizontal: isRtl ? "left" : "right" }}
    >
      <Alert onClose={() => setError("")} severity="error" variant="filled" sx={{ width: "100%" }}>
        {error}
      </Alert>
    </Snackbar>
  </Box>
);
}
