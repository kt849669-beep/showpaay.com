// Presentation only. This module never reads credentials or creates a session.
export function createLoginTransition({ form, overlay, button, status }) {
  let busy = false;
  let started = 0;
  const originalLabel = button.textContent;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  return {
    begin() {
      if (busy) return false;
      busy = true;
      started = performance.now();
      button.disabled = true;
      button.textContent = 'Signing in…';
      form.setAttribute('aria-busy', 'true');
      status.textContent = 'Signing in…';
      overlay.hidden = false;
      overlay.classList.add('is-running');
      return true;
    },
    async complete() {
      // Only called after the existing authentication/session flow succeeds.
      const entrance = reducedMotion ? 100 : 1100;
      await pause(Math.max(0, entrance - (performance.now() - started)));
      status.textContent = 'Opening admin panel…';
      overlay.classList.add('is-success');
      await pause(reducedMotion ? 100 : 350);
    },
    reset() {
      busy = false;
      overlay.hidden = true;
      overlay.classList.remove('is-running', 'is-success');
      form.removeAttribute('aria-busy');
      button.disabled = false;
      button.textContent = originalLabel;
    },
  };
}
