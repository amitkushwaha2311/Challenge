import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';

// Client Firebase configuration from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-personal-journal',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef'
};

const isLiveFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_API_KEY !== 'demo-api-key'
);

let app = null;
let auth = null;
let db = null;

try {
  if (isLiveFirebaseConfigured) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (err) {
  console.warn('⚠️ Firebase client init note (using sandbox mode):', err.message);
}

export { auth, db, isLiveFirebaseConfigured };

/**
 * Signs in with Google Popup via Firebase Auth.
 */
export async function loginWithGoogle() {
  if (auth && isLiveFirebaseConfigured) {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return {
      uid: result.user.uid,
      displayName: result.user.displayName || 'Google User',
      email: result.user.email,
      photoURL: result.user.photoURL,
      idToken
    };
  }
  
  // Sandbox Demo Mode
  const demoUser = {
    uid: 'demo_journal_user_alpha',
    displayName: 'Alex Rivers (Researcher)',
    email: 'alex.rivers@enterprise.internal',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    idToken: 'demo-sandbox-token-demo_journal_user_alpha'
  };
  localStorage.setItem('journal_auth_user', JSON.stringify(demoUser));
  return demoUser;
}

/**
 * Signs in with Email/Password or creates Demo Sandbox user.
 */
export async function loginWithEmail(email, password, isSignUp = false) {
  if (auth && isLiveFirebaseConfigured) {
    let cred;
    if (isSignUp) {
      cred = await createUserWithEmailAndPassword(auth, email, password);
    } else {
      cred = await signInWithEmailAndPassword(auth, email, password);
    }
    const idToken = await cred.user.getIdToken();
    return {
      uid: cred.user.uid,
      displayName: cred.user.displayName || email.split('@')[0],
      email: cred.user.email,
      idToken
    };
  }

  // Sandbox Mode: Create deterministic UID from email
  const safeUid = 'user_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  const user = {
    uid: safeUid,
    displayName: email.split('@')[0],
    email: email,
    photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${safeUid}`,
    idToken: `demo-sandbox-token-${safeUid}`
  };
  localStorage.setItem('journal_auth_user', JSON.stringify(user));
  return user;
}

/**
 * Instant Demo Sandbox Sign-In for zero-friction evaluation.
 */
export async function loginWithSandboxDemo(role = 'executive') {
  const profile = role === 'executive' 
    ? { uid: 'demo_user_dr_sam', displayName: 'Dr. Sam Sterling', email: 'sam.sterling@quantum.ai', title: 'AI Research Director' }
    : { uid: 'demo_user_maya', displayName: 'Maya Lin', email: 'maya.lin@design.io', title: 'Product Architect' };

  const user = {
    ...profile,
    photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`,
    idToken: `demo-sandbox-token-${profile.uid}`
  };
  localStorage.setItem('journal_auth_user', JSON.stringify(user));
  return user;
}

/**
 * Sign out.
 */
export async function logoutUser() {
  if (auth && isLiveFirebaseConfigured) {
    await fbSignOut(auth);
  }
  localStorage.removeItem('journal_auth_user');
}

/**
 * Gets currently logged in user session.
 */
export function getCurrentStoredUser() {
  const saved = localStorage.getItem('journal_auth_user');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return null;
}
