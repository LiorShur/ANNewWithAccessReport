// Complete compass.js - Always active compass with calibration
// NEW: Import UI helpers
import toast from '../helpers/toasts.js';
import modal from '../helpers/modals.js';

export class CompassController {
  constructor() {
    this.isRotationEnabled = false;
    this.currentHeading = 0;
    this.dependencies = {};
    this.orientationHandler = null;
  }

  setDependencies(deps) {
    this.dependencies = deps;
  }

  initialize() {
    this.setupToggleButton();
    this.checkDeviceSupport();
    
    // CRITICAL: Start orientation tracking immediately
    this.startOrientationTracking();
    
    console.log('✅ Compass controller initialized - orientation tracking active');
  }

  async startOrientationTracking() {
    // Request permission on iOS 13+
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          console.warn('⚠️ Device orientation permission denied');
          toast.warning('Device orientation permission denied');
          return;
        }
      } catch (error) {
        console.error('❌ Permission request failed:', error);
        toast.error('Failed to request orientation permission');
        return;
      }
    }
    
    // Start listening - ALWAYS active
    this.orientationHandler = (event) => {
      this.handleOrientationChange(event);
    };
    
    window.addEventListener('deviceorientation', this.orientationHandler);
    console.log('🧭 Orientation tracking started (always active)');
  }

  setupToggleButton() {
    const toggleBtn = document.getElementById('toggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleRotation();
      });
    }
  }

  async checkDeviceSupport() {
    if (!window.DeviceOrientationEvent) {
      console.warn('Device orientation not supported');
      return false;
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Permission request failed:', error);
        return false;
      }
    }

    return true;
  }

  async toggleRotation() {
    if (!await this.checkDeviceSupport()) {
      toast.warning('Compass rotation requires device orientation access. Please enable it in your browser settings.');
      return;
    }

    // Toggle MAP rotation only (compass always tracks)
    this.isRotationEnabled = !this.isRotationEnabled;
    this.updateToggleButton();
    
    const status = this.isRotationEnabled ? 'enabled' : 'disabled';
    console.log(`🗺️ Map rotation ${status}`);
    console.log('   (Compass continues tracking independently)');
    toast.info(`Map rotation ${status}`);
  }

  handleOrientationChange(event) {
    let heading = null;

    // Try different sources for compass heading
    if (typeof event.webkitCompassHeading !== "undefined") {
      // iOS Safari - gives true compass heading (0=North)
      heading = event.webkitCompassHeading;
      
    } else if (event.alpha !== null && event.alpha !== undefined) {
      heading = (event.alpha - 90 + 360) % 360;
      console.log(`🧭 Corrected heading: ${heading.toFixed(1)}°`);
      console.log(`🧭 Raw alpha: ${event.alpha.toFixed(1)}° → Heading: ${heading.toFixed(1)}°`);
    }

    if (heading !== null) {
      this.currentHeading = heading;
      this.updateRotations();
    }
  }

  updateRotations() {
    // Map rotation only if enabled
    if (this.isRotationEnabled) {
      this.updateMapRotation();
    }
    
    // Compass and heading ALWAYS update
    this.updateCompassRotation();
    this.updateHeadingDisplay();
  }

  updateMapRotation() {
    if (!this.dependencies.map) return;

    try {
      this.dependencies.map.setRotation(this.currentHeading);
    } catch (error) {
      console.error('Failed to update map rotation:', error);
    }
  }

  updateCompassRotation() {
    const compassDisplay = document.getElementById('compass');
    if (!compassDisplay) return;
    
    // Rotate entire compass so North points north
    compassDisplay.style.transform = `rotate(${-this.currentHeading}deg)`;
    compassDisplay.style.transformOrigin = 'center center';
    compassDisplay.style.transition = 'transform 0.3s ease-out';
  }

  updateHeadingDisplay() {
    const headingValue = document.getElementById('heading-value');
    if (!headingValue) return;

    // Round to nearest degree
    const roundedHeading = Math.round(this.currentHeading);
    headingValue.textContent = `${roundedHeading}°`;
    
    // Add cardinal direction
    const cardinal = this.getCardinalDirection(roundedHeading);
    headingValue.setAttribute('data-cardinal', cardinal);
  }

  getCardinalDirection(heading) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((heading % 360) / 45)) % 8;
    return directions[index];
  }

  updateToggleButton() {
    const toggleBtn = document.getElementById('toggleBtn');
    if (!toggleBtn) return;

    if (this.isRotationEnabled) {
      toggleBtn.style.background = '#4CAF50';
      toggleBtn.title = 'Disable Map Rotation';
    } else {
      toggleBtn.style.background = 'rgba(0, 0, 0, 0.8)';
      toggleBtn.title = 'Enable Map Rotation';
    }
  }

  resetMapRotation() {
    if (!this.dependencies.map) return;

    try {
      this.dependencies.map.resetRotation();
    } catch (error) {
      console.error('Failed to reset map rotation:', error);
    }
  }

  getCurrentHeading() {
    return this.currentHeading;
  }

  isRotationActive() {
    return this.isRotationEnabled;
  }

  cleanup() {
    // Stop orientation tracking
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler);
      this.orientationHandler = null;
    }
    
    this.isRotationEnabled = false;
    console.log('🧭 Compass controller cleaned up');
  }
}
