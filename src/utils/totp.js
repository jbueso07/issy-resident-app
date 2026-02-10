// src/utils/totp.js
// ISSY - TOTP Generator for React Native
// Compatible with backend HMAC-SHA256 implementation

import * as Crypto from 'expo-crypto';

// Configuration - MUST match backend
const TIME_STEP = 10; // seconds (changed from 7 to 10)
const TOKEN_LENGTH = 6; // digits

/**
 * Get the current time counter (changes every TIME_STEP seconds)
 */
const getTimeCounter = (offset = 0) => {
  const now = Math.floor(Date.now() / 1000);
  return Math.floor(now / TIME_STEP) + offset;
};

/**
 * Convert base64 string to Uint8Array
 */
const base64ToUint8Array = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Convert string to Uint8Array (UTF-8)
 */
const stringToUint8Array = (str) => {
  const encoder = new TextEncoder();
  return encoder.encode(str);
};

/**
 * XOR two byte arrays of the same length
 */
const xorBytes = (a, b) => {
  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
};

/**
 * Compute HMAC-SHA256 manually using expo-crypto
 * HMAC(K, m) = H((K' ⊕ opad) || H((K' ⊕ ipad) || m))
 */
const hmacSha256 = async (keyBase64, message) => {
  const BLOCK_SIZE = 64; // SHA-256 block size
  const IPAD = 0x36;
  const OPAD = 0x5c;

  // Decode the base64 key
  let key = base64ToUint8Array(keyBase64);

  // If key is longer than block size, hash it
  if (key.length > BLOCK_SIZE) {
    const keyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      String.fromCharCode(...key),
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    key = new Uint8Array(keyHash.match(/.{2}/g).map(byte => parseInt(byte, 16)));
  }

  // Pad key to block size
  const paddedKey = new Uint8Array(BLOCK_SIZE);
  paddedKey.set(key);

  // Create ipad and opad
  const ipadKey = new Uint8Array(BLOCK_SIZE);
  const opadKey = new Uint8Array(BLOCK_SIZE);
  for (let i = 0; i < BLOCK_SIZE; i++) {
    ipadKey[i] = paddedKey[i] ^ IPAD;
    opadKey[i] = paddedKey[i] ^ OPAD;
  }

  // Convert message to bytes
  const messageBytes = stringToUint8Array(message);

  // Inner hash: H((K' ⊕ ipad) || m)
  const innerData = new Uint8Array(BLOCK_SIZE + messageBytes.length);
  innerData.set(ipadKey);
  innerData.set(messageBytes, BLOCK_SIZE);

  const innerHashHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    String.fromCharCode(...innerData),
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  const innerHash = new Uint8Array(innerHashHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));

  // Outer hash: H((K' ⊕ opad) || innerHash)
  const outerData = new Uint8Array(BLOCK_SIZE + innerHash.length);
  outerData.set(opadKey);
  outerData.set(innerHash, BLOCK_SIZE);

  const outerHashHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    String.fromCharCode(...outerData),
    { encoding: Crypto.CryptoEncoding.HEX }
  );

  return new Uint8Array(outerHashHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
};

/**
 * Generate TOTP token - compatible with backend
 */
export const generateToken = async (secret, userId, counter = null) => {
  const timeCounter = counter !== null ? counter : getTimeCounter();

  // Data format must match backend: `${userId}:${timeCounter}`
  const data = `${userId}:${timeCounter}`;

  // Compute HMAC-SHA256
  const hash = await hmacSha256(secret, data);

  // Dynamic truncation (HOTP standard)
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Get TOKEN_LENGTH digits
  const token = (binary % Math.pow(10, TOKEN_LENGTH)).toString().padStart(TOKEN_LENGTH, '0');

  return token;
};

/**
 * Generate full QR data for resident
 */
export const generateResidentQRData = async (secret, userId) => {
  const counter = getTimeCounter();
  const token = await generateToken(secret, userId, counter);
  const expiresAt = (counter + 1) * TIME_STEP * 1000; // milliseconds
  const now = Date.now();
  const remainingMs = expiresAt - now;

  return {
    code: `ISSY-R-${userId.substring(0, 8)}-${token}`,
    token,
    userId,
    expiresAt,
    remainingSeconds: Math.max(0, Math.ceil(remainingMs / 1000)),
    timeStep: TIME_STEP,
  };
};

/**
 * Get time until next token change
 */
export const getSecondsUntilChange = () => {
  const now = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(now / TIME_STEP);
  const nextChange = (currentStep + 1) * TIME_STEP;
  return nextChange - now;
};

/**
 * Get the time step configuration
 */
export const getTimeStep = () => TIME_STEP;

export default {
  generateToken,
  generateResidentQRData,
  getSecondsUntilChange,
  getTimeStep,
  TIME_STEP,
};