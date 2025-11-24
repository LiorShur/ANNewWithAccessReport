/**
 * Firebase Setup
 * Initializes Firebase and exposes to window for use across the app
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';
import { getStorage, connectStorageEmulator } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAmsm916Lzp0MUXANq3SECO4ec7q1H0Vu4",
  authDomain: "accessnaturebeta-821a2.firebaseapp.com",
  projectId: "accessnaturebeta-821a2",
  storageBucket: "accessnaturebeta-821a2.firebasestorage.app",
  messagingSenderId: "670888101781",
  appId: "1:670888101781:web:b4cf57f58e86182466589c",
  measurementId: "G-QL82J92CP7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// CRITICAL: Expose to window for auth-status-handler and other scripts
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseStorage = storage;

console.log('🔥 Firebase initialized successfully');
console.log('✅ Exposed to window:', {
  app: !!window.firebaseApp,
  auth: !!window.firebaseAuth,
  db: !!window.firebaseDb,
  storage: !!window.firebaseStorage
});

// Export for module use
export { app, auth, db, storage };