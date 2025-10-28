import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import apiClient, { getDocuments, uploadDocument } from "../services/api";

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

function safeLower(value = "") {
  return String(value || "").toLowerCase();
}

function applySortFilter(rows, comparator, query) {
  const stabilized = rows.map((el, i) => [el, i]);
  stabilized.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    return order !== 0 ? order : a[1] - b[1];
  });
  const sorted = stabilized.map((el) => el[0]);
  if (!query) return sorted;
  const q = safeLower(query);
  return sorted.filter((r) => {
    const name = safeLower(r.name);
    const type = safeLower(r.type);
    return name.includes(q) || type.includes(q);
  });
}

const FALLBACK_DOCS = [
  { name: "Project_Plan.pdf", type: "pdf", url: "/sample.pdf" },
  {
    name: "Financial_Report.xlsx",
    type: "xlsx",
    url: "https://file-examples.com/storage/fe5d32/excel.xlsx",
  },
  {
    name: "Company_Profile.docx",
    type: "docx",
    url: "https://file-examples.com/storage/fe5d32/doc.docx",
  },
  { name: "Blueprint_Scan.jpg", type: "jpg", url: "/sample-scan.jpg" },
];

function getStepColor(status) {
  const normalized = String(status || "").toLowerCase();
  if (["success", "completed", "done"].includes(normalized)) return "success";
  if (["active", "processing", "running"].includes(normalized)) return "info";
  if (["error", "failed"].includes(normalized)) return "error";
  return "default";
}

function isStepPending(status) {
  const normalized = String(status || "").toLowerCase();
  return normalized === "pending" || normalized === "waiting";
}

