import * as firebaseApp from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC92l__REFeeSZr1lAM717ALNRO4EPKvjA",
  authDomain: "oasis-fbfd1.firebaseapp.com",
  projectId: "oasis-fbfd1",
  storageBucket: "oasis-fbfd1.firebasestorage.app",
  messagingSenderId: "678794595620",
  appId: "1:678794595620:web:22703b1250ed529b09b7b1",
  measurementId: "G-6RQM6HHVP9"
};

// Use namespace import and casting to bypass potential type mismatch errors
// Also adds singleton check to prevent re-initialization
const app = (firebaseApp as any).getApps && (firebaseApp as any).getApps().length > 0
  ? (firebaseApp as any).getApps()[0]
  : (firebaseApp as any).initializeApp(firebaseConfig);

// Initialize Firestore with persistent cache to handle offline/unstable connection states
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);