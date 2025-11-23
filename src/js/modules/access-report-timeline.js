/**
 * AccessReport Timeline Visualization
 * Displays reports over time with interactive timeline
 */

export class AccessReportTimeline {
  constructor(containerEl, reportController, mapVisualization) {
    this.container = containerEl;
    this.reportController = reportController;
    this.mapVisualization = mapVisualization;
    this.reports = [];
    this.currentTimeRange = null;
    this.timelineData = [];
    
    this.initializeTimeline();
  }
  
  /**
   * Initialize timeline component
   */
  async initializeTimeline() {
    try {
      // Create timeline HTML structure
      this.createTimelineHTML();
      
      // Load initial data
      await this.loadTimelineData();
      
      // Render timeline
      this.renderTimeline();
      
      console.log('AccessReport Timeline initialized');
    } catch (error) {
      console.error('Error initializing timeline:', error);
    }
  }
  
  /**
   * Create timeline HTML structure
   */
  createTimelineHTML() {
    this.container.innerHTML = `
      <div class="timeline-container">
        <div class="timeline-header">
          <h2>Accessibility Issues Timeline</h2>
          <div class="timeline-controls">
            <select id="timelineRange" class="form-select">
              <option value="7">Last 7 Days</option>
              <option value="30" selected>Last 30 Days</option>
              <option value="90">Last 3 Months</option>
              <option value="180">Last 6 Months</option>
              <option value="365">Last Year</option>
              <option value="all">All Time</option>
            </select>
            <button id="timelinePlayBtn" class="btn-icon" title="Play Timeline">
              ▶️
            </button>
            <button id="timelineResetBtn" class="btn-icon" title="Reset">
              🔄
            </button>
          </div>
        </div>
        
        <div class="timeline-stats">
          <div class="stat-card">
            <div class="stat-value" id="totalReports">0</div>
            <div class="stat-label">Total Reports</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="resolvedReports">0</div>
            <div class="stat-label">Resolved</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="avgResolutionTime">-</div>
            <div class="stat-label">Avg Resolution (days)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="activeReports">0</div>
            <div class="stat-label">Active Issues</div>
          </div>
        </div>
        
        <div class="timeline-slider-container">
          <div class="timeline-slider">
            <input type="range" id="timelineSlider" min="0" max="100" value="100" class="slider">
            <div class="timeline-labels">
              <span id="startDate"></span>
              <span id="currentDate"></span>
              <span id="endDate"></span>
            </div>
          </div>
        </div>
        
        <div class="timeline-visualization">
          <canvas id="timelineChart" width="800" height="200"></canvas>
        </div>
        
        <div class="timeline-events">
          <h3>Recent Reports</h3>
          <div id="eventsList" class="events-list"></div>
        </div>
      </div>
    `;
    
    // Attach event listeners
    this.attachEventListeners();
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Time range selector
    document.getElementById('timelineRange')?.addEventListener('change', (e) => {
      this.currentTimeRange = e.target.value;
      this.loadTimelineData();
    });
    
    // Timeline slider
    document.getElementById('timelineSlider')?.addEventListener('input', (e) => {
      this.handleSliderChange(e.target.value);
    });
    
    // Play button
    document.getElementById('timelinePlayBtn')?.addEventListener('click', () => {
      this.playTimeline();
    });
    
    // Reset button
    document.getElementById('timelineResetBtn')?.addEventListener('click', () => {
      this.resetTimeline();
    });
  }
  
  /**
   * Load timeline data
   */
  async loadTimelineData() {
    try {
      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      
      if (this.currentTimeRange && this.currentTimeRange !== 'all') {
        const days = parseInt(this.currentTimeRange);
        startDate.setDate(endDate.getDate() - days);
      } else {
        startDate = new Date(2020, 0, 1); // Start from a fixed date for "all time"
      }
      
      // Fetch reports (simplified - in real implementation, filter by date)
      this.reports = await this.reportController.getReportsInBounds(null, {});
      
      // Filter by date range
      this.reports = this.reports.filter(report => {
        const reportDate = report.createdAt?.toDate() || new Date();
        return reportDate >= startDate && reportDate <= endDate;
      });
      
      // Sort by date
      this.reports.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateA - dateB;
      });
      
      // Generate timeline data
      this.generateTimelineData(startDate, endDate);
      
