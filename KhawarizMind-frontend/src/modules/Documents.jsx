import React, { useMemo, useState } from "react";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

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
  return sorted.filter(
    (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)
  );
}

const SAMPLE_DOCS = [
  { name: "Project_Plan.pdf", type: "pdf", url: "/sample.pdf" },
  { name: "Financial_Report.xlsx", type: "xlsx", url: "https://file-examples.com/storage/fe5d32/excel.xlsx" },
  { name: "Company_Profile.docx", type: "docx", url: "https://file-examples.com/storage/fe5d32/doc.docx" },
  { name: "Blueprint_Scan.jpg", type: "jpg", url: "/sample-scan.jpg" },
  { name: "HR_Policy.pdf", type: "pdf", url: "/sample.pdf" },
  { name: "Balance_Sheet.xlsx", type: "xlsx", url: "https://file-examples.com/storage/fe5d32/excel.xlsx" },
  { name: "Contract_Template.docx", type: "docx", url: "https://file-examples.com/storage/fe5d32/doc.docx" },
  { name: "Invoice_0001.pdf", type: "pdf", url: "/sample.pdf" },
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

  const filtered = useMemo(
    () => applySortFilter(SAMPLE_DOCS, getComparator(order, orderBy), query),
    [query, order, orderBy]
  );
  const pageRows = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage]
  );

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
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
        <Typography variant="h5" fontWeight={700}>
          {t("Documents")}
        </Typography>
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
            minWidth: { xs: "100%", sm: 300 },
            direction: isRtl ? "rtl" : "ltr",
          }}
        />
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
            {pageRows.map((doc) => (
              <TableRow key={doc.name} hover>
                <TableCell>{doc.name}</TableCell>
                <TableCell>{doc.type.toUpperCase()}</TableCell>
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
                  >
                    {t("View")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  {t("NoResults")}
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
    </Paper>
  );
}
