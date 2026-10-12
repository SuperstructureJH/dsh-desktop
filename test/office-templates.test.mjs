import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, realpath, cp } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterEach, expect, it } from 'vitest'
import { createTemplateLibrary, digest } from '../packages/dsh-desktop-office/lib/templates.js'
import { materialize } from '../packages/dsh-desktop-office/lib/template-writer.js'
import { workspacePolicy, templateTool } from '../packages/dsh-desktop-office/lib/template-tool.js'
import { registerOfficeContext, registerOfficeRoutes } from '../packages/dsh-desktop-office/lib/modes.js'
import { registerBusinessSkills } from '../packages/dsh-desktop-office/lib/business-skills.js'
import { apply as applyPpt } from 'dsh-ppt'
import { electronExecutable } from '../scripts/electron-node-loader.mjs'

const scratch = []
afterEach(async () => { for (const directory of scratch.splice(0)) await rm(directory, { recursive: true, force: true }) })
async function temporary() { const root = await realpath(await mkdtemp(join(tmpdir(), 'office-template-'))); scratch.push(root); return root }
const resources = resolve('.build/office-runtime/templates')
const library = await createTemplateLibrary(resources)

it('produces the same native workbook revision across repeated official Kit recalculations', async () => {
  const directory = await temporary()
  const python = resolve('.build/office-runtime/primary-runtime/dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python3')
  const hashes = []
  for (const filename of ['first.xlsx', 'second.xlsx']) {
    const output = join(directory, filename)
    await promisify(execFile)(electronExecutable(resolve('.')), [resolve('build/office-cli.mjs'), 'recalculate', '--input', join(resources, 'annual-business/example.xlsx'), '--output', output], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, timeout: 30_000
    })
    await promisify(execFile)(python, ['-I', '-B', resolve('scripts/office-runtime/normalize-package.py'), output])
    hashes.push(digest(await readFile(output)))
  }
  expect(hashes[0]).toBe(hashes[1])
}, 60_000)

it('independently verifies recalculated values, charts, original frozen panes and native package integrity', async () => {
  const python = resolve('.build/office-runtime/primary-runtime/dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python3')
  const { stdout } = await promisify(execFile)(python, ['-I', '-B', resolve('scripts/office-runtime/check-templates.py'), resources, resolve('packages/dsh-desktop-office/sources')])
  const result = JSON.parse(stdout)
  expect(result.templates).toBe(6); expect(result.preview_pages).toBe(52)
  expect(result.numeric_checks).toBe(9)
  expect(result.excel_error_cells).toBe(0)
})

async function modesFixture() {
  const root = await temporary(), hooks = [], tools = new Map()
  const ctx = { provide(name, service) { this[name] = service }, skills: { registerProvider() {} },
    tools: { register(tool) { tools.set(tool.name, tool) } }, systemPrompt: { section() {} },
    inject() {}, on(name, hook) { hooks.push({ name, hook }) } }
  await applyPpt(ctx, { root })
  return { ctx, modes: ctx.officeModes, root, hooks }
}

it('publishes six curated native cases with complete preview hashes', async () => {
  const items = await library.list()
  expect(items.filter(item => item.mode === 'word').map(item => item.id)).toEqual(['government-notice', 'coffee-market', 'equity-research'])
  expect(items.filter(item => item.mode === 'word')).toHaveLength(3)
  expect([...new Set(items.filter(item => item.mode === 'word').map(item => item.category))]).toEqual(['公文写作', '调研分析'])
  expect(items.filter(item => item.mode === 'excel').map(item => item.id)).toEqual(['annual-business', 'port-cargo', 'bio-assay'])
  for (const id of ['meeting-minutes', 'work-summary', 'work-daily', 'project-proposal', 'budget-expenses', 'project-tracker', 'sales-report']) await expect(library.prepare(id)).rejects.toThrow()
  for (const item of items) {
    const entry = library.entry(item.id)
    for (const file of Object.keys(entry.files)) expect(digest(await library.asset(item.id, file))).toBe(entry.files[file])
    const last = await library.preview(item.id, item.pages)
    expect(last.image).toMatch(/^data:image\/webp;base64,/)
  }
  await expect(library.preview('equity-research', 13)).rejects.toThrow('available')
  await expect(library.asset('government-notice', '../example.docx')).rejects.toThrow('registered')
})

