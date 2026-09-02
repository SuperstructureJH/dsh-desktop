const packageJson = require('./package.json')

const runtimeRoot = process.env.DSH_WORKBUDDY_PPT_RUNTIME_ROOT
if (!runtimeRoot) {
  throw new Error('DSH_WORKBUDDY_PPT_RUNTIME_ROOT is required for a self-contained Desktop package')
}

module.exports = {
  ...packageJson.build,
  extraResources: [
    ...packageJson.build.extraResources,
    {
      from: runtimeRoot,
      to: 'workbuddy-ppt-runtime'
    }
  ]
}
