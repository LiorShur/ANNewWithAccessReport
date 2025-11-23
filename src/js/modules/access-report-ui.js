/**
 * AccessReport UI Component
 * Handles the user interface for reporting accessibility issues
 */

export class AccessReportUI {
  constructor(mapController) {
    this.mapController = mapController;
    this.selectedLocation = null;
    this.photoFiles = [];
    this.isSelectingLocation = false;
    
    this.initializeUI();
  }
  
  /**
   * Initialize UI components
   */
  initializeUI() {
    // Create report button in navigation
    this.createReportButton();
    
    // Create report form modal
    this.createReportModal();
    
    // Create map marker for location selection
    this.createLocationMarker();
  }
  
  /**
   * Create "Report Issue" button
   */
  createReportButton() {
    const button = document.createElement('button');
    button.id = 'reportIssueBtn';
    button.className = 'btn-report-issue';
    button.innerHTML = `
      <span class="icon">📍</span>
      <span class="label">Report Accessibility Issue</span>
    `;
    button.onclick = () => this.openReportModal();
    
    // Add to navigation or header
    const nav = document.querySelector('nav') || document.querySelector('header');
    if (nav) {
      nav.appendChild(button);
    }
  }
  
  /**
   * Create report form modal
   */
  createReportModal() {
    const modal = document.createElement('div');
    modal.id = 'reportModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content report-modal">
        <div class="modal-header">
          <h2>Report Accessibility Issue</h2>
          <button class="modal-close" onclick="document.getElementById('reportModal').style.display='none'">&times;</button>
        </div>
        
        <div class="modal-body">
          <form id="reportForm">
            <!-- Location Selection -->
            <div class="form-section">
              <h3>📍 Location</h3>
              <div class="location-selector">
                <button type="button" id="selectLocationBtn" class="btn-secondary">
                  ${this.isSelectingLocation ? 'Cancel' : 'Select Location on Map'}
                </button>
                <div id="selectedLocationDisplay" class="location-display">
                  ${this.selectedLocation ? 
                    `<p>✓ Location selected: ${this.selectedLocation.latitude.toFixed(6)}, ${this.selectedLocation.longitude.toFixed(6)}</p>` :
                    '<p class="text-muted">Click button above to select location on map</p>'
                  }
                </div>
                <input type="text" id="placeDescription" placeholder="e.g., Corner of Main St and 5th Ave" class="form-input">
              </div>
            </div>
            
            <!-- Issue Type -->
            <div class="form-section">
              <h3>🏷️ Issue Type</h3>
              <select id="issueType" class="form-select" required>
                <option value="">Select issue type...</option>
                <option value="curb_ramp">♿ Broken/Missing Curb Ramp</option>
                <option value="sidewalk">🚧 Blocked/Damaged Sidewalk</option>
                <option value="entrance">🚪 Inaccessible Entrance</option>
                <option value="parking">🅿️ Parking Issue</option>
                <option value="elevator">🛗 Elevator/Lift Problem</option>
                <option value="signage">🪧 Missing/Poor Signage</option>
                <option value="tactile">⬜ Missing Tactile Paving</option>
                <option value="trail">🥾 Trail Obstacle</option>
                <option value="restroom">🚻 Inaccessible Restroom</option>
                <option value="other">❗ Other Issue</option>
              </select>
            </div>
            
            <!-- Severity -->
            <div class="form-section">
              <h3>⚠️ Severity</h3>
              <div class="severity-buttons">
                <label class="severity-option">
                  <input type="radio" name="severity" value="low" required>
                  <span class="severity-label severity-low">Low</span>
                </label>
                <label class="severity-option">
                  <input type="radio" name="severity" value="medium" checked>
                  <span class="severity-label severity-medium">Medium</span>
                </label>
                <label class="severity-option">
                  <input type="radio" name="severity" value="high">
                  <span class="severity-label severity-high">High</span>
                </label>
                <label class="severity-option">
                  <input type="radio" name="severity" value="critical">
                  <span class="severity-label severity-critical">Critical</span>
                </label>
              </div>
            </div>
            
            <!-- Title -->
            <div class="form-section">
              <h3>📝 Title</h3>
              <input type="text" id="reportTitle" class="form-input" placeholder="Brief description of the issue" required>
            </div>
            
            <!-- Description -->
            <div class="form-section">
              <h3>📄 Description</h3>
              <textarea id="reportDescription" class="form-textarea" rows="4" placeholder="Provide more details about the accessibility barrier..."></textarea>
            </div>
            
            <!-- Photos -->
            <div class="form-section">
              <h3>📷 Photos</h3>
              <div class="photo-upload">
                <input type="file" id="photoInput" accept="image/*" multiple style="display:none">
                <button type="button" id="addPhotoBtn" class="btn-secondary">
                  📸 Add Photos
                </button>
                <div id="photoPreview" class="photo-preview-grid"></div>
              </div>
            </div>
            
            <!-- Tags -->
            <div class="form-section">
              <h3>🏷️ Tags (optional)</h3>
              <input type="text" id="reportTags" class="form-input" placeholder="e.g., wheelchair, urgent, downtown">
              <p class="help-text">Separate tags with commas</p>
            </div>
            
            <!-- Privacy -->
            <div class="form-section">
              <label class="checkbox-label">
                <input type="checkbox" id="isAnonymous">
                <span>Submit anonymously</span>
              </label>
            </div>
            
            <!-- Submit Button -->
            <div class="form-actions">
              <button type="button" class="btn-secondary" onclick="document.getElementById('reportModal').style.display='none'">
                Cancel
              </button>
              <button type="submit" class="btn-primary" id="submitReportBtn">
                Submit Report
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Attach event listeners
    this.attachFormListeners();
  }
  
