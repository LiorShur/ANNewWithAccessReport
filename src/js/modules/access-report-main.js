/**
 * AccessReport Main Integration Module
 * Initializes and coordinates all AccessReport components
 */

import { accessReportController } from './access-report-controller.js';
import { AccessReportUI } from './access-report-ui.js';
import { AccessReportMap } from './access-report-map.js';
import { AccessReportTimeline } from './access-report-timeline.js';

export class AccessReportModule {
  constructor(config = {}) {
    this.config = {
      map: null, // Leaflet map instance
      mapContainer: null, // Map container element
      timelineContainer: null, // Timeline container element
      enableTimeline: true,
      enableFilters: true,
      autoLoadReports: true,
      ...config
    };
    
    this.controller = accessReportController;
    this.ui = null;
    this.mapVisualization = null;
    this.timeline = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the AccessReport module
   */
  async initialize() {
    try {
      console.log('Initializing AccessReport Module...');
      
      // Initialize controller
      await this.controller.initialize();
      
      // Initialize UI components
      if (this.config.map) {
        this.ui = new AccessReportUI(this.config);
        this.mapVisualization = new AccessReportMap(this.config.map, this.controller);
      }
      
      // Initialize timeline if enabled
      if (this.config.enableTimeline && this.config.timelineContainer) {
        this.timeline = new AccessReportTimeline(
          this.config.timelineContainer,
          this.controller,
          this.mapVisualization
        );
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load initial data if enabled
      if (this.config.autoLoadReports && this.mapVisualization) {
        await this.mapVisualization.loadReports();
      }
      
      this.initialized = true;
      console.log('AccessReport Module initialized successfully');
      
      return {
        success: true,
        message: 'AccessReport Module ready'
      };
      
    } catch (error) {
      console.error('Error initializing AccessReport Module:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Set up event listeners for cross-component communication
   */
  setupEventListeners() {
    // Listen for report submission from UI
    window.addEventListener('report-submitted', async (event) => {
      const result = await this.controller.submitReport(event.detail);
      
      if (result.success) {
        // Reload map markers
        if (this.mapVisualization) {
          await this.mapVisualization.loadReports();
        }
        
        // Reload timeline
        if (this.timeline) {
          await this.timeline.loadTimelineData();
        }
        
        // Show success notification
        this.showNotification('Report submitted successfully!', 'success');
      } else {
        this.showNotification('Error submitting report: ' + result.error, 'error');
      }
    });
    
    // Listen for zoom to report requests
    window.addEventListener('zoom-to-report', (event) => {
      if (this.mapVisualization) {
        this.mapVisualization.zoomToReport(event.detail.reportId);
      }
    });
    
    // Listen for show report details requests
    window.addEventListener('show-report-details', (event) => {
      this.showReportDetailsModal(event.detail.reportId, event.detail.report);
    });
  }
  
  /**
   * Show notification toast
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 16px 24px;
      background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 2000;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  /**
   * Show report details modal
   */
  showReportDetailsModal(reportId, reportData = null) {
    // Create or update details modal
    let modal = document.getElementById('reportDetailsModal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'reportDetailsModal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    
    if (reportData) {
      this.renderReportDetails(modal, reportData);
    } else {
      // Fetch report data if not provided
      // This would require adding a getReportById method to the controller
      console.log('Fetch and display report:', reportId);
    }
    
    modal.style.display = 'flex';
  }
  
  /**
   * Render report details
   */
  renderReportDetails(modal, report) {
    modal.innerHTML = `
      <div class="modal-content report-details-modal">
        <div class="modal-header">
          <h2>${report.title}</h2>
          <button class="modal-close" onclick="document.getElementById('reportDetailsModal').style.display='none'">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="report-details">
            <!-- Status and Severity -->
            <div class="detail-section">
              <div class="badges">
                ${this.getStatusBadge(report.status)}
                ${this.getSeverityBadge(report.severity)}
              </div>
            </div>
            
            <!-- Issue Type -->
            <div class="detail-section">
              <h3>Issue Type</h3>
              <p>${this.getIssueIcon(report.issueType)} ${this.getIssueLabel(report.issueType)}</p>
            </div>
            
            <!-- Description -->
            <div class="detail-section">
              <h3>Description</h3>
              <p>${report.description || 'No description provided'}</p>
            </div>
            
            <!-- Location -->
            <div class="detail-section">
              <h3>Location</h3>
              <p>📍 ${report.location.placeDescription || `${report.location.latitude.toFixed(6)}, ${report.location.longitude.toFixed(6)}`}</p>
              ${report.location.address ? `<p>${report.location.address}</p>` : ''}
            </div>
            
            <!-- Photos -->
            ${report.photos && report.photos.length > 0 ? `
              <div class="detail-section">
                <h3>Photos</h3>
                <div class="photo-gallery">
                  ${report.photos.map(photo => `
                    <img src="${photo.url}" alt="${photo.caption || 'Report photo'}" class="gallery-photo">
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- Engagement -->
            <div class="detail-section">
              <h3>Community Engagement</h3>
              <div class="engagement-stats">
                <button class="engagement-btn" onclick="accessReportModule.handleUpvote('${report.id}')">
                  👍 ${report.upvotes} Upvotes
                </button>
                <span>💬 ${report.commentCount} Comments</span>
                <span>👁️ ${report.viewCount} Views</span>
              </div>
            </div>
            
            <!-- Timeline -->
            <div class="detail-section">
              <h3>Status History</h3>
              <div class="status-timeline">
                ${report.statusHistory.map(history => `
                  <div class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                      <strong>${history.status}</strong>
                      <p>${history.note}</p>
                      <span class="timeline-date">${this.formatDate(history.timestamp?.toDate())}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Actions -->
            ${this.canUpdateStatus(report) ? `
              <div class="detail-section">
                <h3>Update Status</h3>
                <select id="statusUpdate" class="form-select">
                  <option value="">Select new status...</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="wont_fix">Won't Fix</option>
                </select>
                <textarea id="statusNote" class="form-textarea" placeholder="Add a note about this status change..." rows="3"></textarea>
                <button class="btn-primary" onclick="accessReportModule.updateStatus('${report.id}')">
                  Update Status
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Handle upvote action
   */
  async handleUpvote(reportId) {
    const result = await this.controller.upvoteReport(reportId);
    
    if (result.success) {
      this.showNotification('Upvoted!', 'success');
      // Refresh the modal
      // In a real implementation, you'd fetch the updated report and re-render
    } else {
      this.showNotification('Error upvoting report', 'error');
    }
  }
  
  /**
   * Update report status
   */
  async updateStatus(reportId) {
    const newStatus = document.getElementById('statusUpdate').value;
    const note = document.getElementById('statusNote').value;
    
    if (!newStatus) {
      this.showNotification('Please select a status', 'error');
      return;
    }
    
    const result = await this.controller.updateReportStatus(reportId, newStatus, note);
    
    if (result.success) {
      this.showNotification('Status updated successfully!', 'success');
      document.getElementById('reportDetailsModal').style.display = 'none';
      
      // Reload data
      if (this.mapVisualization) {
        await this.mapVisualization.loadReports();
      }
      if (this.timeline) {
        await this.timeline.loadTimelineData();
      }
    } else {
      this.showNotification('Error updating status', 'error');
    }
  }
  
  /**
   * Check if current user can update status
   */
  canUpdateStatus(report) {
    // In a real implementation, check if user has authority role
    // For now, allow all authenticated users
    return this.controller.currentUser !== null;
  }
  
  /**
   * Helper methods
   */
  getStatusBadge(status) {
    const badges = {
      'new': '<span class="badge badge-new">New</span>',
      'acknowledged': '<span class="badge badge-ack">Acknowledged</span>',
      'in_progress': '<span class="badge badge-progress">In Progress</span>',
      'resolved': '<span class="badge badge-resolved">Resolved</span>',
      'closed': '<span class="badge badge-closed">Closed</span>',
      'wont_fix': '<span class="badge badge-wontfix">Won\'t Fix</span>'
    };
    return badges[status] || '';
  }
  
  getSeverityBadge(severity) {
    const badges = {
      'low': '<span class="badge badge-severity-low">Low</span>',
      'medium': '<span class="badge badge-severity-medium">Medium</span>',
      'high': '<span class="badge badge-severity-high">High</span>',
      'critical': '<span class="badge badge-severity-critical">Critical</span>'
    };
    return badges[severity] || '';
  }
  
  getIssueIcon(issueType) {
    const icons = {
      'curb_ramp': '♿',
      'sidewalk': '🚧',
      'entrance': '🚪',
      'parking': '🅿️',
      'elevator': '🛗',
      'signage': '🪧',
      'tactile': '⬜',
      'trail': '🥾',
      'restroom': '🚻',
      'other': '❗'
    };
    return icons[issueType] || '📍';
  }
  
  getIssueLabel(issueType) {
    const labels = {
      'curb_ramp': 'Curb Ramp',
      'sidewalk': 'Sidewalk',
      'entrance': 'Entrance',
      'parking': 'Parking',
      'elevator': 'Elevator/Lift',
      'signage': 'Signage',
      'tactile': 'Tactile Paving',
      'trail': 'Trail',
      'restroom': 'Restroom',
      'other': 'Other'
    };
    return labels[issueType] || 'Issue';
  }
  
  formatDate(date) {
    if (!date) return 'Unknown';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
  
  /**
   * Public API methods
   */
  
  /**
   * Get module statistics
   */
  async getStatistics(filters = {}) {
    return await this.controller.getStatistics(filters);
  }
  
  /**
   * Get reports for current user
   */
  async getUserReports() {
    if (!this.controller.currentUser) {
      throw new Error('User must be authenticated');
    }
    return await this.controller.getUserReports(this.controller.currentUser.uid);
  }
  
  /**
   * Reload all data
   */
  async reload() {
    if (this.mapVisualization) {
      await this.mapVisualization.loadReports();
    }
    if (this.timeline) {
      await this.timeline.loadTimelineData();
    }
  }
}

// Export singleton instance for global access
export let accessReportModule = null;

/**
 * Initialize the AccessReport module
 * Call this from your main app initialization
 */
export function initializeAccessReport(config) {
  accessReportModule = new AccessReportModule(config);
  return accessReportModule.initialize();
}

// Make available globally for onclick handlers
window.accessReportModule = accessReportModule;
