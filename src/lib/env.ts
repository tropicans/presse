type EnvSource = Record<string, string | undefined>

export function readRequiredEnv(env: EnvSource, name: string): string {
  const value = env[name]?.trim()

  if (!value) {
    throw new Error(`${name} wajib diisi`)
  }

  return value
}

export function readRequiredEnvList(env: EnvSource, name: string): string[] {
  return readRequiredEnv(env, name)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

interface RequestLike {
  nextUrl?: { origin?: string }
  headers?: { get(name: string): string | null }
}

export function getAppBaseUrl(req?: RequestLike): string {
  // 1. Prioritize canonical NEXTAUTH_URL if configured and not 0.0.0.0
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim()
  if (nextAuthUrl && !nextAuthUrl.includes('0.0.0.0')) {
    return nextAuthUrl.replace(/\/$/, '')
  }

  // 2. Check forwarded headers if available from proxy
  if (req?.headers) {
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
    if (host && !host.includes('0.0.0.0')) {
      return `${proto}://${host}`.replace(/\/$/, '')
    }
  }

  // 3. Fallback to request origin if not 0.0.0.0
  if (req?.nextUrl?.origin && !req.nextUrl.origin.includes('0.0.0.0')) {
    return req.nextUrl.origin.replace(/\/$/, '')
  }

  // 4. Safe default
  return 'http://localhost:3456'
}
