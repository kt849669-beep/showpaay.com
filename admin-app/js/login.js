import { supabase } from "../../user-app/js/config/supabase.js";
import { createLoginTransition } from "./login-transition.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorMsg = document.getElementById("errorMsg");
  const transition = createLoginTransition({form, overlay: document.getElementById('adminEntry'), button: form.querySelector('button[type="submit"]'), status: document.getElementById('adminEntryStatus')});

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!transition.begin()) return;
    let navigating = false;
    try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // First try to check against Supabase admin_settings
    try {
      const { data } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("admin_email", email)
        .eq("admin_password", password)
        .limit(1);

      if (data && data.length > 0) {
        // Generate a new session token
        const sessionToken = crypto.randomUUID();
        const deviceInfo = navigator.userAgent;
        
        // Update DB with the new session token
        await supabase
          .from("admin_sessions")
          .insert({ token: sessionToken, device_info: deviceInfo });

        localStorage.setItem("showpay_admin_session_token", sessionToken);
        await transition.complete();
        navigating = true;
        window.location.href = "/admin-app/pages/dashboard.html";
        return;
      }
    } catch (err) {
      console.log("Supabase check failed, falling back to hardcoded:", err);
    }

    // Fallback to hardcoded credentials
    if (email === "admin@showpay.com" && password === "admin@0123") {
      const sessionToken = crypto.randomUUID();
      const deviceInfo = navigator.userAgent;
      await supabase
          .from("admin_sessions")
          .insert({ token: sessionToken, device_info: deviceInfo });
      localStorage.setItem("showpay_admin_session_token", sessionToken);
      await transition.complete();
      navigating = true;
      window.location.href = "/admin-app/pages/dashboard.html";
    } else {
      errorMsg.textContent = "Invalid credentials";
      errorMsg.classList.remove("hidden");
      errorMsg.style.display = "block";
      errorMsg.style.color = "#ef4444";
      errorMsg.style.textAlign = "center";
      errorMsg.style.marginBottom = "16px";
      errorMsg.style.fontSize = "14px";
    }
    } catch {
      errorMsg.textContent = "Unable to sign in. Please try again.";
      errorMsg.classList.remove("hidden");
    } finally {
      if (!navigating) transition.reset();
    }
  });
});
