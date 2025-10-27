import React, { useState } from "react";
import { Box, Paper, Typography, IconButton, Slider, Stack, Tooltip } from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RestoreIcon from "@mui/icons-material/Restore";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

export default function ImageProcessingViewer({ imageSrc = "/sample-scan.jpg", ocrData = [] }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const handleZoom = (delta) => setZoom((value) => Math.min(Math.max(value + delta, 0.5), 3));
  const handleRotate = () => setRotation((value) => (value + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <Paper
      sx={{ p: 2, height: "100%", position: "relative", bgcolor: "background.paper" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
        {t("ImageProcessing")}
      </Typography>
      <Box
        sx={{
          position: "relative",
          height: { xs: "60vh", md: "70vh" },
          bgcolor: "#0b1221",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: 2,
        }}
      >
        <img
          src={imageSrc}
          alt={t("ImageAltText")}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: "transform .3s",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />
        {ocrData.map((box, index) => (
          <Box
            key={index}
            sx={{
              position: "absolute",
              border: "1px solid rgba(0,255,128,.6)",
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
              borderRadius: "3px",
            }}
          />
        ))}
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 2 }}
        alignItems="center"
        justifyContent="center"
      >
        <Tooltip title={t("ZoomOut")}>
          <IconButton onClick={() => handleZoom(-0.2)}>
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={t("ZoomIn")}>
          <IconButton onClick={() => handleZoom(0.2)}>
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={t("Rotate")}>
          <IconButton onClick={handleRotate}>
            <RotateRightIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={t("Reset")}>
          <IconButton onClick={handleReset}>
            <RestoreIcon />
          </IconButton>
        </Tooltip>
        <Slider
          value={zoom}
          min={0.5}
          max={3}
          step={0.1}
          onChange={(_, value) =>
            setZoom(Array.isArray(value) ? value[0] : value)
          }
          sx={{ width: { xs: 120, sm: 160 } }}
          aria-label={t("ZoomLevel")}
        />
      </Stack>
    </Paper>
  );
}
