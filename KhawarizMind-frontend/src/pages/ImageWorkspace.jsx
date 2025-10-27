import React from "react";
import { Grid, Box } from "@mui/material";
import ImageProcessingViewer from "../components/ImageProcessingViewer";
import AIAssistantPanel from "../components/AIAssistantPanel";

const mockOCR = [
  { x: 120, y: 200, width: 120, height: 20 },
  { x: 300, y: 280, width: 160, height: 25 },
];

export default function ImageWorkspace() {
  const contextId = "sample-image";
  const contextLabel = "sample-scan.jpg";

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <ImageProcessingViewer imageSrc="/sample-scan.jpg" ocrData={mockOCR} />
        </Grid>
        <Grid item xs={12} md={4}>
          <AIAssistantPanel
            contextId={contextId}
            contextLabel={contextLabel}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
