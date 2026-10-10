document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const mobileInput = document.getElementById("mobile");
  const passwordInput = document.getElementById("password");
  const errorMessage = document.getElementById("errorMessage");
  const loginBtn = document.getElementById("loginBtn");

  mobileInput.addEventListener("input", function () {
    this.value = this.value.replace(/[^0-9]/g, "");
    hideError();
  });

  passwordInput.addEventListener("input", hideError);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mobile = mobileInput.value.trim();
    const password = passwordInput.value;

    if (mobile.length !== 10) {
      showError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!password) {
      showError("Please enter a test password to preview the workflow.");
      return;
    }

    setLoading(true);

    // Preview-only flow: immediately remove entered values. They are never
    // written to localStorage, sessionStorage, IndexedDB, cookies, or the DB.
    mobileInput.value = "";
    passwordInput.value = "";

    window.location.replace("/home?preview=1");
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
  }

  function hideError() {
    errorMessage.classList.add("hidden");
  }

  function setLoading(isLoading) {
    loginBtn.textContent = isLoading ? "Please wait..." : "LOG IN";
    loginBtn.disabled = isLoading;
  }
});
