import 'server-only'

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getStorageConfig, type StorageConfig } from './env'

interface StorageGlobal {
  __s3?: S3Client
  __s3Config?: StorageConfig
}

const g = globalThis as typeof globalThis & StorageGlobal

/**
 * Builds an S3 client for the configured MinIO endpoint. path-style addressing
 * is mandatory: MinIO serves buckets as path segments, and virtual-host style
 * would require wildcard DNS that a compose-internal hostname does not have.
 */
export function buildStorageClient(config: StorageConfig = getStorageConfig()): S3Client {
  return new S3Client({
    region: 'us-east-1',
    endpoint: `${config.useSSL ? 'https' : 'http'}://${config.endpoint}:${config.port}`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  })
}

export function getStorageClient(): S3Client {
  return (g.__s3 ??= buildStorageClient((g.__s3Config ??= getStorageConfig())))
}

export function getBucket(): string {
  return (g.__s3Config ??= getStorageConfig()).bucket
}

export async function ensureBucket(): Promise<void> {
  const client = getStorageClient()
  const bucket = getBucket()
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch (err: unknown) {
    const errorName = (err as { name?: string })?.name
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
    if (errorName === 'NoSuchBucket' || errorName === 'NotFound' || status === 404) {
      await client.send(new CreateBucketCommand({ Bucket: bucket }))
      return
    }
    throw err
  }
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await ensureBucket()
  await getStorageClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.byteLength,
    }),
  )
}

export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const response = await getStorageClient().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  )

  if (!response.Body) {
    throw new Error(`object kosong: ${key}`)
  }

  return response.Body.transformToByteArray()
}

export async function deleteObject(key: string): Promise<void> {
  await getStorageClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  )
}

export async function headBucket(): Promise<void> {
  await getStorageClient().send(new HeadBucketCommand({ Bucket: getBucket() }))
}

/**
 * Deterministic object key: the same file record always maps to the same key,
 * so a retried upload overwrites instead of duplicating.
 */
export function buildObjectKey(fileId: string): string {
  return `files/${fileId}`
}