it('rejects changed resources and stale selections before copying them', async () => {
  const root = await temporary()
  await cp(resources, root, { recursive: true })
  const changed = await createTemplateLibrary(root)
  await writeFile(join(root, 'government-notice', 'example.docx'), 'tampered')
  await expect(changed.prepare('government-notice', { id: 'government-notice', mode: 'word', revision: library.entry('government-notice').revision })).rejects.toThrow('recorded revision')
  await expect(library.prepare('government-notice', { id: 'government-notice', mode: 'word', revision: 'old' })).rejects.toThrow('selected Office')
})

it('persists a single document format across restarts and preserves historical PPT files', async () => {
  const f = await modesFixture(), id = 'session-state'
  await f.modes.select(id, 'word')
  const item = library.entry('government-notice')
  await f.modes.selectTemplate(id, { id: item.id, mode: item.mode, revision: item.revision })
  const restarted = { provide(name, value) { this[name] = value }, skills: { registerProvider() {} }, tools: { register() {} }, systemPrompt: { section() {} }, on() {}, inject() {} }
  await applyPpt(restarted, { root: f.root })
  expect((await restarted.officeModes.state(id)).selectedDocumentTemplate.id).toBe('government-notice')
  await restarted.officeModes.select(id, 'excel')
  expect((await f.modes.state(id)).selectedDocumentTemplate).toBeUndefined()
  expect((await f.modes.state(id)).documentMode).toBe('excel')
  await f.modes.select(id, null)
  expect((await f.modes.state(id)).documentMode).toBeUndefined()
  expect((await f.modes.state(id)).decks).toEqual([])
  expect(await readFile(join(f.root, 'audit.ndjson'), 'utf8')).toContain('select-document-template')
})

it('routes bounded, versioned choices through the authenticated Connection owner', async () => {
  const f = await modesFixture(); let route
  registerOfficeRoutes({ connection: { fetch: { register(value) { route = value } } } }, library, f.modes)
  expect(route.path).toBe('/api/office-templates')
  const rpc = async (endpoint, payload, signal) => (await (await route.fetch(new Request('http://localhost/api/office-templates', { method: 'POST', headers: { 'content-type': 'application/json' }, signal, body: JSON.stringify({ type: 'client-request', rpcId: 'test-' + endpoint, method: 'office-templates', payload: { endpoint, ...payload } }) }))).json()).result
  const signal = new AbortController().signal
  const item = library.entry('government-notice'), payload = { sessionId: 'session-route', templateId: item.id, revision: item.revision }
  expect((await rpc('select', payload, signal)).ok).toBe(false)
  expect((await rpc('mode', { sessionId: payload.sessionId, mode: 'word' }, signal)).ok).toBe(true)
  expect((await rpc('select', { ...payload, revision: 'old' }, signal)).ok).toBe(false)
  expect((await rpc('select', payload, signal)).value.selectedTemplateId).toBe(item.id)
  expect((await rpc('preview', { ...payload, page: 2 }, signal)).value.page).toBe(2)
  expect((await rpc('preview', { ...payload, page: 0 }, signal)).ok).toBe(false)
  expect((await rpc('mode', { sessionId: payload.sessionId, mode: 'shell' }, signal)).ok).toBe(false)
})

it('keeps business providers separate from the official Office provider', async () => {
  let provider
  registerBusinessSkills({ skills: { registerProvider(factory) { provider = factory() } } })
  expect(provider.name).toBe('dsh-desktop-office-business')
  expect((await provider.list()).map(item => item.name)).toEqual(['gov-doc-writing', 'meeting-recap', 'work-report-writer', 'research-writer', 'saas-metrics-coach', 'dataset-health-audit', 'data-viz-gen'])
  const skill = await provider.get({ name: 'meeting-recap' })
  expect(skill.content).toContain('office-docx')
  expect(skill.content).toContain('当前用户材料提供事实')
})

