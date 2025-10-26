import React from "react";
import { motion } from "framer-motion";
import { Button, Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import GitHubIcon from "@mui/icons-material/GitHub";

export default function Home() {
  const navigate = useNavigate();

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        background: "linear-gradient(135deg, #000814 0%, #001D3D 40%, #003566 100%)",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* Subtle animated gradient or particles */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, backgroundPosition: "200% 50%" }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "mirror" }}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: "radial-gradient(circle at 30% 30%, rgba(0,120,255,0.15), transparent 60%)",
        }}
      />

      <motion.h1
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          fontSize: "4rem",
          fontWeight: "900",
          letterSpacing: "-0.04em",
          zIndex: 2,
          background: "linear-gradient(90deg, #00d4ff, #0077ff)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        KhawarizMind
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          maxWidth: 600,
          marginTop: "1rem",
          fontSize: "1.3rem",
          color: "rgba(255,255,255,0.8)",
          zIndex: 2,
        }}
      >
        The next generation ECM powered by Artificial Intelligence —
        automate, classify, and extract meaning from every document.
      </motion.p>

      <Box sx={{ mt: 4, zIndex: 2, display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<RocketLaunchIcon />}
          onClick={() => navigate("/tenant")}
          sx={{
            px: 4,
            py: 1.5,
            fontWeight: 600,
            fontSize: "1.1rem",
            borderRadius: "2rem",
          }}
        >
          Get Started
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<GitHubIcon />}
          sx={{
            px: 4,
            py: 1.5,
            fontWeight: 600,
            fontSize: "1.1rem",
            borderRadius: "2rem",
            color: "white",
            borderColor: "rgba(255,255,255,0.4)",
            "&:hover": { borderColor: "white" },
          }}
          href="https://github.com/moazizbera/KhawarizMind"
          target="_blank"
        >
          View on GitHub
        </Button>
      </Box>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 1.2 }}
        style={{
          position: "absolute",
          bottom: "2rem",
          fontSize: "0.9rem",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        © {new Date().getFullYear()} KhawarizMind | Intelligent ECM Platform
      </motion.footer>
    </section>
  );
}
