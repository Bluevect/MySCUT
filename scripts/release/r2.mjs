import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import {
  DeleteObjectsCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { calculateFileMetadata } from './shared.mjs'

function encodeObjectKey(objectKey) {
  return objectKey
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function buildR2ReleaseObjectKey({ keyPrefix, version, fileName }) {
  const normalizedPrefix = keyPrefix.replace(/^\/+|\/+$/g, '')
  return `${normalizedPrefix}/v${version}/${fileName}`
}

export function buildR2LatestVersionsObjectKey({ keyPrefix }) {
  const normalizedPrefix = keyPrefix.replace(/^\/+|\/+$/g, '')
  return `${normalizedPrefix}/versions.json`
}

// nightly 通道对象键：latest 指针放在 history/ 前缀之外，避免被 7 天生命周期规则清除
export function buildNightlyManifestObjectKey({ keyPrefix }) {
  const normalizedPrefix = keyPrefix.replace(/^\/+|\/+$/g, '')
  return `${normalizedPrefix}/nightly/versions.json`
}

export function buildNightlyLatestApkObjectKey({ keyPrefix, fileName }) {
  const normalizedPrefix = keyPrefix.replace(/^\/+|\/+$/g, '')
  return `${normalizedPrefix}/nightly/latest/${fileName}`
}

export function buildNightlyHistoryApkObjectKey({ keyPrefix, stamp, fileName }) {
  const normalizedPrefix = keyPrefix.replace(/^\/+|\/+$/g, '')
  return `${normalizedPrefix}/nightly/history/${stamp}/${fileName}`
}

export function buildR2PublicUrl({ publicBaseUrl, objectKey }) {
  return `${publicBaseUrl}/${encodeObjectKey(objectKey)}`
}

function detectContentType(filePath) {
  const fileName = basename(filePath).toLowerCase()
  if (fileName.endsWith('.apk')) {
    return 'application/vnd.android.package-archive'
  }

  if (fileName.endsWith('.ipa')) {
    return 'application/octet-stream'
  }

  if (fileName.endsWith('.json')) {
    return 'application/json; charset=utf-8'
  }

  return 'application/octet-stream'
}

// 版本化 APK 地址永不复用，可长缓存并标记 immutable；清单要求每次回源校验新鲜度
function detectCacheControl(filePath) {
  const contentType = detectContentType(filePath)
  if (contentType.startsWith('application/vnd.android.package-archive') || contentType === 'application/octet-stream') {
    return 'public, max-age=31536000, immutable'
  }

  return 'public, no-cache'
}

function createR2Client(r2Config) {
  return new S3Client({
    region: 'auto',
    endpoint: r2Config.endpoint,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  })
}

export async function uploadReleaseAssetToR2({ localFilePath, objectKey, r2Config }) {
  const s3Client = createR2Client(r2Config)

  const body = readFileSync(localFilePath)
  const metadata = calculateFileMetadata(localFilePath)
  await s3Client.send(
    new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: detectContentType(localFilePath),
      CacheControl: detectCacheControl(localFilePath),
      Metadata: {
        sha256: metadata.sha256,
      },
    }),
  )

  return {
    url: buildR2PublicUrl({
      publicBaseUrl: r2Config.publicBaseUrl,
      objectKey,
    }),
    metadata,
  }
}

export async function verifyR2ReleaseAsset({ localFilePath, objectKey, r2Config }) {
  const expected = calculateFileMetadata(localFilePath)
  const s3Client = createR2Client(r2Config)
  const headResult = await s3Client.send(new HeadObjectCommand({
    Bucket: r2Config.bucket,
    Key: objectKey,
  }))

  if (headResult.ContentLength !== expected.size) {
    throw new Error(`R2 HEAD size mismatch for ${objectKey}: expected ${expected.size}, got ${headResult.ContentLength}`)
  }

  if (headResult.Metadata?.sha256 !== expected.sha256) {
    throw new Error(`R2 HEAD SHA256 metadata mismatch for ${objectKey}`)
  }

  const publicUrl = buildR2PublicUrl({
    publicBaseUrl: r2Config.publicBaseUrl,
    objectKey,
  })
  const publicHead = await fetch(publicUrl, {
    method: 'HEAD',
    cache: 'no-store',
  })
  if (!publicHead.ok) {
    throw new Error(`R2 public HEAD failed for ${publicUrl} (${publicHead.status})`)
  }

  const publicLength = Number(publicHead.headers.get('content-length'))
  if (publicLength !== expected.size) {
    throw new Error(`R2 public size mismatch for ${publicUrl}: expected ${expected.size}, got ${publicLength}`)
  }

  const publicResponse = await fetch(publicUrl, { cache: 'no-store' })
  if (!publicResponse.ok) {
    throw new Error(`R2 public download failed for ${publicUrl} (${publicResponse.status})`)
  }

  const publicBody = Buffer.from(await publicResponse.arrayBuffer())
  const publicSha256 = createHash('sha256').update(publicBody).digest('hex')
  if (publicBody.byteLength !== expected.size || publicSha256 !== expected.sha256) {
    throw new Error(`R2 public content verification failed for ${publicUrl}`)
  }

  return {
    url: publicUrl,
    metadata: expected,
  }
}

export async function uploadAndVerifyReleaseAssetToR2(input) {
  await uploadReleaseAssetToR2(input)
  return verifyR2ReleaseAsset(input)
}

// 按确定键删除对象（stable 发版成功后清理上一版目录，保持 R2 只留最新 stable）。
// 不用 ListObjectsV2：R2 的 Object Read & Write token 不含 List 权限，且 R2 对
// 无法匹配对象的前缀会返回误导性的 NoSuchKey 404；上一版对象键完全可推导，无需枚举。
export async function deleteR2ObjectsByKeys({ r2Config, keys }) {
  if (keys.length === 0) {
    return 0
  }

  const s3Client = createR2Client(r2Config)
  const result = await s3Client.send(
    new DeleteObjectsCommand({
      Bucket: r2Config.bucket,
      Delete: { Objects: keys.map((key) => ({ Key: key })) },
    }),
  )

  const fatalErrors = (result.Errors ?? []).filter((entry) => entry.Code !== 'NoSuchKey')
  if (fatalErrors.length > 0) {
    throw new Error(`R2 delete failed: ${fatalErrors.map((entry) => `${entry.Key} (${entry.Code})`).join(', ')}`)
  }

  return keys.length - (result.Errors ?? []).length
}
