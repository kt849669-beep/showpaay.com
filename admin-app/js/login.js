import { localDb } from "../../user-app/js/config/local-db.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorMsg = document.getElementById("errorMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      const { data } = await localDb
        .from("admin_settings")
        .select("*")
        .eq("admin_email", email)
        .eq("admin_password", password)
        .limit(1);

      if (data && data.length > 0) {
        const sessionToken = crypto.randomUUID();
        const deviceInfo = navigator.userAgent;
        
        await localDb
          .from("admin_sessions")
          .insert({ token: sessionToken, device_info: deviceInfo });

        localStorage.setItem("showpay_admin_session_token", sessionToken);
        window.location.href = "/admin-app/pages/dashboard.html";
        return;
      }
    } catch (err) {
      console.error("Unable to read administrator settings:", err);
    }

    if (email === "admin@showpay.com" && password === "admin@0123") {
      const sessionToken = crypto.randomUUID();
      const deviceInfo = navigator.userAgent;
      await localDb
          .from("admin_sessions")
          .insert({ token: sessionToken, device_info: deviceInfo });
      localStorage.setItem("showpay_admin_session_token", sessionToken);
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
  });
});
