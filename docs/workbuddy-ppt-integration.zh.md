# PPT Capability 桌面集成说明

## 目标与基线

本分支把当前本地 PPT Capability 作为 DSH Desktop 的私有内置插件交付，同时保留同一份共享核心在外部 DeepSeek Harness 上的运行方式。

- Desktop 分支：`codex/ppt-capability-alpha4`
- Desktop 上游基线：`dataelement/dsh-desktop` 的 `upstream/main@b012e22`
- 外部端兼容分支：`codex/desktop-plugin-compatibility@60b8806`
- 当前本地 WorkBuddy 基线：`codex/workbuddy-suite@d3ce73b`
- 已安装的正式 `DSH Desktop 2.0.2` 只作为行为参照；源码与合并基线以上游 Git 分支为准。

Desktop 集成先在 `07fd40a`（PR #246）上实现，再完成 `0.1.2-alpha.1` 版本的原生验收。本分支把同一能力迁移到当前 `upstream/main@b012e22` 的 Harness `0.1.2-alpha.4`；依赖清单与锁文件采用 alpha4 上游闭包并保留两份 PPT Capability 本地制品，Composer 补丁则按 alpha4 的实际组件契约重新生成。

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

代码 tarball 负责 Host 与 Client 逻辑，Electron 构建把完整平台运行时写入
`Resources/workbuddy-ppt-runtime`。运行时包含 `skills/tencent-pptx`、SlideP 依赖树和 Tencent Docs
`editor_sdk`。Desktop main 通过 `DSH_WORKBUDDY_PPT_RUNTIME_ROOT` 把这个准确路径注入 Harness 子进程，核心 Host 使用该目录；显式插件配置优先，外部 Harness 仍可使用自己的装配路径。

构建前 `npm run runtime:verify` 按 `packages/workbuddy-ppt/runtime-lock.json` 检查目标平台、组件版本、完整文件树摘要、关键文件哈希和执行权限。缺少环境变量、任一传递依赖文件、平台不一致或哈希漂移都会终止打包。最终安装包不读取构建机的 `~/.dsh/office-ppt/runtime`。

## 文件上传边界

DSH Desktop 0.1.2 已有附件与原生目录选择链路，Electron 壳本身不构成 PPT 集成阻塞。当前内置插件继续复用 DSH 的标准附件入口与工作区路径，不新增宽权限 Electron IPC。面向外部 Harness 的通用上传入口属于独立适配层，后续可按宿主能力注入；Host 的工作区约束、策略和审计边界保持一致。

## 固定产物

内部包版本保留 `0.1.1-rc.2`，Desktop 文件名与 SHA-256 固定本次不可变产物：

```text
f3da9fd978b8b850954ebb9e40c96e9656eaa68b43e371bcd5f45b73b5d0ece3  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-self-contained.tgz
55933aee661f9ab9b46658572a273ede40afb58b5d09256abe1f331a3ca221e4  deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-self-contained.tgz
```

两个产物都由 `pnpm pack` 生成，使 monorepo 的 `workspace:` 依赖转换为可独立安装的 semver。Desktop 构建只挂载标准适配器；适配器在同一个 Cordis fiber 中组合共享核心。

## 验证记录

