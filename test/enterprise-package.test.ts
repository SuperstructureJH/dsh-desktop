import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const execFileAsync = promisify(execFile)

describe('DSH Desktop enterprise package', () => {
  it('exports the declared Client bundle for the Harness module loader', async () => {
    const packageJson = JSON.parse(await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-enterprise', 'package.json'),
      'utf8'
    )) as {
      dsh?: { client?: unknown }
      exports?: Record<string, unknown>
    }

    expect(packageJson.dsh?.client).toBeTruthy()
    expect(packageJson.exports?.['./client']).toBe('./client.js')
  })

  it('ships a syntactically valid Client module-loader bundle', async () => {
    const clientPath = path.join(
      projectRoot,
      'packages',
      'dsh-desktop-enterprise',
      'client.js'
    )

    await expect(execFileAsync(process.execPath, ['--check', clientPath])).resolves.toMatchObject({
      stderr: ''
    })
  })

  it('keeps the last BiSheng platform URL after enterprise sign-out', async () => {
    const client = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-enterprise', 'client.js'),
      'utf8'
    )

    expect(client).toContain('dshDesktopEnterprise.lastBase')
    expect(client).toContain('localStorage.setItem(LAST_BASE_KEY')
    expect(client).not.toContain("setBase('')")
  })

  it('keeps sign-in focused and shows model usage with hover percentages', async () => {
    const client = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-enterprise', 'client.js'),
      'utf8'
    )

    expect(client).not.toContain('copy.lead')
    expect(client).not.toContain('copy.disconnected')
    expect(client).not.toContain('copy.platformHint')
    expect(client).not.toContain('copy.sessionExpires')
    expect(client).not.toContain("h('dt', null, copy.platform)")
    expect(client).not.toContain('copy.connected')
    expect(client).not.toContain('state.tenant?.name')
    expect(client).not.toContain('state.user?.display_name')
    expect(client).not.toContain('state.usage)')
    expect(client).not.toContain("h('div', { className: 'dshEnterpriseCard' }, status, accountContent, errorPanel)")
    expect(client).toContain("state.user?.id || '—'")
    expect(client).toContain('@keyframes dshEnterprisePulse')
    expect(client).toContain("state.modelUsage?.[model.id]")
    expect(client).toContain('.dshEnterpriseModels li:hover .dshEnterpriseModelUsageValue{display:none}')
    expect(client).toContain('.dshEnterpriseModels li:hover .dshEnterpriseModelUsagePercent{display:inline}')
    expect(client).toContain("className: 'dshEnterpriseModelUsageValue'")
    expect(client).toContain("className: 'dshEnterpriseModelUsagePercent'")
    expect(client).toContain('maximumFractionDigits: 1')
    expect(client).not.toContain('Math.min(100')
    expect(client).toContain("refresh: '刷新'")
    expect(client).toContain("className: 'dshEnterpriseIconButton'")
    expect(client).toContain("'aria-label': copy.refresh")
    expect(client).toContain("h('span', { 'aria-hidden': 'true' }, '↻')")
    expect(client).toContain("h('button', { className: 'dshEnterpriseButton', disabled: busy || !base.trim()")
    expect(client).not.toContain("h('button', { className: 'dshEnterpriseButton primary', disabled: busy || !base.trim()")
  })
})
