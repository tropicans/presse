import { describe, expect, it } from 'vitest'
import { getAppBaseUrl, readRequiredEnv, readRequiredEnvList } from './env'

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
})
