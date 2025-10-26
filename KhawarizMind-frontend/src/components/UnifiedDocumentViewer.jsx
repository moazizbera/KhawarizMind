import React, { useState, useEffect } from "react";
import { Box, Typography, CircularProgress, Paper } from "@mui/material";
import { Document, Page, pdfjs } from "react-pdf";



// ✅ Modern CSS imports (no longer under /esm/)
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// ✅ Load worker automatically from pdfjs-dist (works in React 18+)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export default function UnifiedDocumentViewer({ fileUrl, fileName }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [fileType, setFileType] = useState("");
  const [loading, setLoading] = useState(true);

  // Detect file type from extension
  useEffect(() => {
    if (!fileName && !fileUrl) return;
    const ext = (fileName || fileUrl)?.split(".").pop().toLowerCase();
    setFileType(ext);
    setLoading(false);
  }, [fileUrl, fileName]);

  // ✅ Helper for Office viewer
  const getOfficeViewerUrl = (url) =>
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <CircularProgress />
      </Box>
    );

  // 🧾 PDF Files
  if (["pdf"].includes(fileType)) {
    return (
      <Paper sx={{ p: 2, height: "100%", overflow: "auto" }}>
        <Typography variant="h6" gutterBottom>PDF Viewer</Typography>
        <Document file={fileUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
          {Array.from(new Array(numPages), (el, index) => (
            <Page key={`page_${index + 1}`} pageNumber={index + 1} scale={1.2} />
          ))}
        </Document>
      </Paper>
    );
  }

  // 📄 Office files
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(fileType)) {
    return (
      <Box sx={{ width: "100%", height: "100%", border: "none" }}>
        <iframe
          src={getOfficeViewerUrl(fileUrl)}
          width="100%"
          height="100%"
          frameBorder="0"
          title="Office Document Viewer"
        />
      </Box>
    );
  }

  // 🖼️ Images
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

  // ❌ Unsupported
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
      }}
    >
      <Typography variant="h6" color="error">
        Unsupported file type
      </Typography>
      <Typography variant="body2" color="text.secondary">
        ({fileType}) cannot be previewed.
      </Typography>
    </Box>
  );
}
