import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { describeStorageError } from './storage-probe'
import { buildObjectKey } from './storage'

describe('describeStorageError', () => {
  it('returns timeout for a TimeoutError', () => {
    expect(describeStorageError({ name: 'TimeoutError' })).toBe('timeout')
  })

  it('returns timeout for an AbortError', () => {
    expect(describeStorageError({ name: 'AbortError' })).toBe('timeout')
  })

  it('returns kredensial invalid for 403', () => {
    expect(describeStorageError({ name: 'Forbidden', $metadata: { httpStatusCode: 403 } })).toBe(
      'kredensial invalid',
    )
  })

  it('returns kredensial invalid for SignatureDoesNotMatch', () => {
    expect(describeStorageError({ name: 'SignatureDoesNotMatch' })).toBe('kredensial invalid')
  })

  it('returns bucket tidak ditemukan for NoSuchBucket', () => {
    expect(describeStorageError({ name: 'NoSuchBucket' })).toBe('bucket tidak ditemukan')
  })

  it('returns HTTP status for other status codes', () => {
    expect(describeStorageError({ name: 'InternalError', $metadata: { httpStatusCode: 500 } })).toBe(
      'HTTP 500',
    )
  })

  it('falls back to the error name for a bare error', () => {
    expect(describeStorageError({ name: 'ECONNREFUSED' })).toBe('ECONNREFUSED')
  })

  it('never leaks a secret from a nested credentials field', () => {
    const leaked = describeStorageError({
      name: 'SignatureDoesNotMatch',
      credentials: { secretAccessKey: 'super-secret' },
    })

    expect(leaked).toBe('kredensial invalid')
    expect(leaked).not.toContain('super-secret')
  })
})

describe('buildObjectKey', () => {
  it('is deterministic for the same file id', () => {
    expect(buildObjectKey('abc-123')).toBe(buildObjectKey('abc-123'))
  })

  it('produces a path-safe key under files/', () => {
    expect(buildObjectKey('abc-123')).toBe('files/abc-123')
  })

  it('differs for different file ids', () => {
    expect(buildObjectKey('a')).not.toBe(buildObjectKey('b'))
  })
})
