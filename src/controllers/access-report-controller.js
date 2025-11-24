/**
 * AccessReport Controller - BASE64 VERSION
 * Stores photos as base64 in Firestore (no Firebase Storage needed)
 * Matches Access Nature's photo storage method
 * 
 * File: src/controllers/access-report-controller.js
 */

import { auth, db } from '../firebase-setup.js';
import { 
  collection, 
  addDoc, 
  getDoc,
  getDocs,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  increment,
  arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';

import toast from '../helpers/toasts.js';
import modal from '../helpers/modals.js';

// Issue type definitions
export const ISSUE_TYPES = {
  // Sidewalk & Pathways
  CURB_RAMP: { id: 'curb_ramp', label: 'Broken/Missing Curb Ramp', category: 'sidewalk', icon: '🦽' },
  SIDEWALK_BLOCKED: { id: 'sidewalk_blocked', label: 'Blocked Sidewalk/Path', category: 'sidewalk', icon: '🚧' },
  DAMAGED_SIDEWALK: { id: 'damaged_sidewalk', label: 'Damaged Sidewalk Surface', category: 'sidewalk', icon: '⚠️' },
  TACTILE_PAVING: { id: 'tactile_paving', label: 'Missing Tactile Paving', category: 'sidewalk', icon: '👣' },
  
  // Buildings & Entrances
  INACCESSIBLE_ENTRANCE: { id: 'inaccessible_entrance', label: 'Inaccessible Entrance', category: 'building', icon: '🚪' },
  BROKEN_ELEVATOR: { id: 'broken_elevator', label: 'Broken Elevator/Lift', category: 'building', icon: '🛗' },
  HEAVY_DOORS: { id: 'heavy_doors', label: 'Heavy/Non-Automatic Doors', category: 'building', icon: '🚪' },
  STAIRS_ONLY: { id: 'stairs_only', label: 'Stairs-Only Access', category: 'building', icon: '🪜' },
  
  // Parking
  PARKING_BLOCKED: { id: 'parking_blocked', label: 'Accessible Parking Blocked', category: 'parking', icon: '🅿️' },
  NO_PARKING: { id: 'no_parking', label: 'No Accessible Parking', category: 'parking', icon: '🅿️' },
  DAMAGED_PARKING: { id: 'damaged_parking', label: 'Damaged Parking Space', category: 'parking', icon: '⚠️' },
  
  // Facilities
  INACCESSIBLE_RESTROOM: { id: 'inaccessible_restroom', label: 'Inaccessible Restroom', category: 'facility', icon: '🚻' },
  INACCESSIBLE_FOUNTAIN: { id: 'inaccessible_fountain', label: 'Inaccessible Water Fountain', category: 'facility', icon: '🚰' },
  NO_SEATING: { id: 'no_seating', label: 'No Accessible Seating', category: 'facility', icon: '💺' },
  
  // Trails & Outdoor
  TRAIL_OBSTACLE: { id: 'trail_obstacle', label: 'Trail Obstacle/Blockage', category: 'trail', icon: '🌳' },
  TRAIL_EROSION: { id: 'trail_erosion', label: 'Trail Surface Erosion', category: 'trail', icon: '⛰️' },
  OVERGROWN: { id: 'overgrown', label: 'Overgrown Vegetation', category: 'trail', icon: '🌿' },
  MISSING_SIGN: { id: 'missing_sign', label: 'Missing/Damaged Trail Sign', category: 'trail', icon: '🪧' },
  
  // Transit
  BUS_STOP: { id: 'bus_stop', label: 'Inaccessible Bus Stop', category: 'transit', icon: '🚌' },
  TRANSIT_STATION: { id: 'transit_station', label: 'Transit Station Issues', category: 'transit', icon: '🚉' },
  
  // Other
  OTHER: { id: 'other', label: 'Other Accessibility Issue', category: 'other', icon: '📍' }
};

// Severity levels
export const SEVERITY_LEVELS = {
  CRITICAL: { id: 'critical', label: 'Critical', color: '#dc2626', description: 'Completely blocks access' },
  HIGH: { id: 'high', label: 'High', color: '#ea580c', description: 'Major accessibility barrier' },
  MEDIUM: { id: 'medium', label: 'Medium', color: '#f59e0b', description: 'Moderate difficulty' },
  LOW: { id: 'low', label: 'Low', color: '#84cc16', description: 'Minor inconvenience' }
};

// Status types
export const STATUS_TYPES = {
  NEW: { id: 'new', label: 'New', color: '#3b82f6', icon: '🆕' },
  ACKNOWLEDGED: { id: 'acknowledged', label: 'Acknowledged', color: '#8b5cf6', icon: '👀' },
  IN_PROGRESS: { id: 'in_progress', label: 'In Progress', color: '#f59e0b', icon: '🔧' },
  RESOLVED: { id: 'resolved', label: 'Resolved', color: '#10b981', icon: '✅' },
  WONT_FIX: { id: 'wont_fix', label: "Won't Fix", color: '#6b7280', icon: '🚫' },
  CLOSED: { id: 'closed', label: 'Closed', color: '#374151', icon: '🔒' }
};

class AccessReportController {
  constructor() {
    this.reportsCollection = 'accessibilityReports';
  }

  /**
   * Create a new accessibility report with base64 photos
   */
  async createReport(reportData, photoFiles = []) {
    try {
      console.log('📝 Creating accessibility report...');
      
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Please sign in to submit reports');
      }

      // Compress and convert photos to base64 (like media.js)
      const photos = await this.processPhotos(photoFiles);
      
      // Prepare report document
      const report = {
        userId: user.uid,
        userName: user.displayName || 'Anonymous User',
        userEmail: user.email,
        isAnonymous: user.isAnonymous,
        
        location: {
          latitude: reportData.latitude,
          longitude: reportData.longitude,
          address: reportData.address || '',
          placeDescription: reportData.placeDescription || ''
        },
        
        issueType: reportData.issueType,
        issueCategory: this.getIssueCategory(reportData.issueType),
        title: reportData.title,
        description: reportData.description,
        severity: reportData.severity,
        
        photos: photos, // Base64 photos array
        
        status: 'new',
        statusHistory: [{
          status: 'new',
          timestamp: Date.now(),
          updatedBy: user.uid,
          note: 'Initial report submitted'
        }],
        
        upvotes: 0,
        upvotedBy: [],
        commentCount: 0,
        viewCount: 0,
        
        linkedTrailId: reportData.linkedTrailId || null,
        jurisdiction: reportData.jurisdiction || null,
        assignedTo: null,
        resolution: null,
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        acknowledgedAt: null,
        resolvedAt: null,
        
        tags: reportData.tags || [],
        isPublic: reportData.isPublic !== false,
        isFlagged: false
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, this.reportsCollection), report);
      
      console.log('✅ Report created with ID:', docRef.id);
      toast.success('Report submitted successfully!');
      
      return docRef.id;

    } catch (error) {
      console.error('❌ Error creating report:', error);
      toast.error('Failed to create report: ' + error.message);
      throw error;
    }
  }

  /**
   * Process and compress photos to base64 (like media.js compressImage)
   */
  async processPhotos(photoFiles) {
    if (!photoFiles || photoFiles.length === 0) {
      return [];
    }

    console.log(`📸 Processing ${photoFiles.length} photos...`);
    const photos = [];

    for (let i = 0; i < Math.min(photoFiles.length, 3); i++) {
      const file = photoFiles[i];
      
      try {
        // Compress to base64 (same as media.js)
        const base64Data = await this.compressImageToBase64(file, 0.7);
        
        photos.push({
          content: base64Data,
          originalName: file.name,
          originalSize: file.size,
          compressedSize: base64Data.length,
          caption: '',
          uploadedAt: Date.now()
        });

        console.log(`✅ Processed photo ${i + 1}/${photoFiles.length}`);
        
      } catch (error) {
        console.error(`❌ Failed to process photo ${i + 1}:`, error);
        toast.warning(`Failed to add photo ${i + 1}`);
      }
    }

    return photos;
  }

  /**
   * Compress image to base64 (same method as media.js)
   */
  async compressImageToBase64(file, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Max width 1200px (same as media.js)
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        try {
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        } catch (error) {
          reject(new Error('Image compression failed'));
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Get issue category from type
   */
  getIssueCategory(issueTypeId) {
    const issueType = Object.values(ISSUE_TYPES).find(t => t.id === issueTypeId);
    return issueType ? issueType.category : 'other';
  }

  /**
   * Get a single report
   */
  async getReport(reportId) {
    try {
      const docRef = doc(db, this.reportsCollection, reportId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Report not found');
      }
    } catch (error) {
      console.error('Error getting report:', error);
      throw error;
    }
  }

  /**
   * Get multiple reports with filters
   */
  async getReports(filters = {}) {
    try {
      console.log('📊 Fetching reports with filters:', filters);
      
      let q = collection(db, this.reportsCollection);
      const constraints = [];

      // Apply filters
      if (filters.status) {
        constraints.push(where('status', '==', filters.status));
      }
      if (filters.severity) {
        constraints.push(where('severity', '==', filters.severity));
      }
      if (filters.issueType) {
        constraints.push(where('issueType', '==', filters.issueType));
      }
      if (filters.userId) {
        constraints.push(where('userId', '==', filters.userId));
      }
      if (filters.isPublic !== undefined) {
        constraints.push(where('isPublic', '==', filters.isPublic));
      }

      // Order by
      const orderByField = filters.orderBy || 'createdAt';
      const orderDirection = filters.orderDirection || 'desc';
      constraints.push(orderBy(orderByField, orderDirection));

      // Limit
      if (filters.limit) {
        constraints.push(limit(filters.limit));
      }

      q = query(q, ...constraints);
      const querySnapshot = await getDocs(q);

      const reports = [];
      querySnapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });

      console.log(`📊 Retrieved ${reports.length} reports`);
      return reports;

    } catch (error) {
      console.error('Error getting reports:', error);
      throw error;
    }
  }

  /**
   * Update report status
   */
  async updateReportStatus(reportId, newStatus, note = '') {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Please sign in');
      }

      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({
          status: newStatus,
          timestamp: Date.now(),
          updatedBy: user.uid,
          note: note || `Status updated to ${newStatus}`
        })
      };

      // Set timestamp for specific statuses
      if (newStatus === 'acknowledged' && !updateData.acknowledgedAt) {
        updateData.acknowledgedAt = serverTimestamp();
      } else if (newStatus === 'resolved') {
        updateData.resolvedAt = serverTimestamp();
      }

      await updateDoc(doc(db, this.reportsCollection, reportId), updateData);
      
      toast.success('Status updated successfully');
      return true;

    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      throw error;
    }
  }

  /**
   * Upvote a report
   */
  async upvoteReport(reportId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.warning('Please sign in to upvote');
        return;
      }

      const reportRef = doc(db, this.reportsCollection, reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }

      const report = reportDoc.data();
      const upvotedBy = report.upvotedBy || [];

      if (upvotedBy.includes(user.uid)) {
        toast.info('You already upvoted this report');
        return;
      }

      await updateDoc(reportRef, {
        upvotes: increment(1),
        upvotedBy: arrayUnion(user.uid),
        updatedAt: serverTimestamp()
      });

      toast.success('Upvoted!');

    } catch (error) {
      console.error('Error upvoting:', error);
      toast.error('Failed to upvote');
    }
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Please sign in');
      }

      await deleteDoc(doc(db, this.reportsCollection, reportId));
      
      toast.success('Report deleted');
      return true;

    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    try {
      const allReports = await this.getReports({ limit: 1000 });

      const stats = {
        total: allReports.length,
        byStatus: {},
        bySeverity: {},
        byCategory: {}
      };

      // Count by status
      Object.values(STATUS_TYPES).forEach(status => {
        stats.byStatus[status.id] = allReports.filter(r => r.status === status.id).length;
      });

      // Count by severity
      Object.values(SEVERITY_LEVELS).forEach(severity => {
        stats.bySeverity[severity.id] = allReports.filter(r => r.severity === severity.id).length;
      });

      // Count by category
      allReports.forEach(report => {
        const category = report.issueCategory || 'other';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      });

      return stats;

    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }
}

// Create singleton instance
export const accessReportController = new AccessReportController();