import { db, isLiveFirebaseConfigured } from './firebase.js';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';

// Default initial starter entries for new users to showcase insights & knowledge graph immediately
const STARTER_ENTRIES = [
  {
    id: 'entry_seed_01',
    title: 'Architecting the Secure AI Pipeline',
    summary: 'Explored Zero-Trust secret management for Gemini API integrations. Emphasized removing API keys from client bundles and using GCP Secret Manager.',
    content: 'Today I worked through the core security architecture for our new AI assistant. The primary mandate was zero client-side credentials. We designed an Express proxy that authenticates Firebase JWTs and loads keys from Google Cloud Secret Manager. It feels so much more resilient and enterprise-ready.',
    primaryMood: 'Motivated',
    sentimentScore: 0.85,
    tags: ['Architecture', 'Security', 'Gemini', 'DevSecOps'],
    keyHighlights: ['Configured Secret Manager proxy', 'Enforced Firestore zero-trust rules', 'Implemented JWT auth middleware'],
    actionItems: ['Review STRIDE threat model', 'Add client-side E2EE toggle'],
    isEncrypted: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3).toISOString()
  },
  {
    id: 'entry_seed_02',
    title: 'Mindful Pacing & Deep Cognitive Focus',
    summary: 'Reflected on avoiding burnout during high-velocity development sprints. Practiced Socratic reframing to prioritize sustained momentum.',
    content: 'Had a productive morning session, but felt mental fatigue setting in around 3 PM. Used the Mindful Mentor persona to unpack the urge to rush everything at once. Realized that steady pacing is actually faster in the long run because it prevents costly refactoring and mental fatigue.',
    primaryMood: 'Calm',
    sentimentScore: 0.72,
    tags: ['Mindfulness', 'Deep Work', 'Wellbeing', 'Productivity'],
    keyHighlights: ['Recognized energy dip patterns', 'Realigned priorities for sustained pace'],
    actionItems: ['Take 10-minute mindful walk before deep coding blocks'],
    isEncrypted: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 1).toISOString()
  }
];

/**
 * Saves or updates a journal entry scoped exclusively to the authenticated user.
 */
export async function saveJournalEntry(userId, entry) {
  if (!userId) throw new Error('User ID is required to save entry (Tenant Isolation).');

  const entryData = {
    ...entry,
    id: entry.id || `entry_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    userId,
    updatedAt: new Date().toISOString(),
    createdAt: entry.createdAt || new Date().toISOString()
  };

  if (isLiveFirebaseConfigured && db) {
    // Cloud Firestore path: users/{userId}/entries/{entryId}
    const entryRef = doc(db, 'users', userId, 'entries', entryData.id);
    await setDoc(entryRef, entryData, { merge: true });
    return entryData;
  }

  // User-Isolated Sandbox Local Storage (Keyed per user UID)
  const userStorageKey = `journal_entries_${userId}`;
  const existing = getStoredUserEntries(userId);
  const updated = [entryData, ...existing.filter(e => e.id !== entryData.id)];
  localStorage.setItem(userStorageKey, JSON.stringify(updated));
  return entryData;
}

/**
 * Loads all journal entries for a specific user.
 * Strictly guarantees that user A cannot see user B's entries.
 */
export async function loadUserEntries(userId) {
  if (!userId) return [];

  if (isLiveFirebaseConfigured && db) {
    try {
      const entriesRef = collection(db, 'users', userId, 'entries');
      const q = query(entriesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const entries = [];
      querySnapshot.forEach(doc => {
        entries.push(doc.data());
      });
      return entries;
    } catch (err) {
      console.warn('Firestore fetch failed, falling back to local isolated store:', err.message);
    }
  }

  return getStoredUserEntries(userId);
}

/**
 * Deletes a journal entry belonging to a user.
 */
export async function deleteJournalEntry(userId, entryId) {
  if (!userId || !entryId) return;

  if (isLiveFirebaseConfigured && db) {
    const entryRef = doc(db, 'users', userId, 'entries', entryId);
    await deleteDoc(entryRef);
  }

  const userStorageKey = `journal_entries_${userId}`;
  const existing = getStoredUserEntries(userId);
  const filtered = existing.filter(e => e.id !== entryId);
  localStorage.setItem(userStorageKey, JSON.stringify(filtered));
}

/**
 * Helper to get user-isolated entries from localStorage.
 */
function getStoredUserEntries(userId) {
  const userStorageKey = `journal_entries_${userId}`;
  const saved = localStorage.getItem(userStorageKey);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  // Initialize with seed entries for this specific user
  localStorage.setItem(userStorageKey, JSON.stringify(STARTER_ENTRIES));
  return STARTER_ENTRIES;
}
