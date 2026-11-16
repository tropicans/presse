import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import type { drive_v3 } from '@googleapis/drive'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/env', () => ({
  getDriveConfig: vi.fn(() => ({
    clientEmail: 'sa@test.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n',
    folderId: 'abcdefghij1234567890',
  })),
}))

vi.mock('google-auth-library', () => ({
  GoogleAuth: vi.fn(() => ({})),
}))

vi.mock('@googleapis/drive', () => ({
  drive: vi.fn(() => ({ files: { get: vi.fn() } })),
}))

const { __test__, PermanentDriveError } = await import('./drive')
const { classifyError, describeSafe, probe } = __test__

type StubDrive = { files: { get: ReturnType<typeof vi.fn> } }

function stubClient(
  getImpl: (args: unknown) => Promise<unknown>,
): drive_v3.Drive {
  const client: StubDrive = { files: { get: vi.fn(getImpl) } }
  return client as unknown as drive_v3.Drive
}

describe('classifyError', () => {
  it('classifies 404, invalid_grant, and 401 as permanent', () => {
    expect(classifyError({ response: { status: 404 } })).toBe('permanent')
    expect(
      classifyError({ response: { status: 400, data: { error: 'invalid_grant' } } }),
    ).toBe('permanent')
    expect(classifyError({ response: { status: 401 } })).toBe('permanent')
  })

  it('classifies no-response, ECONNRESET, 429, 5xx as transient', () => {
    expect(classifyError({})).toBe('transient')
    expect(classifyError(new Error('ECONNRESET'))).toBe('transient')
    expect(classifyError({ response: { status: 429 } })).toBe('transient')
    expect(classifyError({ response: { status: 500 } })).toBe('transient')
    expect(classifyError({ response: { status: 503 } })).toBe('transient')
  })
})

describe('describeSafe', () => {
  it('produces a safe short string per status', () => {
    expect(describeSafe({})).toBe('timeout')
    expect(describeSafe({ response: { status: 429 } })).toBe('HTTP 429')
    expect(
      describeSafe({ response: { status: 400, data: { error: 'invalid_grant' } } }),
    ).toBe('kredensial invalid')
  })

  it('strips tokens from config/response.data', () => {
    const leaky = {
      response: {
        status: 500,
        data: { error: 'x', token: 'LEAK-CANARY' },
      },
      config: { headers: { authorization: 'Bearer SECRET-TOKEN' } },
      request: { headers: { authorization: 'Bearer SECRET-TOKEN' } },
    }
    const reason = describeSafe(leaky)
    expect(reason).not.toContain('SECRET-TOKEN')
    expect(reason).not.toContain('LEAK-CANARY')
    expect(reason).toBe('HTTP 500')
  })
})

describe('probe', () => {
  it('rejects a folder without driveId (not a Shared Drive)', async () => {
    const client = stubClient(async () => ({
      data: { id: 'x', name: 'f', mimeType: 'application/vnd.google-apps.folder' },
    }))

    await expect(probe(client, 'folder-1')).rejects.toBeInstanceOf(PermanentDriveError)
    await expect(probe(client, 'folder-1')).rejects.toThrow(/bukan Shared Drive/)
  })

  it('rejects a Shared Drive folder without canAddChildren', async () => {
    const client = stubClient(async () => ({
      data: { id: 'x', driveId: 'sd-1', capabilities: { canAddChildren: false } },
    }))

    await expect(probe(client, 'folder-1')).rejects.toThrow(
      /tidak punya izin tulis|canAddChildren/,
    )
  })

  it('resolves to { state: ok, driveId } when driveId and canAddChildren present', async () => {
    const client = stubClient(async () => ({
      data: { id: 'x', driveId: 'sd-1', capabilities: { canAddChildren: true } },
    }))

    await expect(probe(client, 'folder-1')).resolves.toEqual({
      state: 'ok',
      driveId: 'sd-1',
    })
  })

  it('returns degraded with a safe reason on a transient error', async () => {
    const client = stubClient(async () => {
      throw { response: { status: 429 } }
    })

    const result = await probe(client, 'folder-1')
    expect(result.state).toBe('degraded')
    if (result.state === 'degraded') {
      expect(result.reason).toBe('HTTP 429')
    }
  })

  it('passes supportsAllDrives:true and the expected fields to files.get', async () => {
    const client = stubClient(async () => ({
      data: { id: 'x', driveId: 'sd-1', capabilities: { canAddChildren: true } },
    }))

    await probe(client, 'folder-1')
    const stub = client as unknown as StubDrive
    expect(stub.files.get).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'folder-1',
        supportsAllDrives: true,
        fields: expect.stringContaining('driveId'),
      }),
    )
  })
})

describe('drive.ts static guards', () => {
  const source = readFileSync(
    fileURLToPath(new URL('./drive.ts', import.meta.url)),
    'utf8',
  )

  it('imports server-only and uses the drive.file scope literal', () => {
    expect(source).toContain("import 'server-only'")
    expect(source).toContain('auth/drive.file')
  })

  it('uses supportsAllDrives:true', () => {
    expect(source).toMatch(/supportsAllDrives:\s*true/)
  })

  it('does not use a bare auth/drive scope', () => {
    expect(source).not.toMatch(/auth\/drive['"]/)
  })

  it('does not call drives.get or files.list', () => {
    expect(source).not.toMatch(/drives\.get/)
    expect(source).not.toMatch(/files\.list/)
  })

  it('does not set type:anyone permissions', () => {
    expect(source).not.toMatch(/type:\s*'anyone'/)
  })

  it('does not console.log the private key', () => {
    expect(source).not.toMatch(/console\.log\([^)]*privateKey/)
  })
})
