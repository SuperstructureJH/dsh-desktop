# PPT Capability 桌面集成说明

## 目标与基线

本分支把当前本地 PPT Capability 作为 DSH Desktop 的私有内置插件交付，同时保留同一份共享核心在外部 DeepSeek Harness 上的运行方式。

- Desktop 分支：`codex/ppt-capability-alpha4`
- Desktop 上游基线：`dataelement/dsh-desktop` 的 `upstream/main@5f05f2d`
- 外部端兼容分支：`codex/desktop-plugin-compatibility@b77dc58`
- 当前本地 WorkBuddy 基线：`codex/workbuddy-suite@d3ce73b`
- 已安装的正式 `DSH Desktop 2.0.2` 只作为行为参照；源码与合并基线以上游 Git 分支为准。

Desktop 集成先在 `07fd40a`（PR #246）上实现，再完成 `0.1.2-alpha.1` 版本的原生验收。本分支把同一能力迁移到当前 `upstream/main@5f05f2d` 的 Harness `0.1.2-alpha.4`；依赖清单与锁文件采用 alpha4 上游闭包并保留两份 PPT Capability 本地制品，Composer 补丁则按 alpha4 的实际组件契约重新生成。

## 分支关系

以下数字以 `upstream/main@b012e22` 为左侧基准，格式为“主线独有 / 分支独有”：

| 分支 | 分叉计数 | 结论 |
| --- | ---: | --- |
| `upstream/dev` | `160 / 20` | 独立开发线，包含尚未进入主线的提交，也缺少较多主线提交 |
| `upstream/release/v0.4.3` | `155 / 0` | 旧发布线，完整落后于当前主线 |
| `origin/main` | `330 / 0` | Fork 主线长期未同步 |
| `origin/codex/session-permanent-delete` | `272 / 3` | 旧基线上的三提交功能分支 |
| `origin/codex/edit-sent-message` | `327 / 3` | 接近旧主线的三提交功能分支 |
| `origin/codex/model-picker-select-all` | `327 / 1` | 接近旧主线的一提交功能分支 |
| `origin/codex/fix-clipboard-permission` | `330 / 1` | Fork 旧主线上的一提交修复分支 |

本次集成以官方 `upstream/main` 为唯一 Desktop 合并基线。其它分支按各自功能单独评估，避免把历史 Fork 差异带入 PPT 插件。

## 适配结构

```text
dsh-workbuddy-ppt
├── Host、PPTD 渲染、模板、Skill、策略、审计与交付
├── legacy client：外部 WorkBuddy Harness 0.1.1 Composer slots
└── standard client：共享状态与标准 Composer 组件
        │
        ▼
@deepseek-ai/dsh-experimental-office-ppt-standard-adapter
├── Host 侧组合 dsh-workbuddy-ppt
├── Client 侧 conversation.input.accessory：输入框内的已选模板参考
└── Client 侧 conversation.composer.dock：模式与模板参考区
        │
        ▼
DSH Desktop 0.1.2-alpha.4 patch + 内置 file: 依赖
        │
        ▼
Resources/workbuddy-ppt-runtime
├── skills/tencent-pptx
├── slidep
└── tencent-docs-ai-engine
```

标准适配器不复制 PPT 工具、提示词、存储、渲染器或文件系统权限。它只负责版本边界与 Composer 席位。外部端继续使用旧版 `conversation.hero.*` 席位；Desktop 使用 0.1.2 语义明确的输入框下方席位。

