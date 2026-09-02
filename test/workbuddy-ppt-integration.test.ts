import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { projectRoot } from './patch-path'

const artifacts = {
  core: {
    file: 'dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-self-contained.tgz',
    sha256: 'bd469e8931ca1566a265b11865b87f30115b2597c7932d98d59d31a4fc071f41'
  },
  adapter: {
    file: 'deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-self-contained.tgz',
    sha256: '9d434e6b8fc3232bc4c08a9f854da813e1fa1bf9bd1a6e93730b0f9c811e21e1'
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
    expect(archive).toContain('conversation.composer.dock')
    expect(archive).not.toContain('@deepseek-ai/dsh-client-runtime/client')
    expect(archive).not.toContain('conversation.input.dock')
    expect(archive).not.toContain('conversation.hero.inputAccessory')
    expect(archive).not.toContain('conversation.chat.turnTail')
  })

  it('renders the hero composer dock after the resident input card', async () => {
    const client = await readFile(path.join(
      projectRoot,
      'node_modules',
      '@deepseek-ai',
      'dsh-client-ui-conversation',
      'lib',
      'client.js'
    ), 'utf8')
    const start = client.indexOf('zone !== void 0 && renderSlot("conversation.input.dock", zone)')
    const input = client.indexOf('inputBar,', start)
    const below = client.indexOf(
      'hero && zone !== void 0 && renderSlot("conversation.composer.dock", zone)',
      input
    )

    expect(start).toBeGreaterThan(-1)
    expect(input).toBeGreaterThan(start)
    expect(below).toBeGreaterThan(input)
  })

  it('ships every JavaScript chunk imported by the Host entry', async () => {
    const archive = gunzipSync(await artifact('core')).toString('utf8')
    const chunk = /from "\.\/(pptd-[A-Za-z0-9_-]+\.js)"/u.exec(archive)?.[1]

    expect(chunk).toBeDefined()
    expect(archive).toContain(`package/lib/${chunk}`)
    expect(archive).toContain('workbuddy-ppt-runtime')
    expect(archive).toContain('selected_template_id')
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
