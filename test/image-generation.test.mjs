import { createServer } from 'node:http'
import { mkdtemp, readFile, realpath, rm, symlink, readdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { LocalCredentialProvider } from '@deepseek-ai/dsh-credentials-local'
import { FileSettingsProvider } from '@deepseek-ai/dsh-settings-file'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'
import { LocalSandboxProvider } from '@deepseek-ai/dsh-sandbox-local'
import { LocalSubprocessRuntime } from '@deepseek-ai/dsh-subprocess-local'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import sharp from 'sharp'
import { apply, imageTool } from '../packages/dsh-image-generation/index.js'
import { createSettings } from '../packages/dsh-image-generation/lib/settings.js'
import { DEFAULTS, generate, generationBody, ImageError, profile, readBounded, validateConnection } from '../packages/dsh-image-generation/lib/provider.js'
import { normalizeImage } from '../packages/dsh-image-generation/lib/assets.js'
import { materialize } from '../packages/dsh-image-generation/lib/storage.js'

const cleanups = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); vi.restoreAllMocks() })
async function temp() { const p = await realpath(await mkdtemp(path.join(tmpdir(), 'dsh-image-test-'))); cleanups.push(() => rm(p, { recursive: true, force: true })); return p }
async function server() {
  const calls = []
  const png = await sharp({ create: { width: 32, height: 24, channels: 4, background: '#11223380' } }).png().toBuffer()
  let status = 200; let malformed = false; let delay = 0; let redirect
  const http = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk
    calls.push({ url: req.url, method: req.method, auth: req.headers.authorization, body: body && JSON.parse(body) })
    if (redirect) { res.writeHead(307, { Location: redirect }); res.end(); return }
    if (delay) await new Promise(resolve => setTimeout(resolve, delay))
    const probe = status === 200 && !malformed && req.url.endsWith('/images/generations') && body && !Object.hasOwn(JSON.parse(body), 'prompt')
    res.writeHead(probe ? 400 : status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(probe ? { error: { code: 'MissingParameter', message: 'The request is missing a required parameter: prompt.' } } : status !== 200 ? { error: { message: 'secret-echo-key' } } : malformed ? {} : req.url.endsWith('/images/generations')
      ? { data: [{ b64_json: png.toString('base64') }] }
      : req.url.endsWith('/models') ? { data: [{ id: DEFAULTS.bytedance.model }] } : { id: DEFAULTS.openai.model }))
  })
  await new Promise((resolve, reject) => { http.once('error', reject); http.listen(0, '127.0.0.1', resolve) })
  cleanups.push(() => { http.closeAllConnections(); return new Promise(resolve => http.close(resolve)) })
  return { calls, png, baseUrl: `http://127.0.0.1:${http.address().port}/v1`, setStatus: value => { status = value }, malformed: () => { malformed = true }, delay: value => { delay = value }, redirect: value => { redirect = value } }
}
async function fixture() {
  const home = await temp(); const workspace = await temp()
  const ctx = new Context()
  for (const [plugin, config] of [[SystemPrompt, {}], [ToolRuntime, {}], [SkillRegistry, {}], [LocalSandboxProvider, {}], [LocalSubprocessRuntime, {}], [FileSettingsProvider, { dshHome: home, watch: false }], [LocalCredentialProvider, { dshHome: home, watch: false }]]) {
    const fork = ctx.plugin(plugin, config); await fork; cleanups.push(() => fork.dispose())
  }
  const log = vi.fn(); let mode = 'workspace-write'
  const services = { credentials: ctx.credentials, sandbox: ctx.sandbox, subprocess: ctx.subprocess, logger: { info: log }, sandboxPolicy: { resolve: () => ({ mode, workspaceRoot: workspace }) } }
  const settings = createSettings(services)
  const id = SessionId(randomUUID())
  const agent = { session: Session.create(id, undefined, { version: 0, id, createdAt: Date.now(), isSeeded: false, cwd: workspace }) }
  return { ctx, home, workspace, services, settings, log, agent, setMode: value => { mode = value } }
}
const saveInput = (provider, baseUrl, revision = 0) => ({ provider, baseUrl, model: DEFAULTS[provider].model, apiKey: 'test-image-key', revision })

