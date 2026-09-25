// Real per-user cloud persistence via Firestore — one document per signed-in
// user, mirroring the same shape AppContext already keeps in localStorage
// (see lib/storage.js). This is additive: when signed out, or when Firebase
// isn't configured, nothing here runs and the app behaves exactly as before
// (localStorage-only, single device).
//
// KNOWN LIMITATION (documented, not hidden): only JSON-serializable metadata
// syncs here. Uploaded file BYTES stay in this browser's IndexedDB
// (services/storage.js) — they are not uploaded to Firestore/Cloud Storage.
// So on a second device, a synced document's metadata (name, category,
// status, extracted text) appears, but "Open"/"Download" for that file will
// fail until Firebase Storage is added for the binary files themselves.
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../services/firebase'

function stateDocRef(uid) {
  return doc(db, 'users', uid, 'careeros', 'state')
}

export async function loadCloudState(uid) {
  if (!isFirebaseConfigured || !uid) return null
  try {
    const snap = await getDoc(stateDocRef(uid))
    return snap.exists() ? snap.data() : null
  } catch (err) {
    console.error('Failed to load cloud state:', err)
    return null
  }
}

export async function saveCloudState(uid, state) {
  if (!isFirebaseConfigured || !uid) return
  try {
    await setDoc(stateDocRef(uid), state)
  } catch (err) {
    console.error('Failed to save cloud state:', err)
  }
}
