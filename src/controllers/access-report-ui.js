/**
 * AccessReport UI Controller - TRULY FINAL VERSION
 * Handles report submission forms and user interface
 * 
 * File: src/controllers/access-report-ui.js
 */

import { accessReportController, ISSUE_TYPES, SEVERITY_LEVELS } from './access-report-controller.js';
import { getCurrentPosition } from '../utils/geolocation.js';
import toast from '../helpers/toasts.js';
import modal from '../helpers/modals.js';

export class AccessReportUI {
  constructor(map) {
    this.map = map;
    this.reportMarker = null;
    this.selectedLocation = null;
    this.photoFiles = [];
    this.formData = null;
  }

  /**
   * Initialize UI and event listeners
   */
  initialize() {
    this.setupReportButton();
    console.log('✅ AccessReport UI initialized');
  }

  /**
   * Setup main "Report Issue" button
   */
  setupReportButton() {
    let reportBtn = document.getElementById('reportIssueBtn');
    
    if (!reportBtn) {
      reportBtn = document.createElement('button');
      reportBtn.id = 'reportIssueBtn';
      reportBtn.className = 'btn-report-floating';
      reportBtn.innerHTML = `
        <span style="font-size: 24px;">📍</span>
        <span>Report Issue</span>
      `;
      document.body.appendChild(reportBtn);
    }

    reportBtn.addEventListener('click', () => {
      this.showReportModal();
    });
  }

  /**
   * Show report submission modal
   */
  async showReportModal() {
    try {
      // Get current location
      toast.info('Getting your location...');
      const position = await getCurrentPosition();
      this.selectedLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Reset
      this.photoFiles = [];
      this.formData = null;

      // Build form HTML
      const formHTML = this.buildReportForm();

      // Show modal
      const modalPromise = modal.show({
        type: 'info',
        title: '📍 Report Accessibility Issue',
        content: formHTML,
        size: 'lg',
        buttons: [
          { label: 'Cancel', action: 'cancel', variant: 'secondary' },
          { label: 'Submit Report', action: 'submit', variant: 'primary' }
        ]
      });

      // Set up event listeners after modal renders
      setTimeout(() => {
        this.setupFormEventListeners();
      }, 100);

      const result = await modalPromise;

      console.log('Modal result:', result);
      console.log('Form data exists:', !!this.formData);

      // If user clicked submit AND we have form data, submit it
      if (result === 'submit') {
        if (this.formData) {
          await this.submitReportData();
        } else {
          console.error('❌ No form data captured');
          toast.error('Form data was not captured. Please try again.');
        }
      }

    } catch (error) {
      console.error('Error showing report modal:', error);
      toast.error('Failed to open report form: ' + error.message);
    }
  }

