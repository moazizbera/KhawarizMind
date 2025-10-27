import React from "react";
import { Paper, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

export default function Settings() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  return (
    <Paper sx={{ p: 3 }} dir={isRtl ? "rtl" : "ltr"}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        {t("Settings")}
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>
        {t("SettingsDescription")}
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 3 }}>
        {t("SettingsDescription")}
      </Typography>

      {loading && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            {t("SettingsLoading")}
          </Typography>
        </Stack>
      )}

      {feedback.message && (
        <Alert
          severity={feedback.type === "success" ? "success" : "error"}
          onClose={() => setFeedback({ type: "", message: "" })}
          sx={{ mb: 2 }}
        >
          {feedback.message}
        </Alert>
      )}

      {!canEdit && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("SettingsAccessDenied", {
            roles: (missingRoles.length ? missingRoles : requiredRoles).join(", "),
          })}
        </Alert>
      )}

      {Array.isArray(requiredRoles) && requiredRoles.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", mb: 1 }}>
            {t("SettingsRequiredRolesLabel")}
          </Typography>
          <Stack direction="row" flexWrap="wrap" sx={{ mt: 1 }}>
            {roleChips}
          </Stack>
        </Box>
      )}

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label={t("SettingsTabsAriaLabel")}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.value} label={tab.label} value={tab.value} {...a11yProps(tab.value)} />
        ))}
      </Tabs>

      <TabPanel current={activeTab} value="localization">
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {t("LocalizationDescription")}
          </Typography>
          <FormControl
            component="fieldset"
            disabled={!canEdit || savingSection === "localization"}
          >
            <FormLabel>{t("LocalizationLanguageLabel")}</FormLabel>
            <RadioGroup
              row
              value={form.language}
              onChange={handleLanguageChange}
              sx={{ mt: 1 }}
            >
              <FormControlLabel
                value="en"
                control={<Radio />}
                label={t("LanguageEnglish")}
              />
              <FormControlLabel
                value="ar"
                control={<Radio />}
                label={t("LanguageArabic")}
              />
            </RadioGroup>
          </FormControl>
          {renderSaveButton("localization")}
        </Stack>
      </TabPanel>

      <TabPanel current={activeTab} value="theming">
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {t("ThemingDescription")}
          </Typography>
          <FormControl
            component="fieldset"
            disabled={!canEdit || savingSection === "theming"}
          >
            <FormLabel>{t("ThemingModeLabel")}</FormLabel>
            <RadioGroup
              row
              value={form.theme}
              onChange={handleThemeChange}
              sx={{ mt: 1 }}
            >
              <FormControlLabel
                value="light"
                control={<Radio />}
                label={t("ThemeLight")}
              />
              <FormControlLabel
                value="dark"
                control={<Radio />}
                label={t("ThemeDark")}
              />
            </RadioGroup>
          </FormControl>
          {renderSaveButton("theming")}
        </Stack>
      </TabPanel>

      <TabPanel current={activeTab} value="notifications">
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            {t("NotificationsDescription")}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.notifications.email)}
                onChange={handleNotificationToggle("email")}
                disabled={!canEdit || savingSection === "notifications"}
              />
            }
            label={t("NotificationEmail")}
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.notifications.sms)}
                onChange={handleNotificationToggle("sms")}
                disabled={!canEdit || savingSection === "notifications"}
              />
            }
            label={t("NotificationSMS")}
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.notifications.push)}
                onChange={handleNotificationToggle("push")}
                disabled={!canEdit || savingSection === "notifications"}
              />
            }
            label={t("NotificationPush")}
          />
          {renderSaveButton("notifications")}
        </Stack>
      </TabPanel>

      <TabPanel current={activeTab} value="integrations">
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary">
            {t("IntegrationsDescription")}
          </Typography>
          <TextField
            label={t("IntegrationsSlackWebhook")}
            value={form.integrations.slackWebhook}
            onChange={handleIntegrationChange("slackWebhook")}
            disabled={!canEdit || savingSection === "integrations"}
            fullWidth
            autoComplete="off"
          />
          <TextField
            label={t("IntegrationsTeamsWebhook")}
            value={form.integrations.teamsWebhook}
            onChange={handleIntegrationChange("teamsWebhook")}
            disabled={!canEdit || savingSection === "integrations"}
            fullWidth
            autoComplete="off"
          />
          <TextField
            label={t("IntegrationsApiKey")}
            value={form.integrations.apiKey}
            onChange={handleIntegrationChange("apiKey")}
            disabled={!canEdit || savingSection === "integrations"}
            fullWidth
            autoComplete="off"
            type="password"
            helperText={t("IntegrationsSecurityNote")}
          />
          {renderSaveButton("integrations")}
        </Stack>
      </TabPanel>

      <Divider sx={{ my: 4 }} />

      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t("AuditLogTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("AuditLogSubtitle")}
        </Typography>
        {auditLogs.length === 0 ? (
          <Typography color="text.secondary">{t("AuditLogEmpty")}</Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {auditLogs.map((entry) => {
              const sectionLabel = sectionLabels[entry.section] || entry.section;
              const action =
                entry.action ||
                t("AuditLogFallbackAction", { section: sectionLabel });
              let actor = entry.actor || "";
              if (!actor.trim()) {
                actor = t("AuditLogActorUnknown");
              } else if (actor.trim().toLowerCase() === "system") {
                actor = t("AuditLogActorSystem");
              }
              const timestamp = formatTimestamp(entry.timestamp, lang);
              const detailsValue = entry.details;
              let detailsSummary = null;
              if (detailsValue && typeof detailsValue === "object") {
                const keys = Object.keys(detailsValue);
                if (keys.length > 0) {
                  detailsSummary = JSON.stringify(detailsValue);
                }
              } else if (
                typeof detailsValue === "string" &&
                detailsValue.trim() !== ""
              ) {
                detailsSummary = detailsValue;
              } else if (
                typeof detailsValue === "number" ||
                typeof detailsValue === "boolean"
              ) {
                detailsSummary = String(detailsValue);
              }

              return (
                <ListItem key={entry.id} alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        <Typography variant="subtitle2">{action}</Typography>
                        <Chip
                          size="small"
                          label={sectionLabel}
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t("AuditLogSecondaryLine", {
                            actor,
                            time: timestamp,
                          })}
                        </Typography>
                        {detailsSummary ? (
                          <Typography
                            variant="caption"
                            sx={{ color: "text.disabled", wordBreak: "break-word" }}
                          >
                            {detailsSummary}
                          </Typography>
                        ) : null}
                      </Stack>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Paper>
  );
}
