/**
 * AccessReport Map Visualization
 * Displays accessibility reports on Leaflet map
 */

export class AccessReportMap {
  constructor(map, reportController) {
    this.map = map;
    this.reportController = reportController;
    this.reportMarkers = new Map();
    this.markerClusterGroup = null;
    this.activeFilters = {
      status: ['new', 'acknowledged', 'in_progress'],
      issueType: [],
      severity: null
    };
    
    this.initializeMap();
  }
  
  /**
   * Initialize map components
   */
  async initializeMap() {
    try {
      // Initialize marker cluster group if available
      if (typeof L.markerClusterGroup !== 'undefined') {
        this.markerClusterGroup = L.markerClusterGroup({
          iconCreateFunction: (cluster) => {
            const count = cluster.getChildCount();
            let className = 'marker-cluster-';
            if (count < 10) {
              className += 'small';
            } else if (count < 50) {
              className += 'medium';
            } else {
              className += 'large';
            }
            
            return L.divIcon({
              html: `<div><span>${count}</span></div>`,
              className: `marker-cluster ${className}`,
              iconSize: L.point(40, 40)
            });
          }
        });
        
        this.map.addLayer(this.markerClusterGroup);
      }
      
      // Create filter control
      this.createFilterControl();
      
      // Load initial reports
      await this.loadReports();
      
      // Listen for map movements
      this.map.on('moveend', () => this.loadReports());
      
      console.log('AccessReport Map initialized');
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }
  
  /**
   * Create filter control panel
   */
  createFilterControl() {
    const FilterControl = L.Control.extend({
      onAdd: () => {
        const div = L.DomUtil.create('div', 'leaflet-control-filter');
        div.innerHTML = `
          <div class="filter-panel">
            <button id="toggleFilters" class="filter-toggle">
              🔍 Filters
            </button>
            <div id="filterOptions" class="filter-options" style="display: none;">
              <div class="filter-section">
                <h4>Status</h4>
                <label><input type="checkbox" value="new" checked> New</label>
                <label><input type="checkbox" value="acknowledged" checked> Acknowledged</label>
                <label><input type="checkbox" value="in_progress" checked> In Progress</label>
                <label><input type="checkbox" value="resolved"> Resolved</label>
              </div>
              
              <div class="filter-section">
                <h4>Issue Type</h4>
                <label><input type="checkbox" value="curb_ramp"> Curb Ramp</label>
                <label><input type="checkbox" value="sidewalk"> Sidewalk</label>
                <label><input type="checkbox" value="entrance"> Entrance</label>
                <label><input type="checkbox" value="parking"> Parking</label>
                <label><input type="checkbox" value="trail"> Trail</label>
              </div>
              
              <div class="filter-section">
                <h4>Severity</h4>
                <label><input type="radio" name="severity" value="all" checked> All</label>
                <label><input type="radio" name="severity" value="critical"> Critical Only</label>
                <label><input type="radio" name="severity" value="high"> High+</label>
              </div>
              
              <button id="applyFilters" class="btn-primary btn-small">Apply</button>
            </div>
          </div>
        `;
        
        L.DomEvent.disableClickPropagation(div);
        
        return div;
      }
    });
    
    const filterControl = new FilterControl({ position: 'topright' });
    this.map.addControl(filterControl);
    
    // Attach filter event listeners
    setTimeout(() => {
      document.getElementById('toggleFilters')?.addEventListener('click', () => {
        const options = document.getElementById('filterOptions');
        options.style.display = options.style.display === 'none' ? 'block' : 'none';
      });
      
      document.getElementById('applyFilters')?.addEventListener('click', () => {
        this.updateFilters();
        this.loadReports();
      });
    }, 100);
  }
  
  /**
   * Update filters from UI
   */
  updateFilters() {
    const statusCheckboxes = document.querySelectorAll('.filter-section:nth-child(1) input[type="checkbox"]');
    this.activeFilters.status = Array.from(statusCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);
    
    const typeCheckboxes = document.querySelectorAll('.filter-section:nth-child(2) input[type="checkbox"]');
    this.activeFilters.issueType = Array.from(typeCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);
    
    const severityRadio = document.querySelector('input[name="severity"]:checked');
    this.activeFilters.severity = severityRadio?.value !== 'all' ? severityRadio?.value : null;
  }
  
  /**
   * Load reports from Firestore
   */
  async loadReports() {
    try {
      const bounds = this.map.getBounds();
      const mapBounds = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };
      
      const reports = await this.reportController.getReportsInBounds(mapBounds, this.activeFilters);
      
      this.displayReports(reports);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  }
  
  /**
   * Display reports on map
   */
  displayReports(reports) {
    // Clear existing markers
    this.clearMarkers();
    
    reports.forEach(report => {
      const marker = this.createReportMarker(report);
      
      if (this.markerClusterGroup) {
        this.markerClusterGroup.addLayer(marker);
      } else {
        marker.addTo(this.map);
      }
      
      this.reportMarkers.set(report.id, marker);
    });
  }
  
  /**
   * Create marker for a report
   */
  createReportMarker(report) {
    const { latitude, longitude } = report.location;
    
    // Get marker color based on status and severity
    const markerColor = this.getMarkerColor(report);
    const issueIcon = this.getIssueIcon(report.issueType);
    
    const marker = L.marker([latitude, longitude], {
      icon: L.divIcon({
        className: 'report-marker',
        html: `
          <div class="marker-icon" style="background-color: ${markerColor};">
            ${issueIcon}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      })
    });
    
    // Create popup
    marker.bindPopup(this.createPopupContent(report), {
      maxWidth: 300,
      className: 'report-popup'
    });
    
    // Click event to show details
    marker.on('click', () => {
      this.showReportDetails(report);
    });
    
    return marker;
  }
  
  /**
   * Get marker color based on status and severity
   */
  getMarkerColor(report) {
    if (report.status === 'resolved') {
      return '#10b981'; // green
    } else if (report.status === 'in_progress') {
      return '#f59e0b'; // orange
    } else {
      // Color by severity
      switch (report.severity) {
        case 'critical': return '#dc2626'; // red
        case 'high': return '#ea580c'; // dark orange
        case 'medium': return '#f59e0b'; // orange
        case 'low': return '#fbbf24'; // yellow
        default: return '#3b82f6'; // blue
      }
    }
  }
  
  /**
   * Get issue icon
   */
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
  
  /**
   * Create popup content
   */
  createPopupContent(report) {
    const statusBadge = this.getStatusBadge(report.status);
    const severityBadge = this.getSeverityBadge(report.severity);
    
    return `
      <div class="report-popup-content">
        <h3>${report.title}</h3>
        <div class="badges">
          ${statusBadge}
          ${severityBadge}
        </div>
        <p class="report-type">${this.getIssueIcon(report.issueType)} ${this.getIssueLabel(report.issueType)}</p>
        <p class="report-description">${report.description?.substring(0, 100)}${report.description?.length > 100 ? '...' : ''}</p>
        <div class="report-meta">
          <span>👍 ${report.upvotes} upvotes</span>
          <span>💬 ${report.commentCount} comments</span>
        </div>
        <button onclick="window.showReportDetails('${report.id}')" class="btn-link">View Details</button>
      </div>
    `;
  }
  
  /**
   * Get status badge HTML
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
  
  /**
   * Get severity badge HTML
   */
  getSeverityBadge(severity) {
    const badges = {
      'low': '<span class="badge badge-severity-low">Low</span>',
      'medium': '<span class="badge badge-severity-medium">Medium</span>',
      'high': '<span class="badge badge-severity-high">High</span>',
      'critical': '<span class="badge badge-severity-critical">Critical</span>'
    };
    return badges[severity] || '';
  }
  
  /**
   * Get issue type label
   */
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
  
  /**
   * Show detailed report view
   */
  showReportDetails(report) {
    // This will open a detailed modal/panel
    console.log('Show details for report:', report.id);
    
    // Dispatch custom event that can be handled by main app
    const event = new CustomEvent('show-report-details', {
      detail: { reportId: report.id, report }
    });
    window.dispatchEvent(event);
  }
  
  /**
   * Clear all markers
   */
  clearMarkers() {
    if (this.markerClusterGroup) {
      this.markerClusterGroup.clearLayers();
    } else {
      this.reportMarkers.forEach(marker => {
        this.map.removeLayer(marker);
      });
    }
    this.reportMarkers.clear();
  }
  
  /**
   * Zoom to report
   */
  zoomToReport(reportId) {
    const marker = this.reportMarkers.get(reportId);
    if (marker) {
      this.map.setView(marker.getLatLng(), 16);
      marker.openPopup();
    }
  }
}

// Make showReportDetails available globally for popup buttons
window.showReportDetails = function(reportId) {
  const event = new CustomEvent('show-report-details', {
    detail: { reportId }
  });
  window.dispatchEvent(event);
};
