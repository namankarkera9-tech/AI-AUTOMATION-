const crypto = require('crypto');
const config = require('../config/env');

// Ensure a 32-byte key
function getEncryptionKey() {
  const rawKey = config.encryptionKey;
  if (!rawKey) throw new Error('CREDENTIAL_ENCRYPTION_KEY is required to encrypt credentials');
  if (rawKey.length === 64) {
    return Buffer.from(rawKey, 'hex');
  }
  return crypto.createHash('sha256').update(String(rawKey)).digest();
}

/**
 * Encrypt plain text using AES-256-GCM
 * Returns string in format: iv:authTag:encryptedData
 */
function encrypt(plainText) {
  if (!plainText) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt cipher text in format iv:authTag:encryptedData
 */
function decrypt(cipherText) {
  if (!cipherText) return null;
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid cipher text format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message);
  }
}

module.exports = {
  encrypt,
  decrypt,
};
