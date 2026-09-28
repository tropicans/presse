import { randomBytes } from 'crypto'
import { prisma } from './prisma'
import { readRequiredEnvList } from './env'
import type { AdminRole, InvitationStatus } from '@prisma/client'

export const INVITATION_TTL_HOURS = 48
export const INVITATION_TTL_MS = INVITATION_TTL_HOURS * 60 * 60 * 1000

export interface EffectiveAdmin {
  email: string
  role: AdminRole
  name?: string | null
  isSuperAdmin: boolean
  isActive: boolean
}

export function getSuperAdminEmails(): string[] {
  try {
    return readRequiredEnvList(process.env, 'ADMIN_EMAILS').map((email) => email.toLowerCase())
  } catch {
    return []
  }
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getSuperAdminEmails().includes(email.trim().toLowerCase())
}

export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex')
}

export async function getEffectiveAdminUser(email: string | null | undefined): Promise<EffectiveAdmin | null> {
  if (!email) return null
  const normalizedEmail = email.trim().toLowerCase()

  // 1. Check Root Superadmin (.env allowlist)
  if (isSuperAdminEmail(normalizedEmail)) {
    return {
      email: normalizedEmail,
      role: 'SUPERADMIN',
      name: null,
      isSuperAdmin: true,
      isActive: true,
    }
  }

  // 2. Check Database Admin Users
  const user = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user || !user.isActive) {
    return null
  }

  return {
    email: user.email,
    role: user.role,
    name: user.name,
    isSuperAdmin: user.role === 'SUPERADMIN',
    isActive: user.isActive,
  }
}

export async function createAdminInvitation(params: {
  email: string
  role?: AdminRole
  invitedByEmail?: string
}): Promise<{
  invitation: {
    id: string
    email: string
    role: AdminRole
    token: string
    status: InvitationStatus
    expiresAt: Date
    createdAt: Date
  }
  inviteUrl?: string
}> {
  const normalizedEmail = params.email.trim().toLowerCase()

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Email tidak valid')
  }

  if (isSuperAdminEmail(normalizedEmail)) {
    throw new Error('Email ini sudah merupakan Superadmin utama')
  }

  // Check if already an active admin user
  const existingActive = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail },
  })
  if (existingActive && existingActive.isActive) {
    throw new Error('Pengguna dengan email ini sudah aktif sebagai admin')
  }

  // Revoke any existing PENDING invitations for this email to avoid duplicate active links
  await prisma.adminInvitation.updateMany({
    where: {
      email: normalizedEmail,
      status: 'PENDING',
    },
    data: {
      status: 'REVOKED',
    },
  })

  // Find inviter admin user if present
  let invitedById: string | null = null
  if (params.invitedByEmail) {
    const inviter = await prisma.adminUser.findUnique({
      where: { email: params.invitedByEmail.trim().toLowerCase() },
    })
    if (inviter) {
      invitedById = inviter.id
    }
  }

  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS)
  const role: AdminRole = params.role ?? 'ADMIN'

  const invitation = await prisma.adminInvitation.create({
    data: {
      email: normalizedEmail,
      role,
      token,
      status: 'PENDING',
      expiresAt,
      invitedById,
    },
    select: {
      id: true,
      email: true,
      role: true,
      token: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  return {
    invitation,
  }
}

export async function getAdminInvitationByToken(token: string | null | undefined) {
  if (!token || typeof token !== 'string') return null
  const cleanToken = token.trim()
  if (!cleanToken) return null

  const invitation = await prisma.adminInvitation.findUnique({
    where: { token: cleanToken },
    include: {
      invitedBy: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  })

  if (!invitation) return null

  // If pending but past expiration, mark as EXPIRED
  if (invitation.status === 'PENDING' && new Date(invitation.expiresAt) < new Date()) {
    await prisma.adminInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    })
    return {
      ...invitation,
      status: 'EXPIRED' as const,
    }
  }

  return invitation
}

export async function acceptAdminInvitation(
  token: string,
  user: { email: string; name?: string | null }
): Promise<{ success: boolean; error?: string; role?: AdminRole }> {
  const invitation = await getAdminInvitationByToken(token)

  if (!invitation) {
    return { success: false, error: 'Undangan tidak ditemukan atau token tidak valid' }
  }

  if (invitation.status !== 'PENDING') {
    if (invitation.status === 'ACCEPTED') {
      return { success: false, error: 'Undangan ini sudah pernah digunakan' }
    }
    if (invitation.status === 'EXPIRED') {
      return { success: false, error: 'Undangan ini telah kadaluwarsa (masa berlaku 48 jam telah habis)' }
    }
    return { success: false, error: 'Undangan ini sudah dicabut atau tidak berlaku lagi' }
  }

  const normalizedUserEmail = user.email.trim().toLowerCase()
  if (invitation.email.toLowerCase() !== normalizedUserEmail) {
    return {
      success: false,
      error: `Akun Google yang Anda gunakan (${normalizedUserEmail}) tidak sesuai dengan email yang diundang (${invitation.email})`,
    }
  }

  // Atomically claim invitation and upsert admin_user
  await prisma.$transaction(async (tx) => {
    await tx.adminInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    })

    await tx.adminUser.upsert({
      where: { email: normalizedUserEmail },
      create: {
        email: normalizedUserEmail,
        name: user.name ?? null,
        role: invitation.role,
        isActive: true,
      },
      update: {
        name: user.name ?? undefined,
        role: invitation.role,
        isActive: true,
      },
    })
  })

  return { success: true, role: invitation.role }
}

export async function listAdminTeam() {
  const superAdminEmails = getSuperAdminEmails()

  const [dbUsers, pendingInvitations] = await Promise.all([
    prisma.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.adminInvitation.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: {
          select: { email: true, name: true },
        },
      },
    }),
  ])

  // Mark expired invitations in memory
  const now = new Date()
  const invitations = pendingInvitations.map((inv) => ({
    ...inv,
    isExpired: new Date(inv.expiresAt) < now,
  }))

  const superadmins = superAdminEmails.map((email) => ({
    id: `root-${email}`,
    email,
    role: 'SUPERADMIN' as const,
    isRoot: true,
    isActive: true,
  }))

  return {
    superadmins,
    users: dbUsers,
    invitations,
  }
}

export async function revokeAdminInvitation(invitationId: string): Promise<boolean> {
  const result = await prisma.adminInvitation.updateMany({
    where: {
      id: invitationId,
      status: 'PENDING',
    },
    data: {
      status: 'REVOKED',
    },
  })
  return result.count > 0
}

export async function revokeAdminUser(
  userId: string,
  requesterEmail: string
): Promise<{ success: boolean; error?: string }> {
  const targetUser = await prisma.adminUser.findUnique({
    where: { id: userId },
  })

  if (!targetUser) {
    return { success: false, error: 'Pengguna tidak ditemukan' }
  }

  if (targetUser.email.toLowerCase() === requesterEmail.trim().toLowerCase()) {
    return { success: false, error: 'Anda tidak dapat mencabut hak akses Anda sendiri' }
  }

  if (isSuperAdminEmail(targetUser.email)) {
    return { success: false, error: 'Superadmin utama dari konfigurasi env tidak dapat dicabut' }
  }

  await prisma.adminUser.update({
    where: { id: userId },
    data: { isActive: false },
  })

  return { success: true }
}
