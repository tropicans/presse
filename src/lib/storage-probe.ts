import 'server-only'

import { getStorageConfig } from './env'
import { ensureBucket } from './storage'

const REPROBE_INTERVAL_MS = 60_000

export interface StorageProbeOk {
  state: 'ok'
  bucket: string
}

export interface StorageProbeDegraded {
  state: 'degraded'
  reason: string
}

export type StorageProbeResult = StorageProbeOk | StorageProbeDegraded

interface StorageProbeGlobal {
  __storageState?: StorageProbeResult
  __storageTimer?: NodeJS.Timeout
}

const g = globalThis as typeof globalThis & StorageProbeGlobal

interface AwsLikeError {
  name?: string
  $metadata?: { httpStatusCode?: number }
  Code?: string
}

function asAwsError(err: unknown): AwsLikeError | undefined {
  if (err && typeof err === 'object') {
    return err as AwsLikeError
  }
  return undefined
}

/**
 * Produces a short, safe reason string for a storage failure. Never includes
 * credentials or request bodies.
 */
export function describeStorageError(err: unknown): string {
  const e = asAwsError(err)

  if (!e) {
    return 'unknown'
  }

  if (e.name === 'TimeoutError' || e.name === 'AbortError') {
    return 'timeout'
  }

  const status = e.$metadata?.httpStatusCode
  if (status === 403 || e.name === 'InvalidAccessKeyId' || e.name === 'SignatureDoesNotMatch') {
    return 'kredensial invalid'
  }
  if (e.name === 'NoSuchBucket' || status === 404) {
    return 'bucket tidak ditemukan'
  }
  if (status !== undefined) {
    return `HTTP ${status}`
  }

  return e.Code ?? e.name ?? 'unknown'
}

/**
 * Probes the bucket with headBucket. A failure NEVER throws: object storage
 * being down must leave the app running in spool-only mode (D-03), so the
 * submission path keeps working while sync retries later.
 */
export async function probeStorage(): Promise<StorageProbeResult> {
  const { bucket } = getStorageConfig()

  try {
    await ensureBucket()
    return { state: 'ok', bucket }
  } catch (err) {
    return { state: 'degraded', reason: describeStorageError(err) }
  }
}

function scheduleReprobe(): void {
  if (g.__storageTimer) {
    return
  }

  g.__storageTimer = setInterval(async () => {
    if (g.__storageState?.state === 'ok') {
      return
    }

    const next = await probeStorage()
    g.__storageState = next
    if (next.state === 'ok') {
      console.info('[storage] recovered — leaving degraded mode')
    }
  }, REPROBE_INTERVAL_MS)

  g.__storageTimer.unref?.()
}

/**
 * Runs the initial probe at boot. Never exits the process: the app boots into
 * spool-only mode when storage is unreachable.
 */
export async function startStorageProbe(): Promise<void> {
  g.__storageState = await probeStorage()

  if (g.__storageState.state === 'degraded') {
    console.warn('[storage] degraded —', g.__storageState.reason)
  }

  scheduleReprobe()
}

export function getStorageState(): StorageProbeResult {
  return g.__storageState ?? { state: 'degraded', reason: 'belum di-probe' }
}

export const __test__ = {
  describeStorageError,
}
