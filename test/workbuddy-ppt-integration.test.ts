import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { projectRoot } from './patch-path'

const artifacts = {
  core: {
    file: 'dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-layout.tgz',
    sha256: 'c0b4aad5c304a0918d26ea04a88a4ed82c3daa6bd5f2b68e7d8b58a4df5c1c13'
  },
  adapter: {
    file: 'deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-layout.tgz',
    sha256: '79f6d16fefacb6a283fa552c6a9b8373c93eb70ec0f4dec7b452bc53c390fee5'
  }
} as const

async function artifact(name: keyof typeof artifacts): Promise<Buffer> {
  return readFile(path.join(projectRoot, 'packages', 'workbuddy-ppt', artifacts[name].file))
}

describe('WorkBuddy PPT built-in plugin', () => {
  it('pins the reviewed plugin artifacts byte-for-byte', async () => {
    for (const name of Object.keys(artifacts) as (keyof typeof artifacts)[]) {
      expect(createHash('sha256').update(await artifact(name)).digest('hex')).toBe(artifacts[name].sha256)
    }
  })

  it('ships a standard Composer client closure without the removed legacy runtime', async () => {
    const archive = gunzipSync(await artifact('adapter')).toString('utf8')

    expect(archive).toContain('conversation.input.left')
    expect(archive).toContain('conversation.input.dock')
    expect(archive).not.toContain('@deepseek-ai/dsh-client-runtime/client')
    expect(archive).not.toContain('conversation.hero.inputAccessory')
    expect(archive).not.toContain('conversation.chat.turnTail')
  })

  it('ships every JavaScript chunk imported by the Host entry', async () => {
    const archive = gunzipSync(await artifact('core')).toString('utf8')
    const chunk = /from "\.\/(pptd-[A-Za-z0-9_-]+\.js)"/u.exec(archive)?.[1]

    expect(chunk).toBeDefined()
    expect(archive).toContain(`package/lib/${chunk}`)
  })

  it('declares both local artifacts and mounts only the standard adapter', async () => {
    const manifest = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    const profilePatch = await readFile(path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'), 'utf8')

    expect(manifest.dependencies['dsh-workbuddy-ppt']).toBe(
      `file:packages/workbuddy-ppt/${artifacts.core.file}`
    )
    expect(manifest.dependencies['@deepseek-ai/dsh-experimental-office-ppt-standard-adapter']).toBe(
      `file:packages/workbuddy-ppt/${artifacts.adapter.file}`
    )
    expect(profilePatch).toContain("name: '@deepseek-ai/dsh-experimental-office-ppt-standard-adapter'")
    expect(profilePatch).not.toContain('name: dsh-workbuddy-ppt')
  })
})
