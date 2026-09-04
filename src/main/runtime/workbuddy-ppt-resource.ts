import { existsSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

const PPT_RUNTIME_RESOURCE = 'workbuddy-ppt-runtime'

export type WorkBuddyPptRuntimeEnvironment = {
  DSH_WORKBUDDY_PPT_RUNTIME_ROOT: string
}

/**
 * Return the Harness environment only when this platform package contains the
 * complete PPT runtime manifest.
 */
export function bundledWorkBuddyPptRuntimeEnvironment(
  resourcesPath: string,
  fileExists: (path: string) => boolean = existsSync
): WorkBuddyPptRuntimeEnvironment | undefined {
  const runtimeRoot = join(resourcesPath, PPT_RUNTIME_RESOURCE)
  if (!fileExists(join(runtimeRoot, 'manifest.json'))) return undefined
  return { DSH_WORKBUDDY_PPT_RUNTIME_ROOT: runtimeRoot }
}

/**
 * Packaged builds use their immutable resource tree. Development builds accept
 * only the absolute, verified cache root supplied by the runtime launcher.
 */
export function workBuddyPptRuntimeEnvironment(
  resourcesPath: string,
  isPackaged: boolean,
  environment: NodeJS.ProcessEnv = process.env,
  fileExists: (path: string) => boolean = existsSync
): WorkBuddyPptRuntimeEnvironment | undefined {
  if (isPackaged) return bundledWorkBuddyPptRuntimeEnvironment(resourcesPath, fileExists)
  const runtimeRoot = environment.DSH_WORKBUDDY_PPT_RUNTIME_ROOT?.trim()
  if (!runtimeRoot || !isAbsolute(runtimeRoot)) return undefined
  if (!fileExists(join(runtimeRoot, 'manifest.json'))) return undefined
  return { DSH_WORKBUDDY_PPT_RUNTIME_ROOT: runtimeRoot }
}