      // Update visualization
      this.renderTimeline();
      this.updateStatistics();
      
    } catch (error) {
      console.error('Error loading timeline data:', error);
    }
  }
  
  /**
   * Generate timeline data grouped by day/week/month
   */
  generateTimelineData(startDate, endDate) {
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const grouping = daysDiff > 90 ? 'month' : daysDiff > 30 ? 'week' : 'day';
    
    this.timelineData = [];
    const dataMap = new Map();
    
    // Group reports
    this.reports.forEach(report => {
      const reportDate = report.createdAt?.toDate() || new Date();
      const key = this.getTimeKey(reportDate, grouping);
      
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          date: reportDate,
          new: 0,
          resolved: 0,
          total: 0
        });
      }
      
      const data = dataMap.get(key);
      data.total++;
      
      if (report.status === 'new' || report.status === 'acknowledged') {
        data.new++;
      } else if (report.status === 'resolved') {
        data.resolved++;
      }
    });
    
    // Convert to array
    this.timelineData = Array.from(dataMap.values()).sort((a, b) => a.date - b.date);
    
    // Update date labels
    document.getElementById('startDate').textContent = startDate.toLocaleDateString();
    document.getElementById('endDate').textContent = endDate.toLocaleDateString();
    document.getElementById('currentDate').textContent = endDate.toLocaleDateString();
  }
  
  /**
   * Get time key for grouping
   */
  getTimeKey(date, grouping) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    switch (grouping) {
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
      case 'month':
        return `${year}-${month}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }
  
  /**
   * Render timeline visualization
   */
  renderTimeline() {
    const canvas = document.getElementById('timelineChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (this.timelineData.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, height / 2);
      return;
    }
    
    // Calculate scales
    const maxValue = Math.max(...this.timelineData.map(d => d.total));
    const barWidth = width / this.timelineData.length;
    const padding = 40;
    
    // Draw bars
    this.timelineData.forEach((data, index) => {
      const x = index * barWidth;
      const barHeight = ((data.total / maxValue) * (height - padding));
      const y = height - barHeight - 20;
      
      // Draw new reports (orange)
      const newHeight = ((data.new / maxValue) * (height - padding));
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x + 2, y, barWidth - 4, newHeight);
      
      // Draw resolved reports (green)
      const resolvedHeight = ((data.resolved / maxValue) * (height - padding));
      ctx.fillStyle = '#10b981';
      ctx.fillRect(x + 2, y + newHeight, barWidth - 4, resolvedHeight);
    });
    
    // Draw axes
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 20);
    ctx.lineTo(width, height - 20);
    ctx.stroke();
    
    // Draw legend
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(10, 10, 20, 10);
    ctx.fillStyle = '#374151';
    ctx.fillText('Active', 35, 20);
    
    ctx.fillStyle = '#10b981';
    ctx.fillRect(100, 10, 20, 10);
    ctx.fillStyle = '#374151';
    ctx.fillText('Resolved', 125, 20);
    
    // Update events list
    this.updateEventsList();
  }
  
  /**
   * Update events list
   */
  updateEventsList() {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;
    
    // Show last 10 reports
    const recentReports = this.reports.slice(-10).reverse();
    
    eventsList.innerHTML = recentReports.map(report => `
      <div class="event-item" data-report-id="${report.id}">
        <div class="event-icon">${this.getIssueIcon(report.issueType)}</div>
        <div class="event-content">
          <div class="event-title">${report.title}</div>
          <div class="event-meta">
            <span class="event-date">${this.formatDate(report.createdAt?.toDate())}</span>
            <span class="event-status status-${report.status}">${report.status}</span>
          </div>
        </div>
        <button class="event-action" onclick="window.showReportOnMap('${report.id}')">
          📍 Show on Map
        </button>
      </div>
    `).join('');
  }
  
  /**
   * Update statistics
   */
  async updateStatistics() {
    const stats = await this.reportController.getStatistics();
    
    document.getElementById('totalReports').textContent = stats.total;
    document.getElementById('resolvedReports').textContent = stats.byStatus['resolved'] || 0;
    document.getElementById('avgResolutionTime').textContent = stats.avgResolutionTime > 0 ? stats.avgResolutionTime : '-';
    
    const active = (stats.byStatus['new'] || 0) + 
                   (stats.byStatus['acknowledged'] || 0) + 
                   (stats.byStatus['in_progress'] || 0);
    document.getElementById('activeReports').textContent = active;
  }
  
  /**
   * Handle slider change
   */
  handleSliderChange(value) {
    const percentage = value / 100;
    const index = Math.floor(percentage * (this.reports.length - 1));
    
    if (index >= 0 && index < this.reports.length) {
      const report = this.reports[index];
      const date = report.createdAt?.toDate() || new Date();
      document.getElementById('currentDate').textContent = date.toLocaleDateString();
      
      // Filter map to show only reports up to this point
      const filteredReports = this.reports.slice(0, index + 1);
      if (this.mapVisualization) {
        this.mapVisualization.displayReports(filteredReports);
      }
    }
  }
  
  /**
   * Play timeline animation
   */
  playTimeline() {
    const slider = document.getElementById('timelineSlider');
    const playBtn = document.getElementById('timelinePlayBtn');
    
    if (this.isPlaying) {
      this.stopTimeline();
      return;
    }
    
    this.isPlaying = true;
    playBtn.textContent = '⏸️';
    
    let currentValue = 0;
    this.playInterval = setInterval(() => {
      currentValue += 1;
      if (currentValue > 100) {
        this.stopTimeline();
        return;
      }
      
      slider.value = currentValue;
      this.handleSliderChange(currentValue);
    }, 200);
  }
  
  /**
   * Stop timeline animation
   */
  stopTimeline() {
    this.isPlaying = false;
    if (this.playInterval) {
      clearInterval(this.playInterval);
    }
    document.getElementById('timelinePlayBtn').textContent = '▶️';
  }
  
  /**
   * Reset timeline
   */
  resetTimeline() {
    this.stopTimeline();
    const slider = document.getElementById('timelineSlider');
    slider.value = 100;
    this.handleSliderChange(100);
  }
  
  /**
   * Format date
   */
  formatDate(date) {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
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
}

// Make function available globally
window.showReportOnMap = function(reportId) {
  const event = new CustomEvent('zoom-to-report', {
    detail: { reportId }
  });
  window.dispatchEvent(event);
};
