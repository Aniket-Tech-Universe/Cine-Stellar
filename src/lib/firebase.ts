import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Define fallback dummy configurations to prevent Next.js build compilation
// and prerendering crashes when environment variables are not loaded.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKey_1234567890_BuildTimeOnly",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890",
};

// Initialize Firebase client for client-side and server-side hydration
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Safe debug logging to see if Vercel is loading the key correctly without printing the full secret
if (typeof window !== "undefined") {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
  console.log("--- Firebase Configuration Debug ---");
  console.log("API Key Exists:", !!key);
  console.log("API Key Length:", key.length);
  console.log("API Key Start:", key.substring(0, 10));
  console.log("API Key End:", key.substring(key.length - 5));
  console.log("Auth Domain:", firebaseConfig.authDomain);
  console.log("Project ID:", firebaseConfig.projectId);
  console.log("-------------------------------------");
}

// Apply custom scopes if needed (like email)
googleProvider.addScope("email");
googleProvider.addScope("profile");

export { auth, googleProvider, db };
