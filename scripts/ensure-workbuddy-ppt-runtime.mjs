import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { createReadStream } from 'node:fs'
import {
  access,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rename,
  rm,
  stat
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { finished } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { verifyWorkBuddyPptRuntime } from './verify-workbuddy-ppt-runtime.mjs'

const execFileAsync = promisify(execFile)
const DEFAULT_DISTRIBUTION_PATH = fileURLToPath(
  new URL('../packages/workbuddy-ppt/runtime-distribution.json', import.meta.url)
)
const DEFAULT_LOCK_PATH = fileURLToPath(
  new URL('../packages/workbuddy-ppt/runtime-lock.json', import.meta.url)
)

function platformName(platform, arch) {
  return `${platform}-${arch}`
}

function defaultCacheRoot(platform, environment) {
  if (environment.DSH_WORKBUDDY_PPT_RUNTIME_CACHE) {
    return path.resolve(environment.DSH_WORKBUDDY_PPT_RUNTIME_CACHE)
  }
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Caches', 'dsh-desktop', 'ppt-capability')
  }
  if (platform === 'win32') {
    const localAppData = environment.LOCALAPPDATA
    if (localAppData) return path.join(localAppData, 'dsh-desktop', 'ppt-capability')
  }
  const xdgCache = environment.XDG_CACHE_HOME
  return path.join(xdgCache || path.join(os.homedir(), '.cache'), 'dsh-desktop', 'ppt-capability')
}

async function sha256File(filePath) {
  const hash = createHash('sha256')
  const stream = createReadStream(filePath)
  stream.on('data', chunk => hash.update(chunk))
  await finished(stream)
  return hash.digest('hex')
}

function assertSecureDownloadUrl(value) {
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:') {
    throw new Error(`PPT Capability runtime download must use HTTPS: ${value}`)
  }
  return parsed.toString()
}

export async function downloadRuntimeArchive(url, destination, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const output = options.output ?? process.stdout
  const response = await fetchImpl(assertSecureDownloadUrl(url), {
    redirect: 'follow',
    signal: AbortSignal.timeout(15 * 60 * 1000)
  })
  if (!response.ok || !response.body) {
    throw new Error(`PPT Capability runtime download failed: HTTP ${response.status}`)
  }
  const handle = await open(destination, 'wx')
  let received = 0
  let nextProgress = 32 * 1024 * 1024
  try {
    for await (const value of response.body) {
      const chunk = Buffer.from(value)
      let offset = 0
      while (offset < chunk.byteLength) {
        const { bytesWritten } = await handle.write(chunk, offset, chunk.byteLength - offset)
        if (bytesWritten === 0) throw new Error('PPT Capability runtime archive write stopped early')
        offset += bytesWritten
      }
      received += chunk.byteLength
      if (received >= nextProgress) {
        output.write(`PPT Capability runtime download: ${Math.round(received / 1024 / 1024)} MiB\n`)
        nextProgress += 32 * 1024 * 1024
      }
    }
  } finally {
    await handle.close()
  }
  return received
}

function validateArchiveEntries(entries) {
  for (const rawEntry of entries.split('\n')) {
    const entry = rawEntry.trim().replace(/^\.\//u, '').replace(/\/$/u, '')
    if (!entry) continue
    const segments = entry.split('/')
    if (path.posix.isAbsolute(entry) || entry.includes('\\') || segments.includes('..')) {
      throw new Error(`PPT Capability runtime archive contains an unsafe path: ${rawEntry}`)
    }
  }
}

export async function extractRuntimeArchive(archivePath, destination) {
  const listed = await execFileAsync('tar', ['-tzf', archivePath], { maxBuffer: 64 * 1024 * 1024 })
  validateArchiveEntries(listed.stdout)
  await mkdir(destination, { recursive: true })
  await execFileAsync('tar', ['-xzf', archivePath, '-C', destination], {
    maxBuffer: 16 * 1024 * 1024
  })
}

async function downloadWithRetry(url, destination, downloadArchive, output) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await rm(destination, { force: true })
    try {
      return await downloadArchive(url, destination, { output })
    } catch (error) {
      lastError = error
      if (attempt < 3) output.write(`PPT Capability runtime download retry ${attempt + 1}/3\n`)
    }
  }
  throw lastError
}

