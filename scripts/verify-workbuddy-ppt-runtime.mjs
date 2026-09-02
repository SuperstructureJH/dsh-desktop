import { access, readFile, readdir, stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createHash } from 'node:crypto'
import { finished } from 'node:stream/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUIRED_SKILL_FILES = [
  'skills/tencent-pptx/SKILL.md',
  'skills/tencent-pptx/references/create-from-scratch.md',
  'skills/tencent-pptx/references/create-from-material.md'
]
const REQUIRED_SLIDEP_FILES = [
  'slidep/package.json',
  'slidep/dist/slidep-start.js',
  'slidep/dist/slidep-validate.js',
  'slidep/node_modules'
]

function platformName(platform, arch) {
  return `${platform}-${arch}`
}

const DEFAULT_LOCK_PATH = fileURLToPath(new URL('../packages/workbuddy-ppt/runtime-lock.json', import.meta.url))

async function sha256File(file) {
  const hash = createHash('sha256')
  const stream = createReadStream(file)
  stream.on('data', chunk => hash.update(chunk))
  await finished(stream)
  return hash.digest('hex')
}

async function runtimeFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue
    const absolute = path.join(current, entry.name)
    if (entry.isDirectory()) {
      files.push(...await runtimeFiles(root, absolute))
    } else if (entry.isFile()) {
      files.push(path.relative(root, absolute).split(path.sep).join('/'))
    } else {
      throw new Error(`WorkBuddy PPT runtime contains an unsupported entry: ${absolute}`)
    }
  }
  return files
}

/** Return a deterministic digest for every packaged runtime file except Finder metadata. */
export async function runtimeTreeDigest(root) {
  const files = (await runtimeFiles(root)).sort((left, right) => left.localeCompare(right, 'en'))
  const hash = createHash('sha256')
  for (const relative of files) {
    hash.update(relative)
    hash.update('\0')
    hash.update(await sha256File(path.join(root, relative)))
    hash.update('\n')
  }
  return { fileCount: files.length, sha256: hash.digest('hex') }
}

export async function verifyWorkBuddyPptRuntime(
  root,
  platform = process.platform,
  arch = process.arch,
  lockPath = DEFAULT_LOCK_PATH
) {
  if (!path.isAbsolute(root)) throw new Error('DSH_WORKBUDDY_PPT_RUNTIME_ROOT must be absolute')
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'))
  const expectedPlatform = platformName(platform, arch)
  if (manifest.platform !== expectedPlatform) {
    throw new Error(`WorkBuddy PPT runtime platform ${manifest.platform} does not match ${expectedPlatform}`)
  }
  const editorBinary = platform === 'win32' ? 'editor_sdk.exe' : 'editor_sdk'
  const required = [
    ...REQUIRED_SKILL_FILES,
    ...REQUIRED_SLIDEP_FILES,
    `tencent-docs-ai-engine/bin/${expectedPlatform}/${editorBinary}`,
    `tencent-docs-ai-engine/bin/${expectedPlatform}/icudt72l.dat`
  ]
  await Promise.all(required.map(relative => access(path.join(root, relative))))
  if (!/^[0-9a-f]{64}$/u.test(manifest.skillSha256)) {
    throw new Error('WorkBuddy PPT runtime manifest has an invalid Skill SHA-256')
  }
  const lock = JSON.parse(await readFile(lockPath, 'utf8'))
  const platformLock = lock.platforms?.[expectedPlatform]
  if (!platformLock) throw new Error(`WorkBuddy PPT runtime lock has no ${expectedPlatform} entry`)
  if (platformLock.slidep !== manifest.slidep.version) {
    throw new Error(`WorkBuddy PPT SlideP ${manifest.slidep.version} does not match locked ${platformLock.slidep}`)
  }
  if (platformLock.editorEngine !== manifest.editorEngine.version) {
    throw new Error(`WorkBuddy PPT editor engine ${manifest.editorEngine.version} does not match locked ${platformLock.editorEngine}`)
  }
  for (const [relative, expected] of Object.entries(platformLock.files)) {
    const actual = await sha256File(path.join(root, relative))
    if (actual !== expected) {
      throw new Error(`WorkBuddy PPT runtime SHA-256 mismatch: ${relative}`)
    }
  }
  const tree = await runtimeTreeDigest(root)
  if (tree.fileCount !== platformLock.runtimeTree.fileCount) {
    throw new Error(`WorkBuddy PPT runtime file count ${tree.fileCount} does not match locked ${platformLock.runtimeTree.fileCount}`)
  }
  if (tree.sha256 !== platformLock.runtimeTree.sha256) {
    throw new Error('WorkBuddy PPT runtime tree SHA-256 mismatch')
  }
  // Windows does not expose POSIX executable bits, including for a fixture or
  // cross-target runtime. Native macOS/Linux packaging still enforces them.
  if (platform !== 'win32' && process.platform !== 'win32') {
    const mode = (await stat(path.join(root, `tencent-docs-ai-engine/bin/${expectedPlatform}/${editorBinary}`))).mode
    if ((mode & 0o111) === 0) throw new Error('WorkBuddy PPT editor_sdk must be executable')
  }
  return manifest
}

async function main() {
  const root = process.env.DSH_WORKBUDDY_PPT_RUNTIME_ROOT
  if (!root && process.argv.includes('--optional')) {
    process.stdout.write('WorkBuddy PPT Slides runtime is not configured; packaging this platform with the bundled PPTD workflow.\n')
    return
  }
  if (!root) throw new Error('DSH_WORKBUDDY_PPT_RUNTIME_ROOT is required for Desktop packaging')
  const manifest = await verifyWorkBuddyPptRuntime(root)
  process.stdout.write([
    `WorkBuddy PPT runtime verified: ${root}`,
    `${manifest.slidep.name}@${manifest.slidep.version}`,
    `${manifest.editorEngine.name}@${manifest.editorEngine.version}`,
    manifest.platform
  ].join(' · ') + '\n')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
