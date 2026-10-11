// auth.js
import { supabase } from "../../user-app/js/config/supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Orbit has its own server-verified login; normal ShowPay login stays below.
  try {
    const response = await fetch('/api/admin/orbit/session', { credentials: 'same-origin', cache: 'no-store' });
    const session = response.ok ? await response.json() : null;
    if (session?.authenticated === true) {
      sessionStorage.setItem('showpay_orbit_login', '1');
      document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
          const logout = await fetch('/api/admin/orbit/logout', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-Showpay-Orbit-CSRF': session.csrf }, body: '{}',
          });
          if (!logout.ok) throw new Error('Logout failed. Please retry.');
          sessionStorage.removeItem('showpay_orbit_login');
          window.location.href = '/admin';
        } catch (error) { alert(error.message); }
      });
      return;
    }
  } catch { /* A standalone deployment can still use its existing login. */ }
  if (sessionStorage.getItem('showpay_orbit_login')) {
    sessionStorage.removeItem('showpay_orbit_login');
    window.location.href = '/admin';
    return;
  }
  const sessionToken = localStorage.getItem("showpay_admin_session_token");
  if (!sessionToken) {
    window.location.href = "/admin";
    return;
  }

  // Verify token asynchronously
  try {
    const { data, error } = await supabase.from("admin_sessions").select("token").eq("token", sessionToken).limit(1);
    
    if (error) {
      console.error("Auth token verification error (table missing or RLS):", error);
      // Don't logout if the table is just missing to avoid infinite login loops
    } else if (!data || data.length === 0) {
      // Token not found in active sessions
      localStorage.removeItem("showpay_admin_session_token");
      window.location.href = "/admin";
      return;
    } else {
      // Update last_active
      await supabase.from("admin_sessions").update({ last_active: new Date().toISOString() }).eq("token", sessionToken);
    }
  } catch (e) {
    console.error("Auth token verification failed:", e);
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.from("admin_sessions").delete().eq("token", sessionToken);
      localStorage.removeItem("showpay_admin_session_token");
      window.location.href = "/admin";
    });
  }
});

export async function logActivity(action, details) {
  try {
    await supabase.from("activity_logs").insert({
      action,
      details,
    });
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}