export async function ensureWorkBuddyPptRuntime(options = {}) {
  const platform = options.platform ?? process.platform
  const arch = options.arch ?? process.arch
  const environment = options.environment ?? process.env
  const output = options.output ?? process.stdout
  const distributionPath = options.distributionPath ?? DEFAULT_DISTRIBUTION_PATH
  const lockPath = options.lockPath ?? DEFAULT_LOCK_PATH
  const verifyRuntime = options.verifyRuntime ?? verifyWorkBuddyPptRuntime
  const downloadArchive = options.downloadArchive ?? downloadRuntimeArchive
  const extractArchive = options.extractArchive ?? extractRuntimeArchive
  const configuredRoot = environment.DSH_WORKBUDDY_PPT_RUNTIME_ROOT?.trim()

  if (configuredRoot) {
    if (!path.isAbsolute(configuredRoot)) {
      throw new Error('DSH_WORKBUDDY_PPT_RUNTIME_ROOT must be absolute')
    }
    await verifyRuntime(configuredRoot, platform, arch, lockPath)
    output.write(`PPT Capability runtime: ${configuredRoot}\n`)
    return configuredRoot
  }

  const targetPlatform = platformName(platform, arch)
  const distribution = JSON.parse(await readFile(distributionPath, 'utf8'))
  if (distribution.schemaVersion !== 1) {
    throw new Error(`Unsupported PPT Capability runtime distribution schema: ${distribution.schemaVersion}`)
  }
  const descriptor = distribution.platforms?.[targetPlatform]
  if (!descriptor) {
    if (options.optional) {
      output.write(`PPT Capability runtime is not published for ${targetPlatform}; continuing without Slides.\n`)
      return undefined
    }
    throw new Error(`PPT Capability runtime is not published for ${targetPlatform}`)
  }
  if (descriptor.archive !== 'tar.gz') {
    throw new Error(`Unsupported PPT Capability runtime archive: ${descriptor.archive}`)
  }
  if (!Number.isSafeInteger(descriptor.archiveSize) || descriptor.archiveSize <= 0) {
    throw new Error('PPT Capability runtime archive has an invalid size lock')
  }
  if (!/^[0-9a-f]{64}$/u.test(descriptor.archiveSha256)) {
    throw new Error('PPT Capability runtime archive has an invalid SHA-256 lock')
  }

  const lock = JSON.parse(await readFile(lockPath, 'utf8'))
  const platformLock = lock.platforms?.[targetPlatform]
  if (!platformLock) throw new Error(`PPT Capability runtime lock has no ${targetPlatform} entry`)
  if (!/^[0-9a-f]{64}$/u.test(platformLock.runtimeTree?.sha256)) {
    throw new Error('PPT Capability runtime tree has an invalid SHA-256 lock')
  }
  const cacheRoot = options.cacheRoot ?? defaultCacheRoot(platform, environment)
  const platformCache = path.join(cacheRoot, targetPlatform)
  const runtimeRoot = path.join(platformCache, platformLock.runtimeTree.sha256)

  try {
    await access(path.join(runtimeRoot, 'manifest.json'))
    await verifyRuntime(runtimeRoot, platform, arch, lockPath)
    output.write(`PPT Capability runtime cache: ${runtimeRoot}\n`)
    return runtimeRoot
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  await mkdir(platformCache, { recursive: true })
  const stagingRoot = await mkdtemp(path.join(platformCache, '.install-'))
  const archivePath = path.join(stagingRoot, 'runtime.tar.gz')
  const extractedRoot = path.join(stagingRoot, 'runtime')
  const url = environment.DSH_WORKBUDDY_PPT_RUNTIME_URL?.trim() || descriptor.url

  try {
    output.write(`Downloading PPT Capability runtime for ${targetPlatform}…\n`)
    const received = await downloadWithRetry(url, archivePath, downloadArchive, output)
    const archiveStats = await stat(archivePath)
    if (received !== descriptor.archiveSize || archiveStats.size !== descriptor.archiveSize) {
      throw new Error(
        `PPT Capability runtime archive size ${archiveStats.size} does not match locked ${descriptor.archiveSize}`
      )
    }
    const archiveSha256 = await sha256File(archivePath)
    if (archiveSha256 !== descriptor.archiveSha256) {
      throw new Error('PPT Capability runtime archive SHA-256 mismatch')
    }
    await extractArchive(archivePath, extractedRoot)
    await verifyRuntime(extractedRoot, platform, arch, lockPath)
    try {
      await rename(extractedRoot, runtimeRoot)
    } catch (error) {
      if (error?.code !== 'EEXIST' && error?.code !== 'ENOTEMPTY') throw error
      await verifyRuntime(runtimeRoot, platform, arch, lockPath)
    }
    output.write(`PPT Capability runtime installed: ${runtimeRoot}\n`)
    return runtimeRoot
  } finally {
    await rm(stagingRoot, { recursive: true, force: true })
  }
}

async function main() {
  await ensureWorkBuddyPptRuntime({ optional: process.argv.includes('--optional') })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
