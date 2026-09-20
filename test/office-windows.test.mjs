import { expect, it } from 'vitest'
import { bundledRuntimeRoot, confinementArgv, runtimeEnvironment } from '../packages/dsh-office/lib/runtime.js'

it('discovers engines after Windows installer and app relocation, including packaged Node', () => {
  for (const app of ['C:\\Users\\user\\AppData\\Local\\Programs\\DSH Desktop', 'D:\\中文目录\\DSH Dev']) {
    for (const exe of ['DSH Desktop.exe', 'resources\\app\\node_modules\\node\\bin\\node.exe', 'resources\\app\\node_modules\\node\\node_modules\\node-win-x64\\bin\\node.exe']) {
      expect(bundledRuntimeRoot(`${app}\\${exe}`, 'win32')).toBe(`${app}\\resources\\office-runtime`)
    }
  }
  expect(bundledRuntimeRoot('/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop', 'darwin')).toBe('/Applications/DSH Desktop.app/Contents/Resources/office-runtime')
})

it('passes literal Windows argv and explicit grants to the confined runner', () => {
  const argv = ['C:\\Runtime\\node.exe', '-e', 'console.log("中文 & $PATH")', '', 'x\\']
  const command = confinementArgv(argv, 'C:\\Jobs\\中文 任务', ['C:\\Runtime'], {
    platform: 'win32', windowsSandbox: 'C:\\App\\office-sandbox.exe', timeoutMs: 3000
  })
  expect(command.slice(command.indexOf('--') + 1)).toEqual(argv)
  expect(command.slice(0, -argv.length)).toEqual(['C:\\App\\office-sandbox.exe', '--job', 'C:\\Jobs\\中文 任务', '--timeout-ms', '3000', '--read', 'C:\\Runtime', '--'])
  expect(() => confinementArgv(argv, 'C:\\Jobs', [], { platform: 'win32' })).toThrow('OFFICE_SANDBOX_UNAVAILABLE')
  expect(() => confinementArgv(argv, 'relative', [], { platform: 'win32', windowsSandbox: 'runner.exe' })).toThrow('absolute paths')
})

it('constructs the Windows loader environment from a small allowlist', () => {
  const env = runtimeEnvironment('win32', 'D:\\Windows')
  expect(env).toEqual({ SystemRoot: 'D:\\Windows', WINDIR: 'D:\\Windows', PATH: 'D:\\Windows\\System32', LANG: 'en_US.UTF-8' })
  expect(env).not.toHaveProperty('USERPROFILE')
})
