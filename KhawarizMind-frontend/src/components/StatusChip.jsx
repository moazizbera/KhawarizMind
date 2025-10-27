import React from "react";
import { Chip } from "@mui/material";
import { useTranslation } from "react-i18next";

const STATUS_COLOR_MAP = {
  draft: "default",
  active: "info",
  in_progress: "warning",
  completed: "success",
  paused: "secondary",
  overdue: "error",
};

export default function StatusChip({ status, size = "medium", variant, sx, ...props }) {
  const { t } = useTranslation();
  const normalized = (status || "draft").toLowerCase();
  const safeKey = STATUS_COLOR_MAP[normalized] ? normalized : "draft";
  const muiColor = STATUS_COLOR_MAP[safeKey];
  const label = t(`Status.${safeKey}`, { defaultValue: status || safeKey });
  const computedVariant = variant ?? (muiColor === "default" ? "outlined" : "filled");

  const sxValue = Array.isArray(sx)
    ? [{ fontWeight: 600, textTransform: "capitalize" }, ...sx]
    : [
        { fontWeight: 600, textTransform: "capitalize" },
        ...(sx ? [sx] : []),
      ];

  return (
    <Chip
      size={size}
      variant={computedVariant}
      color={muiColor === "default" ? undefined : muiColor}
      label={label}
      sx={sxValue}
      {...props}
    />
  );
}
