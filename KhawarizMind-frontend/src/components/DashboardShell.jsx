import React, { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Stack,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import Documents from "../modules/Documents";
import Workflows from "../modules/Workflows";
import Settings from "../modules/Settings";
import AIAssistantPanel from "./AIAssistantPanel";
import UnifiedDocumentViewer from "./UnifiedDocumentViewer";
import ImageProcessingViewer from "./ImageProcessingViewer";
import { useTheme } from "@mui/material/styles";

const NAV_ITEMS = [
  { key: "Documents", path: "/dashboard/docs" },
  { key: "Workflows", path: "/dashboard/work" },
  { key: "AI Assistant", path: "/dashboard/ai", isAi: true },
  { key: "Settings", path: "/dashboard/settings" },
];

export default function DashboardShell({ username }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [lastContentRoute, setLastContentRoute] = useState("/dashboard/docs");
  const [viewerState, setViewerState] = useState({
    open: false,
    fileUrl: "",
    fileName: "",
    maximized: false,
  });
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const storedUsername = useMemo(() => {
    if (typeof window === "undefined") return username || "";
    return window.sessionStorage.getItem("km-username") || username || "";
  }, [username]);

  const displayName = storedUsername || t("GuestUser");

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  const handleOpenDocViewer = ({ fileUrl, fileName }) => {
    setViewerState({ open: true, fileUrl, fileName, maximized: false });
  };

  const handleCloseDocViewer = () => {
    setViewerState((prev) => ({ ...prev, open: false, fileUrl: "", fileName: "", maximized: false }));
  };

  const handleToggleMaximize = () => {
    setViewerState((prev) => ({ ...prev, maximized: !prev.maximized }));
  };

  const handleOpenImage = () => setImageDialogOpen(true);
  const handleCloseImage = () => setImageDialogOpen(false);

  const handleNav = (item) => {
    if (item.isAi) {
      setAiOpen(true);
    } else {
      setAiOpen(false);
    }
    navigate(item.path);
    setMobileOpen(false);
  };

  useEffect(() => {
    const isAiRoute = location.pathname.startsWith("/dashboard/ai");
    setAiOpen(isAiRoute);
    if (!isAiRoute && location.pathname.startsWith("/dashboard")) {
      setLastContentRoute(location.pathname);
    }
  }, [location.pathname]);

  const handleCloseAi = () => {
    setAiOpen(false);
    navigate(lastContentRoute || "/dashboard");
  };

  const drawer = (
    <Box
      sx={{
        textAlign: isRtl ? "right" : "left",
        direction: isRtl ? "rtl" : "ltr",
        p: 2,
      }}
    >
      <Typography variant="h6" sx={{ my: 2, textAlign: "center", fontWeight: 700 }}>
        {t("AppName")}
      </Typography>
      <Divider />
      <List>
        {NAV_ITEMS.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`);
          return (
            <ListItemButton
              key={item.key}
              onClick={() => handleNav(item)}
              selected={isActive}
              sx={{
                textAlign: isRtl ? "right" : "left",
                borderRadius: 2,
                mt: 0.5,
                "&.Mui-selected": {
                  backgroundColor: "primary.main",
                  color: "primary.contrastText",
                  "& .MuiListItemText-primary": { fontWeight: 600 },
                },
              }}
            >
              <ListItemText primary={t(item.key)} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  const Overview = () => (
    <Box sx={{ textAlign: isRtl ? "right" : "left" }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        {t("DashboardWelcomeTitle", { name: displayName })}
      </Typography>
      <Typography sx={{ color: "text.secondary", maxWidth: 720 }}>
        {t("DashboardWelcomeSubtitle")}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        direction: isRtl ? "rtl" : "ltr",
      }}
    >
      {/* Top App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
          flexDirection: isRtl ? "row-reverse" : "row",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge={isRtl ? "end" : "start"}
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {t("Dashboard")}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {displayName}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{
          width: { sm: 240 },
          flexShrink: { sm: 0 },
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          anchor={isRtl ? "right" : "left"}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              width: 240,
              boxSizing: "border-box",
              direction: isRtl ? "rtl" : "ltr",
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Permanent Drawer */}
        <Drawer
          variant="permanent"
          open
          anchor={isRtl ? "right" : "left"}
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              width: 240,
              boxSizing: "border-box",
              direction: isRtl ? "rtl" : "ltr",
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          bgcolor: "background.default",
          minHeight: "100vh",
        }}
      >
        <Toolbar />
        <Routes>
          <Route index element={<Overview />} />
          <Route
            path="docs"
            element={
              <Documents
                onOpenDocViewer={handleOpenDocViewer}
                onOpenImage={handleOpenImage}
              />
            }
          />
          <Route path="work" element={<Workflows />} />
          <Route path="settings" element={<Settings />} />
          <Route path="ai" element={<Overview />} />
          <Route path="*" element={<Navigate to="docs" replace />} />
        </Routes>
      </Box>

      <AIAssistantPanel open={aiOpen} onClose={handleCloseAi} />

      {/* Document Viewer Dialog */}
      <Dialog
        open={viewerState.open}
        onClose={handleCloseDocViewer}
        fullScreen={viewerState.maximized || isSmallScreen}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 1,
            gap: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {viewerState.fileName || t("DocumentViewer")}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              onClick={handleToggleMaximize}
              color="primary"
              startIcon={viewerState.maximized ? <CloseFullscreenIcon /> : <OpenInFullIcon />}
            >
              {viewerState.maximized ? t("Restore") : t("Maximize")}
            </Button>
            <IconButton onClick={handleCloseDocViewer}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: viewerState.maximized ? "100%" : "80vh" }}>
          {viewerState.open && (
            <UnifiedDocumentViewer
              fileUrl={viewerState.fileUrl}
              fileName={viewerState.fileName}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Image Processing Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={handleCloseImage}
        fullScreen={isSmallScreen}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {t("ImageProcessingViewer")}
          </Typography>
          <IconButton onClick={handleCloseImage}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {imageDialogOpen && <ImageProcessingViewer />}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
