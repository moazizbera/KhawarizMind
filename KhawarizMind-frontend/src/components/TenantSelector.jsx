import React from "react";
import { Box, FormControl, InputLabel, Select, MenuItem, Button } from "@mui/material";

export default function TenantSelector({ tenant, onSelect }) {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <FormControl sx={{ minWidth: 240 }}>
        <InputLabel>Select Tenant</InputLabel>
        <Select
          value={tenant || ""}
          onChange={(e) => onSelect(e.target.value)}
          label="Select Tenant"
        >
          <MenuItem value="Tenant1">Tenant 1</MenuItem>
          <MenuItem value="Tenant2">Tenant 2</MenuItem>
        </Select>
      </FormControl>
      <Button
        sx={{ ml: 2 }}
        variant="contained"
        disabled={!tenant}
        onClick={() => onSelect(tenant)}
      >
        Continue
      </Button>
    </Box>
  );
}
