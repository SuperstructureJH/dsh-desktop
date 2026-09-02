import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { projectRoot } from './patch-path'

const artifacts = {
  core: {
    file: 'dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-self-contained.tgz',
    sha256: 'f3da9fd978b8b850954ebb9e40c96e9656eaa68b43e371bcd5f45b73b5d0ece3'
  },
  adapter: {
    file: 'deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-self-contained.tgz',
    sha256: '55933aee661f9ab9b46658572a273ede40afb58b5d09256abe1f331a3ca221e4'
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

    expect(archive).toContain('conversation.input.accessory')
    expect(archive).toContain('conversation.composer.dock')
    expect(archive).toContain('session.blank')
    expect(archive).not.toContain('@deepseek-ai/dsh-client-runtime/client')
    expect(archive).not.toContain('conversation.input.left')
    expect(archive).not.toContain('conversation.input.dock')
    expect(archive).not.toContain('conversation.hero.inputAccessory')
    expect(archive).not.toContain('conversation.chat.turnTail')
  })

  it('ships the complete-JSX Slides route and its Host quality gates', async () => {
    const archive = gunzipSync(await artifact('core')).toString('utf8')

    expect(archive).toContain('workflow: direct Slides JSX authoring')
    expect(archive).toContain('readability, collision, source-relationship, template-fidelity')
    expect(archive).toContain('submit every adapted page through ppt_write_page')
    expect(archive).not.toContain('ppt_write_template_page')
  })

  it('renders the template chooser after the resident input card with the current input zone', async () => {
    const client = await readFile(path.join(
      projectRoot,
      'node_modules',
      '@deepseek-ai',
      'dsh-client-ui-conversation',
      'lib',
      'client.js'
    ), 'utf8')
    const owner = client.indexOf('extensionZone: zone')
    const input = client.indexOf('className: clsx(InputBar_module_css_default.card', owner)
    const below = client.indexOf(
      'extensionZone !== void 0 ? renderSlot("conversation.composer.dock", extensionZone) : null',
      input
    )

    expect(owner).toBeGreaterThan(-1)
    expect(input).toBeGreaterThan(owner)
    expect(below).toBeGreaterThan(input)
  })

  it('renders the PPT reference in the input card accessory seat', async () => {
    const client = await readFile(path.join(
      projectRoot,
      'node_modules',
      '@deepseek-ai',
      'dsh-client-ui-conversation',
      'lib',
      'client.js'
    ), 'utf8')
    const owner = client.indexOf('extensionZone: zone')
    const accessory = client.indexOf(
      'children: accessory ?? renderSlot("conversation.input.accessory", extensionZone)'
    )

    expect(owner).toBeGreaterThan(-1)
    expect(accessory).toBeGreaterThan(-1)
    expect(accessory).toBeGreaterThan(owner)
    expect(client).toContain('"conversation.input.accessory": {')
  })

  it('keeps the empty prompt top-aligned and places the selected template inline before text', async () => {
    const client = await readFile(path.join(
      projectRoot,
      'node_modules',
      '@deepseek-ai',
      'dsh-client-ui-conversation',
      'lib',
      'client.js'
    ), 'utf8')
    const promptRow = client.indexOf('className: InputBar_module_css_default.promptRow')
    const accessory = client.indexOf('className: InputBar_module_css_default.accessory', promptRow)
    const scroll = client.indexOf('ref: scrollRef', promptRow)

    expect(promptRow).toBeGreaterThan(-1)
    expect(accessory).toBeGreaterThan(promptRow)
    expect(scroll).toBeGreaterThan(accessory)
    expect(client).toContain('.dYRH2G_promptRow{display:contents}')
    expect(client).toContain(
      '.dYRH2G_accessory{align-items:flex-start;flex:0 0 auto;min-width:0;padding-left:16px;display:none}'
    )
    expect(client).toContain('>.dYRH2G_scroll .dYRH2G_input{padding-left:0}')
    expect(client).toContain('>.dYRH2G_scroll .dYRH2G_placeholder{left:0}')
    expect(client).toContain('tag.textContent = css$1 + pptAccessoryCss')
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
