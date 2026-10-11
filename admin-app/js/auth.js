import { localDb } from '../../user-app/js/config/local-db.js';
document.addEventListener('DOMContentLoaded', async () => {
  localStorage.removeItem('showpay_admin_session_token');
  try {
    const response = await fetch('/api/admin/session', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Sign in required');
  } catch { location.replace('/admin'); return; }
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    location.replace('/admin');
  });
});
export async function logActivity(action, details) {
  const { error } = await localDb.from('activity_logs').insert({ action, details });
  if (error) console.error(error.message);
}
