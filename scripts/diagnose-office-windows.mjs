// Bounded CI probes using a synthetic local input. Only Office worker stacks and
// conversion results are recorded; no process environments or memory dumps.
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runIsolated, runProcess, withJob } from '../packages/dsh-office/lib/runtime.js'
const root = process.env.DSH_OFFICE_BUNDLE_ROOT
if (process.platform !== 'win32' || !root) throw new Error('Windows bundled runtime required')
const program = path.join(root, 'libreoffice/program')
const converter = path.join(program, 'dsh-office-convert.exe')
const stacks = path.join(path.dirname(root), 'office-thread-stacks.exe')
let isolatedReady = false
for (const mode of ['trusted-fixture', 'isolated', 'isolated-unipoll']) {
  await withJob(async job => {
    const profile = path.join(job, 'profile'), input = path.join(job, 'input.txt'), output = path.join(job, 'output.pdf')
    await mkdir(profile); await writeFile(input, 'Office conversion diagnostic fixture')
    const argv = [converter, program, pathToFileURL(profile).href, pathToFileURL(input).href, pathToFileURL(output).href, 'pdf']
    const env = { SAL_LOG: '+WARN+INFO.lok', SAL_DISABLE_OPENCL: '1', SAL_DISABLESKIA: '1', ...(mode.endsWith('unipoll') ? { SAL_LOK_OPTIONS: 'unipoll' } : {}) }
    console.log(`Office probe: ${mode}`)
    const timer = setTimeout(() => {
      try {
        const ids = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "Get-Process -Name dsh-office-convert -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"], { encoding: 'utf8', timeout: 5000 }).trim().split(/\s+/).filter(s => /^\d+$/.test(s))
        for (const id of ids) console.log(execFileSync(stacks, [id], { encoding: 'utf8', timeout: 10000 }))
      } catch (error) { console.log(`Office stack probe: ${error.message}`) }
    }, 5000)
    try {
      const result = mode === 'trusted-fixture'
        ? await runProcess(argv, { cwd: job, env: { ...env, HOME: job, USERPROFILE: job, APPDATA: job, LOCALAPPDATA: job, TMP: job, TEMP: job }, timeoutMs: 25000 })
        : await runIsolated(argv, { job, readRoots: [path.dirname(program)], windowsSandbox: path.join(root, 'bin/office-sandbox.exe'), timeoutMs: 25000, env })
      const outputBytes = await stat(output).then(s => s.size).catch(() => 0)
      console.log(JSON.stringify({ mode, code: result.code, stdout: result.stdout, stderr: result.stderr, outputBytes }))
      if (mode === 'isolated') isolatedReady = result.code === 0 && outputBytes > 0
    } catch (error) { console.log(JSON.stringify({ mode, error: error.message })) }
    finally { clearTimeout(timer) }
  })
}
if (!isolatedReady) throw new Error('The isolated Windows conversion worker requires a successful startup probe')
