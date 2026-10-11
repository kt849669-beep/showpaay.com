document.addEventListener('DOMContentLoaded', async () => {
  const response = await fetch('/api/admin/session');
  if (!response.ok) { location.replace('/admin'); return; }
  const profile = await response.json();
  document.getElementById('profileName').value = profile.admin_name;
  document.getElementById('profileEmail').value = profile.admin_email;
  document.getElementById('profileDisplayName').textContent = profile.admin_name;
  for (const id of ['profileName', 'profileEmail', 'profileCurrentPassword', 'profileNewPassword', 'saveProfileBtn']) document.getElementById(id).disabled = true;
  const message = document.getElementById('profileMessage');
  message.textContent = 'Administrator access is managed in GoDaddy Secrets using ADMIN_EMAIL and ADMIN_PASSWORD. Passwords are never displayed or saved in this page.';
  message.classList.remove('hidden');
  async function sessions() {
    const response = await fetch('/api/admin/sessions');
    if (!response.ok) return;
    const body = document.getElementById('sessionsTableBody');
    body.replaceChildren();
    for (const row of await response.json()) {
      const tr = document.createElement('tr');
      for (const value of [row.device_info, new Date(row.last_active).toLocaleString(), new Date(row.created_at).toLocaleString()]) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
      const td = document.createElement('td');
      if (row.id === profile.id) td.textContent = 'Current';
      else { const button = document.createElement('button'); button.textContent = 'Logout Device'; button.className = 'admin-btn'; button.addEventListener('click', async () => { await fetch('/api/admin/sessions/' + encodeURIComponent(row.id), { method: 'DELETE' }); await sessions(); }); td.append(button); }
      tr.append(td); body.append(tr);
    }
  }
  await sessions();
});
