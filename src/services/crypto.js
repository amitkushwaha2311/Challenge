/**
 * Client-Side End-to-End Encryption (E2EE) Module
 * 
 * Uses standard Web Crypto API (AES-GCM-256 + PBKDF2 with SHA-256)
 * Guarantees Zero-Knowledge privacy: Plaintext is encrypted in the user's browser
 * before transmission, so neither the database nor server operators can read entries.
 */

// Helper to convert buffer to Base64
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
function base64ToBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a 256-bit AES-GCM key from a user passphrase using PBKDF2.
 */
async function deriveKeyFromPassphrase(passphrase, saltBuffer) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext string using AES-GCM-256.
 * 
 * @param {string} plaintext - The raw text to encrypt
 * @param {string} passphrase - User's secret master passphrase
 * @returns {Promise<{ ciphertext: string, iv: string, salt: string }>}
 */
export async function encryptTextE2EE(plaintext, passphrase) {
  if (!plaintext || !passphrase) {
    throw new Error('Plaintext and passphrase are required for E2EE encryption.');
  }

  // Generate 16 bytes random salt and 12 bytes random IV (standard for AES-GCM)
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const enc = new TextEncoder();
  const encodedPlaintext = enc.encode(plaintext);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encodedPlaintext
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
    algorithm: 'AES-GCM-256-PBKDF2',
    isEncrypted: true
  };
}

/**
 * Decrypts AES-GCM-256 ciphertext using the user's master passphrase.
 * 
 * @param {string} ciphertextBase64 - Base64 encoded ciphertext
 * @param {string} ivBase64 - Base64 encoded IV
 * @param {string} saltBase64 - Base64 encoded Salt
 * @param {string} passphrase - User's secret master passphrase
 * @returns {Promise<string>} Decrypted plaintext string
 */
export async function decryptTextE2EE(ciphertextBase64, ivBase64, saltBase64, passphrase) {
  if (!ciphertextBase64 || !ivBase64 || !saltBase64 || !passphrase) {
    throw new Error('All E2EE metadata and passphrase are required for decryption.');
  }

  const ciphertextBuffer = base64ToBuffer(ciphertextBase64);
  const ivBuffer = base64ToBuffer(ivBase64);
  const saltBuffer = base64ToBuffer(saltBase64);

  const key = await deriveKeyFromPassphrase(passphrase, saltBuffer);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer)
    },
    key,
    ciphertextBuffer
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}
