import React, { useState } from "react";
import { Box, Card, CardContent, TextField, Typography, Button } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

export default function LoginCard({ onLogin }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (username.trim() && password.trim()) {
      onLogin?.({ username });
      sessionStorage.setItem("km-username", username.trim());
      navigate("/dashboard", { state: { username: username.trim() } });
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

            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 3, py: 1.1, fontWeight: 600, borderRadius: "2rem", backgroundColor: "#007BFF" }}
              onClick={handleLogin}
            >
              {t("SignIn")}
            </Button>
          </CardContent>
        </Card>
      </Box>
    </motion.div>
  );
}
