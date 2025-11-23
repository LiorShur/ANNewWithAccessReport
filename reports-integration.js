/**
 * Reports Page Integration
 * Connects reports page with existing AccessReportModule
 * 
 * File: reports-integration.js
 */

import { AccessReportModule } from './src/controllers/access-report-main.js';
import toast from './src/helpers/toasts.js';

/**
 * Initialize AccessReport module on reports page
 * This integrates with the existing modal and detail view system
 */
export async function initializeReportsPageIntegration(map) {
  console.log('🔗 Initializing reports page integration...');
  
  try {
    // Create module instance
    const accessReportModule = new AccessReportModule();
    
    // Initialize with reports page configuration
    const result = await accessReportModule.initialize({
      map: map,
      enableTimeline: false, // Timeline handled by reports-page.js
      enableFilters: false,  // Filters handled by reports-page.js
      autoLoadReports: false // Loading handled by reports-page.js
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // Make globally available
    window.accessReportModule = accessReportModule;
    
    console.log('✅ Reports page integration complete');
    return accessReportModule;
    
  } catch (error) {
    console.error('❌ Failed to initialize reports page integration:', error);
    toast.error('Failed to initialize reporting system');
    return null;
  }
}

/**
 * View report details using existing modal system
 * This function is called from reports-page.js
 */
export async function viewReportDetails(reportId) {
  const module = window.accessReportModule;
  
  if (!module) {
    console.error('❌ AccessReport module not initialized');
    toast.error('Reporting system not ready');
    return;
  }
  
  try {
    // Use existing viewReportDetails method with all photo features
    await module.viewReportDetails(reportId);
    
  } catch (error) {
    console.error('❌ Error viewing report details:', error);
    toast.error('Failed to load report details');
  }
}

/**
 * Open report creation modal
 * Uses existing UI controller
 */
export async function openReportModal(map, initialLocation = null) {
  const module = window.accessReportModule;
  
  if (!module || !module.uiController) {
    console.error('❌ UI controller not initialized');
    toast.error('Reporting system not ready');
    return;
  }
  
  try {
    // Use existing showReportModal method
    await module.uiController.showReportModal(initialLocation);
    
  } catch (error) {
    console.error('❌ Error opening report modal:', error);
    toast.error('Failed to open report form');
  }
}

/**
 * Upvote a report and refresh displays
 */
export async function upvoteReport(reportId, refreshCallback) {
  const module = window.accessReportModule;
  
  if (!module) {
    console.error('❌ AccessReport module not initialized');
    return;
  }
  
  try {
    await module.upvoteReport(reportId);
    
    // Call refresh callback to update displays
    if (refreshCallback) {
      await refreshCallback();
    }
    
  } catch (error) {
    console.error('❌ Error upvoting report:', error);
    toast.error('Failed to upvote report');
  }
}

console.log('🔗 Reports page integration module loaded');
