/**
 * ACCESS NATURE - TOUCH INTERACTIONS
 * Handles swipe gestures and touch interactions
 */

/**
 * Simple Swipe Detector
 */
class SwipeDetector {
  constructor(element, callbacks = {}) {
    this.element = element;
    this.callbacks = callbacks;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.minSwipeDistance = 50;
    this.maxVerticalDistance = 100; // Max vertical movement for horizontal swipe
    
    this.init();
  }

  init() {
    this.element.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
      this.touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    this.element.addEventListener('touchend', (e) => {
      this.touchEndX = e.changedTouches[0].screenX;
      this.touchEndY = e.changedTouches[0].screenY;
      this.handleSwipe();
    }, { passive: true });
  }

  handleSwipe() {
    const horizontalDistance = this.touchEndX - this.touchStartX;
    const verticalDistance = this.touchEndY - this.touchStartY;
    
    // Check if it's primarily a horizontal swipe
    if (Math.abs(verticalDistance) < this.maxVerticalDistance) {
      if (Math.abs(horizontalDistance) >= this.minSwipeDistance) {
        if (horizontalDistance > 0 && this.callbacks.onSwipeRight) {
          this.callbacks.onSwipeRight();
        } else if (horizontalDistance < 0 && this.callbacks.onSwipeLeft) {
          this.callbacks.onSwipeLeft();
        }
      }
    }
    
    // Check if it's primarily a vertical swipe
    if (Math.abs(horizontalDistance) < this.maxVerticalDistance) {
      if (Math.abs(verticalDistance) >= this.minSwipeDistance) {
        if (verticalDistance > 0 && this.callbacks.onSwipeDown) {
          this.callbacks.onSwipeDown();
        } else if (verticalDistance < 0 && this.callbacks.onSwipeUp) {
          this.callbacks.onSwipeUp();
        }
      }
    }
  }

  destroy() {
    // Remove event listeners if needed
    this.element.replaceWith(this.element.cloneNode(true));
  }
}

/**
 * Pull to Refresh
 */
class PullToRefresh {
  constructor(element, onRefresh) {
    this.element = element;
    this.onRefresh = onRefresh;
    this.startY = 0;
    this.currentY = 0;
    this.isPulling = false;
    this.threshold = 80;
    this.maxDistance = 120;
    this.indicator = this.createIndicator();
    
    this.init();
  }

  createIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'pull-to-refresh-indicator';
    indicator.style.cssText = `
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      transition: opacity 0.2s ease;
      opacity: 0;
      z-index: 9999;
    `;
    indicator.innerHTML = '↓';
    this.element.style.position = 'relative';
    this.element.insertBefore(indicator, this.element.firstChild);
    return indicator;
  }

  init() {
    this.element.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        this.startY = e.touches[0].clientY;
        this.isPulling = true;
      }
    }, { passive: true });
    
    this.element.addEventListener('touchmove', (e) => {
      if (!this.isPulling) return;
      
      this.currentY = e.touches[0].clientY;
      const distance = this.currentY - this.startY;
      
      if (distance > 0 && distance < this.maxDistance) {
        e.preventDefault();
        this.showPullIndicator(distance);
      }
    }, { passive: false });
    
    this.element.addEventListener('touchend', () => {
      if (!this.isPulling) return;
      
      const distance = this.currentY - this.startY;
      if (distance >= this.threshold) {
        this.indicator.innerHTML = '⟳';
        this.onRefresh();
      }
      
      this.isPulling = false;
      this.hidePullIndicator();
    }, { passive: true });
  }

  showPullIndicator(distance) {
    const opacity = Math.min(distance / this.threshold, 1);
    this.indicator.style.opacity = opacity;
    this.indicator.style.top = `${Math.min(distance - 60, 0)}px`;
    
    if (distance >= this.threshold) {
      this.indicator.innerHTML = '↑';
    } else {
      this.indicator.innerHTML = '↓';
    }
  }

  hidePullIndicator() {
    this.indicator.style.opacity = '0';
    this.indicator.style.top = '-60px';
    setTimeout(() => {
      this.indicator.innerHTML = '↓';
    }, 200);
  }

  destroy() {
    if (this.indicator && this.indicator.parentNode) {
      this.indicator.parentNode.removeChild(this.indicator);
    }
  }
}

/**
 * Long Press Detector
 */
class LongPressDetector {
  constructor(element, callback, duration = 500) {
    this.element = element;
    this.callback = callback;
    this.duration = duration;
    this.timer = null;
    this.isPressed = false;
    
    this.init();
  }

  init() {
    this.element.addEventListener('touchstart', () => {
      this.isPressed = true;
      this.timer = setTimeout(() => {
        if (this.isPressed) {
          this.callback();
        }
      }, this.duration);
    }, { passive: true });

    this.element.addEventListener('touchend', () => {
      this.isPressed = false;
      if (this.timer) {
        clearTimeout(this.timer);
      }
    }, { passive: true });

    this.element.addEventListener('touchmove', () => {
      this.isPressed = false;
      if (this.timer) {
        clearTimeout(this.timer);
      }
    }, { passive: true });
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }
}

// Export to global scope
window.SwipeDetector = SwipeDetector;
window.PullToRefresh = PullToRefresh;
window.LongPressDetector = LongPressDetector;

// Usage examples (commented out):
// 
// // Swipe detection on an element
// const swipe = new SwipeDetector(document.querySelector('.survey-form'), {
//   onSwipeLeft: () => console.log('Swiped left - next page'),
//   onSwipeRight: () => console.log('Swiped right - previous page'),
//   onSwipeUp: () => console.log('Swiped up'),
//   onSwipeDown: () => console.log('Swiped down')
// });
//
// // Pull to refresh
// const ptr = new PullToRefresh(document.body, () => {
//   console.log('Refreshing...');
//   location.reload();
// });
//
// // Long press
// const longPress = new LongPressDetector(
//   document.querySelector('.map-marker'),
//   () => {
//     console.log('Long press detected!');
//     modal.show({ title: 'Marker Info', content: '<p>Details...</p>' });
//   },
//   800 // 800ms hold
// );
