/**
 * AccessReport Main Module
 * Entry point for the AccessReport system
 * 
 * File: src/controllers/access-report-main.js
 */

import { accessReportController, STATUS_TYPES, SEVERITY_LEVELS, ISSUE_TYPES } from './access-report-controller.js';
import { AccessReportUI } from './access-report-ui.js';
import { AccessReportMap } from './access-report-map.js';
import { AccessReportTimeline } from './access-report-timeline.js';
import toast from '../helpers/toasts.js';
import modal from '../helpers/modals.js';

class AccessReportModule {
  constructor() {
    this.map = null;
    this.mapController = null;
    this.uiController = null;
    this.timelineController = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the AccessReport module
   * @param {Object} options - Configuration options
   * @param {L.Map} options.map - Leaflet map instance
   * @param {HTMLElement} options.mapContainer - Map container element
   * @param {HTMLElement} options.timelineContainer - Timeline container element
   * @param {boolean} options.enableTimeline - Enable timeline view
   * @param {boolean} options.enableFilters - Enable filter controls
   * @param {boolean} options.autoLoadReports - Auto-load reports on init
   */
  async initialize(options = {}) {
    try {
      console.log('🚀 Initializing AccessReport Module...');

      // Validate required options
      if (!options.map) {
        throw new Error('Map instance is required');
      }

      this.map = options.map;

      // Initialize Map Controller
      this.mapController = new AccessReportMap(this.map);
      this.mapController.initialize();

      // Initialize UI Controller
      this.uiController = new AccessReportUI(this.map);
      this.uiController.initialize();

      // Initialize Timeline Controller (if enabled)
      if (options.enableTimeline && options.timelineContainer) {
        this.timelineController = new AccessReportTimeline(options.timelineContainer);
        await this.timelineController.initialize();
      }

      // Auto-load reports if enabled
      if (options.autoLoadReports) {
        await this.loadAndDisplayReports();
      }

      // Make module globally accessible
      window.accessReportModule = this;

      this.isInitialized = true;
      console.log('✅ AccessReport Module initialized successfully');

      return {
        success: true,
        module: this
      };

    } catch (error) {
      console.error('❌ Failed to initialize AccessReport Module:', error);
      toast.error('Failed to initialize accessibility reporting: ' + error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load and display reports
   */
  async loadAndDisplayReports() {
    try {
      console.log('📥 Loading reports...');
      
      const reports = await accessReportController.getReports({
        limit: 100,
        orderBy: 'createdAt',
        orderDirection: 'desc'
      });

      if (this.mapController) {
        await this.mapController.displayReports(reports);
      }

      console.log(`✅ Loaded ${reports.length} reports`);
      return reports;

    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
      return [];
    }
  }

  /**
   * View report details
   */
  async viewReportDetails(reportId) {
    try {
      const report = await accessReportController.getReport(reportId);
      
      // Pan map to report location
      if (report.location?.latitude && report.location?.longitude) {
        this.map.setView([report.location.latitude, report.location.longitude], 16);
      }

      // Show detailed modal with all photos
      await this.showReportDetailsModal(report);

    } catch (error) {
      console.error('Error viewing report details:', error);
      toast.error('Failed to load report details');
    }
  }

  /**
   * Show detailed report modal with all photos
   */
  async showReportDetailsModal(report) {
    const statusInfo = STATUS_TYPES[report.status?.toUpperCase()] || STATUS_TYPES.NEW;
    const severityInfo = SEVERITY_LEVELS[report.severity?.toUpperCase()] || SEVERITY_LEVELS.MEDIUM;
    const issueTypeInfo = Object.values(ISSUE_TYPES).find(t => t.id === report.issueType) || ISSUE_TYPES.OTHER;
    
    const createdDate = report.createdAt?.toDate ? 
      report.createdAt.toDate().toLocaleString() : 
      'Unknown date';

    // Build photos gallery HTML
    let photosHTML = '';
    if (report.photos && report.photos.length > 0) {
      // Store photos in a global variable with unique ID
      const photosId = `photos_${report.id}`;
      const photoContents = report.photos.map(p => p.content);
      window[photosId] = photoContents;
      
      console.log(`📦 Stored ${photoContents.length} photos globally as: ${photosId}`);
      console.log(`📦 First photo preview:`, photoContents[0].substring(0, 50) + '...');
      
      // Create escaped title for inline onclick
      const escapedTitle = this.escapeHtml(report.title).replace(/'/g, "\\'");
      
      photosHTML = `
        <div style="margin: 20px 0;">
          <h3 style="margin-bottom: 12px; font-size: 16px; font-weight: 600;">📷 Photos (${report.photos.length})</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
            ${report.photos.map((photo, index) => `
              <div style="position: relative; border-radius: 8px; overflow: hidden; border: 2px solid #e5e7eb; cursor: pointer; transition: transform 0.2s;" 
                   onclick="window.openPhotoLightbox(${index}, window['${photosId}'], '${escapedTitle}'); console.log('📸 Inline click worked!');"
                   onmouseenter="this.style.transform='scale(1.05)'; this.querySelector('.photo-hover-text').style.opacity='1';"
                   onmouseleave="this.style.transform='scale(1)'; this.querySelector('.photo-hover-text').style.opacity='0';"
                   class="photo-thumbnail">
                <img 
                  src="${photo.content}" 
                  alt="Photo ${index + 1}"
                  style="width: 100%; height: 200px; object-fit: cover; pointer-events: none;"
                  title="Click to view full size"
                >
                <div style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; pointer-events: none;">
                  ${index + 1}/${report.photos.length}
                </div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); padding: 12px 8px 8px; color: white; font-size: 12px; opacity: 0; transition: opacity 0.2s; pointer-events: none;" 
                     class="photo-hover-text">
                  🔍 Click to enlarge
                </div>
              </div>
            `).join('')}
          </div>
          <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">💡 Click any photo to view full screen</p>
        </div>
      `;
    }

    const modalHTML = `
      <div style="max-height: 70vh; overflow-y: auto;">
        <!-- Header -->
        <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
          <span style="background-color: ${statusInfo.color}; color: white; padding: 6px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
            ${statusInfo.icon} ${statusInfo.label}
          </span>
          <span style="border: 2px solid ${severityInfo.color}; color: ${severityInfo.color}; padding: 6px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
            ${severityInfo.label}
          </span>
          <span style="background-color: #f3f4f6; color: #374151; padding: 6px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
            ${issueTypeInfo.icon} ${issueTypeInfo.label}
          </span>
        </div>

        <!-- Title -->
        <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #111827;">
          ${this.escapeHtml(report.title)}
        </h2>

        <!-- Photos Gallery -->
        ${photosHTML}

        <!-- Description -->
        <div style="margin: 20px 0;">
          <h3 style="margin-bottom: 8px; font-size: 16px; font-weight: 600;">📝 Description</h3>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6; white-space: pre-wrap;">
            ${this.escapeHtml(report.description)}
          </p>
        </div>

        <!-- Location -->
        <div style="margin: 20px 0;">
          <h3 style="margin-bottom: 8px; font-size: 16px; font-weight: 600;">📍 Location</h3>
          <p style="font-size: 14px; color: #4b5563;">
            ${this.escapeHtml(report.location?.placeDescription || 'Not specified')}<br>
            <small style="color: #9ca3af;">
              Coordinates: ${report.location.latitude.toFixed(6)}, ${report.location.longitude.toFixed(6)}
            </small>
          </p>
        </div>

        <!-- Metadata -->
        <div style="margin: 20px 0; padding: 16px; background: #f9fafb; border-radius: 8px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 14px;">
            <div>
              <strong>👤 Reported by:</strong><br>
              ${this.escapeHtml(report.userName || 'Anonymous')}
            </div>
            <div>
              <strong>📅 Date:</strong><br>
              ${createdDate}
            </div>
            ${report.upvotes ? `
              <div>
                <strong>👍 Upvotes:</strong><br>
                ${report.upvotes}
              </div>
            ` : ''}
            ${report.commentCount ? `
              <div>
                <strong>💬 Comments:</strong><br>
                ${report.commentCount}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 8px; margin-top: 20px;">
          <button 
            onclick="navigator.geolocation && navigator.geolocation.getCurrentPosition((pos) => { 
              const url = 'https://www.google.com/maps/dir/?api=1&origin=' + pos.coords.latitude + ',' + pos.coords.longitude + '&destination=${report.location.latitude},${report.location.longitude}';
              window.open(url, '_blank');
            })"
            style="flex: 1; padding: 10px 16px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"
          >
            🗺️ Get Directions
          </button>
          <button 
            onclick="window.accessReportModule?.upvoteReport('${report.id}')"
            style="flex: 1; padding: 10px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"
          >
            👍 Upvote This Issue
          </button>
        </div>
      </div>
    `;

    const modalResult = await modal.show({
      type: 'info',
      title: 'Accessibility Issue Details',
      content: modalHTML,
      size: 'lg',
      buttons: [
        { label: 'Close', action: 'close', variant: 'secondary' }
      ]
    });

    console.log('✅ Modal displayed with inline onclick handlers');
    
    // Clean up photos when modal closes
    const photosId = `photos_${report.id}`;
    if (window[photosId]) {
      delete window[photosId];
      console.log(`🧹 Cleaned up ${photosId} after modal closed`);
    }
  }

  /**
   * Upvote a report (helper method)
   */
  async upvoteReport(reportId) {
    try {
      await accessReportController.upvoteReport(reportId);
      
      // Refresh displays without reloading everything
      toast.success('Upvoted! Refreshing...');
      
      // Reload map markers
      if (this.mapController) {
        const reports = await accessReportController.getReports({ 
          limit: 50, 
          isPublic: true 
        });
        await this.mapController.displayReports(reports);
      }
      
      // Reload timeline
      if (this.timelineController) {
        await this.timelineController.loadReports();
      }
      
      console.log('✅ Reports refreshed after upvote');
      
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Filter reports
   */
  async filterReports(filters) {
    try {
      const reports = await accessReportController.getReports(filters);
      
      if (this.mapController) {
        await this.mapController.displayReports(reports);
      }

      if (this.timelineController) {
        this.timelineController.reports = reports;
        this.timelineController.renderTimeline();
      }

      return reports;
    } catch (error) {
      console.error('Error filtering reports:', error);
      toast.error('Failed to filter reports');
      return [];
    }
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    try {
      return await accessReportController.getStats();
    } catch (error) {
      console.error('Error getting statistics:', error);
      return null;
    }
  }

  /**
   * Refresh all data
   */
  async refresh() {
    try {
      toast.info('Refreshing reports...');
      await this.loadAndDisplayReports();
      
      if (this.timelineController) {
        await this.timelineController.loadReports();
      }

      toast.success('Reports refreshed');
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Failed to refresh reports');
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Create and show full-screen photo lightbox
   */
  createPhotoLightbox() {
    console.log('🎨 Creating photo lightbox...');
    
    // Create lightbox container if it doesn't exist
    let lightbox = document.getElementById('photoLightbox');
    if (lightbox) {
      console.log('♻️ Removing existing lightbox');
      lightbox.remove();
    }

    lightbox = document.createElement('div');
    lightbox.id = 'photoLightbox';
    lightbox.innerHTML = `
      <div class="lightbox-overlay" onclick="window.closePhotoLightbox()"></div>
      <div class="lightbox-content">
        <button class="lightbox-close" onclick="window.closePhotoLightbox()" title="Close (ESC)">
          ✕
        </button>
        <button class="lightbox-prev" onclick="window.navigatePhoto(-1)" title="Previous (←)">
          ‹
        </button>
        <button class="lightbox-next" onclick="window.navigatePhoto(1)" title="Next (→)">
          ›
        </button>
        <div class="lightbox-image-container">
          <img id="lightboxImage" src="" alt="Full size photo">
        </div>
        <div class="lightbox-info">
          <div class="lightbox-counter" id="lightboxCounter"></div>
          <div class="lightbox-title" id="lightboxTitle"></div>
        </div>
      </div>
      <style>
        #photoLightbox {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease-in;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        .lightbox-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          cursor: pointer;
        }
        
        .lightbox-content {
          position: relative;
          width: 90%;
          height: 90%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }
        
        .lightbox-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          font-size: 28px;
          font-weight: 300;
          cursor: pointer;
          z-index: 3;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #111827;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        
        .lightbox-close:hover {
          background: white;
          transform: scale(1.1);
        }
        
        .lightbox-prev,
        .lightbox-next {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.9);
          border: none;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          font-size: 40px;
          font-weight: 300;
          cursor: pointer;
          z-index: 3;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #111827;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        
        .lightbox-prev {
          left: 20px;
        }
        
        .lightbox-next {
          right: 20px;
        }
        
        .lightbox-prev:hover,
        .lightbox-next:hover {
          background: white;
          transform: translateY(-50%) scale(1.1);
        }
        
        .lightbox-prev:disabled,
        .lightbox-next:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        
        .lightbox-image-container {
          max-width: 90%;
          max-height: 80%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        #lightboxImage {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
          animation: zoomIn 0.3s ease-out;
        }
        
        @keyframes zoomIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .lightbox-info {
          position: absolute;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          color: white;
          z-index: 2;
        }
        
        .lightbox-counter {
          background: rgba(0, 0, 0, 0.7);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
          backdrop-filter: blur(10px);
        }
        
        .lightbox-title {
          background: rgba(0, 0, 0, 0.7);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          max-width: 600px;
          backdrop-filter: blur(10px);
        }
        
        @media (max-width: 768px) {
          .lightbox-prev,
          .lightbox-next {
            width: 50px;
            height: 50px;
            font-size: 32px;
          }
          
          .lightbox-prev {
            left: 10px;
          }
          
          .lightbox-next {
            right: 10px;
          }
          
          .lightbox-close {
            width: 44px;
            height: 44px;
            font-size: 24px;
            top: 10px;
            right: 10px;
          }
          
          .lightbox-info {
            bottom: 20px;
          }
        }
      </style>
    `;

    document.body.appendChild(lightbox);
    console.log('✅ Lightbox added to DOM');
    
    return lightbox;
  }
}

/**
 * Initialize AccessReport module
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Initialization result
 */
export async function initializeAccessReport(options) {
  const module = new AccessReportModule();
  return await module.initialize(options);
}

// Export for direct use
export { AccessReportModule };

// ========================================
// GLOBAL PHOTO LIGHTBOX FUNCTIONS
// ========================================

// Global photo lightbox state
let currentPhotoIndex = 0;
let currentPhotos = [];
let currentPhotoTitle = '';

/**
 * Open photo lightbox (global function)
 */
window.openPhotoLightbox = function(index, photos, title = '') {
  console.log('🔍 openPhotoLightbox called:', { index, photoCount: photos?.length, title });
  
  currentPhotoIndex = index;
  currentPhotos = photos;
  currentPhotoTitle = title;

  // Validate inputs
  if (!photos || photos.length === 0) {
    console.error('❌ No photos provided to lightbox');
    return;
  }

  // Create or get lightbox
  const module = window.accessReportModule;
  if (!module) {
    console.error('❌ AccessReport module not found');
    return;
  }

  console.log('✅ Creating lightbox...');
  const lightbox = module.createPhotoLightbox();
  
  // Show current photo
  updateLightboxPhoto();

  // Add keyboard navigation
  document.addEventListener('keydown', handleLightboxKeyboard);

  // Prevent body scroll
  document.body.style.overflow = 'hidden';
  
  console.log('✅ Lightbox opened successfully');
};

/**
 * Close photo lightbox (global function)
 */
window.closePhotoLightbox = function() {
  const lightbox = document.getElementById('photoLightbox');
  if (lightbox) {
    lightbox.style.animation = 'fadeOut 0.2s ease-out';
    setTimeout(() => {
      lightbox.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleLightboxKeyboard);
      
      // DON'T delete photos here - keep them available for modal
      // They'll be cleaned up when modal closes or page changes
      console.log('✅ Lightbox closed (photos kept for modal)');
    }, 200);
  }
};

/**
 * Navigate photos (global function)
 */
window.navigatePhoto = function(direction) {
  currentPhotoIndex += direction;
  
  // Loop around
  if (currentPhotoIndex < 0) {
    currentPhotoIndex = currentPhotos.length - 1;
  } else if (currentPhotoIndex >= currentPhotos.length) {
    currentPhotoIndex = 0;
  }
  
  updateLightboxPhoto();
};

/**
 * Update lightbox photo display
 */
function updateLightboxPhoto() {
  console.log('🖼️ Updating lightbox photo:', currentPhotoIndex, '/', currentPhotos.length);
  
  const img = document.getElementById('lightboxImage');
  const counter = document.getElementById('lightboxCounter');
  const title = document.getElementById('lightboxTitle');
  const prevBtn = document.querySelector('.lightbox-prev');
  const nextBtn = document.querySelector('.lightbox-next');

  console.log('📸 Lightbox elements found:', { 
    img: !!img, 
    counter: !!counter, 
    title: !!title,
    prevBtn: !!prevBtn,
    nextBtn: !!nextBtn
  });

  if (img && counter) {
    // Add loading animation
    img.style.animation = 'none';
    setTimeout(() => {
      img.src = currentPhotos[currentPhotoIndex];
      img.style.animation = 'zoomIn 0.3s ease-out';
      console.log('✅ Photo loaded:', currentPhotoIndex + 1);
    }, 10);

    counter.textContent = `${currentPhotoIndex + 1} / ${currentPhotos.length}`;
    
    if (title) {
      title.textContent = currentPhotoTitle;
    }

    // Hide navigation buttons if only one photo
    if (currentPhotos.length === 1) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
    }
  } else {
    console.error('❌ Lightbox elements not found in DOM');
  }
}

/**
 * Handle keyboard navigation
 */
function handleLightboxKeyboard(e) {
  switch(e.key) {
    case 'Escape':
      window.closePhotoLightbox();
      break;
    case 'ArrowLeft':
      if (currentPhotos.length > 1) {
        window.navigatePhoto(-1);
      }
      break;
    case 'ArrowRight':
      if (currentPhotos.length > 1) {
        window.navigatePhoto(1);
      }
      break;
  }
}

console.log('✅ Photo lightbox system initialized');

// DEBUG HELPER - Find where modal content is rendered
window.findModalContent = function() {
  console.log('🔍 Searching for modal and thumbnails...');
  
  // Check various possible locations
  const locations = {
    'document.body': document.body.querySelectorAll('.photo-thumbnail'),
    '.modal': document.querySelector('.modal')?.querySelectorAll('.photo-thumbnail'),
    '[role="dialog"]': document.querySelector('[role="dialog"]')?.querySelectorAll('.photo-thumbnail'),
    '.modal-content': document.querySelector('.modal-content')?.querySelectorAll('.photo-thumbnail'),
    '.modal-body': document.querySelector('.modal-body')?.querySelectorAll('.photo-thumbnail'),
    '#modal': document.querySelector('#modal')?.querySelectorAll('.photo-thumbnail'),
  };
  
  console.log('📍 Search results:');
  Object.entries(locations).forEach(([selector, elements]) => {
    if (elements) {
      console.log(`  ${selector}: ${elements.length} thumbnails`);
      if (elements.length > 0) {
        console.log('    ✅ FOUND HERE!', elements[0]);
      }
    } else {
      console.log(`  ${selector}: container not found`);
    }
  });
  
  // Check for any divs with photos
  const allDivs = document.querySelectorAll('div');
  let found = false;
  allDivs.forEach(div => {
    const thumbnails = div.querySelectorAll('.photo-thumbnail');
    if (thumbnails.length > 0 && !found) {
      console.log('🎯 Found thumbnails in:', div);
      console.log('   Classes:', div.className);
      console.log('   ID:', div.id);
      console.log('   Thumbnail count:', thumbnails.length);
      found = true;
    }
  });
  
  if (!found) {
    console.log('❌ No thumbnails found anywhere in DOM');
    console.log('💡 The modal might not be showing HTML content properly');
  }
};

console.log('💡 Type window.findModalContent() after opening a report to debug');

// TEST FUNCTION - Call this in console to test lightbox with a visible photo
window.testPhotoLightbox = function() {
  console.log('🧪 Testing photo lightbox with sample image...');
  
  // Create a simple colored square as test image
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  
  // Draw gradient
  const gradient = ctx.createLinearGradient(0, 0, 400, 400);
  gradient.addColorStop(0, '#3b82f6');
  gradient.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 400);
  
  // Add text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Test Photo', 200, 180);
  ctx.font = '20px Arial';
  ctx.fillText('Lightbox Working!', 200, 220);
  ctx.fillText('Press → or ← to navigate', 200, 260);
  
  const testPhoto = canvas.toDataURL('image/png');
  
  // Create second test photo
  canvas.width = 400;
  canvas.height = 400;
  const gradient2 = ctx.createLinearGradient(0, 0, 400, 400);
  gradient2.addColorStop(0, '#10b981');
  gradient2.addColorStop(1, '#059669');
  ctx.fillStyle = gradient2;
  ctx.fillRect(0, 0, 400, 400);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Photo 2', 200, 200);
  
  const testPhoto2 = canvas.toDataURL('image/png');
  
  window.openPhotoLightbox(0, [testPhoto, testPhoto2], 'Test Lightbox - Use ← → to navigate');
  
  console.log('✅ Test lightbox opened! Press ESC to close.');
};

console.log('💡 Type window.testPhotoLightbox() in console to test the lightbox!');