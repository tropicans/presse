import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const poolMax = Number(process.env.DB_POOL_MAX ?? '20')
  const poolMin = Number(process.env.DB_POOL_MIN ?? '4')
  const connectionTimeoutMillis = Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? '10000')
  const idleTimeoutMillis = Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? '30000')

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: Number.isFinite(poolMax) ? poolMax : 20,
    min: Number.isFinite(poolMin) ? poolMin : 4,
    connectionTimeoutMillis: Number.isFinite(connectionTimeoutMillis)
      ? connectionTimeoutMillis
      : 10000,
    idleTimeoutMillis: Number.isFinite(idleTimeoutMillis)
      ? idleTimeoutMillis
      : 30000,
  })

  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
