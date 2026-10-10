document.addEventListener("DOMContentLoaded", () => {
  const usersTableBody = document.getElementById("usersTableBody");
  const refreshUsersBtn = document.getElementById("refreshUsers");
  const searchUsersInput = document.getElementById("searchUsersInput");
  const filterUsersSelect = document.getElementById("filterUsersSelect");
  const selectAllCheckbox = document.getElementById("selectAllUsers");

  function renderEmptyState() {
    usersTableBody.innerHTML =
      '<tr><td colspan="10" style="text-align:center;">No users found</td></tr>';
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
  }

  refreshUsersBtn?.addEventListener("click", renderEmptyState);
  searchUsersInput?.addEventListener("input", renderEmptyState);
  filterUsersSelect?.addEventListener("change", renderEmptyState);
  selectAllCheckbox?.addEventListener("change", () => {
    selectAllCheckbox.checked = false;
  });

  document.getElementById("deleteAllUsersBtn")?.addEventListener("click", () => {
    alert("No user data is collected.");
  });
  document.getElementById("downloadAllPdfBtn")?.addEventListener("click", () => {
    alert("No user data to export.");
  });

  renderEmptyState();
});
