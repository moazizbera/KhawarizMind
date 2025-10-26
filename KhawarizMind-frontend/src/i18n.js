import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        AppName: "KhawarizMind",
        DashboardTitle: "KhawarizMind Dashboard",
        // Common nav
        Documents: "Documents",
        Workflows: "Workflows",
        "AI Assistant": "AI Assistant",
        Settings: "Settings",
        "Image Processing": "Image Processing",
        "Document Viewer": "Document Viewer",
        // Hero
        Welcome: "Welcome to KhawarizMind",
        HeroSubtitle:
          "Your intelligent ECM AI Assistant — inspired by Al-Khwarizmi’s legacy of logic and innovation.",
        GetStarted: "Get Started",
        ViewOnGitHub: "View on GitHub",
        // Login
        Login: "Login",
        Username: "Username",
        Password: "Password",
        SignIn: "Sign In",
        // Documents module
        DocumentName: "Document Name",
        Type: "Type",
        Action: "Action",
        View: "View",
        NoResults: "No results",
        SearchPlaceholder: "Search by name or type...",
        OpenImageProcessing: "Open Image Processing",
        // AI panel
        AIPanelWelcome:
          "Hello! I’m KhawarizMind. Ask me to classify, extract, or summarize documents.",
        Send: "Send",
        // Viewer titles
        ImageProcessingViewer: "Image Processing Viewer",
        DocumentViewer: "Document Viewer",
        Maximize: "Maximize",
        Restore: "Restore",
        Close: "Close",
      },
    },
    ar: {
      translation: {
        AppName: "عقل الخوارزمي",
        DashboardTitle: "لوحة تحكم عقل الخوارزمي",
        // Common nav
        Documents: "المستندات",
        Workflows: "سير العمل",
        "AI Assistant": "المساعد الذكي",
        Settings: "الإعدادات",
        "Image Processing": "معالجة الصور",
        "Document Viewer": "عارض المستندات",
        // Hero
        Welcome: "مرحباً بك في عقل الخوارزمي",
        HeroSubtitle:
          "مساعد إدارة المحتوى الذكي المستوحى من إرث الخوارزمي في المنطق والابتكار.",
        GetStarted: "ابدأ الآن",
        ViewOnGitHub: "استعرض على GitHub",
        // Login
        Login: "تسجيل الدخول",
        Username: "اسم المستخدم",
        Password: "كلمة المرور",
        SignIn: "تسجيل الدخول",
        // Documents module
        DocumentName: "اسم المستند",
        Type: "النوع",
        Action: "الإجراء",
        View: "عرض",
        NoResults: "لا توجد نتائج",
        SearchPlaceholder: "ابحث بالاسم أو النوع...",
        OpenImageProcessing: "افتح معالجة الصور",
        // AI panel
        AIPanelWelcome:
          "مرحباً! أنا عقل الخوارزمي. اطلب مني تصنيف المستندات أو استخراج البيانات أو تلخيصها.",
        Send: "إرسال",
        // Viewer titles
        ImageProcessingViewer: "عارض معالجة الصور",
        DocumentViewer: "عارض المستندات",
        Maximize: "تكبير",
        Restore: "استعادة",
        Close: "إغلاق",
      },
    },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
