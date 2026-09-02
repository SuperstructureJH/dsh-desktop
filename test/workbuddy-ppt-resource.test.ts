import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { bundledWorkBuddyPptRuntimeEnvironment } from '../src/main/runtime/workbuddy-ppt-resource'

describe('packaged WorkBuddy PPT runtime resource', () => {
  it('injects the exact resource root when the platform runtime manifest exists', () => {
    const resourcesPath = path.join(path.sep, 'Applications', 'DSH Desktop.app', 'Contents', 'Resources')
    const runtimeRoot = path.join(resourcesPath, 'workbuddy-ppt-runtime')
    const fileExists = vi.fn((candidate: string) => candidate === path.join(runtimeRoot, 'manifest.json'))

    expect(bundledWorkBuddyPptRuntimeEnvironment(resourcesPath, fileExists)).toEqual({
      DSH_WORKBUDDY_PPT_RUNTIME_ROOT: runtimeRoot
    })
    expect(fileExists).toHaveBeenCalledWith(path.join(runtimeRoot, 'manifest.json'))
  })

  it('leaves the Harness environment unchanged when this platform has no bundled Slides runtime', () => {
    expect(bundledWorkBuddyPptRuntimeEnvironment('C:\\Program Files\\DSH Desktop\\resources', () => false))
      .toBeUndefined()
  })
})
