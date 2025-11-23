/**
 * ACCESS NATURE - LOADING STATE MANAGER
 * Manages loading overlays and button loading states
 */

class LoadingManager {
  constructor() {
    this.overlay = this.createOverlay();
  }

  createOverlay() {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'loading-overlay hidden';
      overlay.innerHTML = `
        <div class="loading-content">
          <div class="spinner"></div>
          <div class="loading-message">Loading...</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  /**
   * Show loading overlay
   * @param {string} message - Loading message to display
   */
  show(message = 'Loading...') {
    const messageEl = this.overlay.querySelector('.loading-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
    this.overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Hide loading overlay
   */
  hide() {
    this.overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /**
   * Show loading state on a button
   * @param {HTMLButtonElement} button - Button element
   */
  showButtonLoading(button) {
    if (button) {
      button.classList.add('btn-loading');
      button.disabled = true;
      button.dataset.originalText = button.innerHTML;
    }
  }

  /**
   * Hide loading state on a button
   * @param {HTMLButtonElement} button - Button element
   */
  hideButtonLoading(button) {
    if (button) {
      button.classList.remove('btn-loading');
      button.disabled = false;
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  /**
   * Execute async function with loading overlay
   * @param {Function} asyncFn - Async function to execute
   * @param {string} message - Loading message
   */
  async withLoading(asyncFn, message = 'Loading...') {
    this.show(message);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      this.hide();
    }
  }

  /**
   * Execute async function with button loading state
   * @param {HTMLButtonElement} button - Button element
   * @param {Function} asyncFn - Async function to execute
   */
  async withButtonLoading(button, asyncFn) {
    this.showButtonLoading(button);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      this.hideButtonLoading(button);
    }
  }
}

// Create global loading manager instance
window.loading = new LoadingManager();

// Usage examples (commented out):
// loading.show('Saving route...');
// loading.hide();
// 
// await loading.withLoading(async () => {
//   await saveRoute();
// }, 'Saving your route...');
//
// const button = document.querySelector('#saveBtn');
// await loading.withButtonLoading(button, async () => {
//   await saveRoute();
// });
