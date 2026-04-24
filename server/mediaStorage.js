const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const { Storage } = require('@google-cloud/storage');

const { config } = require('./config');
const { logError, logInfo } = require('./logger');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
]);

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

let storageClient;
let bucket;

function getFileExtension(file) {
  const explicitExtension = path.extname(file.originalname || '');
  if (explicitExtension) {
    return explicitExtension.toLowerCase();
  }

  const mimeExtension = file.mimetype?.split('/')[1];
  if (mimeExtension) {
    return `.${mimeExtension.toLowerCase()}`;
  }

  return '.bin';
}

function getContentType(file) {
  return file.mimetype || 'application/octet-stream';
}

function getMaxBytesForMimeType(mimeType) {
  if (mimeType === 'application/pdf') {
    return MAX_PDF_BYTES;
  }

  if (mimeType.startsWith('video/')) {
    return MAX_VIDEO_BYTES;
  }

  return MAX_IMAGE_BYTES;
}

function validateUploadedMedia(file) {
  if (!file || !file.buffer?.length) {
    const error = new Error('Yuklenecek medya verisi bulunamadi.');
    error.statusCode = 400;
    throw error;
  }

  const mimeType = getContentType(file);
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    const error = new Error('Bu dosya tipi desteklenmiyor.');
    error.statusCode = 415;
    throw error;
  }

  const maxBytes = getMaxBytesForMimeType(mimeType);
  if (Number(file.size || file.buffer.length || 0) > maxBytes) {
    const error = new Error('Dosya boyutu izin verilen siniri asiyor.');
    error.statusCode = 413;
    throw error;
  }

  return {
    mimeType,
    extension: getFileExtension(file),
  };
}

function makeObjectName(file) {
  const extension = getFileExtension(file);
  const safePrefix = config.uploadsPrefix || config.gcsUploadsPrefix || 'media';
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${safePrefix}/${year}/${month}/${day}/${Date.now()}-${randomUUID()}${extension}`;
}

function getBucket() {
  if (!config.gcsBucketName) {
    throw new Error('GCS bucket tanimli degil.');
  }

  if (!storageClient) {
    storageClient = new Storage({
      projectId: config.gcpProjectId || undefined,
    });
  }

  if (!bucket) {
    bucket = storageClient.bucket(config.gcsBucketName);
  }

  return bucket;
}

async function saveToGcs(file) {
  const objectName = makeObjectName(file);
  const gcsFile = getBucket().file(objectName);
  const contentType = getContentType(file);

  await gcsFile.save(file.buffer, {
    resumable: false,
    validation: 'crc32c',
    contentType,
    metadata: {
      cacheControl: contentType === 'application/pdf' ? 'private, max-age=0, no-transform' : 'public, max-age=31536000, immutable',
    },
  });

  if (config.gcsPublicBaseUrl && contentType !== 'application/pdf') {
    return `${config.gcsPublicBaseUrl}/${objectName}`;
  }

  const [signedUrl] = await gcsFile.getSignedUrl({
    action: 'read',
    version: 'v4',
    expires: Date.now() + config.gcsSignedUrlTtlSeconds * 1000,
  });

  return signedUrl;
}

function buildLocalRelativePath(objectName) {
  return objectName.replace(/\\/g, '/').replace(/^\/+/, '');
}

function buildLocalFileUrl(objectName) {
  const relativePath = buildLocalRelativePath(objectName);
  const basePath = `${config.uploadsBasePath}/${relativePath}`.replace(/\/{2,}/g, '/');
  if (config.uploadsPublicBaseUrl) {
    return `${config.uploadsPublicBaseUrl}${basePath}`;
  }

  const publicBaseUrl = String(config.publicBaseUrl || '').replace(/\/+$/g, '');
  if (publicBaseUrl) {
    return `${publicBaseUrl}${basePath}`;
  }

  return basePath;
}

async function saveToLocal(file) {
  const objectName = makeObjectName(file);
  const localFilePath = path.join(config.uploadDir, buildLocalRelativePath(objectName));
  await fs.mkdir(path.dirname(localFilePath), { recursive: true });
  await fs.writeFile(localFilePath, file.buffer);
  return buildLocalFileUrl(objectName);
}

async function saveUploadedMedia(file) {
  try {
    validateUploadedMedia(file);
    const url =
      config.storageDriver === 'gcs'
        ? await saveToGcs(file)
        : await saveToLocal(file);
    logInfo('storage.upload.success', {
      driver: config.storageDriver,
      contentType: getContentType(file),
      originalName: file.originalname || '',
      bytes: Number(file.size || file.buffer?.length || 0),
    });
    return url;
  } catch (error) {
    logError('storage.upload.failed', {
      originalName: file?.originalname || '',
      contentType: file?.mimetype || '',
      bytes: Number(file?.size || file?.buffer?.length || 0),
      error,
    });
    throw error;
  }
}

module.exports = {
  saveUploadedMedia,
  validateUploadedMedia,
};