  /**
   * Attach event listeners to form elements
   */
  attachFormListeners() {
    // Location selection
    document.getElementById('selectLocationBtn').addEventListener('click', () => {
      this.toggleLocationSelection();
    });
    
    // Photo upload
    document.getElementById('addPhotoBtn').addEventListener('click', () => {
      document.getElementById('photoInput').click();
    });
    
    document.getElementById('photoInput').addEventListener('change', (e) => {
      this.handlePhotoSelection(e.target.files);
    });
    
    // Form submission
    document.getElementById('reportForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });
  }
  
  /**
   * Open report modal
   */
  openReportModal() {
    document.getElementById('reportModal').style.display = 'flex';
  }
  
  /**
   * Toggle location selection mode
   */
  toggleLocationSelection() {
    this.isSelectingLocation = !this.isSelectingLocation;
    const btn = document.getElementById('selectLocationBtn');
    
    if (this.isSelectingLocation) {
      btn.textContent = 'Click on Map to Select Location';
      btn.classList.add('active');
      this.enableMapClick();
    } else {
      btn.textContent = 'Select Location on Map';
      btn.classList.remove('active');
      this.disableMapClick();
    }
  }
  
  /**
   * Enable map clicking for location selection
   */
  enableMapClick() {
    if (this.mapController && this.mapController.map) {
      this.mapController.map.on('click', this.handleMapClick.bind(this));
      this.mapController.map.getContainer().style.cursor = 'crosshair';
    }
  }
  
  /**
   * Disable map clicking
   */
  disableMapClick() {
    if (this.mapController && this.mapController.map) {
      this.mapController.map.off('click', this.handleMapClick.bind(this));
      this.mapController.map.getContainer().style.cursor = '';
    }
  }
  
  /**
   * Handle map click for location selection
   */
  handleMapClick(e) {
    this.selectedLocation = {
      latitude: e.latlng.lat,
      longitude: e.latlng.lng
    };
    
    // Update UI
    document.getElementById('selectedLocationDisplay').innerHTML = `
      <p class="success">✓ Location selected: ${this.selectedLocation.latitude.toFixed(6)}, ${this.selectedLocation.longitude.toFixed(6)}</p>
    `;
    
    // Add marker to map
    if (this.locationMarker) {
      this.locationMarker.setLatLng(e.latlng);
    } else {
      this.locationMarker = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'location-selection-marker',
          html: '📍',
          iconSize: [30, 30]
        })
      }).addTo(this.mapController.map);
    }
    
    // Disable selection mode
    this.toggleLocationSelection();
  }
  
  /**
   * Create location marker
   */
  createLocationMarker() {
    // Marker will be created when location is selected
    this.locationMarker = null;
  }
  
  /**
   * Handle photo selection
   */
  handlePhotoSelection(files) {
    const preview = document.getElementById('photoPreview');
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        this.photoFiles.push(file);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const photoDiv = document.createElement('div');
          photoDiv.className = 'photo-preview-item';
          photoDiv.innerHTML = `
            <img src="${e.target.result}" alt="Preview">
            <button type="button" class="remove-photo" onclick="this.parentElement.remove()">×</button>
          `;
          preview.appendChild(photoDiv);
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  /**
   * Handle form submission
   */
  async handleFormSubmit() {
    try {
      // Validate location
      if (!this.selectedLocation) {
        alert('Please select a location on the map');
        return;
      }
      
      // Get form data
      const form = document.getElementById('reportForm');
      const formData = new FormData(form);
      
      const reportData = {
        location: {
          latitude: this.selectedLocation.latitude,
          longitude: this.selectedLocation.longitude,
          placeDescription: document.getElementById('placeDescription').value
        },
        issueType: document.getElementById('issueType').value,
        severity: formData.get('severity'),
        title: document.getElementById('reportTitle').value,
        description: document.getElementById('reportDescription').value,
        photos: this.photoFiles,
        tags: document.getElementById('reportTags').value.split(',').map(t => t.trim()).filter(t => t),
        isAnonymous: document.getElementById('isAnonymous').checked
      };
      
      // Disable submit button
      const submitBtn = document.getElementById('submitReportBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      
      // Submit report (will be connected to controller)
      console.log('Report data:', reportData);
      
      // Show success message
      alert('Report submitted successfully!');
      
      // Reset form
      this.resetForm();
      document.getElementById('reportModal').style.display = 'none';
      
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report. Please try again.');
    } finally {
      document.getElementById('submitReportBtn').disabled = false;
      document.getElementById('submitReportBtn').textContent = 'Submit Report';
    }
  }
  
  /**
   * Reset form
   */
  resetForm() {
    document.getElementById('reportForm').reset();
    this.selectedLocation = null;
    this.photoFiles = [];
    document.getElementById('photoPreview').innerHTML = '';
    document.getElementById('selectedLocationDisplay').innerHTML = '<p class="text-muted">Click button above to select location on map</p>';
    
    if (this.locationMarker && this.mapController.map) {
      this.mapController.map.removeLayer(this.locationMarker);
      this.locationMarker = null;
    }
  }
}
