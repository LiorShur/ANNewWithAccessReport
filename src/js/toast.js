/**
 * ACCESS NATURE - TOAST NOTIFICATION SYSTEM
 * Displays user feedback messages with icons
 */

class ToastManager {
  constructor() {
    this.container = this.createContainer();
    this.toasts = [];
  }

  createContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Show a toast notification
   * @param {Object} options - Toast options
   * @param {string} options.type - Type: 'success', 'error', 'warning', 'info'
   * @param {string} options.title - Toast title
   * @param {string} options.message - Toast message
   * @param {number} options.duration - Duration in ms (default: 5000)
   */
  show({ type = 'info', title, message, duration = 5000 }) {
    const toast = this.createToast(type, title, message);
    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }

    return toast;
  }

  createToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = this.getIcon(type);
    
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close notification">×</button>
    `;

    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.dismiss(toast);
    });

    return toast;
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  dismiss(toast) {
    toast.classList.add('closing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      const index = this.toasts.indexOf(toast);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    }, 300);
  }

  // Convenience methods
  success(title, message, duration) {
    return this.show({ type: 'success', title, message, duration });
  }

  error(title, message, duration) {
    return this.show({ type: 'error', title, message, duration });
  }

  warning(title, message, duration) {
    return this.show({ type: 'warning', title, message, duration });
  }

  info(title, message, duration) {
    return this.show({ type: 'info', title, message, duration });
  }

  dismissAll() {
    this.toasts.forEach(toast => this.dismiss(toast));
  }
}

// Create global toast manager instance
window.toast = new ToastManager();

// Usage examples (commented out):
// toast.success('Success!', 'Your route has been saved.');
// toast.error('Error', 'Failed to connect to GPS.');
// toast.warning('Warning', 'Low battery detected.');
// toast.info('Info', 'Tracking in progress...');
