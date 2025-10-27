import React, { useMemo, useState } from "react";
import {
  Box,
  FormControlLabel,
  IconButton,
  Paper,
  Slider,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RestoreIcon from "@mui/icons-material/Restore";
import CommentIcon from "@mui/icons-material/Comment";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

const toCssUnit = (value) =>
  typeof value === "number" ? `${value}px` : value ?? "0";

export default function ImageProcessingViewer({
  imageSrc = "/sample-scan.jpg",
  ocrData = [],
  annotations = [],
  tooltipLocales = {},
}) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showOcr, setShowOcr] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);

  const handleZoom = (delta) =>
    setZoom((value) => Math.min(Math.max(value + delta, 0.5), 3));
  const handleRotate = () => setRotation((value) => (value + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const resolvedOcr = useMemo(() => (Array.isArray(ocrData) ? ocrData : []), [
    ocrData,
  ]);
  const resolvedAnnotations = useMemo(
    () => (Array.isArray(annotations) ? annotations : []),
    [annotations]
  );

  return (
    <Paper
      sx={{ p: 2, height: "100%", position: "relative", bgcolor: "background.paper" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {t("ImageProcessing")}
        </Typography>
        {tooltipLocales?.[lang] && (
          <Typography variant="body2" color="text.secondary">
            {tooltipLocales[lang]}
          </Typography>
        )}
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <FormControlLabel
            control={
              <Switch
                checked={showOcr}
                onChange={(event) => setShowOcr(event.target.checked)}
                color="primary"
              />
            }
            label={t("ShowOcrLayer")}
          />
          <FormControlLabel
            control={
              <Switch
                checked={showAnnotations}
                onChange={(event) => setShowAnnotations(event.target.checked)}
                color="primary"
              />
            }
            label={t("ShowAnnotations")}
          />
        </Stack>
      </Stack>

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
        <Box
          sx={{
            position: "relative",
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            transition: "transform .3s",
            display: "inline-block",
          }}
        >
          <Box
            component="img"
            src={imageSrc}
            alt={t("ImageAltText")}
            sx={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              display: "block",
              borderRadius: 2,
            }}
          />
          {showOcr &&
            resolvedOcr.map((box) => {
              const tooltipText =
                box.translations?.[lang] ||
                box.translations?.en ||
                box.text ||
                t("OcrText");
              return (
                <Tooltip key={box.id || `${box.x}-${box.y}`} title={tooltipText} arrow>
                  <Box
                    sx={{
                      position: "absolute",
                      left: toCssUnit(box.x),
                      top: toCssUnit(box.y),
                      width: toCssUnit(box.width),
                      height: toCssUnit(box.height),
                      border: "1px solid rgba(0,255,128,.7)",
                      borderRadius: "3px",
                      bgcolor: "rgba(0,255,128,0.12)",
                      pointerEvents: "auto",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        px: 0.5,
                        py: 0.25,
                        color: "#0b1221",
                        fontWeight: 600,
                      }}
                    >
                      {Math.round((box.confidence || 0) * 100)}%
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}
          {showAnnotations &&
            resolvedAnnotations.map((annotation) => {
              const note =
                annotation.note?.[lang] ||
                annotation.note?.en ||
                annotation.note ||
                t("AnnotationNote");
              return (
                <Tooltip
                  key={annotation.id || `${annotation.x}-${annotation.y}`}
                  title={note}
                  arrow
                >
                  <Box
                    sx={{
                      position: "absolute",
                      left: toCssUnit(annotation.x),
                      top: toCssUnit(annotation.y),
                      width: toCssUnit(annotation.width),
                      height: toCssUnit(annotation.height),
                      border: `2px dashed ${annotation.color || "#f97316"}`,
                      borderRadius: "4px",
                      pointerEvents: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CommentIcon sx={{ fontSize: 18, color: annotation.color || "#f97316" }} />
                  </Box>
                </Tooltip>
              );
            })}
        </Box>
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
          onChange={(_, value) => setZoom(Array.isArray(value) ? value[0] : value)}
          sx={{ width: { xs: 120, sm: 160 } }}
          aria-label={t("ZoomLevel")}
        />
      </Stack>
    </Paper>
  );
}
