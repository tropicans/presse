import { readRequiredEnv, readRequiredEnvList } from './env'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { getServerSession } from 'next-auth'

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
      return getAdminEmails().includes(user.email?.toLowerCase() ?? '')
    },
    async session({ session }) {
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
