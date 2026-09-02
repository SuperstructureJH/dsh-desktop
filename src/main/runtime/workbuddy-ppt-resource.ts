import { existsSync } from 'node:fs'
import { join } from 'node:path'

const PPT_RUNTIME_RESOURCE = 'workbuddy-ppt-runtime'

export type WorkBuddyPptRuntimeEnvironment = {
  DSH_WORKBUDDY_PPT_RUNTIME_ROOT: string
}

/**
 * Return the Harness environment only when this platform package contains the
 * complete PPT runtime manifest. Packages without a licensed platform runtime
 * retain the bundled PPTD workflow and may use an operator-staged Slides
 * runtime under the plugin data root.
 */
export function bundledWorkBuddyPptRuntimeEnvironment(
  resourcesPath: string,
  fileExists: (path: string) => boolean = existsSync
): WorkBuddyPptRuntimeEnvironment | undefined {
  const runtimeRoot = join(resourcesPath, PPT_RUNTIME_RESOURCE)
  if (!fileExists(join(runtimeRoot, 'manifest.json'))) return undefined
  return { DSH_WORKBUDDY_PPT_RUNTIME_ROOT: runtimeRoot }
}
