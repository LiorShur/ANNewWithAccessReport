/**
 * AccessReport Timeline Controller
 * Displays reports in a chronological timeline view
 * 
 * File: src/controllers/access-report-timeline.js
 */

import { accessReportController, STATUS_TYPES, SEVERITY_LEVELS, ISSUE_TYPES } from './access-report-controller.js';
import toast from '../helpers/toasts.js';

export class AccessReportTimeline {
  constructor(container) {
    this.container = container;
    this.reports = [];
    this.filters = {
      status: 'all',
      severity: 'all',
      issueType: 'all'
    };
  }

  /**
   * Initialize timeline
   */
  async initialize() {
    if (!this.container) {
      console.warn('Timeline container not found');
      return;
    }

    this.renderFilterBar();
    await this.loadReports();
    
    console.log('✅ AccessReport Timeline initialized');
  }

  /**
   * Render filter bar
   */
  renderFilterBar() {
    const filterBar = document.createElement('div');
    filterBar.className = 'timeline-filter-bar';
    filterBar.innerHTML = `
      <div class="filter-controls">
        <select id="statusFilter" class="filter-select">
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <select id="severityFilter" class="filter-select">
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select id="issueTypeFilter" class="filter-select">
          <option value="all">All Types</option>
          ${Object.values(ISSUE_TYPES).map(type => 
            `<option value="${type.id}">${type.icon} ${type.label}</option>`
          ).join('')}
        </select>

        <button id="refreshReports" class="btn-refresh">
          🔄 Refresh
        </button>
      </div>
    `;

    this.container.appendChild(filterBar);

    // Add event listeners
    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.loadReports();
    });

    document.getElementById('severityFilter')?.addEventListener('change', (e) => {
      this.filters.severity = e.target.value;
      this.loadReports();
    });

    document.getElementById('issueTypeFilter')?.addEventListener('change', (e) => {
      this.filters.issueType = e.target.value;
      this.loadReports();
    });

    document.getElementById('refreshReports')?.addEventListener('click', () => {
      this.loadReports();
    });
  }

  /**
   * Load reports from Firestore
   */
  async loadReports() {
    try {
      const filters = {
        limit: 50,
        orderBy: 'createdAt',
        orderDirection: 'desc'
      };

      if (this.filters.status !== 'all') {
        filters.status = this.filters.status;
      }
      if (this.filters.severity !== 'all') {
        filters.severity = this.filters.severity;
      }
      if (this.filters.issueType !== 'all') {
        filters.issueType = this.filters.issueType;
      }

      this.reports = await accessReportController.getReports(filters);
      this.renderTimeline();

    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    }
  }

  /**
   * Render timeline
   */
  renderTimeline() {
    // Remove old timeline
    const oldTimeline = this.container.querySelector('.timeline-content');
    if (oldTimeline) {
      oldTimeline.remove();
    }

    const timelineContent = document.createElement('div');
    timelineContent.className = 'timeline-content';

    if (this.reports.length === 0) {
      timelineContent.innerHTML = `
        <div class="timeline-empty">
          <div class="empty-icon">📭</div>
          <div class="empty-message">No reports found</div>
          <div class="empty-hint">Try adjusting your filters or be the first to report an issue</div>
        </div>
      `;
    } else {
      this.reports.forEach(report => {
        const reportCard = this.createReportCard(report);
        timelineContent.appendChild(reportCard);
      });
    }

    this.container.appendChild(timelineContent);
  }

  /**
   * Create report card element
   */
  createReportCard(report) {
    const card = document.createElement('div');
    card.className = 'timeline-report-card';
    card.setAttribute('data-report-id', report.id);

    const statusInfo = STATUS_TYPES[report.status?.toUpperCase()] || STATUS_TYPES.NEW;
    const severityInfo = SEVERITY_LEVELS[report.severity?.toUpperCase()] || SEVERITY_LEVELS.MEDIUM;
    const issueTypeInfo = Object.values(ISSUE_TYPES).find(t => t.id === report.issueType) || ISSUE_TYPES.OTHER;

    const createdDate = report.createdAt?.toDate ? 
      report.createdAt.toDate().toLocaleDateString() : 
      'Unknown date';

    let photoHTML = '';
    if (report.photos && report.photos.length > 0) {
      const photo = report.photos[0];
      // Use base64 content directly
      photoHTML = `
        <div class="report-card-photo">
          <img src="${photo.content}" alt="Report photo">
        </div>
      `;
    }

    card.innerHTML = `
      <div class="report-card-header">
        <div class="report-card-badges">
          <span class="badge badge-status" style="background-color: ${statusInfo.color};">
            ${statusInfo.icon} ${statusInfo.label}
          </span>
          <span class="badge badge-severity" style="border-color: ${severityInfo.color}; color: ${severityInfo.color};">
            ${severityInfo.label}
          </span>
        </div>
        <div class="report-card-date">${createdDate}</div>
      </div>

      <div class="report-card-body">
        <div class="report-card-icon">${issueTypeInfo.icon}</div>
        <div class="report-card-content">
          <h3 class="report-card-title">${this.escapeHtml(report.title)}</h3>
          <p class="report-card-description">${this.escapeHtml(report.description)}</p>
          
          ${photoHTML}

          <div class="report-card-meta">
            <span>📍 ${this.escapeHtml(report.location?.placeDescription || 'Location')}</span>
            <span>👤 ${this.escapeHtml(report.userName || 'Anonymous')}</span>
            ${report.upvotes ? `<span>👍 ${report.upvotes}</span>` : ''}
            ${report.commentCount ? `<span>💬 ${report.commentCount}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="report-card-actions">
        <button class="btn-card-action btn-view" data-action="view" data-report-id="${report.id}">
          View Details
        </button>
        <button class="btn-card-action btn-upvote" data-action="upvote" data-report-id="${report.id}">
          👍 Upvote
        </button>
      </div>
    `;

    // Add event listeners
    card.querySelector('[data-action="view"]')?.addEventListener('click', () => {
      // Call the main module's viewReportDetails method
      if (window.accessReportModule) {
        window.accessReportModule.viewReportDetails(report.id);
      } else {
        console.error('AccessReport module not found');
        toast.error('Unable to view details');
      }
    });

    card.querySelector('[data-action="upvote"]')?.addEventListener('click', async () => {
      // Use main module's upvote method for consistency
      if (window.accessReportModule) {
        await window.accessReportModule.upvoteReport(report.id);
      } else {
        await this.upvoteReport(report.id);
      }
    });

    return card;
  }

  /**
   * View report details (delegates to main module)
   */
  async viewReportDetails(reportId) {
    if (window.accessReportModule) {
      await window.accessReportModule.viewReportDetails(reportId);
    } else {
      console.error('AccessReport module not found');
      toast.error('Unable to view details');
    }
  }

  /**
   * Upvote a report
   */
  async upvoteReport(reportId) {
    try {
      await accessReportController.upvoteReport(reportId);
      await this.loadReports(); // Refresh to show updated count
    } catch (error) {
      console.error('Error upvoting:', error);
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