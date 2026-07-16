import { prisma } from './prisma'

export interface HealthResult {
  status: 'ok'
}

export async function checkHealth(): Promise<HealthResult> {
  await prisma.$queryRaw`SELECT 1`

  return { status: 'ok' }
}
