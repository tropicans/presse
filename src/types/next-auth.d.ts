import type { AdminRole } from '@prisma/client'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      role?: AdminRole
      isSuperAdmin?: boolean
    } & DefaultSession['user']
  }

  interface User {
    role?: AdminRole
    isSuperAdmin?: boolean
  }
}
