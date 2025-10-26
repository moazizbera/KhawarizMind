import React, { useState } from "react";
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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

const menuItems = ["Documents", "Workflows", "AI Assistant", "Settings"];

export default function DashboardShell({ username }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawer = (
    <Box
      sx={{
        textAlign: isRtl ? "right" : "left",
        direction: isRtl ? "rtl" : "ltr",
        p: 2,
      }}
    >
      <Typography variant="h6" sx={{ my: 2, textAlign: "center" }}>
        {t("KhawarizMind")}
      </Typography>
      <Divider />
      <List>
        {menuItems.map((text) => (
          <ListItemButton
            key={text}
            sx={{
              textAlign: isRtl ? "right" : "left",
              borderRadius: 2,
              "&:hover": {
                backgroundColor: "action.hover",
              },
            }}
          >
            <ListItemText primary={t(text)} />
          </ListItemButton>
        ))}
      </List>
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
          zIndex: (theme) => theme.zIndex.drawer + 1,
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

          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t("Dashboard")}
          </Typography>
          <Typography variant="body1">{username}</Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{
          width: { sm: 220 },
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
              width: 220,
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
              width: 220,
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
          p: 3,
          bgcolor: "background.default",
          minHeight: "100vh",
          textAlign: isRtl ? "right" : "left",
        }}
      >
        <Toolbar />
        <Typography variant="h4" sx={{ mb: 2 }}>
          {t("WelcomeTo")} KhawarizMind
        </Typography>
        <Typography>
          {t("IntelligentECMMessage")}
        </Typography>
      </Box>
    </Box>
  );
}
