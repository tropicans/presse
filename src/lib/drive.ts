import 'server-only'

import { GoogleAuth } from 'google-auth-library'
import { drive as createDriveClient, type drive_v3 } from '@googleapis/drive'
import { getDriveConfig } from './env'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const REPROBE_INTERVAL_MS = 60_000

export class PermanentDriveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PermanentDriveError'
  }
}

export interface ProbeOk {
  state: 'ok'
  driveId: string
}

export interface ProbeDegraded {
  state: 'degraded'
  reason: string
}

export type ProbeResult = ProbeOk | ProbeDegraded

interface DriveGlobal {
  __drive?: drive_v3.Drive
  __driveState?: ProbeResult
  __driveTimer?: NodeJS.Timeout
}

const g = globalThis as typeof globalThis & DriveGlobal

interface GaxiosLikeError {
  response?: {
    status?: number
    data?: { error?: unknown }
  }
  config?: unknown
  request?: unknown
}

function asGaxios(err: unknown): GaxiosLikeError | undefined {
  if (err && typeof err === 'object') {
    return err as GaxiosLikeError
  }
  return undefined
}

/**
 * Produces a short, safe reason string for a Google API failure without ever
 * leaking the credential, the request, or the response body.
 */
export function describeSafe(err: unknown): string {
  const e = asGaxios(err)
  const status = e?.response?.status

  if (status === undefined) {
    return 'timeout'
  }

  const errPayload = e?.response?.data?.error
  if (errPayload === 'invalid_grant') {
    return 'kredensial invalid'
  }

  return `HTTP ${status}`
}

/**
 * Pure classification of a Google API failure:
 * - permanent: the credentials or the target folder will never recover without
 *   an operator fixing config → process should fail-fast.
 * - transient: retryable / network conditions → boot degraded and retry.
 */
export function classifyError(err: unknown): 'permanent' | 'transient' {
  const e = asGaxios(err)

  if (!e?.response) {
    return 'transient'
  }

  const status = e.response.status
  const errPayload = e.response.data?.error

  if (errPayload === 'invalid_grant') {
    return 'permanent'
  }
  if (status === 401) {
    return 'permanent'
  }
  if (status === 404) {
    return 'permanent'
  }

  return 'transient'
}

function buildClient(): drive_v3.Drive {
  const { clientEmail, privateKey } = getDriveConfig()
  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [DRIVE_SCOPE],
  })

  return createDriveClient({ version: 'v3', auth })
}

export function getDriveClient(): drive_v3.Drive {
  return (g.__drive ??= buildClient())
}

interface ProbeFolderFields {
  id?: string | null
  name?: string | null
  mimeType?: string | null
  driveId?: string | null
  capabilities?: {
    canAddChildren?: boolean | null
  } | null
}

/**
 * Probes the target folder with files.get. Refuses a non-Shared-Drive folder
 * (no driveId) and a folder the SA cannot write to (canAddChildren false).
 *
 * Throws on permanent errors (so register() can exit non-zero); returns a
 * degraded result for transient conditions.
 */
export async function probe(
  client: drive_v3.Drive,
  folderId: string,
): Promise<ProbeResult> {
  try {
    const response = await client.files.get({
      fileId: folderId,
      fields: 'id,name,mimeType,driveId,capabilities(canAddChildren)',
      supportsAllDrives: true,
    })

    const data = (response?.data ?? {}) as ProbeFolderFields
    const driveId = data.driveId ?? undefined

    if (!driveId) {
      throw new PermanentDriveError(
        `Folder ${folderId} bukan Shared Drive (tidak ada driveId)`,
      )
    }

    if (!data.capabilities?.canAddChildren) {
      throw new PermanentDriveError(
        `Service account tidak punya izin tulis ke folder ${folderId} (capabilities.canAddChildren false)`,
      )
    }

    return { state: 'ok', driveId }
  } catch (err) {
    if (err instanceof PermanentDriveError) {
      throw err
    }

    if (classifyError(err) === 'permanent') {
      throw new Error(
        `Kredensial Google invalid: ${describeSafe(err)}`,
      )
    }

    return { state: 'degraded', reason: describeSafe(err) }
  }
}

function scheduleReprobe(client: drive_v3.Drive, folderId: string): void {
  if (g.__driveTimer) {
    return
  }

  g.__driveTimer = setInterval(async () => {
    if (g.__driveState?.state === 'ok') {
      return
    }

    try {
      const next = await probe(client, folderId)
      g.__driveState = next
      if (next.state === 'ok') {
        console.info('[drive] recovered — leaving degraded mode')
      }
    } catch {
      // Keep the last known state. Never exit on a re-probe failure (D-03).
    }
  }, REPROBE_INTERVAL_MS)

  g.__driveTimer.unref?.()
}

/**
 * Runs the initial probe. Throws on a permanent error so the instrumentation
 * hook can let Next exit the process non-zero (D-01 fail-fast). A transient
 * error leaves the process in degraded mode and schedules a 60s re-probe.
 */
export async function startDriveProbe(): Promise<void> {
  const { folderId } = getDriveConfig()
  const client = getDriveClient()

  g.__driveState = await probe(client, folderId)

  if (g.__driveState.state === 'degraded') {
    console.warn('[drive] degraded —', g.__driveState.reason)
  }

  scheduleReprobe(client, folderId)
}

/**
 * Synchronous read used by /api/health. Returns a safe initial state before
 * the instrumentation hook has finished its first probe.
 */
export function getDriveState(): ProbeResult {
  return g.__driveState ?? { state: 'degraded', reason: 'belum di-probe' }
}

export const __test__ = {
  classifyError,
  describeSafe,
  probe,
}