describe('image settings save and provider requests', () => {
  it.each(['openai', 'bytedance'])('saves %s with exactly one non-generating request and redacts credentials', async provider => {
    const f = await fixture(); const s = await server()
    const result = await f.settings.save(saveInput(provider, s.baseUrl))
    expect(s.calls).toHaveLength(1)
    expect(s.calls[0]).toMatchObject({ method: provider === 'openai' ? 'GET' : 'POST', auth: 'Bearer test-image-key' })
    if (provider === 'openai') expect(s.calls[0].url).toContain('/models')
    else expect(s.calls[0].body).toEqual({ model: DEFAULTS.bytedance.model })
    expect(result.profiles[provider]).toMatchObject({ configured: true, validation: provider === 'openai' ? 'model' : 'connection' })
    expect(JSON.stringify(result)).not.toContain('test-image-key')
    expect(JSON.stringify(f.log.mock.calls)).not.toContain('test-image-key')
    expect((await f.settings.active()).provider).toBe(provider)
    expect((await stat(path.join(f.home, '.credentials.yaml'))).mode & 0o777).toBe(0o600)
    expect(await readdir(f.workspace)).toEqual([])
  })
  it('preserves the whole saved profile after validation fails and keeps provider credentials separate', async () => {
    const f = await fixture(); const s = await server()
    await f.settings.save(saveInput('openai', s.baseUrl))
    s.setStatus(401)
    await expect(f.settings.save({ ...saveInput('bytedance', s.baseUrl, 1), apiKey: 'secret-echo-key' })).rejects.toMatchObject({ code: 'AUTH' })
    expect(await f.settings.active()).toMatchObject({ provider: 'openai', key: 'test-image-key' })
    expect(await readFile(path.join(f.home, '.credentials.yaml'), 'utf8')).not.toContain('secret-echo-key')
    s.setStatus(200)
    await f.settings.save({ ...saveInput('bytedance', s.baseUrl, 1), apiKey: 'byte-key' })
    await f.settings.save({ ...saveInput('openai', s.baseUrl, 2), apiKey: '' })
    expect(s.calls.at(-1).auth).toBe('Bearer test-image-key')
  })
  it('prevents lost updates across two validated saves', async () => {
    const f = await fixture(); const s = await server()
    const result = await Promise.allSettled([f.settings.save(saveInput('openai', s.baseUrl)), f.settings.save(saveInput('bytedance', s.baseUrl))])
    expect(result.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(result.find(result => result.status === 'rejected').reason.code).toBe('CONFLICT')
    expect((await f.settings.describe()).revision).toBe(1)
  })
  it('requires a re-entered key for a different origin and rejects stale revisions before requests', async () => {
    const f = await fixture(); const s = await server()
    await f.settings.save(saveInput('openai', s.baseUrl))
    await expect(f.settings.save(saveInput('openai', s.baseUrl))).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(f.settings.save({ ...saveInput('openai', 'https://example.com/v1', 1), apiKey: '' })).rejects.toMatchObject({ code: 'KEY_REQUIRED' })
    expect(s.calls).toHaveLength(1)
  })
  it('handles malformed metadata, cancellation, and custom Ark endpoint validation honestly', async () => {
    const s = await server()
    expect(await validateConnection('bytedance', { baseUrl: s.baseUrl, model: 'ep-custom' }, 'key')).toBe('connection')
    s.malformed()
    await expect(validateConnection('bytedance', { baseUrl: s.baseUrl, model: 'ep-custom' }, 'key')).rejects.toMatchObject({ code: 'RESPONSE' })
    const cancelled = new AbortController(); cancelled.abort()
    await expect(validateConnection('openai', { baseUrl: s.baseUrl, model: DEFAULTS.openai.model }, 'key', { signal: cancelled.signal })).rejects.toMatchObject({ code: 'CANCELLED' })
  })
  it('rejects redirects without forwarding a key to the redirect target', async () => {
    const source = await server(); const target = await server()
    source.redirect(target.baseUrl)
    await expect(validateConnection('openai', { ...profile('openai'), baseUrl: source.baseUrl }, 'key')).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect(source.calls).toHaveLength(1); expect(target.calls).toHaveLength(0)
  })
  it('accepts only the specific Ark missing-prompt response and rejects unrelated 400 errors', async () => {
    const s = await server(); s.setStatus(400)
    await expect(validateConnection('bytedance', { ...profile('bytedance'), baseUrl: s.baseUrl }, 'key')).rejects.toMatchObject({ code: 'PARAMETERS' })
    expect(s.calls).toHaveLength(1)
    expect(s.calls[0].body).toEqual({ model: DEFAULTS.bytedance.model })
  })
  it('leaves credentials untouched when an in-flight validation is cancelled', async () => {
    const f = await fixture(); const s = await server(); s.delay(50)
    const controller = new AbortController()
    const pending = f.settings.save(saveInput('openai', s.baseUrl), controller.signal)
    setTimeout(() => controller.abort(), 10)
    await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' })
    expect((await f.settings.describe()).revision).toBe(0)
  })
  it.each(['https://user:key@example.com/v1', 'http://example.com/v1', 'https://example.com/v1?key=x', 'https://example.com/v1/images/generations'])('rejects unsafe or mistaken endpoint %s', baseUrl => {
    expect(() => profile('openai', { baseUrl })).toThrow(ImageError)
  })
  it('maps provider canvas parameters independently and bounds streamed responses', async () => {
    const args = { prompt: 'A mountain', aspect_ratio: '16:9' }
    expect(generationBody('openai', profile('openai'), args)).toMatchObject({ size: '1536x1024', output_format: 'png' })
    expect(generationBody('openai', profile('openai'), args)).not.toHaveProperty('response_format')
    expect(generationBody('bytedance', profile('bytedance'), args)).toMatchObject({ size: '2560x1440', response_format: 'b64_json' })
    expect(generationBody('bytedance', profile('bytedance'), args)).not.toHaveProperty('quality')
    await expect(readBounded(new Response('too much'), 2)).rejects.toMatchObject({ code: 'TOO_LARGE' })
  })
})

describe('image tool and durable Office assets', () => {
  it.each(['openai', 'bytedance'])('executes %s through ToolRuntime and writes a verifiable PNG', async provider => {
    const f = await fixture(); const s = await server()
    await f.settings.save(saveInput(provider, s.baseUrl))
    f.ctx.tools.register(imageTool(f.services, f.settings))
    const result = await f.ctx.tools.execute({ callId: 'test-call', name: 'image_generate', arguments: { prompt: 'A calm forest', purpose: 'presentation', aspect_ratio: '16:9' }, agent: f.agent, signal: new AbortController().signal })
    expect(result.isError, JSON.stringify(result)).toBeFalsy()
    const value = JSON.parse(result.content[0].text)
    const data = await readFile(path.join(f.workspace, value.workspace_path))
    expect(createHash('sha256').update(data).digest('hex')).toBe(value.sha256)
    expect(await sharp(data).metadata()).toMatchObject({ format: 'png', width: value.width, height: value.height, hasAlpha: true })
    expect(s.calls.filter(call => call.body?.prompt)).toHaveLength(1)
    expect(JSON.stringify(result)).not.toContain('test-image-key')
  })
  it('blocks a read-only workspace and symlink escape before the paid request', async () => {
    const f = await fixture(); const s = await server()
    await f.settings.save(saveInput('openai', s.baseUrl))
    const tool = imageTool(f.services, f.settings)
    f.setMode('read-only')
    await expect(tool.execute({ prompt: 'Forest' }, { agent: f.agent })).rejects.toMatchObject({ code: 'POLICY' })
    f.setMode('workspace-write')
    const outside = await temp(); await symlink(outside, path.join(f.workspace, '.workbuddy'))
    await expect(tool.execute({ prompt: 'Forest' }, { agent: f.agent })).rejects.toMatchObject({ code: 'ASSET_PATH' })
    expect(s.calls).toHaveLength(1); expect(await readdir(outside)).toEqual([])
  })
  it('commits identical assets concurrently, rejects target symlinks, and rejects damaged images', async () => {
    const workspace = await temp(); const s = await server(); const image = await normalizeImage(s.png)
    const values = await Promise.all([materialize(workspace, image.data), materialize(workspace, image.data)])
    expect(values[0]).toEqual(values[1])
    expect(await readdir(path.dirname(path.join(workspace, values[0].workspace_path)))).toHaveLength(1)
    const target = path.join(workspace, values[0].workspace_path)
    await rm(target); await symlink(path.join(workspace, 'absent'), target)
    await expect(materialize(workspace, image.data)).rejects.toThrow()
    await expect(normalizeImage(Buffer.from('not a PNG'))).rejects.toMatchObject({ code: 'IMAGE' })
  })
  it('registers standard authenticated API routes, the shared Skill and default approval', async () => {
    const f = await fixture(); const routes = []
    const plugin = f.ctx.plugin({ inject: ['settings', 'skills', 'systemPrompt', 'tools'], apply: ctx => apply({
      ...f.services, settings: ctx.settings, skills: ctx.skills, systemPrompt: ctx.systemPrompt, tools: ctx.tools,
      on: ctx.on.bind(ctx), connection: { fetch: { register: route => routes.push(route) } },
    }) })
    await plugin; cleanups.push(() => plugin.dispose())
    expect(f.ctx.settings.describe().map(entry => entry.ns)).toContain('image-generation')
    expect(routes.map(route => route.path)).toEqual(['/api/image-generation.settings', '/api/image-generation.save'])
    const response = await routes[0].fetch(new Request('http://localhost/api/image-generation.settings'))
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect((await response.json()).profiles.openai.configured).toBe(false)
    const result = await f.ctx.tools.execute({ callId: 'ask', name: 'image_generate', arguments: { prompt: 'Forest' }, agent: f.agent, signal: new AbortController().signal })
    expect(result.isError).toBe(true)
    expect(JSON.stringify(result)).toContain('Provider usage may be billed')
    expect(await readdir(f.workspace)).toEqual([])
  })
})
