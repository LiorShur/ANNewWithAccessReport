// Mobile-first Navigation Handler
class Navigation {
  constructor() {
    this.menuToggle = document.getElementById('menuToggle');
    this.navMenu = document.getElementById('navMenu');
    this.init();
  }

  init() {
    this.setupMenuToggle();
    this.setupClickOutside();
    this.setActivePage();
    this.setupAccessibility();
  }

  setupMenuToggle() {
    if (!this.menuToggle || !this.navMenu) return;

    this.menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });
  }

  toggleMenu() {
    const isExpanded = this.menuToggle.getAttribute('aria-expanded') === 'true';
    
    this.menuToggle.setAttribute('aria-expanded', !isExpanded);
    this.navMenu.classList.toggle('active');
    this.menuToggle.classList.toggle('active');
    
    // Prevent body scroll when menu is open on mobile
    if (!isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMenu() {
    this.menuToggle?.setAttribute('aria-expanded', 'false');
    this.navMenu?.classList.remove('active');
    this.menuToggle?.classList.remove('active');
    document.body.style.overflow = '';
  }

  setupClickOutside() {
    document.addEventListener('click', (e) => {
      const isClickInside = this.navMenu?.contains(e.target) || 
                           this.menuToggle?.contains(e.target);
      
      if (!isClickInside && this.navMenu?.classList.contains('active')) {
        this.closeMenu();
      }
    });

    // Close menu when clicking nav links
    this.navMenu?.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        this.closeMenu();
      });
    });
  }

  setActivePage() {
    const links = document.querySelectorAll('.nav-link');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    links.forEach(link => {
      try {
        // Skip if link doesn't have href
        if (!link.hasAttribute('href')) {
          return;
        }
        
        const href = link.getAttribute('href');
        
        // Skip empty or null hrefs
        if (!href || href === '#' || href === '') {
          return;
        }
        
        // Handle relative paths
        const linkPage = href.split('/').pop().split('?')[0].split('#')[0];
        
        // Check if this link matches current page
        if (linkPage === currentPage || 
            (currentPage === '' && linkPage === 'index.html') ||
            (currentPage === 'index.html' && linkPage === '')) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      } catch (error) {
        // Silently skip any problematic links
        console.debug('Could not process link:', link);
      }
    });
  }

  setupAccessibility() {
    // Handle escape key to close menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.navMenu?.classList.contains('active')) {
        this.closeMenu();
        this.menuToggle?.focus();
      }
    });

    // Trap focus within menu when open
    if (this.navMenu) {
      this.navMenu.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          const focusableElements = this.navMenu.querySelectorAll(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      });
    }
  }
}

// Initialize navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Navigation();
});

// Export for use in modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Navigation;
}