it('expires a saved retired case and lets the session choose a curated replacement', async () => {
  const f = await modesFixture(); let route
  await f.modes.select('retired-case', 'word')
  await f.modes.selectTemplate('retired-case', { id: 'meeting-minutes', mode: 'word', revision: 'a'.repeat(24) })
  registerOfficeRoutes({ connection: { fetch: { register(value) { route = value } } } }, library, f.modes)
  const rpc = async (endpoint, payload = {}) => (await (await route.fetch(new Request('http://localhost/api/office-templates', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: endpoint, method: 'office-templates', payload: { endpoint, sessionId: 'retired-case', ...payload } }) }))).json()).result
  expect((await rpc('state')).value).toMatchObject({ selectedTemplateId: null, selectionExpired: true })
  expect((await rpc('select', { templateId: 'meeting-minutes', revision: 'a'.repeat(24) })).ok).toBe(false)
  const item = library.entry('government-notice')
  expect((await rpc('select', { templateId: item.id, revision: item.revision })).value).toMatchObject({ selectedTemplateId: item.id, selectionExpired: false })
})

it('restores selected Office context after compaction and retires it when switching formats', async () => {
  const f = await modesFixture(), id = 'session-context'; let hook
  const item = library.entry('government-notice')
  await f.modes.select(id, 'word'); await f.modes.selectTemplate(id, { id: item.id, mode: item.mode, revision: item.revision })
  const events = new Map(), surface = { nodes: new Set() }
  const session = { header: { cwd: f.root }, surface, eventAt: seq => events.get(seq), append(type, data, options) {
    const seq = events.size + 1; events.set(seq, { type, data }); surface.nodes.add(seq)
    if (options?.surfaceOp?.op === 'replace') surface.nodes.delete(options.surfaceOp.startSeq)
  } }
  const ctx = { on(_name, run) { hook = run }, skills: { get: async name => ({ name, provider: 'test', content: `Official or business content: ${name}` }) } }
  registerOfficeContext(ctx, library, f.modes)
  const run = () => hook({ agent: { id, session }, step: 7, signal: new AbortController().signal }, async () => ({ kind: 'enter', messages: [] }))
  const first = await run(); expect(first.messages[0].content[0].text).toContain('office_template')
  session.append('user/message', first.messages[0])
  expect((await run()).messages).toHaveLength(0)
  surface.nodes.clear(); expect((await run()).messages).toHaveLength(1)
  surface.nodes.add(1); await f.modes.select(id, 'excel')
  const switched = await run(); expect(switched.messages[0].content[0].text).toContain('office-xlsx')
  expect(surface.nodes.has(1)).toBe(false)
})


it('copies registered editable inputs into a new directory and rejects hashes, collisions and symlink destinations', async () => {
  const root = await temporary(), prepared = await library.prepare('government-notice')
  const directory = `office-templates/government-notice-${randomUUID()}`
  const result = await materialize(root, { directory, files: prepared.files })
  expect(digest(await readFile(join(root, directory, 'example.docx')))).toBe(library.entry('government-notice').files['example.docx'])
  expect(result.files.length).toBe(prepared.files.length)
  await expect(materialize(root, { directory, files: prepared.files })).rejects.toMatchObject({ code: 'EEXIST' })
  await expect(materialize(root, { directory: `office-templates/government-notice-${randomUUID()}`, files: [{ ...prepared.files[0], data: Buffer.from('changed').toString('base64') }] })).rejects.toThrow('identity')
  const linked = await temporary(), outside = await temporary()
  await symlink(outside, join(linked, 'office-templates'), 'dir')
  await expect(materialize(linked, { directory: `office-templates/government-notice-${randomUUID()}`, files: prepared.files })).rejects.toThrow('regular workspace')
})

it('requires the session write policy before starting the sandbox worker', async () => {
  const root = await temporary(), outside = await temporary()
  const exec = { agent: { id: 'policy-session', session: { header: { cwd: root } } }, signal: new AbortController().signal }
  await expect(workspacePolicy({ sandboxPolicy: { resolve: () => ({ mode: 'read-only', workspaceRoot: root }) } }, exec)).rejects.toThrow('write permission')
  await expect(workspacePolicy({ sandboxPolicy: { resolve: () => ({ mode: 'workspace-write', workspaceRoot: outside }) } }, exec)).rejects.toThrow('covered')
  const tool = templateTool({}, library, { state: async () => ({ documentMode: 'word' }) })
  await expect(tool.execute({ template_id: 'government-notice' }, exec)).rejects.toThrow('current Word')
})
