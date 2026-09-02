import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { projectRoot } from './patch-path'

const artifacts = {
  core: {
    file: 'dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-slides-only.tgz',
    sha256: '282831db2e0388ee813eeb15ad6c4abf6914287108dfaec93d5ce260ea4783c8'
  },
  adapter: {
    file: 'deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-slides-only.tgz',
    sha256: '8806676eb2fe7a74a2037dfe2f38e878aaa3656b97396070da46e8bc987bdb8c'
  }
} as const

async function artifact(name: keyof typeof artifacts): Promise<Buffer> {
  return readFile(path.join(projectRoot, 'packages', 'workbuddy-ppt', artifacts[name].file))
}

function tarEntries(archive: Buffer): Map<string, Buffer> {
  const tar = gunzipSync(archive)
  const entries = new Map<string, Buffer>()
  let offset = 0
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/u, '')
    if (name.length === 0) break
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/u, '')
    const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0.*$/u, '').trim()
    const size = Number.parseInt(sizeText || '0', 8)
    const contentOffset = offset + 512
    const fullName = prefix.length === 0 ? name : `${prefix}/${name}`
    entries.set(fullName, tar.subarray(contentOffset, contentOffset + size))
    offset = contentOffset + Math.ceil(size / 512) * 512
  }
  return entries
}

describe('WorkBuddy PPT built-in plugin', () => {
  it('pins the reviewed plugin artifacts byte-for-byte', async () => {
    for (const name of Object.keys(artifacts) as (keyof typeof artifacts)[]) {
      expect(createHash('sha256').update(await artifact(name)).digest('hex')).toBe(artifacts[name].sha256)
    }
  })

  it('ships a standard Composer client closure without the removed legacy runtime', async () => {
    const entries = tarEntries(await artifact('adapter'))
    const archive = entries.get('package/lib/client.js')?.toString('utf8') ?? ''

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
    const entries = tarEntries(await artifact('core'))
    const archive = entries.get('package/lib/index.js')?.toString('utf8') ?? ''

    expect(archive).toContain('workflow: direct Slides JSX authoring')
    expect(archive).toContain('readability, collision, template fidelity, renderer validation')
    expect(archive).toContain('submit every adapted page through ppt_write_page')
    expect(archive).not.toContain('ppt_write_template_page')
    expect(archive).not.toContain('ppt_get_template_reference')
    expect(archive).not.toContain('pptd_render')
    expect(archive).not.toContain('ppt_update_slide')
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

  it('renders the selected template reference in the input card accessory seat', async () => {
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

  it('ships a production archive with only the Slides compiler route', async () => {
    const entries = tarEntries(await artifact('core'))
    const names = [...entries.keys()]
    const host = entries.get('package/lib/index.js')?.toString('utf8') ?? ''
    const manifest = JSON.parse(entries.get('package/package.json')?.toString('utf8') ?? '{}') as {
      bin?: Record<string, string>
      exports?: Record<string, unknown>
      dependencies?: Record<string, string>
    }

    expect(host).toContain('workbuddy-ppt-runtime')
    expect(host).toContain('selected_template_id')
    expect(host).not.toContain('PPT mode')
    expect(names).not.toContain('package/lib/bin.js')
    expect(names).not.toContain('package/lib/pptd.js')
    expect(names).not.toContain('package/skills/kimi-ppt/SKILL.md')
    expect(manifest.bin).toBeUndefined()
    expect(manifest.exports?.['./pptd']).toBeUndefined()
    for (const dependency of ['@aiden0z/pptx-renderer', 'js-yaml', 'jsdom', 'pptxgenjs', 'sharp']) {
      expect(manifest.dependencies?.[dependency]).toBeUndefined()
    }
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
