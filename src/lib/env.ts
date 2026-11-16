type EnvSource = Record<string, string | undefined>

export function readRequiredEnv(env: EnvSource, name: string): string {
  const value = env[name]?.trim()

  if (!value) {
    throw new Error(`${name} wajib diisi`)
  }

  return value
}

export function readRequiredEnvList(env: EnvSource, name: string): string[] {
  return readRequiredEnv(env, name)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const STORAGE_BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/

export interface StorageConfig {
  endpoint: string
  port: number
  useSSL: boolean
  accessKey: string
  secretKey: string
  bucket: string
}

export function getStorageConfig(env: EnvSource = process.env): StorageConfig {
  const endpoint = readRequiredEnv(env, 'MINIO_ENDPOINT')

  const rawPort = readRequiredEnv(env, 'MINIO_PORT')
  const port = Number.parseInt(rawPort, 10)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('MINIO_PORT tidak valid')
  }

  const rawUseSSL = (env.MINIO_USE_SSL ?? '').trim().toLowerCase()
  const useSSL = rawUseSSL === 'true' || rawUseSSL === '1'

  const accessKey = readRequiredEnv(env, 'MINIO_ACCESS_KEY')
  const secretKey = readRequiredEnv(env, 'MINIO_SECRET_KEY')

  const bucket = readRequiredEnv(env, 'MINIO_BUCKET')
  if (!STORAGE_BUCKET_PATTERN.test(bucket)) {
    throw new Error('MINIO_BUCKET tidak valid')
  }

  return { endpoint, port, useSSL, accessKey, secretKey, bucket }
}

interface RequestLike {
  nextUrl?: { origin?: string }
  headers?: { get(name: string): string | null }
}

export function getAppBaseUrl(req?: RequestLike): string {
  // 1. Prioritize canonical NEXTAUTH_URL if configured and not 0.0.0.0
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim()
  if (nextAuthUrl && !nextAuthUrl.includes('0.0.0.0')) {
    return nextAuthUrl.replace(/\/$/, '')
  }

  // 2. Check forwarded headers if available from proxy
  if (req?.headers) {
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
    if (host && !host.includes('0.0.0.0')) {
      return `${proto}://${host}`.replace(/\/$/, '')
    }
  }

  // 3. Fallback to request origin if not 0.0.0.0
  if (req?.nextUrl?.origin && !req.nextUrl.origin.includes('0.0.0.0')) {
    return req.nextUrl.origin.replace(/\/$/, '')
  }

  // 4. Safe default
  return 'http://localhost:3456'
}
