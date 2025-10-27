import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Chip,
  Tooltip,
  LinearProgress,
  Grid,
  InputAdornment,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import RefreshIcon from "@mui/icons-material/Refresh";
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
    id: "sample-1",
    name: "Project_Plan.pdf",
    type: "pdf",
    url: "/sample.pdf",
    status: "Processed",
    classification: "Project Plan",
    tags: ["Project", "Planning"],
    createdAt: "2024-04-02T09:15:00Z",
    languages: ["en", "ar"],
    tooltipLocales: {
      en: "Project Plan",
      ar: "خطة المشروع",
    },
    ocrLayers: [
      {
        pageNumber: 1,
        items: [
          {
            id: "sample-1-ocr-1",
            text: "Executive Summary",
            translations: {
              en: "Executive Summary",
              ar: "الملخص التنفيذي",
            },
          },
          {
            id: "sample-1-ocr-2",
            text: "Timeline",
            translations: {
              en: "Timeline",
              ar: "الجدول الزمني",
            },
          },
        ],
      },
    ],
    annotations: [
      {
        id: "sample-1-ann-1",
        pageNumber: 1,
        x: "18%",
        y: "32%",
        width: "24%",
        height: "10%",
        color: "rgba(37, 99, 235, 0.28)",
        note: {
          en: "Review the milestones",
          ar: "مراجعة الإنجازات",
        },
      },
    ],
    imagePreview: "/sample-scan.jpg",
    imageOcr: [
      {
        id: "sample-1-img-1",
        x: "16%",
        y: "26%",
        width: "30%",
        height: "12%",
        text: "Executive Summary",
        translations: {
          en: "Executive Summary",
          ar: "الملخص التنفيذي",
        },
        confidence: 0.92,
      },
    ],
  },
  {
    id: "sample-2",
    name: "Financial_Report.xlsx",
    type: "xlsx",
    url: "https://file-examples.com/storage/fe5d32/excel.xlsx",
    status: "active",
    assignee: "AI Bot",
    slaMinutes: 720,
    dueAt: new Date(now + 12 * 60 * 60 * 1000).toISOString(),
    status: "Queued",
    classification: "Financial",
    tags: ["Finance"],
    createdAt: "2024-03-22T10:30:00Z",
    languages: ["en"],
    tooltipLocales: {
      en: "Financial Report",
      ar: "تقرير مالي",
    },
    ocrLayers: [],
    annotations: [],
    imagePreview: "/sample-scan.jpg",
    imageOcr: [],
  },
  {
    id: "sample-3",
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
    status: "Processed",
    classification: "Corporate",
    tags: ["HR", "Corporate"],
    createdAt: "2024-01-12T14:20:00Z",
    languages: ["en"],
    tooltipLocales: {
      en: "Company Profile",
      ar: "ملف الشركة",
    },
    ocrLayers: [],
    annotations: [],
    imagePreview: "/sample-scan.jpg",
    imageOcr: [],
  },
  {
    id: "sample-4",
    name: "Blueprint_Scan.jpg",
    type: "jpg",
    url: "/sample-scan.jpg",
    status: "Processed",
    classification: "Engineering",
    tags: ["Design", "Blueprint"],
    createdAt: "2023-12-05T08:05:00Z",
    languages: ["en"],
    tooltipLocales: {
      en: "Blueprint Scan",
      ar: "مخطط هندسي",
    },
    ocrLayers: [],
    annotations: [],
    imagePreview: "/sample-scan.jpg",
    imageOcr: [
      {
        id: "sample-4-img-1",
        x: "42%",
        y: "48%",
        width: "20%",
        height: "14%",
        text: "Section A",
        translations: {
          en: "Section A",
          ar: "القسم أ",
        },
        confidence: 0.88,
      },
    ],
  },
];

const pipelineStepsTemplate = (t) => [
  { key: "upload", label: t("PipelineUpload") },
  { key: "ingest", label: t("PipelineIngest") },
  { key: "classify", label: t("PipelineClassify") },
  { key: "enrich", label: t("PipelineEnrich") },
  { key: "complete", label: t("PipelineComplete") },
];

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeOcrLayers = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.layers)) return payload.layers;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeAnnotations = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

