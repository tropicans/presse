/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  getAdminSession: vi.fn(),
}))

vi.mock('@/lib/admin-invitations', () => ({
  listAdminTeam: vi.fn(),
  createAdminInvitation: vi.fn(),
  revokeAdminInvitation: vi.fn(),
  revokeAdminUser: vi.fn(),
  getAdminInvitationByToken: vi.fn(),
  acceptAdminInvitation: vi.fn(),
}))

import { getAdminSession } from '@/lib/auth'
import {
  listAdminTeam,
  createAdminInvitation,
  revokeAdminInvitation,
  revokeAdminUser,
  getAdminInvitationByToken,
} from '@/lib/admin-invitations'
import { GET as getAdminUsers } from './route'
import { POST as inviteAdminUser } from './invite/route'
import { POST as revokeAction } from './revoke/route'
import { GET as verifyInvite } from '../../public/invite/verify/route'

describe('Admin Users API Routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/admin/users', () => {
    it('returns 401 if unauthenticated', async () => {
      vi.mocked(getAdminSession).mockResolvedValueOnce(null)
      const res = await getAdminUsers()
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toContain('tidak valid')
    })

    it('returns 403 if user is not superadmin', async () => {
      vi.mocked(getAdminSession).mockResolvedValueOnce({
        user: { email: 'staff@example.com', role: 'ADMIN', isSuperAdmin: false },
        expires: '',
      } as any)

      const res = await getAdminUsers()
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toContain('Hanya Superadmin')
    })

    it('returns 200 with team data for superadmin', async () => {
      vi.mocked(getAdminSession).mockResolvedValueOnce({
        user: { email: 'tropicans@gmail.com', role: 'SUPERADMIN', isSuperAdmin: true },
        expires: '',
      } as any)

      vi.mocked(listAdminTeam).mockResolvedValueOnce({
        superadmins: [{ id: '1', email: 'tropicans@gmail.com', role: 'SUPERADMIN', isRoot: true, isActive: true }],
        users: [],
        invitations: [],
      })

      const res = await getAdminUsers()
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.ok).toBe(true)
      expect(json.data.superadmins).toHaveLength(1)
    })
  })

  describe('POST /api/admin/users/invite', () => {
    it('returns 403 if requester is not superadmin', async () => {
      vi.mocked(getAdminSession).mockResolvedValueOnce({
        user: { email: 'staff@example.com', role: 'ADMIN', isSuperAdmin: false },
        expires: '',
      } as any)

      const req = new NextRequest('http://localhost:3456/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com' }),
      })

      const res = await inviteAdminUser(req)
      expect(res.status).toBe(403)
    })

    it('returns 400 if email is missing', async () => {
      vi.mocked(getAdminSession).mockResolvedValueOnce({
        user: { email: 'tropicans@gmail.com', role: 'SUPERADMIN', isSuperAdmin: true },
        expires: '',
      } as any)

      const req = new NextRequest('http://localhost:3456/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const res = await inviteAdminUser(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toContain('email wajib diisi')
    })

    it('creates invitation and returns inviteUrl on success', async () => {
      vi.mocked(getAdminSession).mockResolvedValueOnce({
        user: { email: 'tropicans@gmail.com', role: 'SUPERADMIN', isSuperAdmin: true },
        expires: '',
      } as any)

      vi.mocked(createAdminInvitation).mockResolvedValueOnce({
        invitation: {
          id: 'inv-1',
          email: 'calon@example.com',
          role: 'ADMIN',
          token: 'token-abc',
          status: 'PENDING',
          expiresAt: new Date(),
          createdAt: new Date(),
        },
      })

      const req = new NextRequest('http://localhost:3456/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'calon@example.com' }),
      })

      const res = await inviteAdminUser(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.ok).toBe(true)
      expect(json.inviteUrl).toContain('/admin/invite?token=token-abc')
    })
  })

  describe('POST /api/admin/users/revoke', () => {
    it('revokes an invitation successfully', async () => {
      vi.mocked(getAdminSession).mockResolvedValueOnce({
        user: { email: 'tropicans@gmail.com', role: 'SUPERADMIN', isSuperAdmin: true },
        expires: '',
      } as any)

      vi.mocked(revokeAdminInvitation).mockResolvedValueOnce(true)

      const req = new NextRequest('http://localhost:3456/api/admin/users/revoke', {
        method: 'POST',
        body: JSON.stringify({ type: 'invitation', id: 'inv-1' }),
      })

      const res = await revokeAction(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.ok).toBe(true)
    })

    it('revokes a user successfully', async () => {
      vi.mocked(getAdminSession).mockResolvedValueOnce({
        user: { email: 'tropicans@gmail.com', role: 'SUPERADMIN', isSuperAdmin: true },
        expires: '',
      } as any)

      vi.mocked(revokeAdminUser).mockResolvedValueOnce({ success: true })

      const req = new NextRequest('http://localhost:3456/api/admin/users/revoke', {
        method: 'POST',
        body: JSON.stringify({ type: 'user', id: 'usr-1' }),
      })

      const res = await revokeAction(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.ok).toBe(true)
    })
  })

  describe('GET /api/public/invite/verify', () => {
    it('returns 400 when token query is missing', async () => {
      const req = new NextRequest('http://localhost:3456/api/public/invite/verify')
      const res = await verifyInvite(req)
      expect(res.status).toBe(400)
    })

    it('returns 404 when token is not found', async () => {
      vi.mocked(getAdminInvitationByToken).mockResolvedValueOnce(null)
      const req = new NextRequest('http://localhost:3456/api/public/invite/verify?token=not-found')
      const res = await verifyInvite(req)
      expect(res.status).toBe(404)
    })

    it('returns 200 with invitation info when token is valid', async () => {
      vi.mocked(getAdminInvitationByToken).mockResolvedValueOnce({
        id: 'inv-1',
        email: 'user@example.com',
        role: 'ADMIN',
        token: 'token-ok',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 100000),
        invitedById: null,
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        invitedBy: { email: 'tropicans@gmail.com', name: 'Super Admin' },
      } as any)

      const req = new NextRequest('http://localhost:3456/api/public/invite/verify?token=token-ok')
      const res = await verifyInvite(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.ok).toBe(true)
      expect(json.invitation.email).toBe('user@example.com')
      expect(json.invitation.isExpired).toBe(false)
    })
  })
})
