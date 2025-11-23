// Manual map rotation with two-finger gesture
export class GestureRotationController {
  constructor(map) {
    this.map = map;
    this.isRotating = false;
    this.startAngle = 0;
    this.currentRotation = 0;
    this.touches = [];
  }

  initialize() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Touch events for rotation
    mapElement.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    mapElement.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    mapElement.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    console.log('✅ Gesture rotation initialized');
  }

  handleTouchStart(e) {
    if (e.touches.length === 2) {
      this.isRotating = true;
      this.touches = [
        { x: e.touches[0].clientX, y: e.touches[0].clientY },
        { x: e.touches[1].clientX, y: e.touches[1].clientY }
      ];
      this.startAngle = this.getAngle(this.touches[0], this.touches[1]);
    }
  }

  handleTouchMove(e) {
    if (!this.isRotating || e.touches.length !== 2) return;

    e.preventDefault();

    const currentTouches = [
      { x: e.touches[0].clientX, y: e.touches[0].clientY },
      { x: e.touches[1].clientX, y: e.touches[1].clientY }
    ];

    const currentAngle = this.getAngle(currentTouches[0], currentTouches[1]);
    const angleDelta = currentAngle - this.startAngle;

    // Update rotation
    this.currentRotation += angleDelta;
    this.currentRotation = this.currentRotation % 360;

    // Apply rotation to map
    this.applyRotation(this.currentRotation);

    // Update for next move
    this.startAngle = currentAngle;
  }

  handleTouchEnd(e) {
    if (e.touches.length < 2) {
      this.isRotating = false;
      this.touches = [];
    }
  }

  getAngle(touch1, touch2) {
    const dx = touch2.x - touch1.x;
    const dy = touch2.y - touch1.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  applyRotation(angle) {
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.style.transform = `rotate(${-angle}deg)`;
    }
  }

  reset() {
    this.currentRotation = 0;
    this.applyRotation(0);
  }

  getCurrentRotation() {
    return this.currentRotation;
  }
}