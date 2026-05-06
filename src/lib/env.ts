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
