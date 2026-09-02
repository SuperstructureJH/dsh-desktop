import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  runtimeTreeDigest,
  verifyWorkBuddyPptRuntime
} from '../scripts/verify-workbuddy-ppt-runtime.mjs'

const temporary = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function fixture(platform = 'darwin', arch = 'arm64') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dsh-workbuddy-runtime-'))
  temporary.push(root)
  const skill = Buffer.from('# Tencent PPTX\n')
  const expectedPlatform = `${platform}-${arch}`
  const files = {
    'skills/tencent-pptx/SKILL.md': skill,
    'skills/tencent-pptx/references/create-from-scratch.md': Buffer.from('# Scratch\n'),
    'skills/tencent-pptx/references/create-from-material.md': Buffer.from('# Material\n'),
    'slidep/package.json': Buffer.from('{"name":"@tencent/slidep"}'),
    'slidep/dist/slidep-start.js': Buffer.from(''),
    'slidep/dist/slidep-validate.js': Buffer.from(''),
    'slidep/node_modules/.keep': Buffer.from(''),
    'slidep/node_modules/transitive.js': Buffer.from('module.exports = {}\n'),
    [`tencent-docs-ai-engine/bin/${expectedPlatform}/${platform === 'win32' ? 'editor_sdk.exe' : 'editor_sdk'}`]: Buffer.from('binary'),
    [`tencent-docs-ai-engine/bin/${expectedPlatform}/icudt72l.dat`]: Buffer.from('icu')
  }
  for (const [relative, content] of Object.entries(files)) {
    const destination = path.join(root, relative)
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, content)
  }
  if (platform !== 'win32') {
    await chmod(path.join(root, `tencent-docs-ai-engine/bin/${expectedPlatform}/editor_sdk`), 0o755)
  }
  const manifest = Buffer.from(JSON.stringify({
    schemaVersion: 1,
    platform: expectedPlatform,
    slidep: { name: '@tencent/slidep', version: '5.4.1' },
    editorEngine: { name: '@tencent/tencent-docs-ai-engine', version: '0.2.112-wb' },
    skillSha256: 'a'.repeat(64)
  }))
  await writeFile(path.join(root, 'manifest.json'), manifest)
  const lockRoot = await mkdtemp(path.join(os.tmpdir(), 'dsh-workbuddy-runtime-lock-'))
  temporary.push(lockRoot)
  const lockPath = path.join(lockRoot, 'runtime-lock.json')
  const lockedFiles = Object.fromEntries([
    'manifest.json',
    'skills/tencent-pptx/SKILL.md',
    'slidep/package.json',
    'slidep/dist/slidep-start.js',
    'slidep/dist/slidep-validate.js',
    `tencent-docs-ai-engine/bin/${expectedPlatform}/${platform === 'win32' ? 'editor_sdk.exe' : 'editor_sdk'}`,
    `tencent-docs-ai-engine/bin/${expectedPlatform}/icudt72l.dat`
  ].map(relative => [relative, relative === 'manifest.json' ? manifest : files[relative]]))
  const runtimeTree = await runtimeTreeDigest(root)
  await writeFile(lockPath, JSON.stringify({
    schemaVersion: 1,
    platforms: {
      [expectedPlatform]: {
        slidep: '5.4.1',
        editorEngine: '0.2.112-wb',
        runtimeTree,
        files: Object.fromEntries(Object.entries(lockedFiles).map(([relative, content]) => [
          relative,
          createHash('sha256').update(content).digest('hex')
        ]))
      }
    }
  }))
  return { root, lockPath }
}

describe('WorkBuddy PPT Desktop runtime package gate', () => {
  it('accepts a complete runtime for the target platform', async () => {
    const { root, lockPath } = await fixture()
    await expect(verifyWorkBuddyPptRuntime(root, 'darwin', 'arm64', lockPath)).resolves.toMatchObject({
      platform: 'darwin-arm64',
      slidep: { version: '5.4.1' }
    })
  })

  it('rejects a runtime built for another platform', async () => {
    const { root, lockPath } = await fixture()
    await expect(verifyWorkBuddyPptRuntime(root, 'win32', 'x64', lockPath)).rejects.toThrow(
      'does not match win32-x64'
    )
  })

  it('rejects a changed Tencent Skill body', async () => {
    const { root, lockPath } = await fixture()
    await writeFile(path.join(root, 'skills/tencent-pptx/SKILL.md'), '# changed\n')
    await expect(verifyWorkBuddyPptRuntime(root, 'darwin', 'arm64', lockPath)).rejects.toThrow(
      'SHA-256 mismatch: skills/tencent-pptx/SKILL.md'
    )
  })

  it('rejects a missing transitive SlideP dependency file', async () => {
    const { root, lockPath } = await fixture()
    await rm(path.join(root, 'slidep/node_modules/transitive.js'))
    await expect(verifyWorkBuddyPptRuntime(root, 'darwin', 'arm64', lockPath)).rejects.toThrow(
      'runtime file count'
    )
  })
})
