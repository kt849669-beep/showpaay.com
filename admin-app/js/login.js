document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('adminLoginForm');
  const error = document.getElementById('errorMsg');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('password');
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: document.getElementById('email').value.trim(), password: password.value }) });
      password.value = '';
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Sign in failed');
      localStorage.removeItem('showpay_admin_session_token');
      location.href = '/admin-app/pages/dashboard.html';
    } catch (failure) {
      password.value = '';
      error.textContent = failure.message;
      error.classList.remove('hidden');
      error.style.display = 'block';
    }
  });
});
