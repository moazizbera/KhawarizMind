import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
  Stack,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  TextField,
  MenuItem,
  Grid,
  LinearProgress,
  Tooltip,
  Skeleton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import StatusChip from "../components/StatusChip";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  getWorkflows,
  getWorkflowById,
  saveWorkflow,
} from "../services/api";
import { computeSlaMeta, formatDurationLabel } from "../utils/sla";

const STATUS_OPTIONS = [
  "draft",
  "active",
  "in_progress",
  "completed",
  "paused",
  "overdue",
];

const STATUS_COLOR_HEX = {
  draft: "#90a4ae",
  active: "#0288d1",
  in_progress: "#fb8c00",
  completed: "#2e7d32",
  paused: "#6d4c41",
  overdue: "#c62828",
};

const VIEW_TABS = ["builder", "monitor"];

function buildNodeStyle(statusKey) {
  const color = STATUS_COLOR_HEX[statusKey] || STATUS_COLOR_HEX.draft;
  return {
    border: `2px solid ${color}`,
    borderRadius: 12,
    padding: 12,
    background: `${color}15`,
  };
}

function formatDateTime(value, lang) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeWorkflow(workflow) {
  if (!workflow) return null;
  return {
    ...workflow,
    nodes: Array.isArray(workflow.nodes) ? workflow.nodes : [],
    edges: Array.isArray(workflow.edges) ? workflow.edges : [],
    stages: Array.isArray(workflow.stages) ? workflow.stages : [],
    activities: Array.isArray(workflow.activities) ? workflow.activities : [],
  };
}