  /**
   * Setup event listeners for form elements
   */
  setupFormEventListeners() {
    // Photo button handler - triggers hidden file input
    const addPhotoBtn = document.getElementById('addPhotoBtn');
    const photoInput = document.getElementById('photoInput');
    
    if (addPhotoBtn && photoInput) {
      addPhotoBtn.addEventListener('click', () => {
        // Only allow clicking if not at max photos
        if (this.photoFiles.length < 3) {
          photoInput.click();
        } else {
          toast.warning('Maximum 3 photos reached. Remove a photo to add more.');
        }
      });
      
      // Hover effect
      addPhotoBtn.addEventListener('mouseenter', () => {
        const currentBg = addPhotoBtn.style.background;
        if (currentBg === 'rgb(16, 185, 129)' || currentBg === '#10b981') {
          // Green (max photos)
          addPhotoBtn.style.background = '#059669';
        } else {
          // Blue (normal)
          addPhotoBtn.style.background = '#2563eb';
        }
        addPhotoBtn.style.transform = 'translateY(-1px)';
      });
      
      addPhotoBtn.addEventListener('mouseleave', () => {
        if (this.photoFiles.length >= 3) {
          addPhotoBtn.style.background = '#10b981'; // Green
        } else {
          addPhotoBtn.style.background = '#3b82f6'; // Blue
        }
        addPhotoBtn.style.transform = 'translateY(0)';
      });
    }
    
    // Photo input handler
    if (photoInput) {
      photoInput.addEventListener('change', (e) => {
        this.handlePhotoSelection(e);
      });
    }

    // Capture form data when submit button is clicked
    const submitBtn = document.querySelector('[data-action="submit"]');
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        console.log('🔵 Submit button clicked - capturing data');
        this.captureFormData();
      }, true);
    }
  }

  /**
   * Capture form data before modal closes
   */
  captureFormData() {
    const form = document.getElementById('accessReportForm');
    if (!form) {
      console.error('❌ Form not found when capturing data');
      return;
    }

    const formData = new FormData(form);
    
    // Validate required fields
    const issueType = formData.get('issueType');
    const severity = formData.get('severity');
    const title = formData.get('title');
    const description = formData.get('description');

    if (!issueType || !severity || !title || !description) {
      toast.error('Please fill in all required fields');
      // Store null to prevent submission
      this.formData = null;
      return;
    }

    // Store form data
    this.formData = {
      issueType,
      severity,
      title: title.trim(),
      description: description.trim(),
      placeDescription: formData.get('placeDescription')?.trim() || '',
      isPublic: formData.get('isPublic') === 'on'
    };

    console.log('📋 Form data captured:', this.formData);
  }

  /**
   * Handle photo selection
   */
  handlePhotoSelection(event) {
    const preview = document.getElementById('photoPreview');
    const addPhotoBtn = document.getElementById('addPhotoBtn');
    if (!preview) return;

    // Get newly selected files
    const newFiles = Array.from(event.target.files);
    
    // Add to existing photos (up to 3 total)
    const remainingSlots = 3 - this.photoFiles.length;
    const filesToAdd = newFiles.slice(0, remainingSlots);
    
    if (filesToAdd.length === 0) {
      toast.warning('Maximum 3 photos allowed');
      return;
    }
    
    // Add new files to existing array
    this.photoFiles = [...this.photoFiles, ...filesToAdd];
    
    // Clear and re-render all photos
    preview.innerHTML = '';

    if (this.photoFiles.length > 0) {
      // Update button text
      if (addPhotoBtn) {
        const remaining = 3 - this.photoFiles.length;
        if (remaining > 0) {
          addPhotoBtn.innerHTML = `
            <span style="font-size: 20px;">📷</span>
            <span>${this.photoFiles.length}/3 Photos (Add ${remaining} more)</span>
          `;
        } else {
          addPhotoBtn.innerHTML = `
            <span style="font-size: 20px;">✓</span>
            <span>3/3 Photos (Max reached)</span>
          `;
          addPhotoBtn.style.background = '#10b981'; // Green when full
        }
      }

      // Show previews for all photos
      this.photoFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const container = document.createElement('div');
          container.style.cssText = 'position: relative; display: inline-block;';
          
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.cssText = `
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 6px;
            border: 2px solid #3b82f6;
          `;
          img.title = file.name;
          
          // Add remove button
          const removeBtn = document.createElement('button');
          removeBtn.innerHTML = '×';
          removeBtn.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #ef4444;
            color: white;
            border: 2px solid white;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
          `;
          removeBtn.title = 'Remove photo';
          removeBtn.onclick = (e) => {
            e.preventDefault();
            this.removePhoto(index);
          };
          
          container.appendChild(img);
          container.appendChild(removeBtn);
          preview.appendChild(container);
        };
        reader.readAsDataURL(file);
      });

      toast.success(`${filesToAdd.length} photo${filesToAdd.length > 1 ? 's' : ''} added (${this.photoFiles.length} total)`);
    } else {
      // Reset button text
      if (addPhotoBtn) {
        addPhotoBtn.innerHTML = `
          <span style="font-size: 20px;">📷</span>
          <span>Take or Choose Photos</span>
        `;
        addPhotoBtn.style.background = '#3b82f6';
      }
    }
    
    // Clear the file input so same file can be selected again if needed
    event.target.value = '';
  }

  /**
   * Remove a photo from selection
   */
  removePhoto(index) {
    const photoInput = document.getElementById('photoInput');
    const addPhotoBtn = document.getElementById('addPhotoBtn');
    
    // Remove from array
    this.photoFiles.splice(index, 1);
    
    // Update preview
    const preview = document.getElementById('photoPreview');
    if (preview) {
      preview.innerHTML = '';
      
      // Re-render remaining photos
      this.photoFiles.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const container = document.createElement('div');
          container.style.cssText = 'position: relative; display: inline-block;';
          
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.cssText = `
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 6px;
            border: 2px solid #3b82f6;
          `;
          
          const removeBtn = document.createElement('button');
          removeBtn.innerHTML = '×';
          removeBtn.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #ef4444;
            color: white;
            border: 2px solid white;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
          `;
          removeBtn.onclick = (e) => {
            e.preventDefault();
            this.removePhoto(i);
          };
          
          container.appendChild(img);
          container.appendChild(removeBtn);
          preview.appendChild(container);
        };
        reader.readAsDataURL(file);
      });
    }
    
    // Update button text and color
    if (addPhotoBtn) {
      if (this.photoFiles.length > 0) {
        const remaining = 3 - this.photoFiles.length;
        addPhotoBtn.innerHTML = `
          <span style="font-size: 20px;">📷</span>
          <span>${this.photoFiles.length}/3 Photos (Add ${remaining} more)</span>
        `;
        addPhotoBtn.style.background = '#3b82f6'; // Reset to blue
      } else {
        addPhotoBtn.innerHTML = `
          <span style="font-size: 20px;">📷</span>
          <span>Take or Choose Photos</span>
        `;
        addPhotoBtn.style.background = '#3b82f6';
      }
    }
    
    // Clear file input
    if (photoInput) {
      photoInput.value = '';
    }
    
    toast.info(`Photo removed. ${this.photoFiles.length} photo${this.photoFiles.length !== 1 ? 's' : ''} remaining.`);
  }

  /**
   * Submit the captured report data
   */
  async submitReportData() {
    try {
      if (!this.formData) {
        console.error('❌ No form data to submit');
        toast.error('No form data captured');
        return;
      }

      console.log('📤 Submitting report with data:', this.formData);

      // Prepare complete report data
      const reportData = {
        ...this.formData,
        latitude: this.selectedLocation.lat,
        longitude: this.selectedLocation.lng,
        tags: []
      };

      console.log('📤 Complete report data:', reportData);
      console.log('📷 Number of photos:', this.photoFiles.length);

      // Show loading
      const loadingToast = toast.loading('Submitting report...');

      try {
        // Submit report with photos
        console.log('🔄 Calling accessReportController.createReport...');
        const reportId = await accessReportController.createReport(reportData, this.photoFiles);
        
        // Close loading
        toast.dismiss(loadingToast);
        
        console.log('✅ Report submitted successfully with ID:', reportId);
        toast.success('Report submitted successfully!');
        
        // Clear data
        this.photoFiles = [];
        this.formData = null;

        // Refresh the timeline/map
        window.dispatchEvent(new CustomEvent('report-submitted', { detail: { reportId } }));

        return reportId;

      } catch (submitError) {
        toast.dismiss(loadingToast);
        console.error('❌ Submit error:', submitError);
        throw submitError;
      }

    } catch (error) {
      console.error('❌ Error in submitReportData:', error);
      toast.error('Failed to submit report: ' + error.message);
      throw error;
    }
  }

  /**
   * Build report form HTML
   */
  buildReportForm() {
    const issueTypeOptions = Object.values(ISSUE_TYPES).map(type => 
      `<option value="${type.id}">${type.icon} ${type.label}</option>`
    ).join('');

    const severityOptions = Object.values(SEVERITY_LEVELS).map(level =>
      `<option value="${level.id}">${level.label} - ${level.description}</option>`
    ).join('');

    return `
      <form id="accessReportForm" class="access-report-form">
        
        <div class="form-group">
          <label for="issueType">Issue Type *</label>
          <select id="issueType" name="issueType" required>
            <option value="">Select issue type...</option>
            ${issueTypeOptions}
          </select>
        </div>

        <div class="form-group">
          <label for="severity">Severity Level *</label>
          <select id="severity" name="severity" required>
            <option value="">Select severity...</option>
            ${severityOptions}
          </select>
        </div>

        <div class="form-group">
          <label for="title">Title *</label>
          <input 
            type="text" 
            id="title" 
            name="title" 
            placeholder="Brief description of the issue"
            maxlength="100"
            required
          />
        </div>

        <div class="form-group">
          <label for="description">Description *</label>
          <textarea 
            id="description" 
            name="description" 
            rows="4"
            placeholder="Provide details about the accessibility barrier..."
            required
          ></textarea>
        </div>

        <div class="form-group">
          <label for="placeDescription">Location Description</label>
          <input 
            type="text" 
            id="placeDescription" 
            name="placeDescription" 
            placeholder="e.g., Corner of Main St and 5th Ave"
          />
        </div>

        <div class="form-group">
          <label>Photos (optional, up to 3)</label>
          
          <!-- Hidden file input -->
          <input 
            type="file" 
            id="photoInput" 
            accept="image/*"
            multiple
            capture="environment"
            style="display: none;"
          />
          
          <!-- Visible photo button -->
          <button 
            type="button" 
            id="addPhotoBtn" 
            class="btn-add-photo"
            style="
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 12px 20px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              margin-bottom: 8px;
            "
          >
            <span style="font-size: 20px;">📷</span>
            <span>Take or Choose Photos</span>
          </button>
          
          <small style="display: block; margin-top: 4px;">Photos help authorities understand and fix the issue</small>
          
          <!-- Photo preview area -->
          <div id="photoPreview" style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;"></div>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="isPublic" name="isPublic" checked />
            Make this report public (recommended)
          </label>
          <small>Public reports help the community see and support accessibility improvements</small>
        </div>

        <div class="form-info">
          <strong>📍 Location:</strong> ${this.selectedLocation.lat.toFixed(6)}, ${this.selectedLocation.lng.toFixed(6)}
        </div>
      </form>
    `;
  }
}