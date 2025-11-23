// ==============================================
// ACCESS NATURE - MODAL SYSTEM
// Elegant modals replacing alert/confirm/prompt
//
// File: src/helpers/modals.js
// Version: 1.0
// ==============================================

/**
 * Modal System
 * Replaces alert(), confirm(), and prompt() with beautiful modals
 */

class ModalManager {
  constructor() {
    this.activeModals = new Map();
    this.modalCounter = 0;
    this.focusedElementBeforeModal = null;
  }

  /**
   * Show a modal
   * @param {object} options - Modal configuration
   * @returns {Promise} Resolves with result when modal closes
   */
  show(options = {}) {
    return new Promise((resolve) => {
      const defaults = {
        type: 'info', // success, error, warning, info, confirm
        title: '',
        message: '',
        subtitle: null,
        closable: true,
        size: 'md', // sm, md, lg, xl, full
        buttons: null,
        content: null,
        onClose: null,
        icon: null
      };

      const config = { ...defaults, ...options };
      const modalId = `modal-${++this.modalCounter}`;

      // Store currently focused element
      if (!this.focusedElementBeforeModal) {
        this.focusedElementBeforeModal = document.activeElement;
      }

      // Create and show modal
      const { backdrop, modal } = this.createModal(modalId, config, resolve);
      document.body.appendChild(backdrop);
      
      // Store reference
      this.activeModals.set(modalId, { backdrop, modal, resolve });

      // Focus modal after animation
      requestAnimationFrame(() => {
        this.focusModal(modal);
      });

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    });
  }

  /**
   * Create modal elements
   */
  createModal(id, config, resolve) {
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = id;
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', `${id}-title`);

    // Create modal
    const modal = document.createElement('div');
    modal.className = `modal modal-${config.type} modal-${config.size}`;

    // Build modal content
    let modalHTML = '';

    // Header
    modalHTML += this.buildHeader(id, config);

    // Body
    if (config.content) {
      modalHTML += `<div class="modal-body">${config.content}</div>`;
    } else if (config.message) {
      modalHTML += `<div class="modal-body"><p>${this.escapeHtml(config.message)}</p></div>`;
    }

    // Footer
    modalHTML += this.buildFooter(config, id, resolve);

    modal.innerHTML = modalHTML;
    backdrop.appendChild(modal);

    // Event listeners
    this.attachEventListeners(backdrop, modal, config, id, resolve);

    return { backdrop, modal };
  }

