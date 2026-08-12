const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const env = require('../config/env');

// R2 speaks the S3 API — same SDK, just pointed at the account's R2 endpoint
// with 'auto' region. Lazily constructed so importing this module never
// throws when R2 isn't configured (e.g. in tests that don't touch video
// routes); anything that actually calls the client requires the env vars.
let client = null;
function getClient() {
  if (client) return client;
  if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey) {
    throw new Error('R2 is not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  }
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  });
  return client;
}

// Uploads a local file (already ffmpeg-processed) to R2 under `key`.
async function uploadFile(key, body, contentType) {
  if (!env.r2Bucket) throw new Error('R2 is not configured — set R2_BUCKET_NAME');
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.r2Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return publicUrl(key);
}

async function deleteFile(key) {
  await getClient().send(new DeleteObjectCommand({ Bucket: env.r2Bucket, Key: key }));
}

// Builds the client-facing playable/thumbnail URL for an object key.
function publicUrl(key) {
  if (!env.r2PublicBaseUrl) throw new Error('R2 is not configured — set R2_PUBLIC_BASE_URL');
  return `${env.r2PublicBaseUrl}/${key}`;
}

module.exports = { getClient, uploadFile, deleteFile, publicUrl };
