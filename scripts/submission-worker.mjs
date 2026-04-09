import process from 'node:process'

const baseUrl = (process.env.WORKER_BASE_URL || 'http://localhost:3456').replace(/\/$/, '')
const workerToken = process.env.INTERNAL_WORKER_TOKEN || ''
const batchSize = Number(process.env.WORKER_BATCH_SIZE || '25')
const idleMs = Number(process.env.WORKER_IDLE_MS || '250')
const errorMs = Number(process.env.WORKER_ERROR_MS || '1000')

if (!workerToken) {
  throw new Error('INTERNAL_WORKER_TOKEN wajib diisi untuk submission worker')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function processBatch() {
  const response = await fetch(`${baseUrl}/api/internal/submission-jobs/process?batch=${batchSize}`, {
    method: 'POST',
    headers: {
      'x-worker-token': workerToken,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Worker process route failed: ${response.status} ${body}`)
  }

  const payload = await response.json()
  return Number(payload.processed || 0)
}

async function main() {
  while (true) {
    try {
      const processed = await processBatch()
      await sleep(processed > 0 ? 25 : idleMs)
    } catch (error) {
      console.error('[submission-worker]', error)
      await sleep(errorMs)
    }
  }
}

main().catch((error) => {
  console.error('[submission-worker] fatal', error)
  process.exit(1)
})
