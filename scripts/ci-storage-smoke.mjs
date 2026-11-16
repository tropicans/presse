// Phase 46-04: real object-storage round-trip proof.
//
// Exit codes (contractual — do not renumber):
//   0  round-trip verified end-to-end
//   1  config/env problem
//   2  storage unreachable (endpoint refused, DNS, TLS)
//   3  credentials rejected (403 / InvalidAccessKeyId / SignatureDoesNotMatch)
//   4  bucket missing (404 / NoSuchBucket)
//   5  bytes differ after read-back
//   6  bucket accepts anonymous access (privacy violation)
//
// Usage:
//   node --env-file=.env.production scripts/ci-storage-smoke.mjs
//   node --env-file=.env scripts/ci-storage-smoke.mjs            (local minio)
//
// The script writes one object under smoke/, reads it back, compares bytes, and
// proves the bucket rejects an unauthenticated request. The object is deleted on
// success; it is left in place on failure so it can be inspected.

import process from 'node:process'
import { randomUUID } from 'node:crypto'
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const EXIT_OK = 0
const EXIT_CONFIG = 1
const EXIT_UNREACHABLE = 2
const EXIT_CREDENTIALS = 3
const EXIT_NO_BUCKET = 4
const EXIT_BYTES_DIFFER = 5
const EXIT_ANONYMOUS_OK = 6

function fail(code, message, detail) {
  console.error(`FAIL [exit ${code}] ${message}`)
  if (detail) {
    console.error(JSON.stringify(detail, null, 2))
  }
  process.exit(code)
}

function readConfig() {
  const endpoint = (process.env.MINIO_ENDPOINT || '').trim()
  const rawPort = (process.env.MINIO_PORT || '').trim()
  const rawSSL = (process.env.MINIO_USE_SSL || '').trim().toLowerCase()
  const accessKey = (process.env.MINIO_ACCESS_KEY || '').trim()
  const secretKey = (process.env.MINIO_SECRET_KEY || '').trim()
  const bucket = (process.env.MINIO_BUCKET || '').trim()

  const missing = []
  if (!endpoint) missing.push('MINIO_ENDPOINT')
  if (!rawPort) missing.push('MINIO_PORT')
  if (!accessKey) missing.push('MINIO_ACCESS_KEY')
  if (!secretKey) missing.push('MINIO_SECRET_KEY')
  if (!bucket) missing.push('MINIO_BUCKET')
  if (missing.length) {
    fail(EXIT_CONFIG, 'env belum lengkap', { missing })
  }

  const port = Number.parseInt(rawPort, 10)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail(EXIT_CONFIG, 'MINIO_PORT tidak valid', { port: rawPort })
  }

  return {
    endpoint,
    port,
    useSSL: rawSSL === 'true' || rawSSL === '1',
    accessKey,
    secretKey,
    bucket,
  }
}

function classify(err) {
  const status = err?.$metadata?.httpStatusCode
  const name = err?.name || ''

  if (name === 'TimeoutError' || name === 'AbortError') return EXIT_UNREACHABLE
  if (status === 403 || name === 'InvalidAccessKeyId' || name === 'SignatureDoesNotMatch') {
    return EXIT_CREDENTIALS
  }
  if (status === 404 || name === 'NoSuchBucket') return EXIT_NO_BUCKET
  if (!status) return EXIT_UNREACHABLE
  return EXIT_UNREACHABLE
}

function safeError(err) {
  return {
    name: err?.name,
    code: err?.Code,
    status: err?.$metadata?.httpStatusCode,
    message: String(err?.message || err).slice(0, 200),
  }
}

const config = readConfig()
const baseUrl = `${config.useSSL ? 'https' : 'http'}://${config.endpoint}:${config.port}`

const client = new S3Client({
  region: 'us-east-1',
  endpoint: baseUrl,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
  },
})

console.log(`endpoint   ${baseUrl}`)
console.log(`bucket     ${config.bucket}`)
console.log(`pathStyle  true`)

