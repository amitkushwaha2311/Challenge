import { getCurrentStoredUser } from './firebase.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Gets authentication headers with Bearer token.
 */
function getAuthHeaders() {
  const user = getCurrentStoredUser();
  const token = user?.idToken || 'demo-sandbox-token-demo_user_001';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Multi-Turn Chat with Gemini via Backend Proxy.
 */
export async function sendChatMessage({ history, message, persona, userContext }) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ history, message, persona, userContext })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Server error: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Auto-Summarize Journal Session.
 */
export async function summarizeSession({ conversationText, rawNotes }) {
  const response = await fetch(`${API_BASE}/api/summarize`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ conversationText, rawNotes })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Summarization failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Cognitive & Emotional Insights Analysis.
 */
export async function fetchCognitiveInsights(entries) {
  const response = await fetch(`${API_BASE}/api/insights/analyze`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ entries })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Insights analysis failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Extract Life Knowledge Graph Entities.
 */
export async function extractLifeGraphNodes(entries) {
  const response = await fetch(`${API_BASE}/api/graph/extract`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ entries })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Life graph extraction failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch Backend Security Audit.
 */
export async function getSecurityAudit() {
  const response = await fetch(`${API_BASE}/api/security/audit`);
  if (!response.ok) {
    throw new Error('Failed to retrieve security audit.');
  }
  return await response.json();
}
