import React, { useEffect, useRef, useState } from "react";
import {
  Box, Drawer, IconButton, Typography, Divider, TextField, Button, Stack, Paper
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

function Message({ role, text }) {
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

export default function AIAssistant({ open, onClose }) {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState([
    { role: "assistant", text: "Hello! I’m KhawarizMind. Ask me to classify, extract, or summarize documents." },
  ]);
  const listRef = useRef(null);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input.trim() };
    setMsgs((m) => [...m, userMsg]);

    // Placeholder bot reply (wire to your AIService later)
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "assistant", text: "Got it. (This is a stubbed reply — connect AIService here.)" }]);
    }, 400);
    setInput("");
  };

  useEffect(() => {
    // auto-scroll to bottom
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs, open]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}
    >
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          AI Assistant
        </Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <Divider />
      <Box ref={listRef} sx={{ p: 2, overflowY: "auto", flexGrow: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        {msgs.map((m, i) => <Message key={i} role={m.role} text={m.text} />)}
      </Box>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            placeholder="Ask something about your documents…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            fullWidth
            size="small"
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <Button variant="contained" onClick={send}>Send</Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
