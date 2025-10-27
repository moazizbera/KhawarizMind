import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Button,
  Snackbar,
  Alert,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { login, setAuthToken } from "../services/api";

export default function LoginCard({ onLogin }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [persistSession, setPersistSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError(t("LoginValidation"));
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await login(username.trim(), password.trim());

      const token = result?.token;
      if (token) {
        setAuthToken(token, persistSession);
      }

      const displayName = result?.user?.displayName || username.trim();

      const storage = persistSession ? window.localStorage : window.sessionStorage;
      storage.setItem("km-username", displayName);

      onLogin?.({ username: displayName, token });
      setSuccess(true);
      navigate("/dashboard", { state: { username: displayName } });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t("LoginFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <Box
        dir={isAr ? "rtl" : "ltr"}
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(to bottom right, #001F3F, #007BFF)",
          px: 2,
        }}
      >
        <Card sx={{ width: 420, borderRadius: 4, boxShadow: 10, backgroundColor: "rgba(255, 255, 255, 0.97)" }}>
          <CardContent sx={{ p: 5 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, textAlign: "center", color: "#0d1b2a" }}>
              {t("Login")}
            </Typography>

            <TextField
              fullWidth
              label={t("Username")}
              variant="outlined"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <TextField
              fullWidth
              label={t("Password")}
              type="password"
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={persistSession}
                  onChange={(event) => setPersistSession(event.target.checked)}
                  color="primary"
                />
              }
              label={t("RememberMe")}
              sx={{ mt: 1, color: "text.secondary" }}
            />

            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 3, py: 1.1, fontWeight: 600, borderRadius: "2rem", backgroundColor: "#007BFF" }}
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : t("SignIn")}
            </Button>
          </CardContent>
        </Card>
      </Box>
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError("")}
        anchorOrigin={{ vertical: "bottom", horizontal: isAr ? "left" : "right" }}
      >
        <Alert onClose={() => setError("")} severity="error" variant="filled" sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: isAr ? "left" : "right" }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" variant="filled" sx={{ width: "100%" }}>
          {t("LoginSuccess")}
        </Alert>
      </Snackbar>
    </motion.div>
  );
}
