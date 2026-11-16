import { prisma } from './prisma'
import { getStorageState } from './storage-probe'

export type HealthResult =
  | { status: 'ok' }
  | { status: 'degraded'; storage: { state: 'degraded'; reason: string } }

export async function checkHealth(): Promise<HealthResult> {
  await prisma.$queryRaw`SELECT 1`

  const storage = getStorageState()

  if (storage.state === 'ok') {
    return { status: 'ok' }
  }

  return {
    status: 'degraded',
    storage: { state: 'degraded', reason: storage.reason },
  }
}
