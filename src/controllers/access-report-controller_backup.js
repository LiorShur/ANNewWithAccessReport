/**
 * AccessReport Controller
 * Manages accessibility issue reporting, tracking, and updates
 * Integrates with Firebase Firestore and Storage
 * 
 * File: src/controllers/access-report-controller.js
 */

import { auth, db, storage } from '../firebase-setup.js';
import { 
  collection, 
  addDoc, 
  updateDoc,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js';

// Import UI helpers
import toast from '../helpers/toasts.js';
import modal from '../helpers/modals.js';

// Constants
export const ISSUE_TYPES = {
  CURB_RAMP: { id: 'curb_ramp', label: 'Broken/Missing Curb Ramp', category: 'sidewalk', icon: '♿' },
  SIDEWALK_BLOCKED: { id: 'sidewalk_blocked', label: 'Blocked Sidewalk/Path', category: 'sidewalk', icon: '🚧' },
  SIDEWALK_DAMAGE: { id: 'sidewalk_damage', label: 'Damaged Sidewalk Surface', category: 'sidewalk', icon: '⚠️' },
  TACTILE_PAVING: { id: 'tactile_paving', label: 'Missing Tactile Paving', category: 'sidewalk', icon: '👣' },
  
  ENTRANCE_INACCESSIBLE: { id: 'entrance_inaccessible', label: 'Inaccessible Entrance', category: 'building', icon: '🚪' },
  ELEVATOR_BROKEN: { id: 'elevator_broken', label: 'Broken Elevator/Lift', category: 'building', icon: '🛗' },
  DOOR_ISSUE: { id: 'door_issue', label: 'Heavy/Non-Automatic Door', category: 'building', icon: '🚪' },
  STAIRS_ONLY: { id: 'stairs_only', label: 'Stairs-Only Access', category: 'building', icon: '🪜' },
  
  PARKING_BLOCKED: { id: 'parking_blocked', label: 'Accessible Parking Blocked', category: 'parking', icon: '🅿️' },
  PARKING_MISSING: { id: 'parking_missing', label: 'No Accessible Parking', category: 'parking', icon: '🅿️' },
  PARKING_DAMAGED: { id: 'parking_damaged', label: 'Damaged Parking Space', category: 'parking', icon: '⚠️' },
  
  SIGNAGE_MISSING: { id: 'signage_missing', label: 'Missing Accessibility Signage', category: 'signage', icon: '🪧' },
  SIGNAGE_UNCLEAR: { id: 'signage_unclear', label: 'Unclear Signage', category: 'signage', icon: '❓' },
  
  RESTROOM_INACCESSIBLE: { id: 'restroom_inaccessible', label: 'Inaccessible Restroom', category: 'facilities', icon: '🚻' },
  WATER_FOUNTAIN: { id: 'water_fountain', label: 'Inaccessible Water Fountain', category: 'facilities', icon: '🚰' },
  SEATING_ISSUE: { id: 'seating_issue', label: 'No Accessible Seating', category: 'facilities', icon: '💺' },
  
  TRAIL_OBSTACLE: { id: 'trail_obstacle', label: 'Trail Obstacle/Blockage', category: 'trail', icon: '🌳' },
  TRAIL_EROSION: { id: 'trail_erosion', label: 'Trail Surface Erosion', category: 'trail', icon: '⛰️' },
  TRAIL_VEGETATION: { id: 'trail_vegetation', label: 'Overgrown Vegetation', category: 'trail', icon: '🌿' },
  TRAIL_SIGNAGE: { id: 'trail_signage', label: 'Missing/Damaged Trail Sign', category: 'trail', icon: '🪧' },
  
  BUS_STOP: { id: 'bus_stop', label: 'Inaccessible Bus Stop', category: 'transit', icon: '🚌' },
  TRANSIT_STATION: { id: 'transit_station', label: 'Transit Station Issue', category: 'transit', icon: '🚉' },
  
  OTHER: { id: 'other', label: 'Other Accessibility Issue', category: 'other', icon: '📍' }
};

export const SEVERITY_LEVELS = {
  CRITICAL: { id: 'critical', label: 'Critical', color: '#d32f2f', description: 'Immediate safety hazard' },
  HIGH: { id: 'high', label: 'High', color: '#f57c00', description: 'Severely limits accessibility' },
  MEDIUM: { id: 'medium', label: 'Medium', color: '#fbc02d', description: 'Moderate accessibility barrier' },
  LOW: { id: 'low', label: 'Low', color: '#388e3c', description: 'Minor inconvenience' }
};

export const STATUS_TYPES = {
  NEW: { id: 'new', label: 'New', color: '#1976d2', icon: '🆕' },
  ACKNOWLEDGED: { id: 'acknowledged', label: 'Acknowledged', color: '#7b1fa2', icon: '👁️' },
  IN_PROGRESS: { id: 'in_progress', label: 'In Progress', color: '#f57c00', icon: '🔧' },
  RESOLVED: { id: 'resolved', label: 'Resolved', color: '#388e3c', icon: '✅' },
  CLOSED: { id: 'closed', label: 'Closed', color: '#616161', icon: '🔒' },
  WONT_FIX: { id: 'wont_fix', label: "Won't Fix", color: '#d32f2f', icon: '❌' }
};

class AccessReportController {
  constructor() {
    this.reportsCollection = 'accessibilityReports';
    this.notificationsCollection = 'reportNotifications';
    this.statsCollection = 'reportStats';
  }

  /**
   * Create a new accessibility report
   */
  async createReport(reportData, photoFiles = []) {
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error('Please sign in to submit reports');
        throw new Error('User must be authenticated to create a report');
      }

      console.log('📝 Creating accessibility report...');

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
        
        photos: [],
        
        status: 'new',
        statusHistory: [{
          status: 'new',
          timestamp: Date.now(), // Use Date.now() instead of serverTimestamp() in arrays
          updatedBy: user.uid,
          note: 'Initial report submitted'
        }],
        
        upvotes: 0,
        upvotedBy: [],
        commentCount: 0,
        viewCount: 0,
        
        jurisdiction: reportData.jurisdiction || 'Unassigned',
        assignedTo: null,
        
        linkedTrailId: reportData.linkedTrailId || null,
        trailName: reportData.trailName || null,
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        acknowledgedAt: null,
        resolvedAt: null,
        
        resolution: null,
        
        tags: reportData.tags || [],
        isPublic: reportData.isPublic !== false,
        isFlagged: false,
        flagReason: null
      };

      // Add report to Firestore
      const reportsRef = collection(db, this.reportsCollection);
      const docRef = await addDoc(reportsRef, report);
      const reportId = docRef.id;

      console.log('✅ Report created with ID:', reportId);

      // Upload photos if provided
      if (photoFiles.length > 0) {
        toast.info('Uploading photos...');
        const uploadedPhotos = await this.uploadReportPhotos(reportId, photoFiles);
        const reportDocRef = doc(db, this.reportsCollection, reportId);
        await updateDoc(reportDocRef, { photos: uploadedPhotos });
        console.log(`📷 Uploaded ${uploadedPhotos.length} photos`);
      }

      toast.success('Report submitted successfully!');
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('report-submitted', { detail: { reportId } }));
      
      return reportId;

    } catch (error) {
      console.error('❌ Error creating report:', error);
      toast.error('Failed to create report: ' + error.message);
      throw error;
    }
  }

  /**
   * Upload photos for a report
   */
  async uploadReportPhotos(reportId, photoFiles) {
    const photos = [];

    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const timestamp = Date.now();
      const fileName = `photo_${i}_${timestamp}.jpg`;
      const storagePath = `accessReports/${reportId}/photos/${fileName}`;
      
      try {
        // Upload to Firebase Storage
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        // Create thumbnail path (in production, use Cloud Functions to resize)
        const thumbPath = `accessReports/${reportId}/photos/thumb_${fileName}`;
        const thumbRef = ref(storage, thumbPath);
        await uploadBytes(thumbRef, file);
        const thumbnailUrl = await getDownloadURL(thumbRef);

        photos.push({
          url,
          storagePath,
          thumbnailUrl,
          caption: file.caption || '',
          uploadedAt: Date.now() // Use Date.now() instead of serverTimestamp() in arrays
        });
      } catch (error) {
        console.error(`Error uploading photo ${i}:`, error);
        toast.warning(`Failed to upload photo ${i + 1}`);
      }
    }

    return photos;
  }

  /**
   * Get issue category from issue type
   */
  getIssueCategory(issueType) {
    const issueTypeObj = Object.values(ISSUE_TYPES).find(type => type.id === issueType);
    return issueTypeObj ? issueTypeObj.category : 'other';
  }

  /**
   * Get a single report by ID
   */
  async getReport(reportId) {
    try {
      const docRef = doc(db, this.reportsCollection, reportId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Report not found');
      }

      // Increment view count
      await updateDoc(docRef, {
        viewCount: increment(1)
      });

      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } catch (error) {
      console.error('Error getting report:', error);
      throw error;
    }
  }

  /**
   * Get reports with filters
   */
  async getReports(filters = {}) {
    try {
      const reportsRef = collection(db, this.reportsCollection);
      const constraints = [];

      // Apply filters
      if (filters.status) {
        constraints.push(where('status', '==', filters.status));
      }
      if (filters.issueType) {
        constraints.push(where('issueType', '==', filters.issueType));
      }
      if (filters.severity) {
        constraints.push(where('severity', '==', filters.severity));
      }
      if (filters.userId) {
        constraints.push(where('userId', '==', filters.userId));
      }
      if (filters.linkedTrailId) {
        constraints.push(where('linkedTrailId', '==', filters.linkedTrailId));
      }

      // Ordering
      const orderField = filters.orderBy || 'createdAt';
      const orderDirection = filters.orderDirection || 'desc';
      constraints.push(orderBy(orderField, orderDirection));

      // Limit
      if (filters.limit) {
        constraints.push(limit(filters.limit));
      }

      // Build query
      const q = constraints.length > 0 ? query(reportsRef, ...constraints) : reportsRef;
      const querySnapshot = await getDocs(q);
      
      const reports = [];
      querySnapshot.forEach((doc) => {
        reports.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`📊 Retrieved ${reports.length} reports`);
      return reports;
      
    } catch (error) {
      console.error('Error getting reports:', error);
      
      // Handle missing index error
      if (error.code === 'failed-precondition') {
        console.warn('⚠️ Firestore index needed. Fetching without ordering...');
        toast.warning('Loading reports without sorting (database index needed)');
        
        // Fallback: get without orderBy
        try {
          const reportsRef = collection(db, this.reportsCollection);
          const simpleConstraints = [];
          
          if (filters.status) simpleConstraints.push(where('status', '==', filters.status));
          if (filters.issueType) simpleConstraints.push(where('issueType', '==', filters.issueType));
          if (filters.limit) simpleConstraints.push(limit(filters.limit));
          
          const q = simpleConstraints.length > 0 ? query(reportsRef, ...simpleConstraints) : reportsRef;
          const querySnapshot = await getDocs(q);
          
          const reports = [];
          querySnapshot.forEach((doc) => {
            reports.push({ id: doc.id, ...doc.data() });
          });
          
          // Sort client-side
          reports.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          });
          
          console.log(`📊 Retrieved ${reports.length} reports (sorted client-side)`);
          return reports;
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Get reports within geographic bounds
   */
  async getReportsInBounds(bounds) {
    try {
      // Note: Firestore doesn't support geoqueries natively
      // Filter client-side for now
      const allReports = await this.getReports({ limit: 1000 });
      
      return allReports.filter(report => {
        const lat = report.location?.latitude;
        const lng = report.location?.longitude;
        if (!lat || !lng) return false;
        
        return lat <= bounds.north && 
               lat >= bounds.south && 
               lng <= bounds.east && 
               lng >= bounds.west;
      });
    } catch (error) {
      console.error('Error getting reports in bounds:', error);
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
        toast.error('Please sign in to update reports');
        throw new Error('User must be authenticated');
      }

      const docRef = doc(db, this.reportsCollection, reportId);
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({
          status: newStatus,
          timestamp: Date.now(), // Use Date.now() instead of serverTimestamp() in arrays
          updatedBy: user.uid,
          note: note || `Status updated to ${newStatus}`
        })
      };

      // Set special timestamps
      if (newStatus === 'acknowledged' || newStatus === 'in_progress') {
        updateData.acknowledgedAt = serverTimestamp();
      }
      if (newStatus === 'resolved') {
        updateData.resolvedAt = serverTimestamp();
      }

      await updateDoc(docRef, updateData);

      console.log('✅ Report status updated:', reportId, newStatus);
      toast.success(`Status updated to ${STATUS_TYPES[newStatus.toUpperCase()]?.label || newStatus}`);
      
    } catch (error) {
      console.error('Error updating report status:', error);
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
        toast.warning('Please sign in to upvote reports');
        throw new Error('User must be authenticated');
      }

      const docRef = doc(db, this.reportsCollection, reportId);
      await updateDoc(docRef, {
        upvotes: increment(1),
        upvotedBy: arrayUnion(user.uid)
      });

      console.log('✅ Report upvoted:', reportId);
      toast.success('Upvoted!');
      
    } catch (error) {
      console.error('Error upvoting report:', error);
      toast.error('Failed to upvote');
      throw error;
    }
  }

  /**
   * Remove upvote from a report
   */
  async removeUpvote(reportId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const docRef = doc(db, this.reportsCollection, reportId);
      await updateDoc(docRef, {
        upvotes: increment(-1),
        upvotedBy: arrayRemove(user.uid)
      });

      console.log('✅ Upvote removed:', reportId);
      
    } catch (error) {
      console.error('Error removing upvote:', error);
      throw error;
    }
  }

  /**
   * Add comment to a report
   */
  async addComment(reportId, commentText) {
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.warning('Please sign in to comment');
        throw new Error('User must be authenticated');
      }

      const comment = {
        userId: user.uid,
        userName: user.displayName || 'Anonymous User',
        comment: commentText,
        photos: [],
        createdAt: Date.now(), // Use Date.now() for consistency
        updatedAt: Date.now(),
        isEdited: false
      };

      // Add comment to subcollection
      const commentsRef = collection(db, this.reportsCollection, reportId, 'comments');
      const commentDoc = await addDoc(commentsRef, comment);

      // Update comment count
      const reportRef = doc(db, this.reportsCollection, reportId);
      await updateDoc(reportRef, {
        commentCount: increment(1)
      });

      console.log('✅ Comment added:', commentDoc.id);
      toast.success('Comment added');
      
      return commentDoc.id;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
      throw error;
    }
  }

  /**
   * Get comments for a report
   */
  async getComments(reportId) {
    try {
      const commentsRef = collection(db, this.reportsCollection, reportId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'asc'));
      const querySnapshot = await getDocs(q);

      const comments = [];
      querySnapshot.forEach((doc) => {
        comments.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return comments;
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error('Please sign in');
        throw new Error('User must be authenticated');
      }

      // Get report to verify ownership
      const report = await this.getReport(reportId);
      if (report.userId !== user.uid) {
        toast.error('You can only delete your own reports');
        throw new Error('Permission denied');
      }

      // Confirm deletion
      const confirmed = await modal.confirm(
        'Are you sure you want to delete this report? This cannot be undone.',
        'Delete Report'
      );
      
      if (!confirmed) return;

      // Delete photos from storage
      if (report.photos && report.photos.length > 0) {
        for (const photo of report.photos) {
          try {
            const photoRef = ref(storage, photo.storagePath);
            await deleteObject(photoRef);
          } catch (error) {
            console.error('Error deleting photo:', error);
          }
        }
      }

      // Delete report document
      const docRef = doc(db, this.reportsCollection, reportId);
      await deleteDoc(docRef);

      console.log('✅ Report deleted:', reportId);
      toast.success('Report deleted');
      
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
      throw error;
    }
  }

  /**
   * Get statistics for dashboard
   */
  async getStats() {
    try {
      const reportsRef = collection(db, this.reportsCollection);
      const q = query(reportsRef, limit(10000));
      const querySnapshot = await getDocs(q);
      
      const allReports = [];
      querySnapshot.forEach(doc => {
        allReports.push({ id: doc.id, ...doc.data() });
      });
      
      const stats = {
        total: allReports.length,
        byStatus: {},
        bySeverity: {},
        byIssueType: {},
        avgResponseTime: 0,
        recentReports: allReports.slice(0, 10)
      };

      // Calculate stats
      allReports.forEach(report => {
        stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;
        stats.bySeverity[report.severity] = (stats.bySeverity[report.severity] || 0) + 1;
        stats.byIssueType[report.issueType] = (stats.byIssueType[report.issueType] || 0) + 1;
      });

      console.log('📊 Statistics calculated:', stats.total, 'reports');
      return stats;
      
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        total: 0,
        byStatus: {},
        bySeverity: {},
        byIssueType: {},
        avgResponseTime: 0,
        recentReports: []
      };
    }
  }
}

// Export singleton instance
export const accessReportController = new AccessReportController();