const {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
} = require('node:crypto');

const { config } = require('./config');

const ENCRYPTION_PREFIX = 'enc:v1';
const SESSION_PREFIX = 'st:v1';

const encryptionKey = scryptSync(config.dataEncryptionSecret, 'vcar:data', 32);
const lookupKey = scryptSync(config.lookupSecret, 'vcar:lookup', 32);
const sessionKey = scryptSync(config.sessionSecret, 'vcar:session', 32);

function normalizeIdentifier(value) {
  return String(value || '').trim().toLocaleLowerCase('tr');
}

function isEncryptedText(value) {
  return typeof value === 'string' && value.startsWith(`${ENCRYPTION_PREFIX}:`);
}

function encryptText(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const plainText = String(value);
  if (isEncryptedText(plainText)) {
    return plainText;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

function decryptText(value, fallback = '') {
  if (!value) {
    return fallback;
  }

  if (!isEncryptedText(value)) {
    return value;
  }

  try {
    const [, , ivValue, tagValue, cipherValue] = value.split(':');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey,
      Buffer.from(ivValue, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherValue, 'base64url')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    return fallback;
  }
}

function encryptJson(value) {
  return encryptText(JSON.stringify(value ?? null));
}

function decryptJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(decryptText(value, value));
  } catch {
    return fallback;
  }
}

function makeLookupHash(value) {
  return createHmac('sha256', lookupKey).update(normalizeIdentifier(value)).digest('hex');
}

function hashSessionToken(token) {
  return `${SESSION_PREFIX}:${createHmac('sha256', sessionKey).update(String(token || '')).digest('hex')}`;
}

function isHashedSessionToken(value) {
  return typeof value === 'string' && value.startsWith(`${SESSION_PREFIX}:`);
}

module.exports = {
  decryptJson,
  decryptText,
  encryptJson,
  encryptText,
  hashSessionToken,
  isEncryptedText,
  isHashedSessionToken,
  makeLookupHash,
  normalizeIdentifier,
};
