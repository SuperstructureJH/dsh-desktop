const packageJson = require('./package.json')
const baseConfig = require('./electron-builder.cjs')

module.exports = {
  ...baseConfig,
  appId: 'io.dsh.desktop.dev',
  productName: 'DSH Desktop Dev',
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
  publish: null
}
