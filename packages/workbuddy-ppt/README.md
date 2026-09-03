# PPT Capability 内置产物

本目录固定 DSH Desktop 内置 Slides/JSX 能力的代码产物与平台运行时契约：

- `dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260903-public-gallery.tgz`：Slides Host、模板状态、`tencent-pptx` Skill 注入、五个生成工具、质量检查、审计与文件交付。
- `deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260903-public-gallery.tgz`：标准 Composer 适配器。Slides 入口紧接 agent preset 右侧；打开后输入框保持固定，分类与模板目录在下方独立滚动；选中模板后，缩略图在输入区左侧与正文同行；任务开始后选择界面收起。
- `runtime-lock.json`：固定 `tencent-pptx` Skill、SlideP、Tencent Docs 编辑引擎和目标平台关键文件 SHA-256。

桌面发布包只提供 Slides 入口。代码产物移除了 PPTD CLI、PPTD 编译器和独立 PPT 模式工具链。内置目录只包含 44 套 MIT 许可的 Kimi 模板及 332 张源页图片；`data-analysis` 和 `vitality-blue` 两套单独购买的模板及预览资源均不进入源码包和桌面产物。

产物来自相邻 DeepSeek Harness 工作树 `codex/desktop-plugin-compatibility@fcb06ab786`。根 `package.json` 通过仓库相对 `file:` 路径安装两个 tarball；Desktop patch 只挂载标准适配器，适配器在同一 Cordis fiber 中组合 Host 核心。

SHA-256 与大小：

```text
f6682e3c42cc946f28cdddd51c177d1411139feabb51448508fc0dbeb48220e2  29238986  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260903-public-gallery.tgz
e909330b53c179cca5ee49a9277ab1d87d3a84c5395e7e1cee8a50a1877f9184   6973632  deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260903-public-gallery.tgz
```

## 桌面运行时闭包

包含 Slides 能力的构建设置 `DSH_WORKBUDDY_PPT_RUNTIME_ROOT`。`npm run runtime:verify` 按 `runtime-lock.json` 校验平台、版本、完整文件树、关键哈希和执行权限，Electron Builder 再把运行时复制到 `Resources/workbuddy-ppt-runtime`。Desktop main 仅在包内 manifest 存在时向 Harness 进程注入准确路径。

当前仓库锁定并验证 `darwin-arm64`。macOS x64 与 Windows x64 使用可选门禁：构建机提供匹配平台的运行时时启用 Slides；省略运行时时生成 PPT Capability 未启用的桌面包。

更新产物时，同步更新两个 tarball、根依赖与锁文件、这里的哈希、集成测试和集成说明。
