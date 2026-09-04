import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureWorkBuddyPptRuntime } from './ensure-workbuddy-ppt-runtime.mjs'

export async function runWithWorkBuddyPptRuntime(command, args, options = {}) {
  if (!command) throw new Error('A command is required after run-with-workbuddy-ppt-runtime.mjs')
  const runtimeRoot = await ensureWorkBuddyPptRuntime(options.ensureOptions)
  const environment = {
    ...process.env,
    ...options.environment
  }
  if (runtimeRoot) environment.DSH_WORKBUDDY_PPT_RUNTIME_ROOT = runtimeRoot
  const child = spawn(command, args, {
    cwd: options.cwd ?? process.cwd(),
    env: environment,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })

  const forwardSignal = signal => child.kill(signal)
  process.on('SIGINT', forwardSignal)
  process.on('SIGTERM', forwardSignal)

  try {
    return await new Promise((resolve, reject) => {
      child.once('error', reject)
      child.once('exit', (code, signal) => {
        if (signal) return resolve(1)
        resolve(code ?? 1)
      })
    })
  } finally {
    process.off('SIGINT', forwardSignal)
    process.off('SIGTERM', forwardSignal)
  }
}

async function main() {
  const rawArgs = process.argv.slice(2)
  const optional = rawArgs[0] === '--runtime-optional'
  const [command, ...args] = optional ? rawArgs.slice(1) : rawArgs
  const exitCode = await runWithWorkBuddyPptRuntime(command, args, {
    ensureOptions: { optional }
  })
  process.exitCode = exitCode
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
