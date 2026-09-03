const { execFileSync } = require('node:child_process')
const path = require('node:path')
const packageJson = require('./package.json')
const baseConfig = require('./electron-builder.cjs')

function signAdHocDevelopmentMac(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  )
  execFileSync(
    '/usr/bin/codesign',
    ['--force', '--deep', '--sign', '-', appPath],
    { stdio: 'inherit' }
  )
}

module.exports = {
  ...baseConfig,
  appId: 'io.dsh.desktop.dev',
  productName: 'DSH Desktop Dev',
  mac: {
    ...baseConfig.mac,
    // Development packages use ad-hoc signatures. Hardened Runtime would make
    // macOS enforce a shared Team ID between the app and Electron's nested
    // frameworks, which local ad-hoc signatures cannot provide.
    hardenedRuntime: false
  },
  directories: {
    ...packageJson.build.directories,
    output: 'dist-dev'
  },
  extraMetadata: {
    name: 'dsh-desktop-dev',
    productName: 'DSH Desktop Dev',
    dshDesktopChannel: 'development'
  },
  artifactName: 'dsh-desktop-dev-${os}-${arch}.${ext}',
  nsis: {
    ...packageJson.build.nsis,
    artifactName: 'dsh-desktop-dev-windows-${arch}-setup.${ext}'
  },
  afterPack: signAdHocDevelopmentMac,
  publish: null
}
