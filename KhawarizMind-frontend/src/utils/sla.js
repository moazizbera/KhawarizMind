export function computeSlaMeta(dueAt, slaMinutes, now = Date.now()) {
  if (!dueAt || !slaMinutes) {
    return {
      state: "none",
      progress: 0,
      remainingMs: null,
      totalMs: null,
      dueDate: dueAt ? new Date(dueAt) : null,
    };
  }

  const dueDate = dueAt instanceof Date ? dueAt : new Date(dueAt);
  const totalMs = slaMinutes * 60 * 1000;
  const remainingMs = dueDate.getTime() - now;
  const progress = Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100));
  let state = "ok";
  if (remainingMs < 0) {
    state = "overdue";
  } else if (remainingMs < totalMs * 0.2) {
    state = "warning";
  }

  return { state, progress, remainingMs, totalMs, dueDate };
}

export function formatDurationLabel(ms, t) {
  if (ms === null || ms === undefined) {
    return t("DurationMinutes", { count: 0 });
  }

  const abs = Math.max(60000, Math.abs(ms));
  const minutes = Math.round(abs / 60000);
  if (minutes < 60) {
    return t("DurationMinutes", { count: minutes });
  }

  const hours = Math.round(abs / 3600000);
  if (hours < 24) {
    return t("DurationHours", { count: hours });
  }

  const days = Math.round(abs / 86400000);
  return t("DurationDays", { count: days });
}
