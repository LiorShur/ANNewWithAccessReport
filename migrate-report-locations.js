/**
 * Migration Script - Add Location Data to Reports
 * Adds city and country fields to existing reports
 * 
 * Usage: Run once in browser console on reports.html page
 * 
 * File: migrate-report-locations.js
 */

import { accessReportController } from './src/controllers/access-report-controller.js';
import { reverseGeocodeWithCache } from './src/helpers/geocoding.js';
import toast from './src/helpers/toasts.js';

/**
 * Migrate all reports to include city and country
 */
export async function migrateReportLocations() {
  console.log('🔄 Starting location data migration...');
  
  try {
    // Get all reports
    const reports = await accessReportController.getReports({
      limit: 1000
    });
    
    console.log(`📊 Found ${reports.length} reports to migrate`);
    
    if (reports.length === 0) {
      console.log('✅ No reports to migrate');
      return { success: true, migrated: 0, failed: 0 };
    }
    
    // Filter reports that need migration
    const reportsToMigrate = reports.filter(report => {
      return report.location?.latitude && 
             report.location?.longitude && 
             (!report.location?.city || !report.location?.country);
    });
    
    console.log(`🎯 ${reportsToMigrate.length} reports need location data`);
    
    if (reportsToMigrate.length === 0) {
      console.log('✅ All reports already have location data');
      toast.success('All reports already have location data');
      return { success: true, migrated: 0, failed: 0 };
    }
    
    // Show progress toast
    toast.info(`Migrating ${reportsToMigrate.length} reports...`);
    
    let migrated = 0;
    let failed = 0;
    
    // Process reports with rate limiting
    for (let i = 0; i < reportsToMigrate.length; i++) {
      const report = reportsToMigrate[i];
      
      try {
        console.log(`\n🔄 [${i + 1}/${reportsToMigrate.length}] Migrating report: ${report.id}`);
        console.log(`   Title: ${report.title}`);
        console.log(`   Location: ${report.location.latitude}, ${report.location.longitude}`);
        
        // Get location details
        const locationDetails = await reverseGeocodeWithCache(
          report.location.latitude,
          report.location.longitude,
          true // Use cache
        );
        
        console.log(`   ✅ Geocoded: ${locationDetails.city}, ${locationDetails.country}`);
        
        // Update report
        await accessReportController.updateReport(report.id, {
          location: {
            ...report.location,
            city: locationDetails.city,
            country: locationDetails.country,
            state: locationDetails.state,
            displayName: locationDetails.displayName
          }
        });
        
        migrated++;
        console.log(`   ✅ Updated report ${report.id}`);
        
        // Update progress every 10 reports
        if ((i + 1) % 10 === 0) {
          toast.info(`Progress: ${i + 1}/${reportsToMigrate.length} reports migrated`);
        }
        
        // Rate limit: 1 request per second (Nominatim requirement)
        if (i < reportsToMigrate.length - 1) {
          await sleep(1100);
        }
        
      } catch (error) {
        console.error(`   ❌ Failed to migrate report ${report.id}:`, error);
        failed++;
      }
    }
    
    console.log('\n📊 Migration Complete:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    toast.success(`Migration complete! ${migrated} reports updated, ${failed} failed`);
    
    return {
      success: true,
      migrated,
      failed
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    toast.error('Migration failed: ' + error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Dry run - Check which reports need migration without updating
 */
export async function checkMigrationNeeded() {
  console.log('🔍 Checking which reports need migration...');
  
  try {
    const reports = await accessReportController.getReports({
      limit: 1000
    });
    
    const needMigration = reports.filter(report => {
      return report.location?.latitude && 
             report.location?.longitude && 
             (!report.location?.city || !report.location?.country);
    });
    
    const hasLocation = reports.filter(report => {
      return report.location?.latitude && 
             report.location?.longitude;
    });
    
    const complete = reports.filter(report => {
      return report.location?.city && report.location?.country;
    });
    
    console.log('\n📊 Migration Status:');
    console.log(`   Total reports: ${reports.length}`);
    console.log(`   Reports with coordinates: ${hasLocation.length}`);
    console.log(`   Reports with complete location: ${complete.length}`);
    console.log(`   Reports needing migration: ${needMigration.length}`);
    
    if (needMigration.length > 0) {
      console.log('\n📋 Reports needing migration:');
      needMigration.forEach((report, i) => {
        console.log(`   ${i + 1}. ${report.title} (${report.id})`);
        console.log(`      Location: ${report.location.latitude}, ${report.location.longitude}`);
      });
    }
    
    return {
      total: reports.length,
      needMigration: needMigration.length,
      complete: complete.length,
      reports: needMigration
    };
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    return null;
  }
}

/**
 * Migrate single report
 */
export async function migrateSingleReport(reportId) {
  console.log(`🔄 Migrating single report: ${reportId}`);
  
  try {
    const report = await accessReportController.getReport(reportId);
    
    if (!report.location?.latitude || !report.location?.longitude) {
      console.error('❌ Report has no coordinates');
      toast.error('Report has no coordinates to geocode');
      return { success: false };
    }
    
    if (report.location.city && report.location.country) {
      console.log('ℹ️ Report already has location data');
      toast.info('Report already has location data');
      return { success: true, alreadyComplete: true };
    }
    
    // Geocode
    const locationDetails = await reverseGeocodeWithCache(
      report.location.latitude,
      report.location.longitude,
      false // Don't use cache for single report
    );
    
    console.log(`✅ Geocoded: ${locationDetails.city}, ${locationDetails.country}`);
    
    // Update
    await accessReportController.updateReport(reportId, {
      location: {
        ...report.location,
        city: locationDetails.city,
        country: locationDetails.country,
        state: locationDetails.state,
        displayName: locationDetails.displayName
      }
    });
    
    console.log('✅ Report updated');
    toast.success(`Updated: ${locationDetails.city}, ${locationDetails.country}`);
    
    return {
      success: true,
      location: locationDetails
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    toast.error('Failed to migrate report');
    return { success: false, error: error.message };
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Make functions globally available for console use
window.migrateReportLocations = migrateReportLocations;
window.checkMigrationNeeded = checkMigrationNeeded;
window.migrateSingleReport = migrateSingleReport;

console.log('🔄 Migration script loaded');
console.log('💡 Run in console:');
console.log('   - window.checkMigrationNeeded() - Check status');
console.log('   - window.migrateReportLocations() - Run migration');
console.log('   - window.migrateSingleReport(id) - Migrate one report');

export default {
  migrateReportLocations,
  checkMigrationNeeded,
  migrateSingleReport
};