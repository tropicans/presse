import { describe, expect, it } from 'vitest'
import { getAppBaseUrl, getDriveConfig, readRequiredEnv, readRequiredEnvList } from './env'

describe('env validation', () => {
  it('throws for missing required env', () => {
    expect(() => readRequiredEnv({ NAME: undefined }, 'NAME')).toThrow('NAME wajib diisi')
  })

  it('throws for blank required env', () => {
    expect(() => readRequiredEnv({ NAME: '   ' }, 'NAME')).toThrow('NAME wajib diisi')
  })

  it('trims required env', () => {
    expect(readRequiredEnv({ NAME: ' value ' }, 'NAME')).toBe('value')
  })

  it('parses comma separated env lists', () => {
    expect(readRequiredEnvList({ ADMIN_EMAILS: 'a@example.com, b@example.com' }, 'ADMIN_EMAILS')).toEqual([
      'a@example.com',
      'b@example.com',
    ])
  })

  describe('getAppBaseUrl', () => {
    it('uses NEXTAUTH_URL when valid and ignores 0.0.0.0 request origin', () => {
      const original = process.env.NEXTAUTH_URL
      process.env.NEXTAUTH_URL = 'https://form.ppkasn.id'
      try {
        const url = getAppBaseUrl({
          nextUrl: { origin: 'https://0.0.0.0:3456' },
        })
        expect(url).toBe('https://form.ppkasn.id')
      } finally {
        process.env.NEXTAUTH_URL = original
      }
    })

    it('falls back to request origin if not 0.0.0.0 when NEXTAUTH_URL is missing', () => {
      const original = process.env.NEXTAUTH_URL
      delete process.env.NEXTAUTH_URL
      try {
        const url = getAppBaseUrl({
          nextUrl: { origin: 'http://localhost:3456' },
        })
        expect(url).toBe('http://localhost:3456')
      } finally {
        process.env.NEXTAUTH_URL = original
      }
    })

    it('falls back to default localhost:3456 when origin contains 0.0.0.0 and no NEXTAUTH_URL', () => {
      const original = process.env.NEXTAUTH_URL
      delete process.env.NEXTAUTH_URL
      try {
        const url = getAppBaseUrl({
          nextUrl: { origin: 'https://0.0.0.0:3456' },
        })
        expect(url).toBe('http://localhost:3456')
      } finally {
        process.env.NEXTAUTH_URL = original
      }
    })
  })

  describe('getDriveConfig', () => {
    const validPemLiteral = '-----BEGIN PRIVATE KEY-----\\nAAAA\\n-----END PRIVATE KEY-----\\n'
    const validPemReal = '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n'
    const validFolderId = 'abcdefghij1234567890'
    const validEmail = 'sa@project.iam.gserviceaccount.com'

    it('throws when GOOGLE_SERVICE_ACCOUNT_EMAIL is missing', () => {
      expect(() =>
        getDriveConfig({
          GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: validPemLiteral,
          GOOGLE_DRIVE_FOLDER_ID: validFolderId,
        }),
      ).toThrow(/GOOGLE_SERVICE_ACCOUNT_EMAIL wajib diisi/)
    })

    it('throws when GOOGLE_SERVICE_ACCOUNT_EMAIL is blank', () => {
      expect(() =>
        getDriveConfig({
          GOOGLE_SERVICE_ACCOUNT_EMAIL: '   ',
          GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: validPemLiteral,
          GOOGLE_DRIVE_FOLDER_ID: validFolderId,
        }),
      ).toThrow(/GOOGLE_SERVICE_ACCOUNT_EMAIL wajib diisi/)
    })

    it('throws when GOOGLE_DRIVE_FOLDER_ID is missing', () => {
      expect(() =>
        getDriveConfig({
          GOOGLE_SERVICE_ACCOUNT_EMAIL: validEmail,
          GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: validPemLiteral,
        }),
      ).toThrow(/GOOGLE_DRIVE_FOLDER_ID wajib diisi/)
    })

    it.each(['https://attacker.example/x', '../etc/passwd', 'abc', 'has space 1234567890'])(
      'throws for hostile GOOGLE_DRIVE_FOLDER_ID: %s',
      (hostileId) => {
        expect(() =>
          getDriveConfig({
            GOOGLE_SERVICE_ACCOUNT_EMAIL: validEmail,
            GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: validPemLiteral,
            GOOGLE_DRIVE_FOLDER_ID: hostileId,
          }),
        ).toThrow(/GOOGLE_DRIVE_FOLDER_ID tidak valid/)
      },
    )

    it('throws when the private key is not a PEM', () => {
      expect(() =>
        getDriveConfig({
          GOOGLE_SERVICE_ACCOUNT_EMAIL: validEmail,
          GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'not-a-pem',
          GOOGLE_DRIVE_FOLDER_ID: validFolderId,
        }),
      ).toThrow(/tidak valid/)
    })

    it('unescapes literal \\n exactly once', () => {
      const result = getDriveConfig({
        GOOGLE_SERVICE_ACCOUNT_EMAIL: validEmail,
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: validPemLiteral,
        GOOGLE_DRIVE_FOLDER_ID: validFolderId,
      })

      expect(result.privateKey).toContain('\n')
      expect(result.privateKey).toContain('BEGIN PRIVATE KEY')
      expect(result.privateKey).toBe(validPemLiteral.replace(/\\n/g, '\n'))
    })

    it('does not double-apply the unescape on a PEM with real newlines', () => {
      const result = getDriveConfig({
        GOOGLE_SERVICE_ACCOUNT_EMAIL: validEmail,
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: validPemReal,
        GOOGLE_DRIVE_FOLDER_ID: validFolderId,
      })

      // readRequiredEnv trims surrounding whitespace, so compare against the
      // trimmed input — the unescape step must not add or remove any newlines.
      const trimmedInput = validPemReal.trim()
      expect(result.privateKey.split('\n').length).toBe(trimmedInput.split('\n').length)
      expect(result.privateKey).toBe(trimmedInput)
    })

    it('returns the three fields for a valid env', () => {
      const result = getDriveConfig({
        GOOGLE_SERVICE_ACCOUNT_EMAIL: validEmail,
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: validPemLiteral,
        GOOGLE_DRIVE_FOLDER_ID: validFolderId,
      })

      expect(result).toEqual({
        clientEmail: validEmail,
        privateKey: validPemLiteral.replace(/\\n/g, '\n'),
        folderId: validFolderId,
      })
    })
  })
})
