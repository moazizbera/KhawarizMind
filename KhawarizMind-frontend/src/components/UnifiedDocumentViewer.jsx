import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, Paper } from "@mui/material";
import { Document, Page, pdfjs } from "react-pdf";
import { useTranslation } from "react-i18next";

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export default function UnifiedDocumentViewer({ fileUrl, fileName }) {
  const { t } = useTranslation();
  const [numPages, setNumPages] = useState(null);
  const [fileType, setFileType] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fileName && !fileUrl) return;
    const ext = (fileName || fileUrl)?.split(".").pop().toLowerCase();
    setFileType(ext);
    setLoading(false);
  }, [fileUrl, fileName]);

  const getOfficeViewerUrl = (url) =>
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

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
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          {t("PdfViewerTitle")}
        </Typography>
        <Document file={fileUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
          {Array.from({ length: numPages || 0 }, (_, index) => (
            <Page key={`page_${index + 1}`} pageNumber={index + 1} scale={1.15} />
          ))}
        </Document>
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
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          bgcolor: "background.paper",
        }}
      >
        <img
          src={fileUrl}
          alt={fileName}
          style={{
            maxWidth: "100%",
            maxHeight: "90vh",
            borderRadius: 8,
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
