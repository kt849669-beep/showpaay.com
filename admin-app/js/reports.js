document.addEventListener("DOMContentLoaded", () => {
  const reportTableBody = document.getElementById("reportTableBody");
  const reportFromDate = document.getElementById("reportFromDate");
  const reportToDate = document.getElementById("reportToDate");

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  reportToDate.value = today.toISOString().split("T")[0];
  reportFromDate.value = thirtyDaysAgo.toISOString().split("T")[0];

  function renderEmptyReport() {
    document.getElementById("reportTotal").textContent = "0";
    document.getElementById("reportPending").textContent = "0";
    document.getElementById("reportCompleted").textContent = "0";
    reportTableBody.innerHTML =
      '<tr><td colspan="8" style="text-align:center;">No data found for selected filters</td></tr>';
  }

  document.getElementById("generateReportBtn")?.addEventListener("click", renderEmptyReport);
  document.getElementById("downloadPdfReportBtn")?.addEventListener("click", () => {
    alert("No user data to export.");
  });
  document.getElementById("downloadCsvReportBtn")?.addEventListener("click", () => {
    alert("No user data to export.");
  });

  renderEmptyReport();
});
