import React from "react";
import { Paper, Typography } from "@mui/material";

export default function Settings() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700}>Settings</Typography>
      <Typography sx={{ color: "text.secondary" }}>
        Multitenancy, integrations, and language options go here.
      </Typography>
    </Paper>
  );
}
