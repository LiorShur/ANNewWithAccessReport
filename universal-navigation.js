/**
 * Universal Navigation Handler
 * Handles hamburger menu, active states, and accessibility
 * Works across all pages: index.html, tracker.html, reports.html
 */

class UniversalNavigation {
  constructor() {
    this.menuToggle = null;
    this.navMenu = null;
    this.isOpen = false;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    console.log('🧭 Initializing Universal Navigation...');
    
    this.menuToggle = document.getElementById('menuToggle');
    this.navMenu = document.getElementById('navMenu');
    
    if (!this.menuToggle || !this.navMenu) {
      console.warn('⚠️ Navigation elements not found');
      return;
    }
    
    this.setupMenuToggle();
    this.setupClickOutside();
    this.setupEscapeKey();
    this.setupFocusTrap();
    this.setActivePage();
    
    console.log('✅ Navigation initialized');
  }

  setupMenuToggle() {
    this.menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });
  }

  toggleMenu() {
    this.isOpen = !this.isOpen;
    
    // Update ARIA
    this.menuToggle.setAttribute('aria-expanded', this.isOpen);
    
    // Toggle classes
    this.menuToggle.classList.toggle('active');
    this.navMenu.classList.toggle('active');
    
    // Prevent body scroll on mobile when menu open
    if (this.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    console.log(`📱 Menu ${this.isOpen ? 'opened' : 'closed'}`);
  }

  closeMenu() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    this.menuToggle.setAttribute('aria-expanded', 'false');
    this.menuToggle.classList.remove('active');
    this.navMenu.classList.remove('active');
    document.body.style.overflow = '';
    
    console.log('📱 Menu closed');
  }

  setupClickOutside() {
    document.addEventListener('click', (e) => {
      const isClickInsideMenu = this.navMenu.contains(e.target);
      const isClickOnToggle = this.menuToggle.contains(e.target);
      
      if (!isClickInsideMenu && !isClickOnToggle && this.isOpen) {
        this.closeMenu();
      }
    });
    
    // Close menu when clicking nav links
    const navLinks = this.navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        this.closeMenu();
      });
    });
  }

  setupEscapeKey() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeMenu();
        this.menuToggle.focus();
      }
    });
  }

  setupFocusTrap() {
    this.navMenu.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && this.isOpen) {
        const focusableElements = this.navMenu.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Shift + Tab on first element -> focus last
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
        // Tab on last element -> focus first
        else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }

  setActivePage() {
    const navLinks = this.navMenu.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    
    console.log(`📍 Current page: ${currentPage}`);
    
    navLinks.forEach(link => {
      try {
        const href = link.getAttribute('href');
        if (!href) return;
        
        const linkPage = href.split('/').pop().split('?')[0].split('#')[0];
        
        // Check if this link matches current page
        const isActive = 
          linkPage === currentPage ||
          (currentPage === '' && linkPage === 'index.html') ||
          (currentPage === 'index.html' && linkPage === '');
        
        if (isActive) {
          link.classList.add('active');
          console.log(`✅ Active link: ${linkPage}`);
        } else {
          link.classList.remove('active');
        }
      } catch (error) {
        console.debug('Could not process link:', link);
      }
    });
  }

  // Public method to programmatically close menu
  close() {
    this.closeMenu();
  }
}

// Auto-initialize
let navigationInstance = null;

function initNavigation() {
  if (!navigationInstance) {
    navigationInstance = new UniversalNavigation();
  }
  return navigationInstance;
}

// Initialize on load
if (typeof window !== 'undefined') {
  initNavigation();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UniversalNavigation, initNavigation };
}

// Make available globally
window.UniversalNavigation = UniversalNavigation;
window.initNavigation = initNavigation;