const packageJson = require('./package.json')

const runtimeRoot = process.env.DSH_WORKBUDDY_PPT_RUNTIME_ROOT
const runtimeResources = runtimeRoot
  ? [{ from: runtimeRoot, to: 'workbuddy-ppt-runtime' }]
  : []

module.exports = {
  ...packageJson.build,
  extraResources: [
    ...packageJson.build.extraResources,
    ...runtimeResources
  ]
}
