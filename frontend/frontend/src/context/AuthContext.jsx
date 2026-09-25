import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase'

const AuthContext = createContext(null)

// Real Firebase session persistence — `onAuthStateChanged` restores the
// signed-in user after a refresh because `browserLocalPersistence` keeps
// Firebase's own session token in the browser (separate from this app's
// `careeros:state` localStorage key, which stores the user's Career OS data).
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) return
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error('Firebase persistence setup failed:', err)
    })
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser)
        setAuthLoading(false)
      },
      (err) => {
        console.error('Auth state listener failed:', err)
        setAuthError(err.message)
        setAuthLoading(false)
      },
    )
    return unsubscribe
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setAuthError('Google sign-in is not configured for this deployment.')
      return
    }
    setAuthError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      console.error('Google sign-in failed:', err)
      setAuthError(
        err.code === 'auth/popup-closed-by-user'
          ? 'Sign-in was cancelled.'
          : "We couldn't sign you in with Google right now. Please try again.",
      )
    }
  }, [])

  const signOutUser = useCallback(async () => {
    if (!isFirebaseConfigured) return
    try {
      await firebaseSignOut(auth)
    } catch (err) {
      console.error('Sign-out failed:', err)
      setAuthError("We couldn't sign you out right now. Please try again.")
    }
  }, [])

  const value = {
    user,
    isSignedIn: Boolean(user),
    authLoading,
    authError,
    clearAuthError: () => setAuthError(null),
    signInWithGoogle,
    signOutUser,
    isFirebaseConfigured,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
