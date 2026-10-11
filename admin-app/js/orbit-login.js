(async () => {
const ticket = new URLSearchParams(location.hash.slice(1)).get('ticket');
history.replaceState(null, '', location.pathname);
try {
  if (!ticket || !/^[a-f0-9]{64}$/.test(ticket)) throw new Error('Open ShowPay from your logged-in Orbit Admin account.');
  const response = await fetch('/api/admin/orbit/redeem', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket }),
  });
  const result = await response.json();
  if (!response.ok || !result.authenticated) throw new Error(result.error || 'Unable to sign in.');
  sessionStorage.setItem('showpay_orbit_login', '1');
  location.replace('/admin-app/pages/dashboard.html');
} catch (error) {
  document.getElementById('status').textContent = error.message;
}
})();
