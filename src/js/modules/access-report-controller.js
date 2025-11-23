/**
 * AccessReport Controller (CDN Version)
 * Works with Firebase loaded via script tags
 * For use when Firebase is loaded from CDN instead of npm modules
 */

// Firebase is loaded globally via script tags
// Access it through the global firebase namespace

class AccessReportController {
    constructor() {
        this.reportsCollection = 'accessibilityReports';
        this.notificationsCollection = 'reportNotifications';
        this.statsCollection = 'reportStats';
        
        // Get Firebase services from global namespace
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.auth = firebase.auth();
        
        console.log('✅ AccessReport Controller initialized (CDN mode)');
    }

    /**
     * Create a new accessibility report
     */
    async createReport(reportData, photoFiles = []) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('User must be authenticated to create a report');
            }

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
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
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
                
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                acknowledgedAt: null,
                resolvedAt: null,
                
                resolution: null,
                
                tags: reportData.tags || [],
                isPublic: reportData.isPublic !== false,
                isFlagged: false,
                flagReason: null
            };

            // Add report to Firestore
            const docRef = await this.db.collection(this.reportsCollection).add(report);
            const reportId = docRef.id;

            // Upload photos if provided
            if (photoFiles.length > 0) {
                const uploadedPhotos = await this.uploadReportPhotos(reportId, photoFiles);
                await docRef.update({ photos: uploadedPhotos });
            }

            console.log('✅ Report created successfully:', reportId);
            
            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('report-submitted', { detail: { reportId } }));
            
            return reportId;

        } catch (error) {
            console.error('❌ Error creating report:', error);
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
                const storageRef = this.storage.ref(storagePath);
                await storageRef.put(file);
                const url = await storageRef.getDownloadURL();

                // Create thumbnail path (in production, use Cloud Functions to resize)
                const thumbPath = `accessReports/${reportId}/photos/thumb_${fileName}`;
                const thumbRef = this.storage.ref(thumbPath);
                await thumbRef.put(file);
                const thumbnailUrl = await thumbRef.getDownloadURL();

                photos.push({
                    url,
                    storagePath,
                    thumbnailUrl,
                    caption: file.caption || '',
                    uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error(`Error uploading photo ${i}:`, error);
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
            const docRef = this.db.collection(this.reportsCollection).doc(reportId);
            const doc = await docRef.get();

            if (!doc.exists) {
                throw new Error('Report not found');
            }

            // Increment view count
            await docRef.update({
                viewCount: firebase.firestore.FieldValue.increment(1)
            });

            return {
                id: doc.id,
                ...doc.data()
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
            let query = this.db.collection(this.reportsCollection);

            // Apply filters
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            if (filters.issueType) {
                query = query.where('issueType', '==', filters.issueType);
            }
            if (filters.severity) {
                query = query.where('severity', '==', filters.severity);
            }
            if (filters.userId) {
                query = query.where('userId', '==', filters.userId);
            }
            if (filters.linkedTrailId) {
                query = query.where('linkedTrailId', '==', filters.linkedTrailId);
            }

            // Ordering
            const orderField = filters.orderBy || 'createdAt';
            const orderDirection = filters.orderDirection || 'desc';
            query = query.orderBy(orderField, orderDirection);

            // Limit
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const snapshot = await query.get();
            const reports = [];

            snapshot.forEach((doc) => {
                reports.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

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
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('User must be authenticated');
            }

            const docRef = this.db.collection(this.reportsCollection).doc(reportId);
            const updateData = {
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                statusHistory: firebase.firestore.FieldValue.arrayUnion({
                    status: newStatus,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: user.uid,
                    note: note || `Status updated to ${newStatus}`
                })
            };

            if (newStatus === 'acknowledged' || newStatus === 'in_progress') {
                updateData.acknowledgedAt = firebase.firestore.FieldValue.serverTimestamp();
            }
            if (newStatus === 'resolved') {
                updateData.resolvedAt = firebase.firestore.FieldValue.serverTimestamp();
            }

            await docRef.update(updateData);

            console.log('✅ Report status updated:', reportId, newStatus);
        } catch (error) {
            console.error('Error updating report status:', error);
            throw error;
        }
    }

    /**
     * Upvote a report
     */
    async upvoteReport(reportId) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('User must be authenticated');
            }

            const docRef = this.db.collection(this.reportsCollection).doc(reportId);
            await docRef.update({
                upvotes: firebase.firestore.FieldValue.increment(1),
                upvotedBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
            });

            console.log('✅ Report upvoted:', reportId);
        } catch (error) {
            console.error('Error upvoting report:', error);
            throw error;
        }
    }

    /**
     * Add comment to a report
     */
    async addComment(reportId, commentText, photoFiles = []) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('User must be authenticated');
            }

            const comment = {
                userId: user.uid,
                userName: user.displayName || 'Anonymous User',
                comment: commentText,
                photos: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                isEdited: false
            };

            // Add comment
            const commentsRef = this.db.collection(this.reportsCollection).doc(reportId).collection('comments');
            const commentDoc = await commentsRef.add(comment);

            // Update comment count
            const reportRef = this.db.collection(this.reportsCollection).doc(reportId);
            await reportRef.update({
                commentCount: firebase.firestore.FieldValue.increment(1)
            });

            console.log('✅ Comment added:', commentDoc.id);
            return commentDoc.id;
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }

    /**
     * Get statistics
     */
    async getStats() {
        try {
            const snapshot = await this.db.collection(this.reportsCollection).limit(10000).get();
            const allReports = [];
            
            snapshot.forEach(doc => {
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

            allReports.forEach(report => {
                stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;
                stats.bySeverity[report.severity] = (stats.bySeverity[report.severity] || 0) + 1;
                stats.byIssueType[report.issueType] = (stats.byIssueType[report.issueType] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }
}

// Constants
const ISSUE_TYPES = {
    CURB_RAMP: { id: 'curb_ramp', label: 'Broken/Missing Curb Ramp', category: 'sidewalk', icon: '♿' },
    SIDEWALK_BLOCKED: { id: 'sidewalk_blocked', label: 'Blocked Sidewalk/Path', category: 'sidewalk', icon: '🚧' },
    SIDEWALK_DAMAGE: { id: 'sidewalk_damage', label: 'Damaged Sidewalk Surface', category: 'sidewalk', icon: '⚠️' },
    ENTRANCE_INACCESSIBLE: { id: 'entrance_inaccessible', label: 'Inaccessible Entrance', category: 'building', icon: '🚪' },
    ELEVATOR_BROKEN: { id: 'elevator_broken', label: 'Broken Elevator/Lift', category: 'building', icon: '🛗' },
    PARKING_BLOCKED: { id: 'parking_blocked', label: 'Accessible Parking Blocked', category: 'parking', icon: '🅿️' },
    SIGNAGE_MISSING: { id: 'signage_missing', label: 'Missing Accessibility Signage', category: 'signage', icon: '🪧' },
    RESTROOM_INACCESSIBLE: { id: 'restroom_inaccessible', label: 'Inaccessible Restroom', category: 'facilities', icon: '🚻' },
    TRAIL_OBSTACLE: { id: 'trail_obstacle', label: 'Trail Obstacle/Blockage', category: 'trail', icon: '🌳' },
    OTHER: { id: 'other', label: 'Other Accessibility Issue', category: 'other', icon: '📍' }
};

const SEVERITY_LEVELS = {
    CRITICAL: { id: 'critical', label: 'Critical', color: '#d32f2f', description: 'Immediate safety hazard' },
    HIGH: { id: 'high', label: 'High', color: '#f57c00', description: 'Severely limits accessibility' },
    MEDIUM: { id: 'medium', label: 'Medium', color: '#fbc02d', description: 'Moderate accessibility barrier' },
    LOW: { id: 'low', label: 'Low', color: '#388e3c', description: 'Minor inconvenience' }
};

const STATUS_TYPES = {
    NEW: { id: 'new', label: 'New', color: '#1976d2', icon: '🆕' },
    ACKNOWLEDGED: { id: 'acknowledged', label: 'Acknowledged', color: '#7b1fa2', icon: '👁️' },
    IN_PROGRESS: { id: 'in_progress', label: 'In Progress', color: '#f57c00', icon: '🔧' },
    RESOLVED: { id: 'resolved', label: 'Resolved', color: '#388e3c', icon: '✅' },
    CLOSED: { id: 'closed', label: 'Closed', color: '#616161', icon: '🔒' },
    WONT_FIX: { id: 'wont_fix', label: "Won't Fix", color: '#d32f2f', icon: '❌' }
};

// Export singleton instance
const accessReportController = new AccessReportController();