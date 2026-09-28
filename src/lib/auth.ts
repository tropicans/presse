import { readRequiredEnv, readRequiredEnvList } from './env'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { getServerSession } from 'next-auth'
import { getEffectiveAdminUser, acceptAdminInvitation } from './admin-invitations'
import { prisma } from './prisma'

const googleClientId = readRequiredEnv(process.env, 'GOOGLE_CLIENT_ID')
const googleClientSecret = readRequiredEnv(process.env, 'GOOGLE_CLIENT_SECRET')
const nextAuthSecret = readRequiredEnv(process.env, 'NEXTAUTH_SECRET')

function getAdminEmails() {
  return readRequiredEnvList(process.env, 'ADMIN_EMAILS').map((email) => email.toLowerCase())
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false
      const normalizedEmail = user.email.toLowerCase()

      // 1. Check if root superadmin (.env) or active admin in DB
      const effective = await getEffectiveAdminUser(normalizedEmail)
      if (effective && effective.isActive) {
        return true
      }

      // 2. Check if user has an unexpired pending invitation to auto-claim
      try {
        const pendingInvite = await prisma.adminInvitation.findFirst({
          where: {
            email: normalizedEmail,
            status: 'PENDING',
            expiresAt: { gt: new Date() },
          },
        })

        if (pendingInvite) {
          const claimResult = await acceptAdminInvitation(pendingInvite.token, {
            email: normalizedEmail,
            name: user.name,
          })
          return claimResult.success
        }
      } catch (error) {
        console.error('[auth] Error checking/claiming admin invitation:', error)
      }

      return false
    },
    async session({ session }) {
      if (session?.user?.email) {
        const effective = await getEffectiveAdminUser(session.user.email)
        if (effective) {
          session.user.role = effective.role
          session.user.isSuperAdmin = effective.isSuperAdmin
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
}

export async function getAdminSession() {
  return await getServerSession(authOptions)
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase())
}

