const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { env } = require('./env');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

let s3Client = null;

function getS3Client() {
  if (env.USE_LOCAL_STORAGE) return null;

  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
    logger.info('✅ AWS S3 client initialized');
  }
  return s3Client;
}

// Local storage fallback
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

function ensureUploadDir(subDir) {
  const dir = path.join(UPLOAD_DIR, subDir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function uploadFile(fileBuffer, key, contentType) {
  if (env.USE_LOCAL_STORAGE) {
    const filePath = path.join(UPLOAD_DIR, key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, fileBuffer);
    logger.info(`📁 File saved locally: ${key}`);
    return `local://${key}`;
  }

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );
  logger.info(`☁️ File uploaded to S3: ${key}`);
  return `s3://${env.S3_BUCKET}/${key}`;
}

async function getSignedFileUrl(key) {
  if (env.USE_LOCAL_STORAGE) {
    // Return local API URL for serving files
    return `/api/v1/files/${encodeURIComponent(key)}`;
  }

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

module.exports = { getS3Client, uploadFile, getSignedFileUrl, ensureUploadDir, UPLOAD_DIR };
