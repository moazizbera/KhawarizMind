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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import RefreshIcon from "@mui/icons-material/Refresh";
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
        const response = await getDocuments(
          search ? { search } : undefined
        );
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
            t("UntitledDocument"),
          type: doc?.type || doc?.mimeType?.split("/").pop() || "",
          url: toAbsoluteUrl(doc?.url || doc?.downloadUrl || doc?.previewUrl),
          id: doc.id,
          createdAt: doc.createdAt,
        }));

        setDocuments(mapped);
      } catch (err) {
        console.error("Failed to load documents", err);
        setError(
          err?.response?.data?.message || err?.message || t("DocumentsLoadError")
        );
        setDocuments((prev) =>
          prev.length === 0
            ? FALLBACK_DOCS.map((doc) => ({
                ...doc,
                url: toAbsoluteUrl(doc.url),
              }))
            : prev
        );
      } finally {
        setLoading(false);
      }
    },
    [t, toAbsoluteUrl]
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
              <TableCell align="center" width={140}>
                {t("Action")}
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && documents.length === 0
              ? Array.from({ length: rowsPerPage }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={3}>
                      <Skeleton variant="rounded" height={40} />
                    </TableCell>
                  </TableRow>
                ))
              : pageRows.map((doc) => (
                  <TableRow key={doc.id || doc.name} hover>
                    <TableCell>{doc.name}</TableCell>
                    <TableCell>
                      {doc.type ? doc.type.toUpperCase() : t("UnknownType")}
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
                ))}
            {!loading && pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
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
