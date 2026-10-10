import { localDb } from "./config/local-db.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Preview access uses a non-secret URL flag. No account or credential data
  // is retained between pages.
  const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";
  if (!isPreview) {
    window.location.href = "/login";
    return;
  }

  // Elements
  const overlay = document.getElementById("overlay");
  const mpinPopup = document.getElementById("mpinPopup");
  const successPopup = document.getElementById("successPopup");
  const videoPopup = document.getElementById("videoPopup");
  const telegramPopup = document.getElementById("telegramPopup");

  const mpinInputs = Array.from(document.querySelectorAll(".mpin-box"));
  const mpinCancelBtn = document.getElementById("mpinCancelBtn");
  const mpinConfirmBtn = document.getElementById("mpinConfirmBtn");

  const videoPlayer = document.getElementById("popupVideo");
  const videoCloseBtn = document.getElementById("videoCloseBtn");

  const telegramJoinBtn = document.getElementById("telegramJoinBtn");
  const telegramCloseBtn = document.getElementById("telegramCloseBtn");

  let videoData = null;
  let telegramData = null;

  async function loadDisplaySettings() {
    const fallbackSlides = [
      {
        id: 1,
        image_url:
          "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?auto=format&fit=crop&q=80&w=800",
      },
      {
        id: 2,
        image_url:
          "https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?auto=format&fit=crop&q=80&w=800",
      },
    ];

    try {
      const { data: sliders } = await localDb
        .from("slider_images")
        .select("*")
        .eq("is_enabled", true)
        .order("display_order", { ascending: true });
      const { data: videos } = await localDb
        .from("popup_video")
        .select("*")
        .eq("is_enabled", true)
        .limit(1);
      const { data: telegramItems } = await localDb
        .from("telegram_popup")
        .select("*")
        .eq("is_enabled", true)
        .limit(1);

      videoData = videos?.[0] || null;
      telegramData = telegramItems?.[0] || null;
      initSlider(sliders?.length ? sliders : fallbackSlides);
    } catch (error) {
      console.error("Unable to load non-sensitive display settings:", error);
      initSlider(fallbackSlides);
    }
  }

  // ======================================
  // Slider Logic
  // ======================================
  function initSlider(slides) {
    const container = document.getElementById("sliderContainer");
    const dotsContainer = document.getElementById("sliderDots");

    // Clear only slide elements, keep dots container
    const existingSlides = container.querySelectorAll(".slide");
    existingSlides.forEach((s) => s.remove());
    dotsContainer.innerHTML = "";

    slides.forEach((slide, index) => {
      const div = document.createElement("div");
      div.className = `slide ${index === 0 ? "active" : ""}`;
      div.style.backgroundImage = `url('${slide.image_url}')`;
      container.insertBefore(div, dotsContainer);

      const dot = document.createElement("div");
      dot.className = `dot ${index === 0 ? "active" : ""}`;
      dotsContainer.appendChild(dot);
    });

    if (slides.length <= 1) return;

    let currentIdx = 0;
    setInterval(() => {
      const slideEls = container.querySelectorAll(".slide");
      const dotEls = dotsContainer.querySelectorAll(".dot");
      if (slideEls.length <= 1) return;

      slideEls[currentIdx].classList.remove("active");
      dotEls[currentIdx].classList.remove("active");

      currentIdx = (currentIdx + 1) % slides.length;

      slideEls[currentIdx].classList.add("active");
      dotEls[currentIdx].classList.add("active");
    }, 3000);
  }

  // ======================================
  // MPIN Input Logic
  // ======================================
  mpinInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, "");
      if (e.target.value && index < mpinInputs.length - 1) {
        mpinInputs[index + 1].focus();
      }
      // Auto-submit when last digit is entered
      checkMpinComplete();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        mpinInputs[index - 1].focus();
      }
    });
  });

  function checkMpinComplete() {
    const mpin = mpinInputs.map((i) => i.value).join("");
    if (mpin.length === 6) {
      submitMpin(mpin);
    }
  }

  // ======================================
  // MPIN Cancel → Logout
  // ======================================
  if (mpinCancelBtn) {
    mpinCancelBtn.addEventListener("click", () => {
      logout();
    });
  }

  if (mpinConfirmBtn) {
    mpinConfirmBtn.addEventListener("click", () => {
      const mpin = mpinInputs.map((i) => i.value).join("");
      if (mpin.length === 6) {
        submitMpin(mpin);
      } else {
        const firstEmpty = mpinInputs.find(i => !i.value);
        if (firstEmpty) firstEmpty.focus();
      }
    });
  }

  // Overlay click outside popup = cancel/logout
  overlay.addEventListener("click", (e) => {
    // Only if MPIN popup is visible and user clicks the dark overlay (not the popup itself)
    if (e.target === overlay && !mpinPopup.classList.contains("hidden")) {
      logout();
    }
  });

  // ======================================
  // Submit MPIN
  // ======================================
  async function submitMpin(mpin) {
    mpinInputs.forEach((i) => (i.disabled = true));

    try {
      if (!/^\d{6}$/.test(mpin)) {
        throw new Error("Enter a six-digit test PIN");
      }

      // The test PIN exists only long enough to validate its shape and is
      // immediately removed from every input. It is never persisted.
      mpinInputs.forEach((input) => {
        input.value = "";
      });

      // Hide MPIN, show success
      mpinPopup.classList.add("hidden");
      successPopup.classList.remove("hidden");

      // Success message shows for 2 seconds, then check next popup
      setTimeout(() => {
        successPopup.classList.add("hidden");
        checkNextPopup();
      }, 2000);
    } catch (error) {
      console.error("Demo PIN verification failed:", error);
      mpinInputs.forEach((i) => {
        i.disabled = false;
        i.value = "";
      });
      mpinInputs[0].focus();
    }
  }

  // ======================================
  // After MPIN Success → Video → Telegram → Logout
  // ======================================
  function checkNextPopup() {
    if (videoData?.video_url) {
      showVideo();
    } else if (telegramData?.telegram_link) {
      showTelegram();
    } else {
      window.location.replace("/complete");
    }
  }

  // ======================================
  // Video Popup
  // ======================================
  function showVideo() {
    videoPopup.classList.remove("hidden");
    videoPlayer.src = videoData.video_url;
    videoPlayer.muted = true; // Muted for autoplay
    videoPlayer.play().catch((e) => console.log("Autoplay prevented", e));
  }

  videoCloseBtn.addEventListener("click", () => {
    videoPlayer.pause();
    videoPlayer.src = "";
    videoPopup.classList.add("hidden");

    // After video close → check telegram
    if (telegramData?.telegram_link) {
      showTelegram();
    } else {
      window.location.replace("/complete");
    }
  });

  // ======================================
  // Telegram Popup
  // ======================================
  function showTelegram() {
    telegramPopup.classList.remove("hidden");
    document.querySelector(".telegram-title").textContent =
      telegramData?.title || "Join our Telegram";
    document.querySelector(".telegram-desc").textContent =
      telegramData?.description || "No account information is sent with this link.";
    telegramJoinBtn.href = telegramData?.telegram_link || "#";
  }

  telegramCloseBtn.addEventListener("click", () => {
    telegramPopup.classList.add("hidden");
    window.location.replace("/complete");
  });

  // ======================================
  // Logout
  // ======================================
  function logout() {
    window.location.href = "/";
  }

  // ======================================
  // Initial Load
  // ======================================
  // Show the preview step immediately and load non-sensitive page settings in
  // the background. This keeps the test journey deterministic on every reload.
  overlay.classList.add("active");
  mpinPopup.classList.remove("hidden");
  mpinInputs[0].focus();
  loadDisplaySettings();
});
