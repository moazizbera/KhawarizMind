import React from "react";
import { Paper, Typography } from "@mui/material";

export default function Workflows() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700}>Workflows</Typography>
      <Typography sx={{ color: "text.secondary" }}>
        Drag-and-drop workflow designer (hook/predefined). (Integrate later)
      </Typography>
    </Paper>
  );
}
