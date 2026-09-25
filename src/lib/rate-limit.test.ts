import { beforeEach, describe, expect, it } from 'vitest'
import { clearRateLimitStoreForTest, getClientIp, rateLimit } from './rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    clearRateLimitStoreForTest()
  })

  it('allows requests up to configured limit then rejects', () => {
    const config = { limit: 2, windowMs: 60_000 }

    expect(rateLimit('client-a', config)).toMatchObject({ allowed: true, remaining: 1 })
    expect(rateLimit('client-a', config)).toMatchObject({ allowed: true, remaining: 0 })
    expect(rateLimit('client-a', config)).toMatchObject({ allowed: false, remaining: 0 })
  })
})

describe('getClientIp', () => {
  it('uses first x-forwarded-for address', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.1, 10.0.0.1',
      'x-real-ip': '198.51.100.1',
    })

    expect(getClientIp(headers)).toBe('203.0.113.1')
  })

  it('falls back to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.1' })

    expect(getClientIp(headers)).toBe('198.51.100.1')
  })

  it('falls back to unknown', () => {
    expect(getClientIp(new Headers())).toBe('unknown')
  })
})
