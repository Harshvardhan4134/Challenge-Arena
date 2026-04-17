import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyDyhOUKzNQQaNxP30q3PmnuHDVnfgnKQBw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "challenge-arena-freefire.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "challenge-arena-freefire",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "challenge-arena-freefire.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "668149421973",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:668149421973:web:660a883c4cfd771ce9089c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-WMPXHFGC5N",
};

function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
  );
}

const app = hasFirebaseConfig()
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : null;

export const firebaseAuth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;

export function isFirebaseConfigured() {
  return app !== null;
}
