export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  const { startDriveProbe } = await import('./lib/drive')
  await startDriveProbe()
  console.info('[instrumentation] drive probe started')
}
