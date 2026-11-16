import { describe, expect, it } from 'vitest'
import { getAppBaseUrl, getStorageConfig, readRequiredEnv, readRequiredEnvList } from './env'

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

  describe('getStorageConfig', () => {
    const base = {
      MINIO_ENDPOINT: 'minio',
      MINIO_PORT: '9000',
      MINIO_USE_SSL: 'false',
      MINIO_ACCESS_KEY: 'form',
      MINIO_SECRET_KEY: 'form-secret-123',
      MINIO_BUCKET: 'form-uploads',
    }

    it('accepts a valid storage env', () => {
      expect(getStorageConfig(base)).toEqual({
        endpoint: 'minio',
        port: 9000,
        useSSL: false,
        accessKey: 'form',
        secretKey: 'form-secret-123',
        bucket: 'form-uploads',
      })
    })

    it('throws when MINIO_ENDPOINT is missing', () => {
      expect(() => getStorageConfig({ ...base, MINIO_ENDPOINT: undefined })).toThrow(/MINIO_ENDPOINT wajib diisi/)
    })

    it('throws when MINIO_SECRET_KEY is blank', () => {
      expect(() => getStorageConfig({ ...base, MINIO_SECRET_KEY: '   ' })).toThrow(/MINIO_SECRET_KEY wajib diisi/)
    })

    it('throws for a non-numeric MINIO_PORT', () => {
      expect(() => getStorageConfig({ ...base, MINIO_PORT: 'not-a-port' })).toThrow(/MINIO_PORT tidak valid/)
    })

    it('throws for a hostile MINIO_BUCKET', () => {
      expect(() => getStorageConfig({ ...base, MINIO_BUCKET: '../etc' })).toThrow(/MINIO_BUCKET tidak valid/)
    })
  })
})