function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export default function Workflows() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  const [view, setView] = useState("builder");
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ open: false, severity: "success", message: "" });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const reactFlowWrapper = useRef(null);
  const reactFlowInstance = useRef(null);

  const paletteItems = useMemo(
    () => [
      { type: "task", label: t("WorkflowPaletteTask"), status: "in_progress" },
      { type: "approval", label: t("WorkflowPaletteApproval"), status: "active" },
      { type: "notification", label: t("WorkflowPaletteNotification"), status: "draft" },
    ],
    [t]
  );

  const activeStages = useMemo(() => {
    return nodes.map((node, index) => ({
      id: node.id,
      label: node.data?.label || t("WorkflowStageDefault", { index: index + 1 }),
      status: node.data?.status || "draft",
      order: index,
      assignee: node.data?.assignee || "",
      slaMinutes: node.data?.slaMinutes,
    }));
  }, [nodes, t]);

  const activeStageIndex = useMemo(() => {
    if (activeStages.length === 0) return 0;
    const progressing = activeStages.findIndex((stage) =>
      ["active", "in_progress"].includes(stage.status)
    );
    if (progressing !== -1) return progressing;
    const pending = activeStages.findIndex((stage) => stage.status !== "completed");
    if (pending !== -1) return pending;
    return Math.max(activeStages.length - 1, 0);
  }, [activeStages]);

  const derivedActivities = useMemo(() => {
    if (selectedWorkflow?.activities?.length) {
      return selectedWorkflow.activities;
    }
    return nodes.map((node, index) => ({
      id: `local-${node.id}`,
      title: node.data?.label || t("WorkflowStageDefault", { index: index + 1 }),
      description: node.data?.assignee || "",
      status: node.data?.status || "draft",
      timestamp: new Date(Date.now() + index * 15 * 60 * 1000).toISOString(),
      assignee: node.data?.assignee || "",
    }));
  }, [nodes, selectedWorkflow?.activities, t]);

  const timelineItems = useMemo(
    () =>
      [...derivedActivities].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    [derivedActivities]
  );

  const monitorActiveIndex = useMemo(() => {
    if (timelineItems.length === 0) return 0;
    const activeIdx = timelineItems.findIndex((item) =>
      ["active", "in_progress"].includes((item.status || "").toLowerCase())
    );
    if (activeIdx !== -1) return activeIdx;
    const pendingIdx = timelineItems.findIndex(
      (item) => (item.status || "").toLowerCase() !== "completed"
    );
    if (pendingIdx !== -1) return pendingIdx;
    return Math.max(timelineItems.length - 1, 0);
  }, [timelineItems]);

  const slaMeta = useMemo(() => {
    if (!selectedWorkflow) return { state: "none", progress: 0, remainingMs: null, dueDate: null };
    return computeSlaMeta(selectedWorkflow.dueAt, selectedWorkflow.slaMinutes);
  }, [selectedWorkflow]);

  const nodeSummary = useMemo(() => {
    const total = nodes.length;
    const completed = nodes.filter((node) => node.data?.status === "completed").length;
    const inProgress = nodes.filter((node) =>
      ["active", "in_progress"].includes(node.data?.status)
    ).length;
    return { total, completed, inProgress };
  }, [nodes]);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getWorkflows();
      const normalized = Array.isArray(data) ? data.map(normalizeWorkflow) : [];
      setWorkflows(normalized);
      if (!selectedWorkflowId && normalized.length > 0) {
        setSelectedWorkflowId(normalized[0].id);
      }
    } catch (err) {
      console.error("Failed to load workflows", err);
      setError(err?.response?.data?.message || err?.message || t("WorkflowsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [selectedWorkflowId, t]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  useEffect(() => {
    if (!selectedWorkflowId) {
      setSelectedWorkflow(null);
      return;
    }

    const cached = workflows.find((wf) => wf.id === selectedWorkflowId);
    if (cached?.isDraft) {
      setSelectedWorkflow(deepClone(cached));
      return;
    }

    if (cached && cached.nodes?.length && cached.activities?.length) {
      setSelectedWorkflow(deepClone(cached));
      return;
    }

    const loadDetail = async () => {
      try {
        setWorkflowLoading(true);
        const detail = await getWorkflowById(selectedWorkflowId);
        const normalized = normalizeWorkflow(detail);
        setSelectedWorkflow(normalized);
        setWorkflows((prev) =>
          prev.map((wf) => (wf.id === normalized.id ? { ...normalized } : wf))
        );
      } catch (err) {
        console.error("Failed to fetch workflow", err);
        setError(err?.response?.data?.message || err?.message || t("WorkflowLoadError"));
      } finally {
        setWorkflowLoading(false);
      }
    };

    loadDetail();
  }, [selectedWorkflowId, workflows, t]);

  useEffect(() => {
    if (!selectedWorkflow) {
      setNodes([]);
      setEdges([]);
      setSelectedNodeId(null);
      return;
    }

    const mappedNodes = (selectedWorkflow.nodes || []).map((node, index) => {
      const statusKey = (node.data?.status || "draft").toLowerCase();
      return {
        id: node.id || `node-${index}`,
        type: node.type || "default",
        position: {
          x: node.x ?? node.position?.x ?? 0,
          y: node.y ?? node.position?.y ?? 0,
        },
        data: {
          label: node.data?.label || t("WorkflowStageDefault", { index: index + 1 }),
          assignee: node.data?.assignee || "",
          status: statusKey,
          slaMinutes: node.data?.slaMinutes ?? null,
        },
        style: buildNodeStyle(statusKey),
      };
    });

    const mappedEdges = (selectedWorkflow.edges || []).map((edge, index) => ({
      id: edge.id || `edge-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: edge.type || "default",
    }));

    setNodes(mappedNodes);
    setEdges(mappedEdges);
    setSelectedNodeId(mappedNodes[0]?.id || null);
  }, [selectedWorkflow, setNodes, setEdges, t]);

  const onConnect = useCallback(
    (connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `${connection.source}-${connection.target}-${Date.now()}`,
          },
          eds
        )
      ),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const meta = event.dataTransfer.getData("application/reactflow");
      if (!meta) return;

      let parsed;
      try {
        parsed = JSON.parse(meta);
      } catch (err) {
        parsed = { label: meta, type: "task", status: "draft" };
      }

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const position = reactFlowInstance.current
        ? reactFlowInstance.current.project({
            x: event.clientX - (bounds?.left ?? 0),
            y: event.clientY - (bounds?.top ?? 0),
          })
        : { x: 100, y: 100 };

      const statusKey = (parsed.status || "draft").toLowerCase();
      const newNode = {
        id: `node-${Date.now()}`,
        type: "default",
        position,
        data: {
          label: parsed.label || t("WorkflowPaletteTask"),
          assignee: parsed.assignee || "",
          status: STATUS_OPTIONS.includes(statusKey) ? statusKey : "draft",
          slaMinutes: parsed.slaMinutes ?? selectedWorkflow?.slaMinutes ?? null,
        },
        style: buildNodeStyle(statusKey),
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNode.id);
    },
    [selectedWorkflow?.slaMinutes, setNodes, t]
  );

  const handleNodeSelection = useCallback((selection) => {
    setSelectedNodeId(selection.nodes?.[0]?.id || null);
  }, []);

  const handleNodeDataChange = (field, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== selectedNodeId) return node;
        const statusKey =
          field === "status"
            ? value
            : node.data?.status || "draft";
        return {
          ...node,
          data: {
            ...node.data,
            [field]: field === "slaMinutes" ? Number(value) || null : value,
          },
          style: buildNodeStyle(statusKey),
        };
      })
    );
  };

  const handleWorkflowFieldChange = (field, value) => {
    setSelectedWorkflow((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      if (field === "slaMinutes" && !prev.isDraft && !prev.dueAt && value) {
        updated.dueAt = new Date(Date.now() + Number(value) * 60000).toISOString();
      }
      return updated;
    });
  };

  const serializeNodes = () =>
    nodes.map((node) => ({
      id: node.id,
      type: node.type,
      x: node.position.x,
      y: node.position.y,
      data: {
        label: node.data?.label,
        assignee: node.data?.assignee,
        status: node.data?.status,
        slaMinutes: node.data?.slaMinutes ?? null,
      },
    }));

  const serializeEdges = () =>
    edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
    }));

  const handleSave = async () => {
    if (!selectedWorkflow) return;
    try {
      setSaving(true);
      const payload = {
        name: selectedWorkflow.name,
        description: selectedWorkflow.description,
        owner: selectedWorkflow.owner,
        status: selectedWorkflow.status,
        slaMinutes: selectedWorkflow.slaMinutes,
        dueAt: selectedWorkflow.dueAt,
        nodes: serializeNodes(),
        edges: serializeEdges(),
        stages: activeStages.map((stage, order) => ({
          id: stage.id,
          name: stage.label,
          status: stage.status,
          order,
        })),
        activities: selectedWorkflow.activities,
      };

      if (!selectedWorkflow.isDraft && selectedWorkflow.id) {
        payload.id = selectedWorkflow.id;
      }

      const saved = await saveWorkflow(payload);
      const normalized = normalizeWorkflow(saved);
      setSelectedWorkflow(normalized);
      setWorkflows((prev) => {
        const exists = prev.some((wf) => wf.id === normalized.id);
        if (exists) {
          return prev.map((wf) =>
            wf.id === normalized.id ? { ...normalized } : wf
          );
        }
        return [{ ...normalized }, ...prev.filter((wf) => !wf.isDraft)];
      });
      setSelectedWorkflowId(normalized.id);
      setFeedback({
        open: true,
        severity: "success",
        message: t("WorkflowSaved"),
      });
    } catch (err) {
      console.error("Failed to save workflow", err);
      setFeedback({
        open: true,
        severity: "error",
        message: err?.response?.data?.message || err?.message || t("WorkflowSaveError"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWorkflow = () => {
    const draftId = `draft-${Date.now()}`;
    const now = new Date();
    const dueAt = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
    const draft = {
      id: draftId,
      isDraft: true,
      name: t("WorkflowDraftName"),
      description: "",
      owner: "",
      status: "draft",
      slaMinutes: 480,
      dueAt,
      nodes: [],
      edges: [],
      stages: [],
      activities: [],
    };

    setWorkflows((prev) => [draft, ...prev]);
    setSelectedWorkflowId(draftId);
    setSelectedWorkflow(draft);
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
  };

  const handleCloseFeedback = () => setFeedback((prev) => ({ ...prev, open: false }));

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const slaLabel = useMemo(() => {
    if (slaMeta.state === "none") {
      return t("SlaNotDefined");
    }
    if (slaMeta.state === "overdue") {
      return t("SlaOverdue", { time: formatDurationLabel(slaMeta.remainingMs, t) });
    }
    if (slaMeta.state === "warning") {
      return t("SlaDueSoon", { time: formatDurationLabel(slaMeta.remainingMs, t) });
    }
    return t("SlaOnTrack", { time: formatDurationLabel(slaMeta.remainingMs, t) });
  }, [slaMeta, t]);

  const renderWorkflowList = () => (
    <Box sx={{ width: { xs: "100%", md: 280 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {t("WorkflowLibrary")}
        </Typography>
        <Tooltip title={t("Refresh")}>
          <span>
            <Button
              size="small"
              startIcon={<RefreshIcon fontSize="small" />}
              onClick={fetchWorkflows}
              disabled={loading}
            >
              {t("Refresh")}
            </Button>
          </span>
        </Tooltip>
      </Stack>
      <Button
        variant="contained"
        fullWidth
        startIcon={<AddIcon />}
        onClick={handleCreateWorkflow}
        sx={{ mb: 2 }}
      >
        {t("CreateWorkflow")}
      </Button>
      <Divider sx={{ mb: 1 }} />
      {loading ? (
        <Stack spacing={1}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`wf-skeleton-${index}`} variant="rounded" height={56} />
          ))}
        </Stack>
      ) : (
        <List dense sx={{ maxHeight: 420, overflowY: "auto" }}>
          {workflows.map((wf) => {
            const active = wf.id === selectedWorkflowId;
            return (
              <ListItemButton
                key={wf.id}
                selected={active}
                onClick={() => setSelectedWorkflowId(wf.id)}
                sx={{ borderRadius: 2, mb: 0.5 }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {wf.name || t("WorkflowUntitled")}
                    </Typography>
                  }
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <StatusChip status={wf.status} size="small" />
                      {wf.slaMinutes && (
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={<AccessTimeIcon fontSize="inherit" />}
                          label={`${wf.slaMinutes} ${t("MinutesAbbrev")}`}
                        />
                      )}
                    </Stack>
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
      )}
    </Box>
  );

  const renderBuilder = () => (
    <Stack direction={{ xs: "column", lg: "row" }} spacing={3} sx={{ mt: 3 }}>
      {renderWorkflowList()}
      <Box sx={{ flexGrow: 1 }}>
        {!selectedWorkflow && !workflowLoading ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              {t("WorkflowEmptyState")}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {t("WorkflowEmptyHint")}
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateWorkflow}>
              {t("CreateWorkflow")}
            </Button>
          </Paper>
        ) : (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t("WorkflowName")}
                    value={selectedWorkflow?.name || ""}
                    onChange={(e) => handleWorkflowFieldChange("name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t("WorkflowOwner")}
                    value={selectedWorkflow?.owner || ""}
                    onChange={(e) => handleWorkflowFieldChange("owner", e.target.value)}
                    InputProps={{
                      startAdornment: <PersonIcon sx={{ mr: 1, color: "text.disabled" }} fontSize="small" />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label={t("WorkflowDescription")}
                    value={selectedWorkflow?.description || ""}
                    onChange={(e) => handleWorkflowFieldChange("description", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label={t("WorkflowStatus")}
                    value={selectedWorkflow?.status || "draft"}
                    onChange={(e) => handleWorkflowFieldChange("status", e.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {t(`Status.${option}`)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    type="number"
                    fullWidth
                    label={t("WorkflowSla")}
                    value={selectedWorkflow?.slaMinutes ?? ""}
                    onChange={(e) => handleWorkflowFieldChange("slaMinutes", Number(e.target.value) || null)}
                    helperText={t("WorkflowSlaHelper")}
                    InputProps={{
                      endAdornment: <Typography color="text.secondary">{t("MinutesAbbrev")}</Typography>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label={t("WorkflowDueAt")}
                    value={selectedWorkflow?.dueAt ? selectedWorkflow.dueAt.substring(0, 16) : ""}
                    onChange={(e) => handleWorkflowFieldChange("dueAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <StatusChip status={selectedWorkflow?.status} size="medium" sx={{ width: "fit-content" }} />
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  {t("WorkflowBuilderCanvas")}
                </Typography>
                <Stack direction="row" spacing={1}>
                  {paletteItems.map((item) => (
                    <Chip
                      key={item.type}
                      draggable
                      icon={<AddIcon fontSize="small" />}
                      label={item.label}
                      onDragStart={(event) =>
                        event.dataTransfer.setData(
                          "application/reactflow",
                          JSON.stringify(item)
                        )
                      }
                    />
                  ))}
                </Stack>
              </Stack>
              <Box
                ref={reactFlowWrapper}
                sx={{
                  height: 420,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                }}
              >
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onSelectionChange={handleNodeSelection}
                  onInit={(instance) => {
                    reactFlowInstance.current = instance;
                  }}
                  fitView
                >
                  <MiniMap pannable zoomable />
                  <Controls />
                  <Background gap={20} size={1} />
                </ReactFlow>
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    {t("WorkflowPathway")}
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
                    <LinearProgress
                      variant="determinate"
                      value={slaMeta.progress}
                      color={slaMeta.state === "overdue" ? "error" : slaMeta.state === "warning" ? "warning" : "primary"}
                      sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                    />
                    <Chip
                      icon={<AccessTimeIcon />}
                      label={slaLabel}
                      color={slaMeta.state === "overdue" ? "error" : slaMeta.state === "warning" ? "warning" : "primary"}
                      variant="outlined"
                    />
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  {activeStages.length > 0 ? (
                    <>
                      <Stepper alternativeLabel activeStep={activeStageIndex} sx={{ mb: 3 }}>
                        {activeStages.map((stage) => (
                          <Step key={stage.id} completed={stage.status === "completed"}>
                            <StepLabel optional={<StatusChip status={stage.status} size="small" />}>
                              {stage.label}
                            </StepLabel>
                          </Step>
                        ))}
                      </Stepper>
                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        {activeStages.map((stage) => (
                          <Paper
                            key={`${stage.id}-card`}
                            variant="outlined"
                            sx={{
                              p: 2,
                              minWidth: 200,
                              borderRadius: 2,
                              borderColor: STATUS_COLOR_HEX[stage.status] || STATUS_COLOR_HEX.draft,
                            }}
                          >
                            <Typography variant="subtitle2" fontWeight={700}>
                              {stage.label}
                            </Typography>
                            <StatusChip status={stage.status} size="small" sx={{ mt: 1 }} />
                            {stage.assignee && (
                              <Chip
                                size="small"
                                icon={<PersonIcon fontSize="inherit" />}
                                label={stage.assignee}
                                sx={{ mt: 1 }}
                              />
                            )}
                            {stage.slaMinutes && (
                              <Chip
                                size="small"
                                icon={<AccessTimeIcon fontSize="inherit" />}
                                label={`${stage.slaMinutes} ${t("MinutesAbbrev")}`}
                                sx={{ mt: 1 }}
                                variant="outlined"
                              />
                            )}
                          </Paper>
                        ))}
                      </Stack>
                    </>
                  ) : (
                    <Typography color="text.secondary">{t("WorkflowNoStages")}</Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    {t("WorkflowTaskDetails")}
                  </Typography>
                  {selectedNode ? (
                    <Stack spacing={2}>
                      <TextField
                        label={t("TaskLabel")}
                        value={selectedNode.data?.label || ""}
                        onChange={(e) => handleNodeDataChange("label", e.target.value)}
                      />
                      <TextField
                        label={t("TaskAssignee")}
                        value={selectedNode.data?.assignee || ""}
                        onChange={(e) => handleNodeDataChange("assignee", e.target.value)}
                        InputProps={{
                          startAdornment: <PersonIcon sx={{ mr: 1, color: "text.disabled" }} fontSize="small" />, 
                        }}
                      />
                      <TextField
                        select
                        label={t("TaskStatus")}
                        value={selectedNode.data?.status || "draft"}
                        onChange={(e) => handleNodeDataChange("status", e.target.value)}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <MenuItem key={option} value={option}>
                            {t(`Status.${option}`)}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        type="number"
                        label={t("TaskSlaMinutes")}
                        value={selectedNode.data?.slaMinutes ?? ""}
                        onChange={(e) => handleNodeDataChange("slaMinutes", e.target.value)}
                        InputProps={{
                          endAdornment: <Typography color="text.secondary">{t("MinutesAbbrev")}</Typography>,
                        }}
                      />
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">{t("SelectNodeHint")}</Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="flex-end">
              <Button
                variant="contained"
                onClick={handleSave}
                startIcon={<SaveIcon />}
                disabled={saving || !selectedWorkflow}
              >
                {saving ? t("Saving") : t("SaveWorkflow")}
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </Stack>
  );

  const renderMonitor = () => (
    <Stack spacing={3} sx={{ mt: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t("ActiveWorkflows")}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {workflows.filter((wf) => wf.status === "active").length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t("TasksInProgress")}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {nodeSummary.inProgress}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t("TasksCompleted")}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {nodeSummary.completed} / {nodeSummary.total}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={700}>
              {selectedWorkflow?.name || t("WorkflowUntitled")}
            </Typography>
            <Typography color="text.secondary">
              {selectedWorkflow?.description || t("WorkflowMonitorDescription")}
            </Typography>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
            <StatusChip status={selectedWorkflow?.status} size="small" />
            <Chip
              icon={<AccessTimeIcon />}
              label={slaLabel}
              color={slaMeta.state === "overdue" ? "error" : slaMeta.state === "warning" ? "warning" : "primary"}
              variant="outlined"
            />
          </Stack>
        </Stack>
        <Divider sx={{ my: 3 }} />
        {timelineItems.length > 0 ? (
          <Stepper orientation="vertical" activeStep={monitorActiveIndex} nonLinear>
            {timelineItems.map((activity) => {
              const statusKey = (activity.status || "draft").toLowerCase();
              return (
                <Step key={activity.id} completed={statusKey === "completed"}>
                  <StepLabel optional={<StatusChip status={statusKey} size="small" />}> 
                    <Typography variant="subtitle2" fontWeight={700}>
                      {activity.title}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Stack spacing={0.5} alignItems={isRtl ? "flex-end" : "flex-start"}>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(activity.timestamp, lang)}
                      </Typography>
                      {activity.assignee && (
                        <Chip
                          size="small"
                          icon={<PersonIcon fontSize="inherit" />}
                          label={`${t("AssignedTo")}: ${activity.assignee}`}
                          variant="outlined"
                        />
                      )}
                      {activity.description && (
                        <Typography variant="body2" color="text.secondary">
                          {activity.description}
                        </Typography>
                      )}
                    </Stack>
                  </StepContent>
                </Step>
              );
            })}
          </Stepper>
        ) : (
          <Typography color="text.secondary">{t("WorkflowNoHistory")}</Typography>
        )}
      </Paper>
    </Stack>
  );

  return (
    <Paper sx={{ p: 3 }} dir={isRtl ? "rtl" : "ltr"}>
      <Stack spacing={1} alignItems={isRtl ? "flex-end" : "flex-start"}>
        <Typography variant="h5" fontWeight={700}>
          {t("Workflows")}
        </Typography>
        <Typography sx={{ color: "text.secondary", maxWidth: 720 }}>
          {t("WorkflowsDescription")}
        </Typography>
      </Stack>

      <Tabs
        value={view}
        onChange={(_, value) => setView(value)}
        sx={{ mt: 3 }}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        <Tab value="builder" label={t("WorkflowBuilderView")}></Tab>
        <Tab value="monitor" label={t("WorkflowMonitorView")}></Tab>
      </Tabs>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      {view === "builder" ? renderBuilder() : renderMonitor()}

      {feedback.open && (
        <Box
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: (theme) => theme.zIndex.snackbar,
            direction: "ltr",
          }}
        >
          <Paper
            elevation={6}
            sx={{
              px: 2.5,
              py: 1.5,
              borderRadius: 2,
              bgcolor:
                feedback.severity === "success"
                  ? "success.light"
                  : feedback.severity === "error"
                  ? "error.light"
                  : "grey.800",
              color: feedback.severity === "error" ? "error.contrastText" : "text.primary",
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography fontWeight={600}>{feedback.message}</Typography>
              <Button color="inherit" onClick={handleCloseFeedback}>
                {t("Close")}
              </Button>
            </Stack>
          </Paper>
        </Box>
      )}
    </Paper>
  );
}