| 证据层 | 状态 | 证据 |
| --- | --- | --- |
| 共享源码与双布局组件 | PASS | Office/adapter 32 个测试文件、169 项测试通过；332/332 个 Kimi JSX 模板通过静态、视觉质量、模板一致性与真实 SlideP 校验；Host、legacy client 与 standard adapter 均完成干净构建 |
| Harness 契约与文档 | PASS | pre-commit staged lint 通过；翻译 1027 对、README model-experience/limitations、Agent Note 结构/格式与 Markdown wrap 门禁通过 |
| Desktop 插件闭包 | PASS | 固定代码产物 SHA、输入框选择席位、输入框下方功能席位、Host import 闭包、模板上下文与 Desktop patch 顺序测试通过 |
| Desktop 运行时闭包 | PASS | `darwin-arm64` 锁定 9,920 个文件的整体摘要、关键文件哈希与执行权限；缺少任一传递依赖的负向测试通过 |
| Desktop alpha4 自动化 | PASS | `npm ci` 从零应用 21 份上游补丁和 PPT Composer 补丁；82 个测试文件/680 项测试、typecheck、Electron main/preload build 通过；darwin-arm64 PPT 运行时闭包校验通过 |
| 当前隔离开发包 | PASS | alpha1 验收包以 Electron 43.4.0 arm64 目录包重新构建成功；应用包含完整 JSX Slides 核心、标准适配器、全部 Host chunks 及 `Resources/workbuddy-ppt-runtime` 完整运行时 |
| 当前原生 Desktop 布局与滚动 | PASS | alpha1 验收包以隔离 bundle id `io.dsh.desktop.dev` 启动；空白会话中占位词贴近输入区顶部；选中 `Moss Green Transformation` 后紧凑预览位于输入卡片左上角，正文从右侧同行开始；Slides/PPT、分类与模板仍位于输入框下方；已完成会话只保留标准输入框，模板预览、模式开关和图库全部退出；图库向下填充窗口，向下滚动保持输入框居中，反向滚动恢复初始位置 |
| alpha4 原生目录包 | NOT_RUN | 当前只完成源码迁移、干净安装、自动化和 Electron main/preload 构建；等待当前验收包确认后再生成并启动新的原生目录包 |
| 原生模板选择与模型上下文 | PASS | 选择 `Moss Green Transformation` 后输入框显示同名预览；会话注入 `office-ppt-skill` 与 `office-ppt-composer`，模型回读 `tencent-pptx` 和所选模板；无 unknown-Skill 错误 |
| 包内运行时路径 | PASS | 最终 Harness utility process 的 `DSH_WORKBUDDY_PPT_RUNTIME_ROOT` 指向当前开发 App 的 `Contents/Resources/workbuddy-ppt-runtime`；包内关键文件哈希与运行时锁一致 |
| macOS x64 / Windows x64 包 | NOT_RUN | 尚未取得并锁定对应平台的 SlideP 与编辑引擎运行时 |
| 正式签名与公证 | NOT_RUN | 当前只构建开发身份目录包，未执行正式发布签名与公证 |
| 实际完整演示文稿生成 | PASS | 用户在集成版中完成真实 11 页中文 PPTX 生成，产物报告 193 个可编辑对象，并在 WPS 中打开查看 |
| PowerPoint/WPS 往返 | NOT_RUN | 已完成 WPS 打开查看；编辑、保存、关闭与重开仍需单独验收 |

第一次 Desktop 开发包启动暴露了 Host 动态 chunk 未进入 npm `files` 的闭包错误。共享包现在收录 `lib/*.js`，构建前清空生成目录，并用闭包测试校验每个相对 import 及孤立模块。后续原生截图暴露了绝对定位图库叠压输入框、标准席位顺序错误、模板选择缺少输入框反馈和滚轮恢复链路缺失。最终实现修正 0.1.2 新会话页对既有 `conversation.composer.dock` 的渲染顺序，开放输入卡片 `conversation.input.accessory`，并按 `session.blank` 收束模板界面的生命周期；legacy 外部端保持原布局。

完整运行时由 Electron Builder 从经过文件树门禁的目录递归复制。构建输入的 9,920 个文件先通过整体摘要；目录包逐文件比较时，除 Electron Builder 对 `editor_sdk` 执行代码签名产生的预期字节变化及 Finder 时间元数据外，其余内容一致。Skill、SlideP、`node_modules`、编辑引擎和 ICU 数据均进入 App Resources。Desktop main 再把这个包内目录显式注入 Harness，避免运行时回退到构建机或用户目录。

原生验收只运行隔离的 `DSH Desktop Dev`，并在验收后保留窗口供人工复核。已安装的正式 `DSH Desktop` 与本地 3080 WorkBuddy 服务保持原状态。
本次 JSX 与 Composer 同行布局更新后的 alpha1 目录包于 2026-09-02 16:09 重新生成并正常启动；运行中的 Harness utility 进程从当前 App 的 `Contents/Resources/workbuddy-ppt-runtime` 加载 9,920 个锁定文件。空态与模板选中态均已在隔离 App 中完成原生界面核验，真实模型生成效果继续由本轮人工测试验收。alpha4 独立迁移已通过自动化门禁，尚未替换这份运行中 App。
