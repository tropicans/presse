import { claimUploadJobs, markFileJobSynced, markFileJobFailed, cleanupOrphanedFiles } from './file-storage'
import { putObject, buildObjectKey, getBucket } from './storage'

export interface ProcessFileJobsResult {
  claimed: number
  synced: number
  failed: number
  retried: number
  orphanedCount: number
  purgedPayloadCount: number
}

export async function processQueuedFileUploadJobs(
  batchSize: number = 10,
  sweepOrphans: boolean = true,
): Promise<ProcessFileJobsResult> {
  const jobs = await claimUploadJobs(batchSize)
  let synced = 0
  let failed = 0
  let retried = 0

  let bucket = 'form-uploads'
  try {
    bucket = getBucket()
  } catch {
    // If bucket config fails to resolve, fallback to default
  }

  for (const job of jobs) {
    if (!job.payload) {
      await markFileJobFailed({
        jobId: job.jobId,
        fileId: job.fileId,
        error: 'Payload spooled tidak ditemukan dalam antrian.',
        isTerminal: true,
      })
      failed++
      continue
    }

    const objectKey = buildObjectKey(job.fileId)

    try {
      await putObject(objectKey, job.payload, job.payloadMime)
      await markFileJobSynced({
        jobId: job.jobId,
        fileId: job.fileId,
        bucket,
        objectKey,
      })
      synced++
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const attempts = job.attempts
      const isTerminal = attempts >= 5

      if (isTerminal) {
        await markFileJobFailed({
          jobId: job.jobId,
          fileId: job.fileId,
          error: `Gagal sinkronisasi setelah ${attempts} percobaan: ${errMsg}`,
          isTerminal: true,
        })
        failed++
      } else {
        const backoffSeconds = Math.min(300, Math.pow(2, attempts) * 2)
        const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000)

        await markFileJobFailed({
          jobId: job.jobId,
          fileId: job.fileId,
          error: errMsg,
          nextAttemptAt,
          isTerminal: false,
        })
        retried++
      }
    }
  }

  let orphanStats = { orphanedCount: 0, purgedPayloadCount: 0 }
  if (sweepOrphans) {
    try {
      orphanStats = await cleanupOrphanedFiles(24)
    } catch (err) {
      console.error('Error during cleanupOrphanedFiles sweep:', err)
    }
  }

  return {
    claimed: jobs.length,
    synced,
    failed,
    retried,
    orphanedCount: orphanStats.orphanedCount,
    purgedPayloadCount: orphanStats.purgedPayloadCount,
  }
}
