import { createHash } from 'node:crypto'
import { chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  downloadRuntimeArchive,
  ensureWorkBuddyPptRuntime
} from '../scripts/ensure-workbuddy-ppt-runtime.mjs'
import { runtimeTreeDigest } from '../scripts/verify-workbuddy-ppt-runtime.mjs'

const temporary = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dsh-runtime-download-test-'))
  temporary.push(root)
  const runtimeRoot = path.join(root, 'source-runtime')
  const platform = 'darwin'
  const arch = 'arm64'
  const targetPlatform = `${platform}-${arch}`
  const files = {
    'skills/tencent-pptx/SKILL.md': Buffer.from('# Tencent PPTX\n'),
    'skills/tencent-pptx/references/create-from-scratch.md': Buffer.from('# Scratch\n'),
    'skills/tencent-pptx/references/create-from-material.md': Buffer.from('# Material\n'),
    'slidep/package.json': Buffer.from('{"name":"@tencent/slidep","version":"5.4.1"}'),
    'slidep/dist/slidep-start.js': Buffer.from(''),
    'slidep/dist/slidep-validate.js': Buffer.from(''),
    'slidep/node_modules/.keep': Buffer.from(''),
    [`tencent-docs-ai-engine/bin/${targetPlatform}/editor_sdk`]: Buffer.from('binary'),
    [`tencent-docs-ai-engine/bin/${targetPlatform}/icudt72l.dat`]: Buffer.from('icu')
  }
  for (const [relative, content] of Object.entries(files)) {
    const destination = path.join(runtimeRoot, relative)
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, content)
  }
  await chmod(path.join(runtimeRoot, `tencent-docs-ai-engine/bin/${targetPlatform}/editor_sdk`), 0o755)
  const manifest = Buffer.from(JSON.stringify({
    schemaVersion: 1,
    platform: targetPlatform,
    slidep: { name: '@tencent/slidep', version: '5.4.1' },
    editorEngine: { name: '@tencent/tencent-docs-ai-engine', version: '0.2.112-wb' },
    skillSha256: 'a'.repeat(64)
  }))
  await writeFile(path.join(runtimeRoot, 'manifest.json'), manifest)

  const runtimeTree = await runtimeTreeDigest(runtimeRoot)
  const lockedFiles = [
    'manifest.json',
    'skills/tencent-pptx/SKILL.md',
    'slidep/package.json',
    'slidep/dist/slidep-start.js',
    'slidep/dist/slidep-validate.js',
    `tencent-docs-ai-engine/bin/${targetPlatform}/editor_sdk`,
    `tencent-docs-ai-engine/bin/${targetPlatform}/icudt72l.dat`
  ]
  const lockPath = path.join(root, 'runtime-lock.json')
  await writeFile(lockPath, JSON.stringify({
    schemaVersion: 1,
    platforms: {
      [targetPlatform]: {
        slidep: '5.4.1',
        editorEngine: '0.2.112-wb',
        runtimeTree,
        files: Object.fromEntries(await Promise.all(lockedFiles.map(async relative => {
          const content = relative === 'manifest.json' ? manifest : files[relative]
          return [relative, createHash('sha256').update(content).digest('hex')]
        })))
      }
    }
  }))

  const archive = Buffer.from('locked runtime archive')
  const distributionPath = path.join(root, 'runtime-distribution.json')
  await writeFile(distributionPath, JSON.stringify({
    schemaVersion: 1,
    platforms: {
      [targetPlatform]: {
        archive: 'tar.gz',
        archiveSize: archive.byteLength,
        archiveSha256: createHash('sha256').update(archive).digest('hex'),
        url: 'https://example.test/runtime.tar.gz'
      }
    }
  }))
  return { root, runtimeRoot, platform, arch, lockPath, distributionPath, archive, runtimeTree }
}

