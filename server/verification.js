const { createHash, randomInt, timingSafeEqual } = require('node:crypto');

const { config } = require('./config');

function nowIso() {
  return new Date().toISOString();
}

function makeVerificationCode() {
  return String(randomInt(100000, 999999));
}

function hashVerificationCode(id, code) {
  return createHash('sha256')
    .update(`${id}:${String(code || '').trim()}:${config.sessionSecret}`)
    .digest('hex');
}

function verifyCodeHash(id, code, expectedHash) {
  const left = Buffer.from(hashVerificationCode(id, code), 'hex');
  const right = Buffer.from(String(expectedHash || ''), 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

module.exports = {
  hashVerificationCode,
  makeVerificationCode,
  nowIso,
  verifyCodeHash,
};
