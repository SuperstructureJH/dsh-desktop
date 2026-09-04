import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { projectRoot } from './patch-path'

const artifacts = {
  core: {
    file: 'dsh-workbuddy-ppt-0.1.1-rc.2-desktop-kimi-20260904.tgz',
    sha256: 'bc88c1d1d6bdd0c846aabfa8c419ba8272ab31a82d7516b8dd3d7f322ccbe631'
  },
  adapter: {
    file: 'deepseek-ai-dsh-experimental-kimi-ppt-standard-adapter-0.1.1-rc.2-desktop-kimi-20260904.tgz',
    sha256: 'd38d3c2ca6dc9526a988ecd5ece750a1a11a71c851318a09ff690bb306a96688'
  }
} as const

async function artifact(name: keyof typeof artifacts): Promise<Buffer> {
  return readFile(path.join(projectRoot, 'packages', 'kimi-ppt', artifacts[name].file))
}

describe('Kimi PPT built-in plugin', () => {
  it('pins the reviewed plugin artifacts byte-for-byte', async () => {
    for (const name of Object.keys(artifacts) as (keyof typeof artifacts)[]) {
      expect(createHash('sha256').update(await artifact(name)).digest('hex')).toBe(artifacts[name].sha256)
    }
  })

  it('ships one Kimi composer surface and excludes the Tencent route', async () => {
    const core = gunzipSync(await artifact('core')).toString('utf8')
    const adapter = gunzipSync(await artifact('adapter')).toString('utf8')
    const excluded = /\b(?:tencent|slidep|editor_sdk)\b|workbuddy[- ]runtime|\bppt_(?:create|render|write_page)\b/iu

    expect(core).toContain('experimental-kimi-ppt')
    expect(core).toContain('pptd_render')
    expect(core).toContain('ppt_get_template_reference')
    expect(core).not.toMatch(excluded)
    expect(adapter).toContain('conversation.hero.modeActions')
    expect(adapter).toContain('kimi-ppt')
    expect(adapter).not.toMatch(excluded)
  })

  it('ships every JavaScript chunk imported by the Host entry', async () => {
    const archive = gunzipSync(await artifact('core')).toString('utf8')
    const chunk = /from "\.\/(pptd-[A-Za-z0-9_-]+\.js)"/u.exec(archive)?.[1]

    expect(chunk).toBeDefined()
    expect(archive).toContain(`package/lib/${chunk}`)
  })

  it('declares both local artifacts and mounts only the Kimi adapter', async () => {
    const manifest = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    const profilePatch = await readFile(path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'), 'utf8')

    expect(manifest.dependencies['dsh-workbuddy-ppt']).toBe(
      `file:packages/kimi-ppt/${artifacts.core.file}`
    )
    expect(manifest.dependencies['@deepseek-ai/dsh-experimental-kimi-ppt-standard-adapter']).toBe(
      `file:packages/kimi-ppt/${artifacts.adapter.file}`
    )
    expect(profilePatch).toContain("name: '@deepseek-ai/dsh-experimental-kimi-ppt-standard-adapter'")
    expect(profilePatch).not.toContain('office-ppt-standard-adapter')
    expect(profilePatch).not.toContain('name: dsh-workbuddy-ppt')
  })
})
