import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import dotenv from 'dotenv';

dotenv.config();

let client = null;
let secretCache = new Map();

/**
 * Initializes the Secret Manager client with error handling.
 */
function getSecretClient() {
  if (!client) {
    try {
      client = new SecretManagerServiceClient();
    } catch (err) {
      console.warn('⚠️ Google Cloud Secret Manager client initialization warning (using env fallback):', err.message);
    }
  }
  return client;
}

/**
 * Securely retrieves a secret from Google Cloud Secret Manager.
 * Falls back to process.env if running outside GCP or in local development.
 * 
 * @param {string} secretName - Name of the secret in Secret Manager (e.g., 'GEMINI_API_KEY')
 * @returns {Promise<string>} Secret value
 */
export async function getSecret(secretName) {
  // Check in-memory cache first to minimize GCP API calls and latency
  if (secretCache.has(secretName)) {
    return secretCache.get(secretName);
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;

  if (projectId) {
    try {
      const smClient = getSecretClient();
      if (smClient) {
        const secretPath = `projects/${projectId}/secrets/${secretName}/versions/latest`;
        console.log(`🔒 Resolving secret '${secretName}' from Google Cloud Secret Manager...`);
        const [version] = await smClient.accessSecretVersion({ name: secretPath });
        const secretValue = version.payload.data.toString('utf8');
        
        if (secretValue) {
          secretCache.set(secretName, secretValue);
          return secretValue;
        }
      }
    } catch (err) {
      console.warn(`⚠️ Could not retrieve '${secretName}' from GCP Secret Manager: ${err.message}. Falling back to server environment.`);
    }
  }

  // Secure Server-Side Fallback: process.env (never exposed to client browser)
  const envVal = process.env[secretName];
  if (envVal) {
    secretCache.set(secretName, envVal);
    return envVal;
  }

  return '';
}

/**
 * Returns security audit metadata without revealing secret contents.
 */
export function getSecretManagementAudit() {
  const hasGcpProject = Boolean(process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID);
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || secretCache.has('GEMINI_API_KEY'));

  return {
    provider: hasGcpProject ? 'Google Cloud Secret Manager' : 'Server-Side Environment Proxy',
    isGcpSecretManagerActive: hasGcpProject,
    geminiKeyConfigured: hasGeminiKey,
    clientSideExposure: 'NONE (Zero Client-Side Secrets)',
    cachingEnabled: true,
    lastAuditTimestamp: new Date().toISOString()
  };
}
