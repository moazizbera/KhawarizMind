import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Box, Stack, IconButton, Typography, Slider } from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function DocumentViewer({ fileUrl = "/sample.pdf" }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  return (
    <Box sx={{ height: "100%", bgcolor: "background.paper", p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <PictureAsPdfIcon color="error" />
        <Typography variant="h6">Document Viewer</Typography>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 1 }}>
        <IconButton disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}>
          <NavigateBeforeIcon />
        </IconButton>

        <Typography variant="body2">
          Page {pageNumber} / {numPages || "?"}
        </Typography>

        <IconButton disabled={pageNumber >= numPages} onClick={() => setPageNumber((p) => Math.min(p + 1, numPages))}>
          <NavigateNextIcon />
        </IconButton>

        <IconButton onClick={() => setScale((s) => Math.min(s + 0.1, 3))}>
          <ZoomInIcon />
        </IconButton>
        <IconButton onClick={() => setScale((s) => Math.max(s - 0.1, 0.5))}>
          <ZoomOutIcon />
        </IconButton>

        <Slider
          value={scale}
          min={0.5}
          max={3}
          step={0.1}
          onChange={(_, v) => setScale(v)}
          sx={{ width: 100 }}
        />
      </Stack>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          overflow: "auto",
          bgcolor: "background.default",
          borderRadius: 2,
          height: "80%",
        }}
      >
        <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </Box>
    </Box>
  );
}
