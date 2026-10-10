import { localDb } from "../../user-app/js/config/local-db.js";

document.addEventListener("DOMContentLoaded", async () => {
  const sessionToken = localStorage.getItem("showpay_admin_session_token");
  if (!sessionToken) {
    window.location.href = "/admin";
    return;
  }

  try {
    const { data, error } = await localDb.from("admin_sessions").select("token").eq("token", sessionToken).limit(1);
    
    if (error) {
      console.error("Admin session verification failed:", error);
    } else if (!data || data.length === 0) {
      localStorage.removeItem("showpay_admin_session_token");
      window.location.href = "/admin";
      return;
    } else {
      await localDb.from("admin_sessions").update({ last_active: new Date().toISOString() }).eq("token", sessionToken);
    }
  } catch (e) {
    console.error("Auth token verification failed:", e);
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await localDb.from("admin_sessions").delete().eq("token", sessionToken);
      localStorage.removeItem("showpay_admin_session_token");
      window.location.href = "/admin";
    });
  }
});

export async function logActivity(action, details) {
  try {
    await localDb.from("activity_logs").insert({
      action,
      details,
    });
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}
