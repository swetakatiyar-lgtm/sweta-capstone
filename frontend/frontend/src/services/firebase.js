// Real Firebase Auth + Firestore wiring for Google sign-in and per-user
// cloud persistence. All config values below are the PUBLIC web config
// Firebase issues for browser apps — safe to ship in frontend code (they
// identify the project, they don't grant access on their own; actual data
// access is governed by Firestore security rules on the project itself).
//
// REQUIRES: a real Firebase project with Google sign-in enabled and these
// six VITE_FIREBASE_* values in .env. Without them, `isFirebaseConfigured`
// is false and AuthContext falls back to the existing local-only mode —
// the rest of the app (localStorage/IndexedDB persistence) keeps working
// exactly as it did before this file existed.
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
)

let app = null
let auth = null
let db = null
let googleProvider = null

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  googleProvider = new GoogleAuthProvider()
}

export { auth, db, googleProvider }
