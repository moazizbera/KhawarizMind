import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { Document, Page, pdfjs } from "react-pdf";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

const toCssUnit = (value) =>
  typeof value === "number" ? `${value}px` : value ?? "0";

const buildTranslationMap = (layers = []) => {
  const map = new Map();
  layers.forEach((layer) => {
    layer?.items?.forEach((item, index) => {
      if (!item?.text) return;
      const key = `${layer.pageNumber || 0}-${item.id || index}-${item.text}`;
      map.set(key, item);
      map.set(item.text, item);
    });
  });
  return map;
};

const buildAnnotationMap = (annotations = []) => {
  const map = new Map();
  annotations.forEach((annotation) => {
    const page = annotation.pageNumber || 1;
    if (!map.has(page)) {
      map.set(page, []);
    }
    map.get(page).push(annotation);
  });
  return map;
};

export default function UnifiedDocumentViewer({
  fileUrl,
  fileName,
  ocrLayers = [],
  annotations = [],
  tooltipLocales = {},
  languages = [],
  classification = "",
  metadata = {},
}) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const [numPages, setNumPages] = useState(null);
  const [fileType, setFileType] = useState("");
  const [loading, setLoading] = useState(true);
  const [showOcr, setShowOcr] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);

  useEffect(() => {
    if (!fileName && !fileUrl) return;
    const ext = (fileName || fileUrl)?.split(".").pop().toLowerCase();
    setFileType(ext);
    setLoading(false);
  }, [fileUrl, fileName]);

  const translationMap = useMemo(
    () => buildTranslationMap(ocrLayers),
    [ocrLayers]
  );

  const annotationMap = useMemo(
    () => buildAnnotationMap(annotations),
    [annotations]
  );

  const customTextRenderer = useCallback(
    ({ str, item, index }) => {
      if (!showOcr) return str;
      const key = `${item?.pageNumber || item?.pageIndex || 0}-${item?.id || index}-${str}`;
      const match = translationMap.get(key) || translationMap.get(str);
      const tooltipText =
        match?.translations?.[lang] ||
        match?.translations?.en ||
        match?.text ||
        str;
      return (
        <Tooltip title={tooltipText} arrow enterDelay={200} placement="top">
          <span
            style={{
              backgroundColor: "rgba(37,99,235,0.08)",
              padding: "0 2px",
              borderRadius: 2,
            }}
          >
            {str}
          </span>
        </Tooltip>
      );
    },
    [lang, showOcr, translationMap]
  );

  const getOfficeViewerUrl = (url) =>
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  const renderMetadata = () => (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        {t("PdfViewerTitle")}
      </Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="flex-start">
        {classification && (
          <Chip color="primary" variant="outlined" label={`${t("Classification")}: ${classification}`} />
        )}
        {languages?.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {languages.map((lng) => (
              <Chip key={lng} size="small" label={lng.toUpperCase()} />
            ))}
          </Stack>
        )}
        {tooltipLocales?.[lang] && (
          <Chip size="small" label={tooltipLocales[lang]} />
        )}
      </Stack>
      {(() => {
        const rawConfidence =
          metadata?.confidence ?? metadata?.score ?? metadata?.accuracy;
        const numericConfidence =
          typeof rawConfidence === "number"
            ? rawConfidence
            : rawConfidence
            ? parseFloat(rawConfidence)
            : undefined;
        return Number.isFinite(numericConfidence) ? (
          <Typography variant="caption" color="text.secondary">
            {t("ConfidenceScore", {
              score: Math.round(numericConfidence * 100) / 100,
            })}
          </Typography>
        ) : null;
      })()}
      <Stack direction="row" spacing={2} flexWrap="wrap">
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
      <Divider />
    </Stack>
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (["pdf"].includes(fileType)) {
    return (
      <Paper sx={{ p: 2, height: "100%", overflow: "auto" }}>
        {renderMetadata()}
        <Document file={fileUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
          {Array.from({ length: numPages || 0 }, (_, index) => {
            const pageNumber = index + 1;
            const pageAnnotations = annotationMap.get(pageNumber) || [];
            return (
              <Box key={`page_${pageNumber}`} sx={{ position: "relative", mb: 4 }}>
                <Page
                  pageNumber={pageNumber}
                  scale={1.15}
                  renderTextLayer={showOcr}
                  renderAnnotationLayer
                  customTextRenderer={customTextRenderer}
                />
                {showAnnotations && pageAnnotations.length > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                    }}
                  >
                    {pageAnnotations.map((annotation) => {
                      const note =
                        annotation.note?.[lang] ||
                        annotation.note?.en ||
                        annotation.note ||
                        t("AnnotationNote");
                      return (
                        <Tooltip
                          key={annotation.id || `${pageNumber}-${annotation.x}-${annotation.y}`}
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
                              border: `2px dashed ${annotation.color || "#2563eb"}`,
                              borderRadius: 1,
                              bgcolor: "rgba(37,99,235,0.12)",
                              pointerEvents: "auto",
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "flex-start",
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                px: 0.5,
                                py: 0.25,
                                bgcolor: "background.paper",
                                borderRadius: 1,
                                boxShadow: 1,
                                maxWidth: "100%",
                              }}
                            >
                              {annotation.label || t("Annotation")}
                            </Typography>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })}
        </Document>
        {numPages === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t("NoPagesAvailable")}
          </Typography>
        )}
      </Paper>
    );
  }

  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(fileType)) {
    return (
      <Box sx={{ width: "100%", height: "100%", border: "none" }}>
        <iframe
          src={getOfficeViewerUrl(fileUrl)}
          width="100%"
          height="100%"
          frameBorder="0"
          title={t("OfficeViewerTitle")}
        />
      </Box>
    );
  }

  if (["png", "jpg", "jpeg", "gif", "bmp", "tif", "tiff"].includes(fileType)) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "center",
          height: "100%",
          bgcolor: "background.paper",
          p: 2,
        }}
      >
        <Stack spacing={1} sx={{ width: "100%" }}>
          {renderMetadata()}
          {!ocrLayers.length && (
            <Typography variant="body2" color="text.secondary">
              {t("NoOcrAvailable")}
            </Typography>
          )}
        </Stack>
        <Box
          component="img"
          src={fileUrl}
          alt={fileName}
          sx={{
            maxWidth: "100%",
            maxHeight: "90vh",
            borderRadius: 2,
            boxShadow: "0 2px 20px rgba(0,0,0,0.3)",
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        textAlign: "center",
        px: 2,
      }}
    >
      <Typography variant="h6" color="error" sx={{ fontWeight: 600 }}>
        {t("UnsupportedFileType")}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t("UnsupportedFileMessage", { fileType })}
      </Typography>
    </Box>
  );
}
