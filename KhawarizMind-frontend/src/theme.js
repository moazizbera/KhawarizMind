import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#2563EB", // deep blue
    },
    secondary: {
      main: "#60A5FA", // lighter accent blue
    },
    background: {
      default: "#000814",
      paper: "#001D3D",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "rgba(255,255,255,0.7)",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h2: { fontWeight: 800, letterSpacing: "-0.02em" },
    h6: { fontWeight: 400, lineHeight: 1.6 },
  },
  shape: {
    borderRadius: 16,
  },
});

export default theme;
