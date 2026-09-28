/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    adminInvitation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => cb({
      adminInvitation: { update: vi.fn() },
      adminUser: { upsert: vi.fn() },
    })),
  },
}))

import {
  generateInvitationToken,
  isSuperAdminEmail,
  INVITATION_TTL_HOURS,
  INVITATION_TTL_MS,
  createAdminInvitation,
  acceptAdminInvitation,
  revokeAdminUser,
} from './admin-invitations'
import { prisma } from './prisma'

describe('admin-invitations domain logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.ADMIN_EMAILS = 'tropicans@gmail.com, superadmin@example.com'
  })

  describe('token & constants', () => {
    it('provides 48 hours TTL constants', () => {
      expect(INVITATION_TTL_HOURS).toBe(48)
      expect(INVITATION_TTL_MS).toBe(48 * 60 * 60 * 1000)
    })

    it('generates secure 64-char hex tokens', () => {
      const token1 = generateInvitationToken()
      const token2 = generateInvitationToken()

      expect(token1).toHaveLength(64)
      expect(token2).toHaveLength(64)
      expect(token1).toMatch(/^[0-9a-f]{64}$/)
      expect(token1).not.toBe(token2)
    })
  })

  describe('isSuperAdminEmail', () => {
    it('identifies superadmins case-insensitively', () => {
      expect(isSuperAdminEmail('tropicans@gmail.com')).toBe(true)
      expect(isSuperAdminEmail('TROPICANS@GMAIL.COM')).toBe(true)
      expect(isSuperAdminEmail('  superadmin@example.com  ')).toBe(true)
      expect(isSuperAdminEmail('unknown@example.com')).toBe(false)
      expect(isSuperAdminEmail(null)).toBe(false)
      expect(isSuperAdminEmail(undefined)).toBe(false)
    })
  })

  describe('createAdminInvitation validation', () => {
    it('throws error for invalid emails', async () => {
      await expect(createAdminInvitation({ email: 'invalid-email' })).rejects.toThrow('Email tidak valid')
      await expect(createAdminInvitation({ email: '' })).rejects.toThrow('Email tidak valid')
    })

    it('throws error when trying to invite a superadmin', async () => {
      await expect(createAdminInvitation({ email: 'tropicans@gmail.com' })).rejects.toThrow(
        'Email ini sudah merupakan Superadmin utama'
      )
    })

    it('throws error if user is already an active admin in DB', async () => {
      vi.spyOn(prisma.adminUser, 'findUnique').mockResolvedValueOnce({
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Existing Admin',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      await expect(createAdminInvitation({ email: 'admin@test.com' })).rejects.toThrow(
        'Pengguna dengan email ini sudah aktif sebagai admin'
      )
    })
  })

  describe('acceptAdminInvitation verification', () => {
    it('rejects if invitation is not found', async () => {
      vi.spyOn(prisma.adminInvitation, 'findUnique').mockResolvedValueOnce(null)

      const result = await acceptAdminInvitation('non-existent-token', { email: 'any@test.com' })
      expect(result.success).toBe(false)
      expect(result.error).toContain('Undangan tidak ditemukan')
    })

    it('rejects if invitation is already accepted', async () => {
      vi.spyOn(prisma.adminInvitation, 'findUnique').mockResolvedValueOnce({
        id: 'inv-1',
        email: 'user@test.com',
        role: 'ADMIN',
        token: 'token-123',
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 100000),
        invitedById: null,
        acceptedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        invitedBy: null,
      } as any)

      const result = await acceptAdminInvitation('token-123', { email: 'user@test.com' })
      expect(result.success).toBe(false)
      expect(result.error).toContain('sudah pernah digunakan')
    })

    it('rejects if invitation has expired', async () => {
      vi.spyOn(prisma.adminInvitation, 'findUnique').mockResolvedValueOnce({
        id: 'inv-1',
        email: 'user@test.com',
        role: 'ADMIN',
        token: 'token-123',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1000), // expired
        invitedById: null,
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        invitedBy: null,
      } as any)
      vi.spyOn(prisma.adminInvitation, 'update').mockResolvedValueOnce({} as any)

      const result = await acceptAdminInvitation('token-123', { email: 'user@test.com' })
      expect(result.success).toBe(false)
      expect(result.error).toContain('kadaluwarsa')
    })

    it('rejects if Google login email does not match invitation email', async () => {
      vi.spyOn(prisma.adminInvitation, 'findUnique').mockResolvedValueOnce({
        id: 'inv-1',
        email: 'invited@test.com',
        role: 'ADMIN',
        token: 'token-123',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 100000),
        invitedById: null,
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        invitedBy: null,
      } as any)

      const result = await acceptAdminInvitation('token-123', { email: 'different@test.com' })
      expect(result.success).toBe(false)
      expect(result.error).toContain('tidak sesuai dengan email yang diundang')
    })
  })

  describe('revokeAdminUser safeguards', () => {
    it('prevents self-revocation', async () => {
      vi.spyOn(prisma.adminUser, 'findUnique').mockResolvedValueOnce({
        id: 'user-me',
        email: 'me@example.com',
        role: 'ADMIN',
        isActive: true,
      } as any)

      const result = await revokeAdminUser('user-me', 'me@example.com')
      expect(result.success).toBe(false)
      expect(result.error).toContain('tidak dapat mencabut hak akses Anda sendiri')
    })

    it('prevents revoking root superadmins', async () => {
      vi.spyOn(prisma.adminUser, 'findUnique').mockResolvedValueOnce({
        id: 'user-super',
        email: 'tropicans@gmail.com',
        role: 'SUPERADMIN',
        isActive: true,
      } as any)

      const result = await revokeAdminUser('user-super', 'other@example.com')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Superadmin utama')
    })
  })
})
