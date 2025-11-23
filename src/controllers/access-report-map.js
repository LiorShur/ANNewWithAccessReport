/**
 * AccessReport Map Controller
 * Handles map visualization of accessibility reports
 * 
 * File: src/controllers/access-report-map.js
 */

import { accessReportController, STATUS_TYPES, SEVERITY_LEVELS } from './access-report-controller.js';
import toast from '../helpers/toasts.js';

export class AccessReportMap {
  constructor(map) {
    this.map = map;
    this.reportMarkers = [];
    this.markerClusterGroup = null;
  }

  /**
   * Initialize map features
   */
  initialize() {
    // Initialize marker clustering if available
    if (typeof L.markerClusterGroup !== 'undefined') {
      this.markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false
      });
      this.map.addLayer(this.markerClusterGroup);
    }

    console.log('✅ AccessReport Map initialized');
  }

  /**
   * Display reports on map
   */
  async displayReports(reports) {
    try {
      console.log(`🗺️ Displaying ${reports.length} reports on map`);
      
      this.clearMarkers();

      if (reports.length === 0) {
        toast.info('No reports to display');
        return;
      }

      const bounds = L.latLngBounds([]);

      reports.forEach(report => {
        if (!report.location?.latitude || !report.location?.longitude) {
          return;
        }

        const marker = this.createReportMarker(report);
        
        if (this.markerClusterGroup) {
          this.markerClusterGroup.addLayer(marker);
        } else {
          marker.addTo(this.map);
        }

        this.reportMarkers.push(marker);
        bounds.extend([report.location.latitude, report.location.longitude]);
      });

      // Fit map to show all markers
      if (bounds.isValid() && reports.length > 1) {
        this.map.fitBounds(bounds, { padding: [50, 50] });
      } else if (reports.length === 1) {
        const report = reports[0];
        this.map.setView([report.location.latitude, report.location.longitude], 15);
      }

      console.log(`✅ Displayed ${this.reportMarkers.length} report markers`);

    } catch (error) {
      console.error('Error displaying reports:', error);
      toast.error('Failed to display reports on map');
    }
  }

  /**
   * Create marker for a report
   */
  createReportMarker(report) {
    const statusInfo = STATUS_TYPES[report.status?.toUpperCase()] || STATUS_TYPES.NEW;
    const severityInfo = SEVERITY_LEVELS[report.severity?.toUpperCase()] || SEVERITY_LEVELS.MEDIUM;

    // Create custom marker icon based on status
    const markerIcon = L.divIcon({
      html: `
        <div class="report-marker report-marker-${report.status}" 
             style="background-color: ${severityInfo.color};">
          ${statusInfo.icon}
        </div>
      `,
      className: 'report-marker-container',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    const marker = L.marker(
      [report.location.latitude, report.location.longitude],
      { icon: markerIcon }
    );

    // Create popup content
    const popupContent = this.createPopupContent(report);
    marker.bindPopup(popupContent, {
      maxWidth: 300,
      className: 'report-popup'
    });

    return marker;
  }

  /**
   * Create popup content for report
   */
  createPopupContent(report) {
    const statusInfo = STATUS_TYPES[report.status?.toUpperCase()] || STATUS_TYPES.NEW;
    const severityInfo = SEVERITY_LEVELS[report.severity?.toUpperCase()] || SEVERITY_LEVELS.MEDIUM;
    
    const createdDate = report.createdAt?.toDate ? 
      report.createdAt.toDate().toLocaleDateString() : 
      'Unknown date';

    let photoHTML = '';
    if (report.photos && report.photos.length > 0) {
      const photo = report.photos[0];
      // Use base64 content directly
      photoHTML = `
        <div class="report-popup-photo">
          <img src="${photo.content}" alt="Report photo" 
               style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px;">
        </div>
      `;
    }

    return `
      <div class="report-popup-content">
        <div class="report-popup-header">
          <span class="report-status-badge" style="background-color: ${statusInfo.color};">
            ${statusInfo.icon} ${statusInfo.label}
          </span>
          <span class="report-severity-badge" style="color: ${severityInfo.color};">
            ${severityInfo.label}
          </span>
        </div>

        <h3 class="report-popup-title">${this.escapeHtml(report.title)}</h3>

        ${photoHTML}

        <p class="report-popup-description">${this.escapeHtml(report.description)}</p>

        <div class="report-popup-meta">
          <div>📍 ${this.escapeHtml(report.location.placeDescription || 'Location not specified')}</div>
          <div>📅 ${createdDate}</div>
          <div>👤 ${this.escapeHtml(report.userName || 'Anonymous')}</div>
          ${report.upvotes ? `<div>👍 ${report.upvotes} upvotes</div>` : ''}
        </div>

        <div class="report-popup-actions">
          <button onclick="window.accessReportModule?.viewReportDetails('${report.id}')" class="btn-view-details">
            View Details
          </button>
        </div>
      </div>

      <style>
        .report-marker-container { background: transparent !important; border: none !important; }
        .report-marker {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s;
        }
        .report-marker:hover { transform: scale(1.1); }
        
        .report-popup-content { padding: 4px; }
        .report-popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          gap: 8px;
        }
        .report-status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: white;
        }
        .report-severity-badge {
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
        }
        .report-popup-title {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 12px 0;
          color: #111827;
        }
        .report-popup-photo {
          margin-bottom: 12px;
        }
        .report-popup-description {
          font-size: 14px;
          color: #4b5563;
          margin: 0 0 12px 0;
          line-height: 1.5;
        }
        .report-popup-meta {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .report-popup-actions {
          display: flex;
          gap: 8px;
        }
        .btn-view-details {
          flex: 1;
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-view-details:hover {
          background: #2563eb;
        }
      </style>
    `;
  }

  /**
   * Clear all markers from map
   */
  clearMarkers() {
    if (this.markerClusterGroup) {
      this.markerClusterGroup.clearLayers();
    } else {
      this.reportMarkers.forEach(marker => {
        this.map.removeLayer(marker);
      });
    }
    this.reportMarkers = [];
  }

  /**
   * Filter reports on map
   */
  async filterReports(filters) {
    try {
      const reports = await accessReportController.getReports(filters);
      await this.displayReports(reports);
    } catch (error) {
      console.error('Error filtering reports:', error);
      toast.error('Failed to filter reports');
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}