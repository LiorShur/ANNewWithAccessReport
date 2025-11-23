// ==============================================
// ACCESS NATURE - TOAST NOTIFICATION SYSTEM
// Non-blocking notification handler
//
// File: src/helpers/toasts.js
// Version: 1.0
// ==============================================

/**
 * Toast Notification System
 * Replaces alert() with beautiful, non-blocking notifications
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.toastCounter = 0;
    this.init();
  }

  /**
   * Initialize toast container
   */
  init() {
    // Create container if it doesn't exist
    if (!document.getElementById('toastContainer')) {
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toastContainer');
    }
  }

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - Type of toast (success, error, warning, info)
   * @param {object} options - Additional options
   * @returns {string} Toast ID
   */
  show(message, type = 'info', options = {}) {
    const defaults = {
      title: null,
      duration: 4000,
      closable: true,
      actions: null,
      onClose: null,
      position: 'top-right'
    };

    const config = { ...defaults, ...options };
    const toastId = `toast-${++this.toastCounter}`;

    // Create toast element
    const toast = this.createToast(toastId, message, type, config);
    
    // Add to container
    this.container.appendChild(toast);
    this.toasts.set(toastId, toast);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-enter');
    });

    // Auto-dismiss
    if (config.duration > 0) {
      const dismissTimeout = setTimeout(() => {
        this.dismiss(toastId);
      }, config.duration);
      
      toast.setAttribute('data-timeout', dismissTimeout);
    }

    return toastId;
  }

  /**
   * Create toast element
   */
  createToast(id, message, type, config) {
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    // Icon
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    let html = `
      <div class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</div>
      <div class="toast-content">
    `;

    if (config.title) {
      html += `<div class="toast-title">${this.escapeHtml(config.title)}</div>`;
    }

    html += `<div class="toast-message">${this.escapeHtml(message)}</div>`;

    // Actions
    if (config.actions && config.actions.length > 0) {
      html += '<div class="toast-actions">';
      config.actions.forEach(action => {
        html += `
          <button class="toast-action-btn" data-action="${action.id}">
            ${this.escapeHtml(action.label)}
          </button>
        `;
      });
      html += '</div>';
    }

    html += '</div>';

    // Close button
    if (config.closable) {
      html += `
        <button class="toast-close" aria-label="Close notification">
          ×
        </button>
      `;
    }

    toast.innerHTML = html;

    // Event listeners
    if (config.closable) {
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn?.addEventListener('click', () => {
        this.dismiss(id);
        config.onClose?.();
      });
    }

    // Action button listeners
    if (config.actions) {
      const actionBtns = toast.querySelectorAll('.toast-action-btn');
      actionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const actionId = e.target.getAttribute('data-action');
          const action = config.actions.find(a => a.id === actionId);
          if (action?.onClick) {
            action.onClick();
            if (action.dismissOnClick !== false) {
              this.dismiss(id);
            }
          }
        });
      });
    }

    return toast;
  }

  /**
   * Dismiss a toast
   * @param {string} toastId - ID of toast to dismiss
   */
  dismiss(toastId) {
    const toast = this.toasts.get(toastId);
    if (!toast) return;

    // Clear timeout
    const timeout = toast.getAttribute('data-timeout');
    if (timeout) {
      clearTimeout(parseInt(timeout));
    }

    // Add exit animation
    toast.classList.add('toast-exit');

    // Remove after animation
    setTimeout(() => {
      toast.remove();
      this.toasts.delete(toastId);
    }, 300);
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    this.toasts.forEach((_, id) => {
      this.dismiss(id);
    });
  }

  /**
   * Convenience methods for different toast types
   */
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', { duration: 6000, ...options });
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  /**
   * Show loading toast with spinner
   */
  loading(message, options = {}) {
    return this.show(message, 'info', {
      duration: 0,
      closable: false,
      ...options,
      title: options.title || 'Loading...'
    });
  }

  /**
   * Update an existing toast
   */
  update(toastId, message, type, options = {}) {
    const toast = this.toasts.get(toastId);
    if (!toast) return;

    const messageEl = toast.querySelector('.toast-message');
    if (messageEl) {
      messageEl.textContent = message;
    }

    if (type) {
      toast.className = `toast toast-${type}`;
    }

    if (options.title) {
      const titleEl = toast.querySelector('.toast-title');
      if (titleEl) {
        titleEl.textContent = options.title;
      }
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create singleton instance
const toastManager = new ToastManager();

// Export convenience functions
export const showToast = (message, type, options) => toastManager.show(message, type, options);
export const dismissToast = (id) => toastManager.dismiss(id);
export const dismissAllToasts = () => toastManager.dismissAll();

export const toast = {
  show: (message, type, options) => toastManager.show(message, type, options),
  success: (message, options) => toastManager.success(message, options),
  error: (message, options) => toastManager.error(message, options),
  warning: (message, options) => toastManager.warning(message, options),
  info: (message, options) => toastManager.info(message, options),
  loading: (message, options) => toastManager.loading(message, options),
  dismiss: (id) => toastManager.dismiss(id),
  dismissAll: () => toastManager.dismissAll(),
  update: (id, message, type, options) => toastManager.update(id, message, type, options)
};

// Make available globally for non-module usage
if (typeof window !== 'undefined') {
  window.toast = toast;
}

export default toast;

// ==============================================
// USAGE EXAMPLES
// ==============================================

/*

// Basic usage:
toast.success('Route saved successfully!');
toast.error('Failed to save route');
toast.warning('GPS accuracy is low');
toast.info('Tip: Long press to add note');

// With title:
toast.success('Success!', {
  title: 'Route Saved',
  duration: 5000
});

// With actions:
toast.warning('Unsaved changes detected', {
  title: 'Warning',
  duration: 0, // Don't auto-dismiss
  actions: [
    {
      id: 'save',
      label: 'Save',
      onClick: () => saveRoute()
    },
    {
      id: 'discard',
      label: 'Discard',
      onClick: () => discardChanges()
    }
  ]
});

// Loading toast:
const loadingId = toast.loading('Uploading to cloud...');
// ... do async work
toast.update(loadingId, 'Upload complete!', 'success');
setTimeout(() => toast.dismiss(loadingId), 2000);

// Long messages:
toast.info('Your trail has been successfully documented with 5 photos, 3 notes, and complete accessibility information. Share it with the community!', {
  duration: 8000
});

// Error with retry:
toast.error('Failed to sync with cloud', {
  title: 'Sync Error',
  actions: [
    {
      id: 'retry',
      label: 'Retry',
      onClick: () => retrySync()
    }
  ]
});

*/
