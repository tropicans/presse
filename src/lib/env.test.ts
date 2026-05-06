import { describe, expect, it } from 'vitest'
import { readRequiredEnv, readRequiredEnvList } from './env'

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
})