Desktop 0.1.2 原有 `conversation.composer.dock` 定义为输入框下方区域。alpha4 把该席位下沉到 resident ComposerBar，本分支让 ConversationRoot 把当前 `InputZone` 作为 `extensionZone` 传入 ComposerBar，并在同一组件中注册、渲染 `conversation.input.accessory` 与 `conversation.composer.dock`。最终顺序为标题与工作区、输入框、Slides/PPT、分类与模板参考区。标准适配器使用 `conversation.input.accessory` 把已选模板放入输入框内部：紧凑预览位于左上角，正文从右侧同一行开始；未选择模板时 accessory 不占高度，占位词贴近输入区顶部。`conversation.composer.dock` 展示下方功能区；两个席位共享同一份 Host 选择状态，并只在 `session.blank` 的空白会话阶段渲染。任务被会话接受后，已选模板预览、Slides/PPT 开关和模板图库同时收起，标准会话输入框继续承担后续对话。图库拥有独立纵向滚动和 overscroll 边界，正常流高度为 `clamp(360px, 52dvh, 680px)`。滚轮先恢复输入框的居中位置，再滚动图库；反向滚动先回到图库顶部，再把会话页恢复到初始位置。外部端的悬浮图库继续保持原行为。

模板点击调用 Host `template/select`，持久化 `selectedTemplateId`。每轮 Office PPT 上下文从这份 Host 状态生成 `selected_template_id`、模板名称和配色指导，并注入自动加载的 `tencent-pptx` Skill。输入框预览和模型上下文因此引用同一个选择结果。

Slides 路线读取所选源页的真实预览图与完整语义 JSX 构图，模型通过 `ppt_write_page` 提交改写后的完整 JSX、源页编号、内容关系和选择理由。Host 在逐页写入时执行受限语法、最小字号、文本溢出、文本碰撞、内容关系和模板视觉一致性检查。PPT 路线继续使用独立的 Kimi-compatible PPTD 工程；本次更新保持两条生成路线不变，只调整 Desktop Composer 的模板预览与正文排列。

## 运行时闭包

代码 tarball 负责 Host 与 Client 逻辑。构建环境提供目标平台运行时时，Electron 构建把它写入
`Resources/workbuddy-ppt-runtime`。运行时包含 `skills/tencent-pptx`、SlideP 依赖树和 Tencent Docs
`editor_sdk`。Desktop main 在包内清单存在时通过 `DSH_WORKBUDDY_PPT_RUNTIME_ROOT` 把准确路径注入 Harness
子进程，核心 Host 使用该目录；显式插件配置优先，外部 Harness 仍可使用自己的装配路径。

包内 runtime 只承载可执行文件和静态资产。`editor_sdk` 的工作目录固定在插件数据根目录的 `runtime/editor` 下，日志写入该可写目录；App Resources 在运行前后保持只读，代码签名资源不会因编辑器日志发生变化。构建输入不包含 `logs/editor_sdk.log`。

包含 Slides 能力的构建在打包前执行 `npm run runtime:verify`，按
`packages/workbuddy-ppt/runtime-lock.json` 检查目标平台、组件版本、完整文件树摘要、关键文件哈希和执行权限。
缺少环境变量、任一传递依赖文件、平台不一致或哈希漂移都会终止严格打包。当前 `darwin-arm64` 使用该严格
门禁。macOS x64 与 Windows x64 的平台命令执行 `runtime:verify:optional`：提供运行时时执行完整校验并内置；
未提供时省略 Slides 运行时资源，保留包内 PPTD/Kimi 工作流。最终安装包不读取构建机的
`~/.dsh/office-ppt/runtime`，Desktop 也不会向 Harness 注入不存在的资源路径。

## 文件上传边界

DSH Desktop 0.1.2 已有附件与原生目录选择链路，Electron 壳本身不构成 PPT 集成阻塞。当前内置插件继续复用 DSH 的标准附件入口与工作区路径，不新增宽权限 Electron IPC。面向外部 Harness 的通用上传入口属于独立适配层，后续可按宿主能力注入；Host 的工作区约束、策略和审计边界保持一致。

## 固定产物

内部包版本保留 `0.1.1-rc.2`，Desktop 文件名与 SHA-256 固定本次不可变产物：

```text
99d8f0266db73babed41b149af84a9641594465e0fd786ca8b02933ad600c99f  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-writable-editor.tgz
55933aee661f9ab9b46658572a273ede40afb58b5d09256abe1f331a3ca221e4  deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-self-contained.tgz
```

