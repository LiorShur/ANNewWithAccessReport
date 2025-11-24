/**
 * Universal Report Modal Fix
 * Fixes modals created by access-report-main.js dynamically
 * Place this AFTER your other scripts in reports.html
 */

(function() {
  console.log('🔧 Universal Modal Fix Loading...');

  // Function to fix modal whenever it's created
  function fixModal() {
    // Try multiple possible modal IDs/classes
    const possibleSelectors = [
      '#reportDetailModal',
      '#reportModal',
      '.report-modal',
      '.modal-container',
      '[id*="report"][id*="modal"]',
      '[class*="report"][class*="modal"]'
    ];

    let modal = null;
    for (const selector of possibleSelectors) {
      modal = document.querySelector(selector);
      if (modal) {
        console.log('🎯 Found modal with selector:', selector);
        break;
      }
    }

    if (!modal) {
      console.log('⏳ Modal not found yet, will retry...');
      return false;
    }

    console.log('🔧 Applying fixes to modal...');

    // Force proper modal styles
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 999999 !important;
      background: rgba(0, 0, 0, 0.7) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 1rem !important;
      overflow-y: auto !important;
    `;

    // Remove hidden class if present
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';

    // Find and fix modal content
    const contentSelectors = [
      '.modal-content',
      '.report-modal-content',
      '[class*="modal"][class*="content"]',
      'div[style*="background"]'
    ];

    let content = null;
    for (const selector of contentSelectors) {
      content = modal.querySelector(selector);
      if (content) {
        console.log('📦 Found modal content with selector:', selector);
        break;
      }
    }

    if (!content) {
      // If no specific content element, use first child
      content = modal.firstElementChild;
    }

    if (content) {
      console.log('🎨 Styling modal content...');
      content.style.cssText = `
        background: white !important;
        border-radius: 16px !important;
        max-width: 800px !important;
        width: 100% !important;
        max-height: 90vh !important;
        overflow-y: auto !important;
        position: relative !important;
        z-index: 1000000 !important;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
        padding: 2rem !important;
      `;

      // Prevent click propagation on content
      content.addEventListener('click', (e) => {
        e.stopPropagation();
      }, true);
    }

    // Add close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('🚪 Closing modal via backdrop');
        closeModal(modal);
      }
    }, true);

    console.log('✅ Modal fixed and should be visible!');
    return true;
  }

  function closeModal(modal) {
    if (!modal) {
      modal = document.querySelector('[id*="modal"], [class*="modal"]');
    }
    
    if (modal) {
      modal.style.display = 'none';
      modal.classList.add('hidden');
      
      // Also try to remove it if it's dynamically created
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }
  }

  // Monitor for modal creation using MutationObserver
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // Check if a modal was added
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element node
            const isModal = 
              node.id?.includes('modal') ||
              node.className?.includes('modal') ||
              node.querySelector('[id*="modal"], [class*="modal"]');
            
            if (isModal) {
              console.log('🎭 New modal detected!');
              setTimeout(fixModal, 10);
              setTimeout(fixModal, 50);
              setTimeout(fixModal, 100);
            }
          }
        }
      }
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also try to fix existing modals
  setTimeout(fixModal, 100);
  setTimeout(fixModal, 500);
  setTimeout(fixModal, 1000);

  // Override common modal functions if they exist
  const originalShowReportDetail = window.showReportDetail;
  if (originalShowReportDetail) {
    window.showReportDetail = function(...args) {
      console.log('🎯 showReportDetail intercepted');
      const result = originalShowReportDetail.apply(this, args);
      setTimeout(fixModal, 10);
      setTimeout(fixModal, 50);
      setTimeout(fixModal, 100);
      return result;
    };
  }

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.querySelector('[id*="modal"]:not(.hidden), [class*="modal"]:not(.hidden)');
      if (modal) {
        console.log('🚪 Closing modal via Escape');
        closeModal(modal);
      }
    }
  });

  // Debug function
  window.fixReportModal = function() {
    console.log('🔧 Manual fix triggered');
    fixModal();
  };

  console.log('✅ Universal Modal Fix Active');
  console.log('💡 Type window.fixReportModal() to manually fix modal');
})();