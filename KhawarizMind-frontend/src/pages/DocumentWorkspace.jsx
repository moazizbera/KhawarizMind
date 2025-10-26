import React from "react";
import { Grid, Box } from "@mui/material";
import DocumentViewer from "../components/DocumentViewer";
import AIAssistantPanel from "../components/AIAssistantPanel";

export default function DocumentWorkspace() {
  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <DocumentViewer fileType="pdf" fileName="Sample_Invoice.pdf" />
        </Grid>
        <Grid item xs={12} md={4}>
          <AIAssistantPanel />
        </Grid>
      </Grid>
    </Box>
  );
}