  /**
   * Build modal header
   */
  buildHeader(id, config) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      confirm: '❓'
    };

    const icon = config.icon || icons[config.type] || '';

    let header = '<div class="modal-header">';
    
    if (icon) {
      header += `<div class="modal-icon" aria-hidden="true">${icon}</div>`;
    }

    header += '<div class="modal-title-wrapper">';
    header += `<h2 class="modal-title" id="${id}-title">${this.escapeHtml(config.title)}</h2>`;
    
    if (config.subtitle) {
      header += `<div class="modal-subtitle">${this.escapeHtml(config.subtitle)}</div>`;
    }
    
    header += '</div>';

    if (config.closable) {
      header += `
        <button class="modal-close" aria-label="Close" data-action="close">
          ×
        </button>
      `;
    }

    header += '</div>';
    return header;
  }

  /**
   * Build modal footer
   */
  buildFooter(config, id, resolve) {
    let footer = '<div class="modal-footer">';

    // Default buttons based on type
    let buttons = config.buttons;
    
    if (!buttons) {
      if (config.type === 'confirm') {
        buttons = [
          { label: 'Cancel', action: 'cancel', variant: 'secondary' },
          { label: 'Confirm', action: 'confirm', variant: 'primary' }
        ];
      } else {
        buttons = [
          { label: 'OK', action: 'ok', variant: 'primary' }
        ];
      }
    }

    // Build buttons
    buttons.forEach(btn => {
      const variant = btn.variant || 'secondary';
      const disabled = btn.disabled ? 'disabled' : '';
      footer += `
        <button class="btn btn-${variant}" data-action="${btn.action}" ${disabled}>
          ${this.escapeHtml(btn.label)}
        </button>
      `;
    });

    footer += '</div>';
    return footer;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners(backdrop, modal, config, id, resolve) {
    // Close button
    const closeBtn = modal.querySelector('[data-action="close"]');
    closeBtn?.addEventListener('click', () => {
      this.close(id, null, resolve);
    });

    // Action buttons
    const actionBtns = modal.querySelectorAll('[data-action]');
    actionBtns.forEach(btn => {
      const action = btn.getAttribute('data-action');
      if (action !== 'close') {
        btn.addEventListener('click', () => {
          this.close(id, action, resolve);
        });
      }
    });

    // Backdrop click (if closable)
    if (config.closable) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.close(id, null, resolve);
        }
      });
    }

    // ESC key (if closable)
    if (config.closable) {
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          this.close(id, null, resolve);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
      backdrop.setAttribute('data-esc-handler', 'true');
    }

    // Focus trap
    this.setupFocusTrap(modal);
  }

  /**
   * Close modal
   */
  close(id, result, resolve) {
    const modalData = this.activeModals.get(id);
    if (!modalData) return;

    const { backdrop } = modalData;

    // Add closing animation
    backdrop.classList.add('closing');

    // Remove after animation
    setTimeout(() => {
      backdrop.remove();
      this.activeModals.delete(id);

      // Restore body scroll if no more modals
      if (this.activeModals.size === 0) {
        document.body.style.overflow = '';
        
        // Restore focus
        if (this.focusedElementBeforeModal) {
          this.focusedElementBeforeModal.focus();
          this.focusedElementBeforeModal = null;
        }
      }

      // Resolve promise
      resolve(result);
    }, 200);
  }

  /**
   * Focus modal
   */
  focusModal(modal) {
    const firstButton = modal.querySelector('button:not([data-action="close"])');
    const closeButton = modal.querySelector('[data-action="close"]');
    const focusTarget = firstButton || closeButton;
    
    if (focusTarget) {
      focusTarget.focus();
    }
  }

  /**
   * Setup focus trap
   */
  setupFocusTrap(modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Convenience methods
   */

  // Alert (replaces window.alert)
  alert(message, title = 'Alert') {
    return this.show({
      type: 'info',
      title,
      message,
      buttons: [{ label: 'OK', action: 'ok', variant: 'primary' }]
    });
  }

  // Confirm (replaces window.confirm)
  confirm(message, title = 'Confirm') {
    return this.show({
      type: 'confirm',
      title,
      message,
      buttons: [
        { label: 'Cancel', action: 'cancel', variant: 'secondary' },
        { label: 'Confirm', action: 'confirm', variant: 'primary' }
      ]
    }).then(result => result === 'confirm');
  }

  // Success message
  success(message, title = 'Success') {
    return this.show({
      type: 'success',
      title,
      message
    });
  }

  // Error message
  error(message, title = 'Error') {
    return this.show({
      type: 'error',
      title,
      message
    });
  }

  // Warning message
  warning(message, title = 'Warning') {
    return this.show({
      type: 'warning',
      title,
      message
    });
  }

  // Loading modal
  loading(message = 'Loading...', title = 'Please Wait') {
    const loadingContent = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 32px 0;">
        <div class="loading-spinner loading-spinner-primary"></div>
        <p style="margin: 0;">${this.escapeHtml(message)}</p>
      </div>
    `;

    return this.show({
      type: 'info',
      title,
      content: loadingContent,
      closable: false,
      buttons: []
    });
  }

  // Custom list modal
  list(items, title = 'Select Item') {
    const listHTML = `
      <ul class="modal-list">
        ${items.map((item, index) => `
          <li class="modal-list-item" data-action="select-${index}">
            ${item.title ? `<div class="modal-list-item-title">${this.escapeHtml(item.title)}</div>` : ''}
            ${item.description ? `<div class="modal-list-item-description">${this.escapeHtml(item.description)}</div>` : ''}
          </li>
        `).join('')}
      </ul>
    `;

    return this.show({
      type: 'info',
      title,
      content: listHTML,
      closable: true,
      buttons: [{ label: 'Cancel', action: 'cancel', variant: 'secondary' }]
    }).then(result => {
      if (result?.startsWith('select-')) {
        const index = parseInt(result.split('-')[1]);
        return items[index];
      }
      return null;
    });
  }

  // Form modal (simple input)
  prompt(message, title = 'Input', defaultValue = '') {
    const formHTML = `
      <div class="modal-form">
        <p>${this.escapeHtml(message)}</p>
        <input type="text" id="modal-prompt-input" class="modal-form-input" 
               value="${this.escapeHtml(defaultValue)}" autofocus>
      </div>
    `;

    return this.show({
      type: 'info',
      title,
      content: formHTML,
      buttons: [
        { label: 'Cancel', action: 'cancel', variant: 'secondary' },
        { label: 'OK', action: 'ok', variant: 'primary' }
      ]
    }).then(result => {
      if (result === 'ok') {
        const input = document.getElementById('modal-prompt-input');
        return input ? input.value : null;
      }
      return null;
    });
  }
}

// Create singleton instance
const modalManager = new ModalManager();

// Export modal functions
export const modal = {
  show: (options) => modalManager.show(options),
  alert: (message, title) => modalManager.alert(message, title),
  confirm: (message, title) => modalManager.confirm(message, title),
  success: (message, title) => modalManager.success(message, title),
  error: (message, title) => modalManager.error(message, title),
  warning: (message, title) => modalManager.warning(message, title),
  loading: (message, title) => modalManager.loading(message, title),
  list: (items, title) => modalManager.list(items, title),
  prompt: (message, title, defaultValue) => modalManager.prompt(message, title, defaultValue)
};

// Make available globally
if (typeof window !== 'undefined') {
  window.modal = modal;
}

export default modal;

// ==============================================
// USAGE EXAMPLES
// ==============================================

/*

// Simple alert (replaces window.alert):
await modal.alert('Route saved successfully!', 'Success');

// Confirm dialog (replaces window.confirm):
const confirmed = await modal.confirm('Delete this route?', 'Confirm Delete');
if (confirmed) {
  deleteRoute();
}

// Success message:
await modal.success('Trail guide generated successfully!');

// Error message:
await modal.error('Failed to connect to GPS', 'GPS Error');

// Warning:
await modal.warning('Battery level is low', 'Warning');

// Loading:
const loadingModal = modal.loading('Uploading to cloud...');
await uploadData();
// Close loading modal by tracking the ID or using toast instead

// List selection:
const routes = [
  { title: 'Morning Trail', description: '2.5 km' },
  { title: 'Evening Walk', description: '1.8 km' }
];
const selected = await modal.list(routes, 'Select Route');
if (selected) {
  console.log('Selected:', selected.title);
}

// Prompt/Input:
const routeName = await modal.prompt('Enter route name:', 'Name Route', 'Untitled Route');
if (routeName) {
  saveRoute(routeName);
}

// Custom modal:
const result = await modal.show({
  type: 'warning',
  title: 'Unsaved Changes',
  message: 'You have unsaved changes. What would you like to do?',
  buttons: [
    { label: 'Discard', action: 'discard', variant: 'danger' },
    { label: 'Cancel', action: 'cancel', variant: 'secondary' },
    { label: 'Save', action: 'save', variant: 'success' }
  ]
});

if (result === 'save') {
  saveChanges();
} else if (result === 'discard') {
  discardChanges();
}

*/
