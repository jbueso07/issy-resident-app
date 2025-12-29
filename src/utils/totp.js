// src/utils/totp.js
// ISSY - TOTP Generator for React Native

import * as Crypto from 'expo-crypto';

const TIME_STEP = 7;
const TOKEN_LENGTH = 6;

const getTimeCounter = (offset = 0) => {
  const now = Math.floor(Date.now() / 1000);
  return Math.floor(now / TIME_STEP) + offset;
};

const hmacSha256 = async (secret, data) => {
  const key = secret;
  const message = data;
  
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${key}:${message}`,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  
  const bytes = [];
  for (let i = 0; i < hash.length; i += 2) {
    bytes.push(parseInt(hash.substr(i, 2), 16));
  }
  
  return new Uint8Array(bytes);
};

export const generateToken = async (secret, userId, counter = null) => {
  const timeCounter = counter !== null ? counter : getTimeCounter();
  
  const data = `${userId}:${timeCounter}`;
  const hash = await hmacSha256(secret, data);
  
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = 
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  
  const token = (binary % Math.pow(10, TOKEN_LENGTH)).toString().padStart(TOKEN_LENGTH, '0');
  
  return token;
};

export const generateResidentQRData = async (secret, userId) => {
  const counter = getTimeCounter();
  const token = await generateToken(secret, userId, counter);
  const expiresAt = (counter + 1) * TIME_STEP * 1000;
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

export const getSecondsUntilChange = () => {
  const now = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(now / TIME_STEP);
  const nextChange = (currentStep + 1) * TIME_STEP;
  return nextChange - now;
};

export const getTimeStep = () => TIME_STEP;

export default {
  generateToken,
  generateResidentQRData,
  getSecondsUntilChange,
  getTimeStep,
  TIME_STEP,
};