import React, { useState } from "react";
import { Box, Paper, Typography, IconButton, Slider, Stack, Tooltip } from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RestoreIcon from "@mui/icons-material/Restore";

export default function ImageProcessingViewer({ imageSrc="/sample-scan.jpg", ocrData=[] }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const handleZoom = (d) => setZoom(v => Math.min(Math.max(v + d, 0.5), 3));
  const handleRotate = () => setRotation(r => (r + 90) % 360);
  const handleReset = () => { setZoom(1); setRotation(0); };

  return (
    <Paper sx={{ p: 2, height: "100%", position: "relative", bgcolor: "background.paper" }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Image Processing</Typography>
      <Box sx={{
        position: "relative", height: "70vh", bgcolor: "#0b1221",
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
        borderRadius: 2
      }}>
        <img
          src={imageSrc} alt="scan"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: "transform .3s",
                   maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
        {ocrData.map((b, i) => (
          <Box key={i} sx={{
            position: "absolute", border: "1px solid rgba(0,255,128,.6)",
            left: b.x, top: b.y, width: b.width, height: b.height, borderRadius: "3px"
          }} />
        ))}
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center" justifyContent="center">
        <Tooltip title="Zoom Out"><IconButton onClick={() => handleZoom(-0.2)}><ZoomOutIcon/></IconButton></Tooltip>
        <Tooltip title="Zoom In"><IconButton onClick={() => handleZoom(0.2)}><ZoomInIcon/></IconButton></Tooltip>
        <Tooltip title="Rotate"><IconButton onClick={handleRotate}><RotateRightIcon/></IconButton></Tooltip>
        <Tooltip title="Reset"><IconButton onClick={handleReset}><RestoreIcon/></IconButton></Tooltip>
        <Slider value={zoom} min={0.5} max={3} step={0.1} onChange={(_, v)=>setZoom(v)} sx={{ width: 150 }} />
      </Stack>
    </Paper>
  );
}
