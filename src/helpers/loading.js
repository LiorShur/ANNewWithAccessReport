/**
 * Loading state helpers
 */

export function showLoading(message = 'Loading...') {
  const overlay = document.getElementById('loadingOverlay');
  const text = overlay?.querySelector('.loading-text');
  if (overlay) {
    overlay.classList.remove('hidden');
    if (text) text.textContent = message;
  }
}

export function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  overlay?.classList.add('hidden');
}