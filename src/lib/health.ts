import { prisma } from './prisma'
import { getDriveState } from './drive'

export type HealthResult =
  | { status: 'ok' }
  | { status: 'degraded'; drive: { state: 'degraded'; reason: string } }

export async function checkHealth(): Promise<HealthResult> {
  await prisma.$queryRaw`SELECT 1`

  const drive = getDriveState()

  if (drive.state === 'ok') {
    return { status: 'ok' }
  }

  return {
    status: 'degraded',
    drive: { state: 'degraded', reason: drive.reason },
  }
}