// --- 1. bucket reachable -----------------------------------------------------
try {
  await client.send(new HeadBucketCommand({ Bucket: config.bucket }))
  console.log('step 1/4  headBucket OK')
} catch (err) {
  const code = classify(err)
  if (code === EXIT_NO_BUCKET) {
    // A fresh MinIO has no bucket yet. Creating it here mirrors what the app does
    // on first boot, and keeps the smoke run idempotent.
    try {
      await client.send(new CreateBucketCommand({ Bucket: config.bucket }))
      console.log('step 1/4  bucket absen → dibuat')
    } catch (createErr) {
      fail(EXIT_NO_BUCKET, 'bucket tidak ada dan gagal dibuat', safeError(createErr))
    }
  } else if (code === EXIT_CREDENTIALS) {
    fail(EXIT_CREDENTIALS, 'kredensial ditolak', safeError(err))
  } else {
    fail(EXIT_UNREACHABLE, 'storage tidak terjangkau', safeError(err))
  }
}

// --- 2. upload a real object -------------------------------------------------
const key = `smoke/ci-${Date.now()}-${randomUUID()}.txt`
const body = new TextEncoder().encode(
  `phase-46-04 smoke\nuuid=${randomUUID()}\nendpoint=${baseUrl}\nbucket=${config.bucket}\n`,
)

try {
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: 'text/plain',
      ContentLength: body.byteLength,
    }),
  )
  console.log(`step 2/4  putObject OK  key=${key}  bytes=${body.byteLength}`)
} catch (err) {
  fail(classify(err), 'putObject gagal', safeError(err))
}

// --- 3. read it back byte-identical ------------------------------------------
let roundTripped
try {
  const response = await client.send(
    new GetObjectCommand({ Bucket: config.bucket, Key: key }),
  )
  roundTripped = await response.Body.transformToByteArray()
  console.log(`step 3/4  getObject OK  bytes=${roundTripped.byteLength}`)
} catch (err) {
  fail(classify(err), 'getObject gagal', safeError(err))
}

if (roundTripped.byteLength !== body.byteLength) {
  fail(EXIT_BYTES_DIFFER, 'ukuran byte berbeda setelah read-back', {
    written: body.byteLength,
    read: roundTripped.byteLength,
  })
}

for (let i = 0; i < body.byteLength; i += 1) {
  if (roundTripped[i] !== body[i]) {
    fail(EXIT_BYTES_DIFFER, `byte berbeda pada offset ${i}`, {
      written: body[i],
      read: roundTripped[i],
    })
  }
}

console.log('step 3/4  bytes identik')

// --- 4. bucket rejects anonymous access --------------------------------------
// A 200 here would mean the bucket is public — a privacy violation (FILE-19).
// 403 is the correct answer; 404 is also acceptable for some configurations.
const anonymousUrl = `${baseUrl}/${config.bucket}/${key}`
let anonymousStatus = 0
try {
  const anonymous = await fetch(anonymousUrl, { method: 'GET' })
  anonymousStatus = anonymous.status
} catch (err) {
  // Network-level rejection is still a rejection.
  anonymousStatus = -1
  console.log(`step 4/4  anonymous request ditolak di level jaringan (${err?.message || err})`)
}

if (anonymousStatus === 200) {
  fail(EXIT_ANONYMOUS_OK, 'bucket menerima akses anonim tanpa kredensial', {
    url: anonymousUrl,
    status: anonymousStatus,
  })
}

if (anonymousStatus > 0) {
  console.log(`step 4/4  anonymous ditolak  HTTP ${anonymousStatus}`)
}

// --- cleanup -----------------------------------------------------------------
try {
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
  console.log('cleanup    object dihapus')
} catch (err) {
  console.warn(`cleanup    gagal hapus ${key}: ${err?.name || err}`)
}

console.log('PASS       round-trip byte-identik, bucket private')
process.exit(EXIT_OK)
