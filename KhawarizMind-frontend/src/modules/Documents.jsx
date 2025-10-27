import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Button,
  Stack,
  Skeleton,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import RefreshIcon from "@mui/icons-material/Refresh";
import { getDocuments, uploadDocument } from "../services/api";
import StatusChip from "../components/StatusChip";
import { computeSlaMeta, formatDurationLabel } from "../utils/sla";

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}
function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}
function applySortFilter(rows, comparator, query) {
  const stabilized = rows.map((el, i) => [el, i]);
  stabilized.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    return order !== 0 ? order : a[1] - b[1];
  });
  const sorted = stabilized.map((el) => el[0]);
  if (!query) return sorted;
  const q = query.toLowerCase();
  return sorted.filter((r) => {
    const status = (r.status || "").toLowerCase();
    const assignee = (r.assignee || "").toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      status.includes(q) ||
      assignee.includes(q)
    );
  });
}

const now = Date.now();
const FALLBACK_DOCS = [
  {
    name: "Project_Plan.pdf",
    type: "pdf",
    url: "/sample.pdf",
    status: "in_progress",
    assignee: "Nina Rivera",
    slaMinutes: 1440,
    dueAt: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    name: "Financial_Report.xlsx",
    type: "xlsx",
    url: "https://file-examples.com/storage/fe5d32/excel.xlsx",
    status: "active",
    assignee: "AI Bot",
    slaMinutes: 720,
    dueAt: new Date(now + 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    name: "Company_Profile.docx",
    type: "docx",
    url: "https://file-examples.com/storage/fe5d32/doc.docx",
    status: "completed",
    assignee: "Fatima Al-Zahra",
    slaMinutes: 480,
    dueAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    name: "Blueprint_Scan.jpg",
    type: "jpg",
    url: "/sample-scan.jpg",
    status: "overdue",
    assignee: "Quality Desk",
    slaMinutes: 360,
    dueAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
  },
];

export default function Documents({ onOpenDocViewer, onOpenImage }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  const [query, setQuery] = useState("");
  const [orderBy, setOrderBy] = useState("name");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRpp] = useState(5);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const uploadInputRef = useRef(null);

  const getSlaDetails = useCallback(
    (item) => {
      const meta = computeSlaMeta(item?.dueAt, item?.slaMinutes);
      if (meta.state === "none") {
        return { meta, label: t("SlaNotDefined"), color: "default" };
      }

      if (meta.state === "overdue") {
        return {
          meta,
          color: "error",
          label: t("SlaOverdue", { time: formatDurationLabel(meta.remainingMs, t) }),
        };
      }

      if (meta.state === "warning") {
        return {
          meta,
          color: "warning",
          label: t("SlaDueSoon", { time: formatDurationLabel(meta.remainingMs, t) }),
        };
      }

      return {
        meta,
        color: "success",
        label: t("SlaOnTrack", { time: formatDurationLabel(meta.remainingMs, t) }),
      };
    },
    [t]
  );

  const formatDueDate = useCallback(
    (value) => {
      if (!value) return t("SlaNoDueDate");
      const date = new Date(value);
      return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    },
    [lang, t]
  );

  const fetchDocuments = useCallback(
    async (search = "") => {
      try {
        setLoading(true);
        setError("");
        const response = await getDocuments(
          search ? { search } : undefined
        );
        const normalized = Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response)
          ? response
          : [];

        const mapped = normalized.map((doc) => ({
          name: doc.name || doc.fileName || doc.title,
          type: doc.type || doc.mimeType?.split("/").pop() || "",
          url: doc.url || doc.downloadUrl || doc.previewUrl || "",
          id: doc.id,
          createdAt: doc.createdAt,
          status: doc.status || doc.state || "draft",
          assignee: doc.assignee || doc.owner || doc.assignedTo || "",
          slaMinutes: doc.slaMinutes ?? doc.sla?.minutes ?? null,
          dueAt: doc.dueAt || doc.sla?.dueAt || doc.deadline || null,
        }));

        setDocuments(mapped);
      } catch (err) {
        console.error("Failed to load documents", err);
        setError(
          err?.response?.data?.message || err?.message || t("DocumentsLoadError")
        );
        setDocuments((prev) => (prev.length === 0 ? FALLBACK_DOCS : prev));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  const initialLoad = useRef(true);

  useEffect(() => {
    fetchDocuments().finally(() => {
      initialLoad.current = false;
    });
  }, [fetchDocuments]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") {
      if (!initialLoad.current) {
        fetchDocuments();
      }
      return undefined;
    }

    const handler = setTimeout(() => {
      fetchDocuments(trimmed);
    }, 400);
    return () => clearTimeout(handler);
  }, [fetchDocuments, query]);

  const filtered = useMemo(() => {
    if (loading && documents.length === 0) return [];
    return applySortFilter(documents, getComparator(order, orderBy), query);
  }, [documents, order, orderBy, query, loading]);
  const pageRows = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage]
  );

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleRefresh = () => {
    fetchDocuments(query.trim());
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setError("");
      await uploadDocument(file);
      setUploadSuccess(true);
      await fetchDocuments(query.trim());
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || t("UploadFailed")
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <Paper
      dir={isRtl ? "rtl" : "ltr"}
      sx={{
        p: 3,
        bgcolor: "background.paper",
        textAlign: isRtl ? "right" : "left",
      }}
    >
      {/* Header and Search */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack spacing={1} alignItems={isRtl ? "flex-end" : "flex-start"}>
          <Typography variant="h5" fontWeight={700}>
            {t("Documents")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("DocumentsSubtitle")}
          </Typography>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder={t("SearchPlaceholder")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: { xs: "100%", sm: 260 },
              direction: isRtl ? "rtl" : "ltr",
            }}
          />
          <input
            ref={uploadInputRef}
            type="file"
            hidden
            onChange={handleUpload}
          />
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
            sx={{ minWidth: 160 }}
          >
            {uploading ? t("Uploading") : t("UploadDocument")}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            {t("Refresh")}
          </Button>
        </Stack>
      </Stack>

      {/* Table */}
      <TableContainer sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sortDirection={orderBy === "name" ? order : false}>
                <TableSortLabel
                  active={orderBy === "name"}
                  direction={orderBy === "name" ? order : "asc"}
                  onClick={() => handleSort("name")}
                >
                  {t("DocumentName")}
                </TableSortLabel>
              </TableCell>
              <TableCell
                sortDirection={orderBy === "type" ? order : false}
                width={120}
              >
                <TableSortLabel
                  active={orderBy === "type"}
                  direction={orderBy === "type" ? order : "asc"}
                  onClick={() => handleSort("type")}
                >
                  {t("Type")}
                </TableSortLabel>
              </TableCell>
              <TableCell width={180}>{t("AssignedTo")}</TableCell>
              <TableCell width={140}>{t("Status")}</TableCell>
              <TableCell width={220}>{t("SLA")}</TableCell>
              <TableCell align="center" width={140}>
                {t("Action")}
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && documents.length === 0
              ? Array.from({ length: rowsPerPage }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={6}>
                      <Skeleton variant="rounded" height={40} />
                    </TableCell>
                  </TableRow>
                ))
              : pageRows.map((doc) => {
                  const sla = getSlaDetails(doc);
                  const chipColor = sla.color === "default" ? undefined : sla.color;
                  return (
                    <TableRow key={doc.id || doc.name} hover>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell>{doc.type?.toUpperCase()}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={<PersonIcon fontSize="inherit" />}
                          label={doc.assignee || t("Unassigned")}
                          variant={doc.assignee ? "filled" : "outlined"}
                          color={doc.assignee ? "info" : undefined}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={doc.status} size="small" />
                      </TableCell>
                      <TableCell>
                        <Stack spacing={1} alignItems={isRtl ? "flex-end" : "flex-start"}>
                          <Tooltip title={formatDueDate(doc.dueAt)}>
                            <Chip
                              size="small"
                              icon={<AccessTimeIcon fontSize="inherit" />}
                              label={sla.label}
                              color={chipColor}
                              variant={sla.color === "default" ? "outlined" : "filled"}
                            />
                          </Tooltip>
                          {sla.meta.state !== "none" && (
                            <LinearProgress
                              variant="determinate"
                              value={sla.meta.progress}
                              sx={(theme) => ({
                                width: 160,
                                height: 6,
                                borderRadius: 999,
                                backgroundColor: theme.palette.grey[200],
                                "& .MuiLinearProgress-bar": {
                                  backgroundColor:
                                    sla.color === "error"
                                      ? theme.palette.error.main
                                      : sla.color === "warning"
                                      ? theme.palette.warning.main
                                      : theme.palette.success.main,
                                },
                              })}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() =>
                            onOpenDocViewer({
                              fileUrl: doc.url,
                              fileName: doc.name,
                            })
                          }
                          disabled={!doc.url}
                        >
                          {t("View")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!loading && pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Stack spacing={1} alignItems="center" sx={{ py: 6 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t("NoResults")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("NoResultsHint")}
                    </Typography>
                    <Button variant="outlined" onClick={handleRefresh}>
                      {t("ResetFilters")}
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRpp(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25]}
      />

      {/* Footer Buttons */}
      <Stack
        direction={isRtl ? "row-reverse" : "row"}
        spacing={2}
        sx={{ mt: 2 }}
        justifyContent={isRtl ? "flex-start" : "flex-end"}
      >
        <Button variant="outlined" onClick={onOpenImage}>
          {t("OpenImageProcessing")}
        </Button>
      </Stack>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError("")}
        anchorOrigin={{ vertical: "bottom", horizontal: isRtl ? "left" : "right" }}
      >
        <Alert onClose={() => setError("")} severity="error" variant="filled" sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar
        open={uploadSuccess}
        autoHideDuration={4000}
        onClose={() => setUploadSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: isRtl ? "left" : "right" }}
      >
        <Alert onClose={() => setUploadSuccess(false)} severity="success" variant="filled" sx={{ width: "100%" }}>
          {t("UploadSuccess")}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
