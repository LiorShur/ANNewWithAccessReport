/**
 * ACCESS NATURE - MODAL DIALOG MANAGER
 * Manages modal dialogs and confirmations
 */

class ModalManager {
  constructor() {
    this.modals = [];
  }

  /**
   * Show a modal dialog
   * @param {Object} options - Modal options
   * @param {string} options.title - Modal title
   * @param {string|HTMLElement} options.content - Modal content
   * @param {Array} options.buttons - Array of button configs
   * @param {boolean} options.closable - Can be closed by clicking overlay (default: true)
   */
  show({ title, content, buttons = [], closable = true }) {
    const modal = this.createModal(title, content, buttons, closable);
    document.body.appendChild(modal.overlay);
    this.modals.push(modal);
    document.body.style.overflow = 'hidden';

    // Focus first button or close button
    setTimeout(() => {
      const firstBtn = modal.element.querySelector('button');
      if (firstBtn) firstBtn.focus();
    }, 100);

    return modal;
  }

  createModal(title, content, buttons, closable) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modalEl = document.createElement('div');
    modalEl.className = 'modal';

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <h2 class="modal-title">${title}</h2>
      ${closable ? '<button class="modal-close" aria-label="Close modal">×</button>' : ''}
    `;

    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }

    // Footer (if buttons provided)
    let footer = null;
    if (buttons.length > 0) {
      footer = document.createElement('div');
      footer.className = 'modal-footer';
      
      buttons.forEach(btnConfig => {
        const btn = document.createElement('button');
        btn.className = `btn ${btnConfig.className || 'btn-secondary'}`;
        btn.textContent = btnConfig.text;
        btn.addEventListener('click', () => {
          if (btnConfig.onClick) {
            btnConfig.onClick(modal);
          }
          if (btnConfig.close !== false) {
            this.close(modal);
          }
        });
        footer.appendChild(btn);
      });
    }

    // Assemble modal
    modalEl.appendChild(header);
    modalEl.appendChild(body);
    if (footer) modalEl.appendChild(footer);
    overlay.appendChild(modalEl);

    // Close button handler
    if (closable) {
      const closeBtn = header.querySelector('.modal-close');
      closeBtn.addEventListener('click', () => this.close(modal));

      // Click overlay to close
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close(modal);
        }
      });
    }

    // Escape key to close
    const escapeHandler = (e) => {
      if (e.key === 'Escape' && closable) {
        this.close(modal);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    const modal = {
      overlay,
      element: modalEl,
      escapeHandler
    };

    return modal;
  }

  close(modal) {
    if (modal.overlay.parentNode) {
      modal.overlay.parentNode.removeChild(modal.overlay);
    }
    
    const index = this.modals.indexOf(modal);
    if (index > -1) {
      this.modals.splice(index, 1);
    }

    document.removeEventListener('keydown', modal.escapeHandler);

    // Restore scroll if no modals open
    if (this.modals.length === 0) {
      document.body.style.overflow = '';
    }
  }

  closeAll() {
    [...this.modals].forEach(modal => this.close(modal));
  }

  /**
   * Show a confirmation dialog
   * @param {Object} options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} options.confirmText - Confirm button text (default: 'Confirm')
   * @param {string} options.cancelText - Cancel button text (default: 'Cancel')
   * @param {string} options.confirmClass - Confirm button class (default: 'btn-primary')
   * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
   */
  confirm({ 
    title = 'Confirm', 
    message, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    confirmClass = 'btn-primary'
  }) {
    return new Promise((resolve) => {
      this.show({
        title,
        content: `<p>${message}</p>`,
        buttons: [
          {
            text: cancelText,
            className: 'btn-secondary',
            onClick: () => resolve(false)
          },
          {
            text: confirmText,
            className: confirmClass,
            onClick: () => resolve(true)
          }
        ],
        closable: true
      });
    });
  }

  /**
   * Show an alert dialog
   * @param {Object} options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} options.buttonText - Button text (default: 'OK')
   * @returns {Promise<void>}
   */
  alert({ title = 'Alert', message, buttonText = 'OK' }) {
    return new Promise((resolve) => {
      this.show({
        title,
        content: `<p>${message}</p>`,
        buttons: [
          {
            text: buttonText,
            className: 'btn-primary',
            onClick: () => resolve()
          }
        ],
        closable: true
      });
    });
  }
}

// Create global modal manager instance
window.modal = new ModalManager();

// Usage examples (commented out):
// modal.show({
//   title: 'Route Details',
//   content: '<p>Your route information here...</p>',
//   buttons: [
//     { text: 'Close', className: 'btn-secondary' },
//     { text: 'Save', className: 'btn-primary', onClick: () => saveRoute() }
//   ]
// });
//
// const confirmed = await modal.confirm({
//   title: 'Delete Route',
//   message: 'Are you sure you want to delete this route?',
//   confirmText: 'Delete',
//   confirmClass: 'btn-danger'
// });
//
// await modal.alert({
//   title: 'Success',
//   message: 'Your route has been saved!'
// });