function CustomToolbar({ isRtl }) {
  const { t } = useTranslation();
  return (
    <GridToolbarContainer
      sx={{
        flexDirection: isRtl ? "row-reverse" : "row",
        gap: 1,
        justifyContent: "space-between",
        p: 1,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <GridToolbarFilterButton />
        <GridToolbarExport />
      </Stack>
      <GridToolbarQuickFilter
        quickFilterParser={(value) => value.split(/\s+/).filter(Boolean)}
        placeholder={t("SearchPlaceholder")}
      />
    </GridToolbarContainer>
  );
}

export default function Documents({ onOpenDocViewer, onOpenImage }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [filterModel, setFilterModel] = useState({ items: [] });
  const [selectionModel, setSelectionModel] = useState([]);
  const [bulkTagValue, setBulkTagValue] = useState("");
  const [pipelineSteps, setPipelineSteps] = useState([]);
  const [activeOverlayDoc, setActiveOverlayDoc] = useState(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  const uploadInputRef = useRef(null);
  const initialLoad = useRef(true);
  const pipelineDocRef = useRef(null);

  const stepsConfig = useMemo(() => pipelineStepsTemplate(t), [t]);

  const resetPipeline = useCallback(() => {
    setPipelineSteps(
      stepsConfig.map((step) => ({ ...step, status: "pending", detail: "" }))
    );
  }, [stepsConfig]);

  const setStepStatus = useCallback((key, status, detail = "") => {
    setPipelineSteps((prev) =>
      prev.map((step) =>
        step.key === key
          ? {
              ...step,
              status,
              detail,
            }
          : step
      )
    );
  }, []);

  const pipelineRunning = useMemo(
    () => pipelineSteps.some((step) => step.status === "active"),
    [pipelineSteps]
  );

  const mergeDocumentRecord = useCallback((baseDocs, candidate) => {
    if (!candidate) return baseDocs;
    const existingIndex = baseDocs.findIndex((doc) => doc.id === candidate.id);
    if (existingIndex === -1) {
      return [candidate, ...baseDocs];
    }
    const updated = [...baseDocs];
    updated[existingIndex] = {
      ...baseDocs[existingIndex],
      ...candidate,
      tags: Array.from(
        new Set([
          ...(baseDocs[existingIndex].tags || []),
          ...(candidate.tags || []),
        ])
      ),
    };
    return updated;
  }, []);

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
        const response = await getDocuments(search ? { search } : undefined);
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

        pipelineDocRef.current = null;
        setDocuments(merged);
      } catch (err) {
        console.error("Failed to load documents", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            t("DocumentsLoadError")
        );
        setDocuments((prev) =>
          prev.length === 0 ? [...FALLBACK_DOCS] : prev
        );
      } finally {
        setLoading(false);
      }
    },
    [mergeDocumentRecord, t]
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

  const handleRefresh = () => {
    fetchDocuments(query.trim());
  };

  const handleBulkTagApply = useCallback(() => {
    if (!bulkTagValue.trim() || selectionModel.length === 0) return;
    const tag = bulkTagValue.trim();
    setDocuments((prev) =>
      prev.map((doc) =>
        selectionModel.includes(doc.id)
          ? {
              ...doc,
              tags: Array.from(new Set([...(doc.tags || []), tag])),
            }
          : doc
      )
    );
    setBulkTagValue("");
  }, [bulkTagValue, selectionModel]);

  const handleBulkTagClear = useCallback(() => {
    if (selectionModel.length === 0) return;
    setDocuments((prev) =>
      prev.map((doc) =>
        selectionModel.includes(doc.id) ? { ...doc, tags: [] } : doc
      )
    );
  }, [selectionModel]);

  const selectedDocs = useMemo(
    () => documents.filter((doc) => selectionModel.includes(doc.id)),
    [documents, selectionModel]
  );

  const selectedDocForImage = selectedDocs[0] || documents[0] || null;

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetPipeline();
    setUploading(true);
    setError("");

    try {
      setStepStatus("upload", "active", t("PipelineUploadingFile", { name: file.name }));
      const uploadResponse = await uploadDocument(file, { locale: lang });
      const documentId =
        uploadResponse?.id ||
        uploadResponse?.documentId ||
        uploadResponse?.data?.id;
      const uploadedName =
        uploadResponse?.name || uploadResponse?.fileName || file.name;
      const uploadedUrl =
        uploadResponse?.url ||
        uploadResponse?.downloadUrl ||
        uploadResponse?.previewUrl ||
        "";
      setStepStatus("upload", "success", t("PipelineUploadComplete"));

      if (documentId) {
        setStepStatus("ingest", "active", t("PipelineIngesting"));
        const ingestResponse = await ingestDocument(documentId, {
          locale: lang,
        });
        setStepStatus("ingest", "success", t("PipelineIngestComplete"));

        setStepStatus("classify", "active", t("PipelineClassifying"));
        const classifyResponse = await autoClassifyDocument(documentId, {
          locale: lang,
        });
        setStepStatus("classify", "success", t("PipelineClassifyComplete"));

        setStepStatus("enrich", "active", t("PipelineEnriching"));
        const enrichResponse = await enrichDocumentMetadata(documentId, {
          locale: lang,
          classification:
            classifyResponse?.classification ||
            classifyResponse?.data?.classification,
          tags:
            classifyResponse?.tags ||
            classifyResponse?.data?.tags ||
            [],
        });
        setStepStatus("enrich", "success", t("PipelineEnrichComplete"));

        const [ocrResult, annotationResult] = await Promise.allSettled([
          getDocumentOcrLayers(documentId),
          getDocumentAnnotations(documentId),
        ]);

        const mergedRecord = {
          id: documentId,
          name: uploadedName,
          type: file.name.split(".").pop() || "",
          url:
            enrichResponse?.url ||
            enrichResponse?.previewUrl ||
            ingestResponse?.url ||
            uploadedUrl,
          status:
            enrichResponse?.status ||
            ingestResponse?.status ||
            "Processed",
          classification:
            enrichResponse?.classification ||
            classifyResponse?.classification ||
            classifyResponse?.data?.classification ||
            "",
          tags: Array.from(
            new Set([
              ...normalizeArray(enrichResponse?.tags || enrichResponse?.metadata?.tags),
              ...normalizeArray(classifyResponse?.tags || classifyResponse?.data?.tags),
            ])
          ),
          createdAt:
            enrichResponse?.createdAt ||
            ingestResponse?.createdAt ||
            uploadResponse?.createdAt ||
            new Date().toISOString(),
          languages: normalizeArray(
            enrichResponse?.languages || enrichResponse?.metadata?.languages
          ),
          tooltipLocales:
            enrichResponse?.localizedTitles ||
            enrichResponse?.titles ||
            enrichResponse?.metadata?.titles ||
            {},
          ocrLayers: normalizeOcrLayers(
            ocrResult.status === "fulfilled" ? ocrResult.value : []
          ),
          annotations: normalizeAnnotations(
            annotationResult.status === "fulfilled"
              ? annotationResult.value
              : []
          ),
          imagePreview:
            enrichResponse?.previewImage || ingestResponse?.previewImage || "",
          imageOcr: normalizeArray(
            enrichResponse?.imageOcr || enrichResponse?.metadata?.ocrBoxes
          ),
          metadata: enrichResponse?.metadata || {},
        };

        pipelineDocRef.current = mergedRecord;
      }

      setStepStatus("complete", "success", t("PipelineCompleteDetail"));
      setUploadSuccess(true);
      await fetchDocuments(query.trim());
    } catch (err) {
      console.error("Upload pipeline failed", err);
      setStepStatus(
        "complete",
        "error",
        err?.response?.data?.message || err?.message || t("UploadFailed")
      );
      setError(
        err?.response?.data?.message || err?.message || t("UploadFailed")
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleViewDocument = useCallback(
    async (doc) => {
      if (!doc) return;
      let enrichedDoc = doc;
      if (doc.id && (!doc.ocrLayers?.length || !doc.annotations?.length)) {
        try {
          setActiveOverlayDoc(doc.id);
          const [ocrResult, annotationResult] = await Promise.allSettled([
            getDocumentOcrLayers(doc.id),
            getDocumentAnnotations(doc.id),
          ]);
          enrichedDoc = {
            ...doc,
            ocrLayers:
              ocrResult.status === "fulfilled"
                ? normalizeOcrLayers(ocrResult.value)
                : doc.ocrLayers,
            annotations:
              annotationResult.status === "fulfilled"
                ? normalizeAnnotations(annotationResult.value)
                : doc.annotations,
          };
          setDocuments((prev) =>
            prev.map((row) => (row.id === doc.id ? enrichedDoc : row))
          );
        } catch (err) {
          console.error("Failed to load OCR or annotations", err);
          setError(
            err?.response?.data?.message ||
              err?.message ||
              t("OverlayLoadFailed")
          );
        } finally {
          setActiveOverlayDoc(null);
        }
      }
      onOpenDocViewer(enrichedDoc);
    },
    [onOpenDocViewer, t]
  );

  const handleOpenImage = useCallback(
    (doc) => {
      const target = doc || selectedDocForImage;
      if (!target) {
        onOpenImage({ imageSrc: "/sample-scan.jpg", ocrData: [] });
        return;
      }
      onOpenImage({
        imageSrc: target.imagePreview || target.url,
        ocrData: normalizeArray(target.imageOcr),
        annotations: normalizeAnnotations(target.annotations),
        tooltipLocales: target.tooltipLocales || {},
      });
    },
    [onOpenImage, selectedDocForImage]
  );

  const columns = useMemo(
    () => [
      {
        field: "name",
        headerName: t("DocumentName"),
        flex: 1.4,
        minWidth: 220,
        renderCell: (params) => (
          <Stack spacing={0.5} sx={{ width: "100%" }}>
            <Typography variant="body1" fontWeight={600} noWrap>
              {params.row.name}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              {params.row.languages?.map((lng) => (
                <Chip
                  key={`${params.row.id}-${lng}`}
                  size="small"
                  label={lng.toUpperCase()}
                  icon={<AutoAwesomeIcon fontSize="inherit" />}
                  sx={{
                    fontSize: "0.7rem",
                    height: 22,
                    "& .MuiChip-icon": { fontSize: 14 },
                  }}
                />
              ))}
            </Stack>
          </Stack>
        ),
      },
      {
        field: "type",
        headerName: t("Type"),
        width: 110,
        valueFormatter: (params) => params.value?.toUpperCase(),
      },
      {
        field: "status",
        headerName: t("Status"),
        width: 150,
        renderCell: (params) => (
          <Chip
            label={params.value || t("Unknown")}
            color={
              params.value === "Processed"
                ? "success"
                : params.value === "Queued"
                ? "warning"
                : params.value === "Failed"
                ? "error"
                : "default"
            }
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        field: "classification",
        headerName: t("Classification"),
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <Stack spacing={0.5} sx={{ width: "100%" }}>
            <Typography variant="body2" fontWeight={500} noWrap>
              {params.value || t("Unclassified")}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {params.row.tooltipLocales?.[lang] || params.row.name}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "tags",
        headerName: t("Tags"),
        flex: 1.1,
        minWidth: 200,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {params.value?.length ? (
              params.value.map((tag) => (
                <Chip
                  key={`${params.row.id}-${tag}`}
                  size="small"
                  label={tag}
                  icon={<TagIcon fontSize="inherit" />}
                  sx={{
                    height: 24,
                    fontSize: "0.75rem",
                    "& .MuiChip-icon": { fontSize: 14 },
                  }}
                />
              ))
            ) : (
              <Typography variant="caption" color="text.secondary">
                {t("NoTags")}
              </Typography>
            )}
          </Stack>
        ),
      },
      {
        field: "createdAt",
        headerName: t("UploadedOn"),
        width: 180,
        valueFormatter: (params) =>
          params.value
            ? new Date(params.value).toLocaleString()
            : "",
      },
      {
        field: "actions",
        headerName: t("Action"),
        width: 220,
        sortable: false,
        filterable: false,
        align: "center",
        renderCell: (params) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant="contained"
              onClick={() => handleViewDocument(params.row)}
              disabled={activeOverlayDoc === params.row.id}
            >
              {activeOverlayDoc === params.row.id ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                t("View")
              )}
            </Button>
            <Tooltip title={t("OpenImageProcessing")}
              placement={isRtl ? "left" : "right"}
            >
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<LayersIcon />}
                  onClick={() => handleOpenImage(params.row)}
                >
                  {t("ImageInsights")}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [activeOverlayDoc, handleOpenImage, handleViewDocument, isRtl, lang, t]
  );

  return (
    <Paper
      dir={isRtl ? "rtl" : "ltr"}
      sx={{
        p: 3,
        bgcolor: "background.paper",
        textAlign: isRtl ? "right" : "left",
      }}
    >
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
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
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems="center"
          >
            <TextField
              size="small"
              placeholder={t("SearchPlaceholder")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPaginationModel((prev) => ({ ...prev, page: 0 }));
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
                uploading || pipelineRunning ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <CloudUploadIcon />
                )
              }
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploading || pipelineRunning}
              sx={{ minWidth: 180 }}
            >
              {uploading || pipelineRunning ? t("Uploading") : t("UploadDocument")}
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

        {pipelineSteps.length > 0 && (
          <Box sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", p: 2 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                {pipelineSteps.map((step) => (
                  <Chip
                    key={step.key}
                    label={`${step.label}${step.detail ? ` · ${step.detail}` : ""}`}
                    color={
                      step.status === "success"
                        ? "success"
                        : step.status === "active"
                        ? "info"
                        : step.status === "error"
                        ? "error"
                        : "default"
                    }
                    variant={step.status === "pending" ? "outlined" : "filled"}
                    sx={{
                      mb: 1,
                    }}
                  />
                ))}
              </Stack>
              {(uploading || pipelineRunning) && <LinearProgress />}
            </Stack>
          </Box>
        )}

        <Paper variant="outlined" sx={{ height: 520, position: "relative" }}>
          <DataGrid
            rows={documents}
            columns={columns}
            autoHeight={false}
            density="compact"
            disableRowSelectionOnClick
            checkboxSelection
            onRowSelectionModelChange={(model) => setSelectionModel(model)}
            rowSelectionModel={selectionModel}
            loading={loading && documents.length === 0}
            filterModel={filterModel}
            onFilterModelChange={setFilterModel}
            slots={{ toolbar: CustomToolbar }}
            slotProps={{ toolbar: { isRtl } }}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            sx={{
              direction: isRtl ? "rtl" : "ltr",
              "& .MuiDataGrid-cell": { alignItems: "center" },
              "& .MuiDataGrid-toolbarContainer": {
                flexDirection: isRtl ? "row-reverse" : "row",
              },
            }}
          />
          {loading && documents.length > 0 && (
            <LinearProgress sx={{ position: "absolute", left: 0, right: 0, bottom: 0 }} />
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid
            container
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
            direction={isRtl ? "row-reverse" : "row"}
          >
            <Grid item xs={12} md={6}>
              <Stack spacing={1}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {t("BulkActions")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("SelectedCount", { count: selectionModel.length })}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                  <TextField
                    size="small"
                    value={bulkTagValue}
                    onChange={(event) => setBulkTagValue(event.target.value)}
                    placeholder={t("TagPlaceholder")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <TagIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      minWidth: { xs: "100%", sm: 220 },
                      direction: isRtl ? "rtl" : "ltr",
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleBulkTagApply}
                    disabled={!bulkTagValue.trim() || selectionModel.length === 0}
                  >
                    {t("ApplyTag")}
                  </Button>
                  <Button
                    variant="text"
                    color="secondary"
                    onClick={handleBulkTagClear}
                    disabled={selectionModel.length === 0}
                  >
                    {t("ClearTags")}
                  </Button>
                </Stack>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack
                spacing={1}
                alignItems={isRtl ? "flex-end" : "flex-start"}
                direction={isRtl ? "row-reverse" : "row"}
                justifyContent={isRtl ? "flex-start" : "flex-end"}
              >
                <Button
                  variant="outlined"
                  onClick={() => handleOpenImage(selectedDocForImage)}
                  startIcon={<LayersIcon />}
                  disabled={!documents.length}
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
        anchorOrigin={{
          vertical: "bottom",
          horizontal: isRtl ? "left" : "right",
        }}
      >
        <Alert
          onClose={() => setError("")}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={uploadSuccess}
        autoHideDuration={4000}
        onClose={() => setUploadSuccess(false)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: isRtl ? "left" : "right",
        }}
      >
        <Alert
          onClose={() => setUploadSuccess(false)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {t("UploadSuccess")}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
