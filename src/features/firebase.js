// FIXED: Firebase operations with v10 modular SDK
import { auth, db, storage } from '../firebase-setup.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';

export class FirebaseController {
  constructor() {
    this.auth = auth;
    this.db = db;
    this.storage = storage;
    this.user = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('ℹ️ Firebase controller already initialized');
      return;
    }

    try {
      console.log('🔥 Firebase controller initializing...');
      
      this.setupAuthListener();
      this.isInitialized = true;
      
      console.log('✅ Firebase controller initialized');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
    }
  }

  setupAuthListener() {
    onAuthStateChanged(this.auth, (user) => {
      this.user = user;
      if (user) {
        console.log('🔥 User signed in:', user.email);
      } else {
        console.log('🔥 User signed out');
      }
    });
  }

  async saveRouteToCloud(routeData, metadata = {}) {
    if (!this.user) {
      alert('⚠️ Please sign in to save routes to cloud');
      return null;
    }

    if (!routeData || !Array.isArray(routeData)) {
      alert('❌ Invalid route data');
      return null;
    }

    try {
      console.log('☁️ Saving route to cloud...');
      
      const routeDoc = {
        userId: this.user.uid,
        userEmail: this.user.email,
        routeName: metadata.name || 'Unnamed Route',
        totalDistance: metadata.totalDistance || 0,
        elapsedTime: metadata.elapsedTime || 0,
        createdAt: serverTimestamp(),
        metadata: metadata,
        routeData: routeData,
        stats: {
          locationPoints: routeData.filter(p => p.type === 'location').length,
          photos: routeData.filter(p => p.type === 'photo').length,
          notes: routeData.filter(p => p.type === 'text').length
        }
      };

      const routesCollection = collection(this.db, 'routes');
      const docRef = await addDoc(routesCollection, routeDoc);
      
      console.log('✅ Route saved to cloud with ID:', docRef.id);
      alert('✅ Route saved to cloud successfully!');
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Failed to save route to cloud:', error);
      alert('❌ Failed to save route to cloud: ' + error.message);
      return null;
    }
  }

  async loadMyRoutes() {
    if (!this.user) {
      alert('⚠️ Please sign in to load your routes');
      return [];
    }

    try {
      console.log('📥 Loading routes from cloud...');
      
      const routesCollection = collection(this.db, 'routes');
      const q = query(
        routesCollection,
        where('userId', '==', this.user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const routes = [];
      
      querySnapshot.forEach(doc => {
        routes.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ Loaded ${routes.length} routes from cloud`);
      return routes;
      
    } catch (error) {
      console.error('❌ Failed to load routes:', error);
      
      // Handle missing index error gracefully
      if (error.code === 'failed-precondition') {
        console.warn('⚠️ Firestore index needed. Trying without orderBy...');
        
        try {
          const routesCollection = collection(this.db, 'routes');
          const q = query(
            routesCollection,
            where('userId', '==', this.user.uid)
          );
          
          const querySnapshot = await getDocs(q);
          const routes = [];
          
          querySnapshot.forEach(doc => {
            routes.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          // Sort client-side
          routes.sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return bTime - aTime;
          });
          
          console.log(`✅ Loaded ${routes.length} routes (sorted client-side)`);
          return routes;
          
        } catch (fallbackError) {
          console.error('❌ Fallback query also failed:', fallbackError);
          alert('Failed to load routes. Please check your connection.');
          return [];
        }
      }
      
      alert('Failed to load routes: ' + error.message);
      return [];
    }
  }

  async saveTrailGuide(guideData) {
    if (!this.user) {
      alert('⚠️ Please sign in to save trail guides');
      return null;
    }

    try {
      console.log('📝 Saving trail guide to cloud...');
      
      const guideDoc = {
        userId: this.user.uid,
        userEmail: this.user.email,
        ...guideData,
        createdAt: serverTimestamp(),
        isPublic: guideData.isPublic || false
      };

      const guidesCollection = collection(this.db, 'trail_guides');
      const docRef = await addDoc(guidesCollection, guideDoc);
      
      console.log('✅ Trail guide saved with ID:', docRef.id);
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Failed to save trail guide:', error);
      alert('Failed to save trail guide: ' + error.message);
      return null;
    }
  }

  getCurrentUser() {
    return this.user;
  }

  isSignedIn() {
    return this.user !== null;
  }

  getUserId() {
    return this.user?.uid || null;
  }

  getUserEmail() {
    return this.user?.email || null;
  }
}