两个产物都由 `pnpm pack` 生成，使 monorepo 的 `workspace:` 依赖转换为可独立安装的 semver。Desktop 构建只挂载标准适配器；适配器在同一个 Cordis fiber 中组合共享核心。

alpha4 macOS arm64 人工验收包：

```text
02881b58efdc30ec2977a11a8b79c94128dbbdc811a858c4048d4875e2c4ba58  ppt-capability-alpha4-mac-arm64.zip
```

ZIP 大小为 485,295,398 字节。它采用 ad-hoc 签名，只用于当前人工验收；正式分发仍需 Developer ID 签名与公证。

## 验证记录

| 证据层 | 状态 | 证据 |
| --- | --- | --- |
| 共享源码与双布局组件 | PASS | Office/adapter 32 个测试文件、170 项测试通过；新增运行时回归确认编辑器从插件可写目录启动且 staged runtime 不生成日志目录；332/332 个 Kimi JSX 模板通过静态、视觉质量、模板一致性与真实 SlideP 校验；Host、legacy client 与 standard adapter 均完成干净构建 |
| Harness 契约与文档 | PASS | pre-commit staged lint 通过；翻译 1027 对、README model-experience/limitations、Agent Note 结构/格式与 Markdown wrap 门禁通过 |
| Desktop 插件闭包 | PASS | 固定代码产物 SHA、输入框选择席位、输入框下方功能席位、Host import 闭包、模板上下文与 Desktop patch 顺序测试通过 |
| Desktop 运行时闭包 | PASS | `darwin-arm64` 锁定 9,919 个只读文件的整体摘要、关键文件哈希与执行权限；运行日志由插件数据目录承载；缺少任一传递依赖的负向测试通过 |
| Desktop alpha4 自动化 | PASS | `npm ci` 从零应用 21 份上游补丁和 PPT Composer 补丁；正式合入 `upstream/main@5f05f2d` 后，83 个测试文件/687 项测试、typecheck、Electron main/preload build 通过；运行时单测仅在支持 POSIX 权限位的主机检查非 Windows 编辑器执行位，darwin-arm64 PPT 运行时闭包校验通过 |
| 当前 alpha1 隔离开发包 | PASS | 当前运行中的验收包以 Electron 43.4.0 arm64 目录包构建成功；应用包含完整 JSX Slides 核心、标准适配器、全部 Host chunks 及 `Resources/workbuddy-ppt-runtime` 完整运行时 |
| alpha1 运行后签名完整性 | FAIL | 旧版编辑器以 App Resources 为工作目录并写入 `logs/editor_sdk.log`，导致运行后的目录包不再通过严格代码签名校验；当前运行进程与原 ZIP 保持原状，alpha4 已从根因上迁移日志目录 |
| 当前原生 Desktop 布局与滚动 | PASS | alpha1 验收包以隔离 bundle id `io.dsh.desktop.dev` 启动；空白会话中占位词贴近输入区顶部；选中 `Moss Green Transformation` 后紧凑预览位于输入卡片左上角，正文从右侧同行开始；Slides/PPT、分类与模板仍位于输入框下方；已完成会话只保留标准输入框，模板预览、模式开关和图库全部退出；图库向下填充窗口，向下滚动保持输入框居中，反向滚动恢复初始位置 |
| alpha4 原生目录包与 ZIP | PASS | Electron 43.4.0 arm64 候选包已生成；App 严格代码签名校验、包内 9,919 文件运行时校验、ZIP 完整解压和解压后严格签名校验均通过；包内没有 `logs/editor_sdk.log`，共享核心包含可写工作目录实现 |
| alpha4 用户验收与 PR 授权 | PASS | alpha4 候选 App 与 ZIP 已交付，用户完成本轮验收后明确授权向 `dataelement/dsh-desktop` 创建 PR |
| 原生模板选择与模型上下文 | PASS | 选择 `Moss Green Transformation` 后输入框显示同名预览；会话注入 `office-ppt-skill` 与 `office-ppt-composer`，模型回读 `tencent-pptx` 和所选模板；无 unknown-Skill 错误 |
| 包内运行时路径 | PASS | 最终 Harness utility process 的 `DSH_WORKBUDDY_PPT_RUNTIME_ROOT` 指向当前开发 App 的 `Contents/Resources/workbuddy-ppt-runtime`；包内关键文件哈希与运行时锁一致 |
| Windows x64 基础包 | PASS | GitHub Actions `33619715932` 在 Windows x64 完成 687 项测试、打包与安装包 smoke test；产物省略未配置的 Slides 运行时并保留 PPTD/Kimi 路线 |
| macOS x64 基础包 | NOT_RUN | 平台命令允许省略未配置的 Slides 运行时并保留 PPTD/Kimi 路线；本轮尚未执行实际打包 |
| macOS x64 / Windows x64 Slides 路线 | NOT_RUN | 对应平台的 SlideP 与编辑引擎运行时尚未取得并加入运行时锁 |
| 正式签名与公证 | NOT_RUN | alpha4 候选包采用 ad-hoc 签名，尚未执行 Developer ID 发布签名与公证 |
| 实际完整演示文稿生成 | PASS | 用户在集成版中完成真实 11 页中文 PPTX 生成，产物报告 193 个可编辑对象，并在 WPS 中打开查看 |
| alpha4 运行后签名与 PowerPoint/WPS 往返 | NOT_RUN | alpha1 已完成真实 PPTX 生成与 WPS 打开查看；alpha4 的运行后严格签名复核，以及编辑、保存、关闭与重开仍作为独立发布验收项 |

