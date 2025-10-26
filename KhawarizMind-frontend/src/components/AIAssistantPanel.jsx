import React, { useEffect, useRef, useState } from "react";
import {
  Box, Drawer, IconButton, Typography, Divider, TextField, Button, Stack, Paper
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

function Bubble({ role, text }) {
  const isUser = role === "user";
  return (
    <Stack direction="row" justifyContent={isUser ? "flex-end" : "flex-start"} sx={{ mb: 1 }}>
      <Paper
        elevation={0}
        sx={{
          px: 2, py: 1, maxWidth: "80%",
          bgcolor: isUser ? "primary.main" : "background.paper",
          color: isUser ? "primary.contrastText" : "text.primary",
          border: isUser ? "none" : "1px solid",
          borderColor: isUser ? "transparent" : "divider",
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{text}</Typography>
      </Paper>
    </Stack>
  );
}

export default function AIAssistantPanel({ open, onClose }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState([
    { role: "assistant", text: t("AIPanelWelcome") },
  ]);
  const listRef = useRef(null);

  useEffect(() => {
    // update welcome message on language change
    setMsgs([{ role: "assistant", text: t("AIPanelWelcome") }]);
  }, [t]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input.trim() };
    setMsgs((m) => [...m, userMsg]);

    // TODO: Connect to AIService; this is a stubbed response
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "assistant", text: t("AIStubResponse") }]);
    }, 400);
    setInput("");
  };

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs, open]);

  return (
    <Drawer
      anchor={isRtl ? "left" : "right"}
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }} dir={isRtl ? "rtl" : "ltr"}>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          {t("AI Assistant")}
        </Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <Divider />
      <Box
        ref={listRef}
        sx={{ p: 2, overflowY: "auto", flexGrow: 1, display: "flex", flexDirection: "column", gap: 1 }}
      >
        {msgs.map((m, i) => <Bubble key={i} role={m.role} text={m.text} />)}
      </Box>
      <Divider />
      <Box sx={{ p: 2 }} dir={isRtl ? "rtl" : "ltr"}>
        <Stack direction="row" spacing={1}>
          <TextField
            placeholder={t("AIInputPlaceholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            fullWidth
            size="small"
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <Button variant="contained" onClick={send}>{t("Send")}</Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
