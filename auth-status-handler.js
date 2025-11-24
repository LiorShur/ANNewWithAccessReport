/**
 * Auth Status Handler
 * Properly displays "Sign In" or "Sign Out" based on Firebase auth state
 * Works across all pages
 */

class AuthStatusHandler {
  constructor() {
    this.auth = null;
    this.authBtn = null;
    this.currentUser = null;
    this.onAuthStateChanged = null;
    this.init();
  }

  async init() {
    console.log('🔐 Initializing Auth Status Handler...');
    
    // Wait for Firebase to be ready
    await this.waitForFirebase();
    
    // Setup auth button
    this.setupAuthButton();
    
    // Listen for auth state changes
    this.listenToAuthState();
  }

  async waitForFirebase() {
    // Wait for Firebase auth to be available
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max (increased from 5)
    
    while (attempts < maxAttempts) {
      // Check if Firebase is available
      if (window.firebaseAuth) {
        this.auth = window.firebaseAuth;
        
        // Import onAuthStateChanged
        try {
          const authModule = await import(
            'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js'
          );
          this.onAuthStateChanged = authModule.onAuthStateChanged;
          
          console.log('✅ Firebase auth ready');
          return;
        } catch (error) {
          console.error('❌ Failed to import auth module:', error);
        }
      }
      
      // Wait before next attempt
      await this.sleep(100);
      attempts++;
      
      // Log progress every 2 seconds
      if (attempts % 20 === 0) {
        console.log(`⏳ Still waiting for Firebase... (${attempts * 100}ms)`);
      }
    }
    
    console.error('❌ Firebase auth not available after 10 seconds');
    console.log('🔍 Debug - window.firebaseAuth:', window.firebaseAuth);
    console.log('🔍 Debug - window.firebaseApp:', window.firebaseApp);
  }

  setupAuthButton() {
    this.authBtn = document.getElementById('authBtn');
    
    if (!this.authBtn) {
      console.warn('⚠️ Auth button not found (id="authBtn")');
      return;
    }
    
    // Add click handler
    this.authBtn.addEventListener('click', () => this.handleAuthClick());
    
    console.log('✅ Auth button initialized');
  }

  listenToAuthState() {
    if (!this.auth || !this.onAuthStateChanged) {
      console.error('❌ Cannot listen to auth state - Firebase not ready');
      
      // Show message in auth button if available
      if (this.authBtn) {
        this.authBtn.textContent = 'Sign In';
        this.authBtn.disabled = false;
      }
      return;
    }
    
    this.onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      this.updateAuthButton(user);
    });
    
    console.log('👂 Listening to auth state changes');
  }

  updateAuthButton(user) {
    if (!this.authBtn) return;
    
    if (user) {
      // User is signed in
      this.authBtn.textContent = 'Sign Out';
      this.authBtn.setAttribute('data-auth-state', 'signed-in');
      console.log('✅ User signed in:', user.uid);
    } else {
      // User is signed out
      this.authBtn.textContent = 'Sign In';
      this.authBtn.setAttribute('data-auth-state', 'signed-out');
      console.log('👤 User signed out');
    }
  }

  async handleAuthClick() {
    if (this.currentUser) {
      // User is signed in - sign out
      await this.signOut();
    } else {
      // User is signed out - sign in
      await this.signIn();
    }
  }

  async signIn() {
    try {
      console.log('🔓 Signing in...');
      
      // Import sign in methods
      const { signInAnonymously, signInWithPopup, GoogleAuthProvider } = await import(
        'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js'
      );
      
      // Try Google sign in first, fallback to anonymous
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(this.auth, provider);
        console.log('✅ Signed in with Google');
        this.showToast('Signed in successfully!', 'success');
      } catch (popupError) {
        // If popup fails, sign in anonymously
        console.log('ℹ️ Google sign in cancelled, trying anonymous...');
        await signInAnonymously(this.auth);
        console.log('✅ Signed in anonymously');
        this.showToast('Signed in anonymously', 'info');
      }
      
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      this.showToast('Failed to sign in: ' + error.message, 'error');
    }
  }

  async signOut() {
    try {
      console.log('🔒 Signing out...');
      
      // Import sign out method
      const { signOut } = await import(
        'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js'
      );
      
      await signOut(this.auth);
      console.log('✅ Signed out');
      this.showToast('Signed out successfully', 'info');
      
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      this.showToast('Failed to sign out: ' + error.message, 'error');
    }
  }

  showToast(message, type = 'info') {
    // Check if toast helper exists
    if (window.toast && window.toast[type]) {
      window.toast[type](message);
    } else {
      // Fallback to alert if toast not available
      console.log(`[${type.toUpperCase()}] ${message}`);
      
      // Simple visual feedback
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
      `;
      
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public method to get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Public method to check if signed in
  isSignedIn() {
    return !!this.currentUser;
  }
}

// Auto-initialize
let authStatusInstance = null;

function initAuthStatus() {
  if (!authStatusInstance) {
    authStatusInstance = new AuthStatusHandler();
  }
  return authStatusInstance;
}

// Initialize on load
if (typeof window !== 'undefined') {
  // Wait a bit for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthStatus);
  } else {
    initAuthStatus();
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthStatusHandler, initAuthStatus };
}

// Make available globally
window.AuthStatusHandler = AuthStatusHandler;
window.initAuthStatus = initAuthStatus;