import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { getWorkflows, getErrorMessage } from "../services/api";

const statusColor = (status) => {
  const normalized = (status || "").toLowerCase();
  if (normalized === "active") return "success";
  if (normalized === "paused") return "warning";
  if (normalized === "error" || normalized === "failed") return "error";
  return "default";
};

export default function Workflows() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workflows, setWorkflows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, paused: 0 });

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getWorkflows();
      setWorkflows(result.workflows || []);
      setSummary(result.summary || { total: 0, active: 0, paused: 0 });
    } catch (err) {
      setError(getErrorMessage(err, t("WorkflowsLoadError")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const summaryChips = useMemo(
    () => [
      { label: t("WorkflowsSummaryTotal", { count: summary.total || 0 }), color: "default" },
      { label: t("WorkflowsSummaryActive", { count: summary.active || 0 }), color: "success" },
      { label: t("WorkflowsSummaryPaused", { count: summary.paused || 0 }), color: "warning" },
    ],
    [summary, t]
  );

  return (
    <Paper sx={{ p: 3 }} dir={isRtl ? "rtl" : "ltr"}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
          <Stack spacing={1} alignItems={isRtl ? "flex-end" : "flex-start"}>
            <Typography variant="h5" fontWeight={700}>
              {t("Workflows")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("WorkflowsDescription")}
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchWorkflows}
            disabled={loading}
          >
            {t("Refresh")}
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          {summaryChips.map((chip) => (
            <Chip key={chip.label} label={chip.label} color={chip.color} variant="outlined" />
          ))}
        </Stack>

        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              {t("WorkflowsLoading")}
            </Typography>
          </Stack>
        ) : null}

        {error ? <Alert severity="error">{error}</Alert> : null}

        {!loading && !error && workflows.length === 0 ? (
          <Typography color="text.secondary">{t("WorkflowsEmpty")}</Typography>
        ) : null}

        <Grid container spacing={2}>
          {workflows.map((workflow) => (
            <Grid item xs={12} md={6} key={workflow.id}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="h6" fontWeight={600}>
                        {workflow.name}
                      </Typography>
                      <Chip
                        label={workflow.status || t("WorkflowsStatusUnknown")}
                        color={statusColor(workflow.status)}
                        size="small"
                      />
                    </Stack>
                    {workflow.description ? (
                      <Typography variant="body2" color="text.secondary">
                        {workflow.description}
                      </Typography>
                    ) : null}
                    {workflow.trigger ? (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {t("WorkflowTriggerLabel", { trigger: workflow.trigger })}
                      </Typography>
                    ) : null}
                    {Array.isArray(workflow.steps) && workflow.steps.length > 0 ? (
                      <Box>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                          {t("WorkflowStepsLabel")}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {workflow.steps.map((step) => (
                            <Chip
                              key={step.id}
                              label={step.name}
                              variant="outlined"
                              color={statusColor(step.status)}
                            />
                          ))}
                        </Stack>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {t("WorkflowNoSteps")}
                      </Typography>
                    )}
                    {Array.isArray(workflow.owners) && workflow.owners.length > 0 ? (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {t("WorkflowOwnersLabel", { owners: workflow.owners.join(", ") })}
                      </Typography>
                    ) : null}
                    {workflow.updatedAt ? (
                      <Typography variant="caption" sx={{ color: "text.disabled" }}>
                        {t("WorkflowUpdatedAt", {
                          time: new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(workflow.updatedAt)),
                        })}
                      </Typography>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Paper>
  );
}
