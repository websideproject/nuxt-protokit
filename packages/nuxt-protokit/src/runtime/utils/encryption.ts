/**
 * AES-GCM encryption utilities for Y.js update persistence.
 * All operations use the Web Crypto API (available in all modern browsers and Node 20+).
 */

/** Generate a cryptographically random 16-byte PBKDF2 salt. */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

/**
 * Derive a 256-bit AES-GCM key from a password and salt using PBKDF2.
 * The salt should be stored alongside the encrypted data (it is not secret —
 * it prevents pre-computation attacks).
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Import raw key bytes as an AES-GCM CryptoKey.
 * Use when the caller manages key derivation externally (e.g. from a server-issued token).
 */
export async function importRawKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypt bytes with AES-GCM.
 * Returns a single ArrayBuffer formatted as: [IV (12 bytes)][ciphertext].
 * The IV is random per call — encrypting the same plaintext twice produces different output.
 */
export async function encryptBytes(key: CryptoKey, data: Uint8Array): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const out = new Uint8Array(12 + ciphertext.byteLength)
  out.set(iv, 0)
  out.set(new Uint8Array(ciphertext), 12)
  return out.buffer
}

/**
 * Decrypt bytes produced by encryptBytes.
 * Throws DOMException if the key is wrong or the ciphertext is tampered with
 * (AES-GCM authentication tag verification fails).
 */
export async function decryptBytes(key: CryptoKey, data: ArrayBuffer): Promise<Uint8Array> {
  const bytes = new Uint8Array(data)
  const iv = bytes.slice(0, 12)
  const ciphertext = bytes.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new Uint8Array(plaintext)
}
