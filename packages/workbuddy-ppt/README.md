# PPT Capability 内置产物

本目录固定 DSH Desktop 私有内置插件所需的代码产物与平台运行时契约：

- `dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-writable-editor.tgz`：共享 Host、PPTD 渲染器、Skill 注册、模板状态、策略、审计与交付核心；`editor_sdk` 使用插件数据目录保存日志，包内 runtime 保持只读。
- `deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-self-contained.tgz`：Harness 0.1.2 标准 Composer 适配器；空白会话中，已选模板以紧凑预览显示在输入区左上角，正文从右侧同行开始，未选择时占位词贴近顶部；Slides/PPT 与模板参考区在输入框下方展开；任务开始后整组模板界面收起。
- `runtime-lock.json`：按平台固定 `tencent-pptx` Skill、SlideP、Tencent Docs 编辑引擎和关键文件 SHA-256。

源码来自相邻 `deepseek-harness` 工作树的 `codex/desktop-plugin-compatibility` 分支，以
`codex/workbuddy-suite` 的稳定提交 `d3ce73b` 为基线；标准 Composer 适配器来自桌面兼容提交 `60b8806`，共享核心包含提交 `b77dc58` 的只读运行时修复。两个产物通过 Desktop 根 `package.json` 的仓库相对
`file:` 依赖安装；构建补丁只挂载适配器，适配器在同一 Cordis fiber 下组合共享核心。

SHA-256：

```text
99d8f0266db73babed41b149af84a9641594465e0fd786ca8b02933ad600c99f  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-writable-editor.tgz
55933aee661f9ab9b46658572a273ede40afb58b5d09256abe1f331a3ca221e4  deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-self-contained.tgz
```

## 桌面运行时闭包

包含 Slides 能力的桌面构建设置绝对路径 `DSH_WORKBUDDY_PPT_RUNTIME_ROOT`。`npm run runtime:verify` 先按
`runtime-lock.json` 检查平台、版本、完整文件树、关键哈希和可执行权限，Electron Builder 再把整个目录复制到
`Contents/Resources/workbuddy-ppt-runtime`（Windows 为对应 Resources 目录）。Desktop main 仅在包内清单存在时把
`DSH_WORKBUDDY_PPT_RUNTIME_ROOT` 传给 Harness 子进程。打包后的 Slides 路线直接从资源目录加载 Skill、SlideP
和编辑引擎，不依赖用户目录或单独部署的 PPT 服务。包内 runtime 只提供可执行文件与静态资产；`editor_sdk`
的工作目录位于插件数据根目录下，运行日志不会改写 App Resources。

当前仓库已锁定并验证 `darwin-arm64`。该平台的 arm64 打包命令使用严格门禁并生成完整的内置 Slides 能力。
macOS x64 与 Windows x64 使用 `runtime:verify:optional`：构建环境提供匹配平台的受控运行时目录时完成同一套
校验和内置；未提供时生成保留 PPTD/Kimi 路线的 Desktop 包，且不会注入不存在的 Slides 运行时路径。
运行时包含无法从公开 npm 重新获取的许可二进制，因此源码仓库保存版本锁与打包规则；新增平台的完整
Slides 能力需要提供对应运行时并加入同一份锁。

更新产物时，应同时更新两个 tarball、根依赖、这里的哈希、运行时锁、插件闭包测试和集成说明。
