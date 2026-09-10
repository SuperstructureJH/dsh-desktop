import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { ImageError } from './provider.js'

export function writerPlan(ctx, root, exec) {
  const policy = ctx.sandboxPolicy.resolve({ session: exec.agent.session })
  return ctx.sandbox.confine([process.execPath, fileURLToPath(new URL('./writer.js', import.meta.url))], {
    ...policy, mode: 'workspace-write', workspaceRoot: root,
  })
}

export async function commitImage(ctx, root, data, exec) {
  const plan = writerPlan(ctx, root, exec)
  const signal = AbortSignal.any([AbortSignal.timeout(30_000), ...(exec.signal ? [exec.signal] : [])])
  // Tombstones clear ordinary parent entries too: no launch credentials or
  // NODE_OPTIONS enter the asset writer, even if the host inherited them.
  const env = Object.fromEntries(Object.keys(process.env).map(key => [key, undefined]))
  if (process.platform === 'win32') env.SystemRoot = process.env.SystemRoot
  const child = ctx.subprocess.spawn({
    argv: plan.argv, cwd: root, env, signal, graceMs: 1000,
    stdio: { stdin: { data: data.toString('base64') }, stdout: { maxBytes: 1024 }, stderr: { maxBytes: 2048 } },
  })
  const outcome = await child.done
  signal.throwIfAborted()
  if (outcome.exitCode !== 0) throw new ImageError('ASSET_PATH', 'The sandbox could not save the generated image. Check workspace permissions and sandbox availability.')
  let result
  try { result = JSON.parse(child.collected.stdout.readFrom(0).text) } catch { throw new ImageError('ASSET_PATH', 'The image writer returned an invalid result.') }
  const hash = createHash('sha256').update(data).digest('hex')
  if (result.sha256 !== hash || result.workspace_path !== `.workbuddy/generated-images/${hash}.png`) throw new ImageError('ASSET_PATH', 'The generated asset identity does not match its image.')
  return result
}
