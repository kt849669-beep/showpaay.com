import { localDb } from "../../user-app/js/config/local-db.js";

document.addEventListener("DOMContentLoaded", () => {
  function resetUserStats() {
    document.getElementById("statTotalUsers").textContent = "0";
    document.getElementById("statPendingUsers").textContent = "0";
    document.getElementById("statCompletedUsers").textContent = "0";
    document.getElementById("statTodayLogins").textContent = "0";
    document.getElementById("statLatestLogin").textContent = "-";
  }

  async function fetchDisplayStats() {
    try {
      const { count: sliderCount } = await localDb
        .from("slider_images")
        .select("*", { count: "exact", head: true });
      document.getElementById("statTotalSliders").textContent = sliderCount || 0;

      const { count: videoCount } = await localDb
        .from("popup_video")
        .select("*", { count: "exact", head: true });
      document.getElementById("statTotalVideos").textContent = videoCount || 0;

      const { data: telegramItems } = await localDb
        .from("telegram_popup")
        .select("is_enabled")
        .limit(1);
      const enabled = Boolean(telegramItems?.[0]?.is_enabled);
      const status = document.getElementById("statTelegramStatus");
      status.textContent = enabled ? "Enabled" : "Disabled";
      status.style.color = enabled ? "#10b981" : "#ef4444";
    } catch (error) {
      console.error("Unable to load display settings:", error);
    }
  }

  resetUserStats();
  fetchDisplayStats();

  localDb
    .channel("dashboard-display-settings")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "slider_images" },
      fetchDisplayStats,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "popup_video" },
      fetchDisplayStats,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "telegram_popup" },
      fetchDisplayStats,
    )
    .subscribe();
});