export default function Documents({ onOpenDocViewer, onOpenImage }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  const [query, setQuery] = useState("");
  const [orderBy, setOrderBy] = useState("name");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [documents, setDocuments] = useState([]);
  const [pipelineSteps, setPipelineSteps] = useState([]);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const uploadInputRef = useRef(null);
  const initialLoad = useRef(true);

  const baseUrl = apiClient?.defaults?.baseURL;
  const toAbsoluteUrl = useCallback(
    (url) => {
      if (!url) return "";
      const fallback =
        typeof window !== "undefined" ? window.location.origin : undefined;
      try {
        return new URL(url, baseUrl || fallback).href;
      } catch (error) {
        return url;
      }
    },
    [baseUrl]
  );

  const fetchDocuments = useCallback(
    async (search = "") => {
      try {
        setLoading(true);
        setError("");
        const response = await getDocuments(search ? { search } : undefined);
        const normalized = Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.documents)
          ? response.documents
          : Array.isArray(response)
          ? response
          : [];

        const mapped = normalized.map((doc) => ({
          name:
            doc?.name ||
            doc?.fileName ||
            doc?.title ||
            t("UntitledDocument", { defaultValue: "Untitled document" }),
          type: doc?.type || doc?.mimeType?.split("/").pop() || "",
          url: toAbsoluteUrl(doc?.url || doc?.downloadUrl || doc?.previewUrl),
          id: doc?.id || doc?.documentId || doc?.fileId || doc?.externalId,
          createdAt: doc?.createdAt || doc?.created_on || doc?.created || null,
        }));

        const pipelineRaw =
          response?.pipeline ||
          response?.processing ||
          response?.data?.pipeline ||
          response?.metadata?.pipeline ||
          null;

        const pipelineCollection = Array.isArray(pipelineRaw)
          ? pipelineRaw
          : Array.isArray(pipelineRaw?.steps)
          ? pipelineRaw.steps
          : [];

        const normalizedSteps = pipelineCollection.map((step, index) => ({
          key: step?.key || step?.id || `step-${index}`,
          label: step?.label || step?.name || `Step ${index + 1}`,
          status: step?.status || step?.state || "pending",
          detail: step?.detail || step?.description || "",
        }));

        setPipelineSteps(normalizedSteps);
        setPipelineRunning(
          normalizedSteps.some((step) =>
            ["active", "processing", "running"].includes(
              String(step.status || "").toLowerCase()
            )
          )
        );

        setDocuments(mapped);
      } catch (err) {
        console.error("Failed to load documents", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            t("DocumentsLoadError", { defaultValue: "Unable to load documents." })
        );
        setDocuments((prev) =>
          prev.length === 0
            ? FALLBACK_DOCS.map((doc) => ({
                ...doc,
                url: toAbsoluteUrl(doc.url),
              }))
            : prev
        );
        setPipelineSteps([]);
        setPipelineRunning(false);
      } finally {
        setLoading(false);
      }
    },
    [t, toAbsoluteUrl]
  );

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

  useEffect(() => {
    if (page === 0) return;
    const maxPage = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filtered.length, page, rowsPerPage]);

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleRefresh = () => {
    setPage(0);
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
        err?.response?.data?.message ||
          err?.message ||
          t("UploadFailed", { defaultValue: "Upload failed." })
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleOpenDoc = useCallback(
    (doc) => {
      if (!doc?.url) return;
      onOpenDocViewer?.({ fileUrl: doc.url, fileName: doc.name });
    },
    [onOpenDocViewer]
  );

  const handleOpenImage = useCallback(
    (doc) => {
      if (!doc?.url) return;
      onOpenImage?.({ fileUrl: doc.url, fileName: doc.name });
    },
    [onOpenImage]
  );

  const formatDate = useCallback(
    (value) => {
      if (!value) {
        return t("UnknownDate", { defaultValue: "Unknown" });
      }
      try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          return t("UnknownDate", { defaultValue: "Unknown" });
        }
        const locale = lang === "ar" ? "ar" : undefined;
        return date.toLocaleString(locale);
      } catch (error) {
        return t("UnknownDate", { defaultValue: "Unknown" });
      }
    },
    [lang, t]
  );

  const headCells = useMemo(
    () => [
      {
        id: "name",
        label: t("DocumentName", { defaultValue: "Document" }),
        sortable: true,
        align: "left",
      },
      {
        id: "type",
        label: t("Type", { defaultValue: "Type" }),
        sortable: true,
        align: "left",
        width: 120,
      },
      {
        id: "createdAt",
        label: t("Uploaded", { defaultValue: "Uploaded" }),
        sortable: true,
        align: "left",
        width: 200,
      },
      {
        id: "actions",
        label: t("Action", { defaultValue: "Action" }),
        sortable: false,
        align: "center",
        width: 220,
      },
    ],
    [t]
  );

  const showImageButton = typeof onOpenImage === "function";

  return (
    <Paper
      dir={isRtl ? "rtl" : "ltr"}
      sx={{
        p: 3,
        bgcolor: "background.paper",
        textAlign: isRtl ? "right" : "left",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Stack spacing={1} alignItems={isRtl ? "flex-end" : "flex-start"}>
          <Typography variant="h5" fontWeight={700}>
            {t("Documents")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("DocumentsSubtitle", {
              defaultValue: "Manage and explore your documents.",
            })}
          </Typography>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder={t("SearchPlaceholder", { defaultValue: "Search documents" })}
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
            startIcon={
              uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />
            }
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
            sx={{ minWidth: 160 }}
          >
            {uploading
              ? t("Uploading", { defaultValue: "Uploading..." })
              : t("UploadDocument", { defaultValue: "Upload document" })}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            {t("Refresh", { defaultValue: "Refresh" })}
          </Button>
        </Stack>
      </Stack>

      {pipelineSteps.length > 0 && (
        <Box sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", p: 2, mt: 3 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              {t("PipelineStatus", { defaultValue: "Processing pipeline" })}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              {pipelineSteps.map((step) => (
                <Chip
                  key={step.key}
                  label={`${step.label}${step.detail ? ` · ${step.detail}` : ""}`}
                  color={getStepColor(step.status)}
                  variant={isStepPending(step.status) ? "outlined" : "filled"}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
            {(uploading || pipelineRunning) && <LinearProgress />}
          </Stack>
        </Box>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ mt: 3, position: "relative" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {headCells.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  align={headCell.align}
                  sortDirection={orderBy === headCell.id ? order : false}
                  sx={{ width: headCell.width }}
                >
                  {headCell.sortable ? (
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : "asc"}
                      onClick={() => handleSort(headCell.id)}
                    >
                      {headCell.label}
                    </TableSortLabel>
                  ) : (
                    headCell.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && documents.length === 0
              ? Array.from({ length: rowsPerPage }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={headCells.length}>
                      <Skeleton variant="rounded" height={40} />
                    </TableCell>
                  </TableRow>
                ))
              : pageRows.map((doc) => (
                  <TableRow key={doc.id || doc.name} hover>
                    <TableCell>{doc.name}</TableCell>
                    <TableCell>{doc.type ? doc.type.toUpperCase() : t("UnknownType", { defaultValue: "Unknown" })}</TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleOpenDoc(doc)}
                          disabled={!doc.url}
                        >
                          {t("View", { defaultValue: "View" })}
                        </Button>
                        {showImageButton && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleOpenImage(doc)}
                            disabled={!doc.url}
                          >
                            {t("Preview", { defaultValue: "Preview" })}
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
            {!loading && pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={headCells.length} align="center">
                  <Stack spacing={1} alignItems="center" sx={{ py: 6 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t("NoResults", { defaultValue: "No documents found" })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("NoResultsHint", {
                        defaultValue: "Try adjusting your filters or upload a new document.",
                      })}
                    </Typography>
                    <Button variant="outlined" onClick={handleRefresh}>
                      {t("ResetFilters", { defaultValue: "Reset filters" })}
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {loading && documents.length > 0 && (
          <LinearProgress sx={{ position: "absolute", left: 0, right: 0, bottom: 0 }} />
        )}
      </TableContainer>

      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25]}
        sx={{ direction: isRtl ? "rtl" : "ltr" }}
      />

      {showImageButton && (
        <Stack
          direction={isRtl ? "row-reverse" : "row"}
          spacing={2}
          sx={{ mt: 2 }}
          justifyContent={isRtl ? "flex-start" : "flex-end"}
        >
          <Button variant="outlined" onClick={() => onOpenImage?.(null)}>
            {t("OpenImageProcessing", { defaultValue: "Open image processing" })}
          </Button>
        </Stack>
      )}

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
          {t("UploadSuccess", { defaultValue: "Upload completed successfully." })}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