describe('WorkBuddy PPT runtime downloader', () => {
  it('publishes an immutable HTTPS archive descriptor for Apple Silicon', async () => {
    const descriptorPath = path.resolve(
      import.meta.dirname,
      '../packages/workbuddy-ppt/runtime-distribution.json'
    )
    const distribution = JSON.parse(await readFile(descriptorPath, 'utf8'))
    expect(distribution).toMatchObject({
      schemaVersion: 1,
      platforms: {
        'darwin-arm64': {
          archive: 'tar.gz',
          archiveSize: 207169828,
          archiveSha256: 'ca273302786617b722e98aa0976386a497e287db72880d07257bb32cd3d33a1d'
        }
      }
    })
    expect(distribution.platforms['darwin-arm64'].url).toMatch(
      /^https:\/\/github\.com\/SuperstructureJH\/dsh-desktop\/releases\/download\//u
    )
  })

  it('streams an HTTPS response into the requested archive file', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'dsh-runtime-stream-test-'))
    temporary.push(root)
    const destination = path.join(root, 'runtime.tar.gz')
    const archive = Buffer.from('downloaded archive')
    const fetchImpl = vi.fn(async () => new Response(archive, { status: 200 }))

    await expect(downloadRuntimeArchive('https://example.test/runtime.tar.gz', destination, {
      fetchImpl,
      output: { write: vi.fn() }
    })).resolves.toBe(archive.byteLength)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('downloads, verifies, atomically caches, and reuses a locked runtime', async () => {
    const test = await fixture()
    const downloadArchive = vi.fn(async (_url, destination) => {
      await writeFile(destination, test.archive)
      return test.archive.byteLength
    })
    const extractArchive = vi.fn(async (_archive, destination) => {
      await cp(test.runtimeRoot, destination, { recursive: true })
    })
    const options = {
      platform: test.platform,
      arch: test.arch,
      cacheRoot: path.join(test.root, 'cache'),
      lockPath: test.lockPath,
      distributionPath: test.distributionPath,
      downloadArchive,
      extractArchive,
      output: { write: vi.fn() }
    }

    const installed = await ensureWorkBuddyPptRuntime(options)
    expect(installed).toBe(path.join(options.cacheRoot, 'darwin-arm64', test.runtimeTree.sha256))
    expect(downloadArchive).toHaveBeenCalledTimes(1)
    expect(extractArchive).toHaveBeenCalledTimes(1)

    await expect(ensureWorkBuddyPptRuntime(options)).resolves.toBe(installed)
    expect(downloadArchive).toHaveBeenCalledTimes(1)
  })

  it('uses and verifies an explicitly configured runtime without downloading', async () => {
    const test = await fixture()
    const downloadArchive = vi.fn()
    await expect(ensureWorkBuddyPptRuntime({
      platform: test.platform,
      arch: test.arch,
      lockPath: test.lockPath,
      distributionPath: path.join(test.root, 'unused.json'),
      environment: { DSH_WORKBUDDY_PPT_RUNTIME_ROOT: test.runtimeRoot },
      downloadArchive,
      output: { write: vi.fn() }
    })).resolves.toBe(test.runtimeRoot)
    expect(downloadArchive).not.toHaveBeenCalled()
  })

  it('rejects an archive whose bytes do not match the public lock', async () => {
    const test = await fixture()
    const downloadArchive = vi.fn(async (_url, destination) => {
      const changed = Buffer.from(test.archive)
      changed[0] = changed[0] ^ 1
      await writeFile(destination, changed)
      return changed.byteLength
    })
    const extractArchive = vi.fn()
    await expect(ensureWorkBuddyPptRuntime({
      platform: test.platform,
      arch: test.arch,
      cacheRoot: path.join(test.root, 'bad-cache'),
      lockPath: test.lockPath,
      distributionPath: test.distributionPath,
      downloadArchive,
      extractArchive,
      output: { write: vi.fn() }
    })).rejects.toThrow('archive SHA-256 mismatch')
    expect(extractArchive).not.toHaveBeenCalled()
  })

  it('keeps development available without Slides on an unpublished platform', async () => {
    const test = await fixture()
    await expect(ensureWorkBuddyPptRuntime({
      platform: 'win32',
      arch: 'x64',
      distributionPath: test.distributionPath,
      lockPath: test.lockPath,
      optional: true,
      output: { write: vi.fn() }
    })).resolves.toBeUndefined()
  })
})