第一次 Desktop 开发包启动暴露了 Host 动态 chunk 未进入 npm `files` 的闭包错误。共享包现在收录 `lib/*.js`，构建前清空生成目录，并用闭包测试校验每个相对 import 及孤立模块。后续原生截图暴露了绝对定位图库叠压输入框、标准席位顺序错误、模板选择缺少输入框反馈和滚轮恢复链路缺失。最终实现修正 0.1.2 新会话页对既有 `conversation.composer.dock` 的渲染顺序，开放输入卡片 `conversation.input.accessory`，并按 `session.blank` 收束模板界面的生命周期；legacy 外部端保持原布局。

完整运行时由 Electron Builder 从经过文件树门禁的目录递归复制。构建输入的 9,919 个只读文件先通过整体摘要；目录包逐文件比较时，除 Electron Builder 对 `editor_sdk` 执行代码签名产生的预期字节变化及 Finder 时间元数据外，其余内容一致。Skill、SlideP、`node_modules`、编辑引擎和 ICU 数据均进入 App Resources。Desktop main 再把这个包内目录显式注入 Harness，核心把编辑器工作目录派生到插件数据根目录，避免运行时回退到构建机、用户提供的外部 runtime 或 App Resources 日志目录。

原生验收只运行隔离的 `DSH Desktop Dev`，并在验收后保留窗口供人工复核。已安装的正式 `DSH Desktop` 与本地 3080 WorkBuddy 服务保持原状态。
本次 JSX 与 Composer 同行布局更新后的 alpha1 目录包于 2026-09-02 16:09 重新生成并正常启动；运行中的 Harness utility 进程从当前 App 的 `Contents/Resources/workbuddy-ppt-runtime` 加载 9,920 个锁定文件。空态与模板选中态均已在隔离 App 中完成原生界面核验，真实模型生成效果继续由本轮人工测试验收。

alpha4 候选 App 与 ZIP 已独立生成并完成静态、运行时闭包、压缩包完整性和 ad-hoc 签名校验。候选包没有替换当前 alpha1。用户完成本轮验收并授权创建 PR 后，分支正式合入 `upstream/main@5f05f2d`，重新通过 687 项测试、类型检查、Electron 构建和包内运行时校验。PR 的 Windows 流水线进一步验证基础包可在缺少对应 Slides 运行时的构建机上生成；完整 Slides 路线继续以平台运行时锁为启用边界。运行后签名完整性与完整 PowerPoint/WPS 往返继续保留为发布验收项。
