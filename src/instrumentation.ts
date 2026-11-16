export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  const { startStorageProbe } = await import('./lib/storage-probe')
  await startStorageProbe()
  console.debug('[instrumentation] storage probe started')
}
