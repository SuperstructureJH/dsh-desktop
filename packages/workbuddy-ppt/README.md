# PPT Capability 内置产物

本目录固定 DSH Desktop 内置 Slides/JSX 能力的代码产物与平台运行时契约：

- `dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260903-public-gallery.tgz`：Slides Host、模板状态、`tencent-pptx` Skill 注入、五个生成工具、质量检查、审计与文件交付。
- `deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260903-public-gallery.tgz`：标准 Composer 适配器。Slides 入口紧接 agent preset 右侧；打开后输入框保持固定，分类与模板目录在下方独立滚动；选中模板后，缩略图在输入区左侧与正文同行；任务开始后选择界面收起。
- `runtime-lock.json`：固定 `tencent-pptx` Skill、SlideP、Tencent Docs 编辑引擎和目标平台关键文件 SHA-256。
- `runtime-distribution.json`：固定每个平台的公开二进制下载地址、压缩包大小与 SHA-256；不包含运行时文件本体。

桌面发布包只提供 Slides 入口。代码产物移除了 PPTD CLI、PPTD 编译器和独立 PPT 模式工具链。内置目录只包含 44 套 MIT 许可的 Kimi 模板及 332 张源页图片；`data-analysis` 和 `vitality-blue` 两套单独购买的模板及预览资源均不进入源码包和桌面产物。

产物来自相邻 DeepSeek Harness 工作树 `codex/desktop-plugin-compatibility@fcb06ab786`。根 `package.json` 通过仓库相对 `file:` 路径安装两个 tarball；Desktop patch 只挂载标准适配器，适配器在同一 Cordis fiber 中组合 Host 核心。

SHA-256 与大小：

```text
f6682e3c42cc946f28cdddd51c177d1411139feabb51448508fc0dbeb48220e2  29238986  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260903-public-gallery.tgz
e909330b53c179cca5ee49a9277ab1d87d3a84c5395e7e1cee8a50a1877f9184   6973632  deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260903-public-gallery.tgz
```

## 桌面运行时闭包

`npm run dev` 和 macOS arm64 打包命令通过 `scripts/run-with-workbuddy-ppt-runtime.mjs` 启动。首次运行按照 `runtime-distribution.json` 从公开 GitHub Release 下载闭源运行时，校验压缩包大小和 SHA-256，安全解压后再按 `runtime-lock.json` 校验平台、版本、完整文件树、关键哈希和执行权限。校验通过的目录保存在用户缓存中，后续启动复用同一个内容寻址目录。开发进程获得 `DSH_WORKBUDDY_PPT_RUNTIME_ROOT` 后启用 Slides；Electron Builder 把同一目录复制到 `Resources/workbuddy-ppt-runtime`，安装后的 App 自包含运行时，不会在应用启动时下载可执行代码。

macOS Apple Silicon 公开运行时：

```text
ca273302786617b722e98aa0976386a497e287db72880d07257bb32cd3d33a1d  207169828  ppt-capability-runtime-darwin-arm64-5.4.1-0.2.112-wb.tar.gz
https://github.com/SuperstructureJH/dsh-desktop/releases/tag/ppt-capability-runtime-v1
```

SlideP 与 Tencent Docs 编辑引擎作为闭源二进制运行时独立分发，不进入本仓库，也不适用本仓库的 MIT 许可证。任何运行前都必须通过公开锁定值与完整运行时树校验。`DSH_WORKBUDDY_PPT_RUNTIME_ROOT` 可指定已准备的绝对目录；`DSH_WORKBUDDY_PPT_RUNTIME_CACHE` 可覆盖默认用户缓存位置。

当前公开分发并验证 `darwin-arm64`。macOS x64 与 Windows x64 使用可选门禁：构建机提供匹配平台的运行时时启用 Slides；省略运行时时生成 PPT Capability 未启用的桌面包。为这些平台发布运行时时，在两个锁文件中添加对应平台记录，开发和打包命令即可复用相同下载链路。

更新产物时，同步更新两个代码 tarball、根依赖、`runtime-lock.json`、`runtime-distribution.json`、公开 Release、这里的哈希、集成测试和集成说明。
