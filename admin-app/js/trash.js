document.addEventListener("DOMContentLoaded", () => {
  const trashTableBody = document.getElementById("trashTableBody");

  function renderEmptyTrash() {
    trashTableBody.innerHTML =
      '<tr><td colspan="3" style="text-align:center;">Trash is empty</td></tr>';
  }

  document.getElementById("restoreAllBtn")?.addEventListener("click", () => {
    alert("No user data to restore.");
  });
  document.getElementById("emptyTrashBtn")?.addEventListener("click", () => {
    alert("Trash is already empty.");
  });

  renderEmptyTrash();
});
