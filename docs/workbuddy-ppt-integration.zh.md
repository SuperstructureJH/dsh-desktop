# WorkBuddy PPT 桌面集成说明

## 目标与基线

本分支把当前本地 WorkBuddy PPT 能力作为 DSH Desktop 的私有内置插件交付，同时保留同一份共享核心在外部 DeepSeek Harness 上的运行方式。

- Desktop 分支：`codex/workbuddy-desktop-integration`
- Desktop 上游基线：`dataelement/dsh-desktop` 的 `upstream/main@31aa27f`
- 外部端兼容分支：`codex/desktop-plugin-compatibility@c347f03`
- 当前本地 WorkBuddy 基线：`codex/workbuddy-suite@d3ce73b`
- 已安装的正式 `DSH Desktop 2.0.2` 只作为行为参照；源码与合并基线以上游 Git 分支为准。

Desktop 集成先在 `07fd40a`（PR #246）上实现，再合并当前 `upstream/main@31aa27f`。合并过程无冲突。`31aa27f` 之前的五个主线合并分别是 PR #269、#267、#263、#251 和 #225。

## 分支关系

以下数字以 `upstream/main@31aa27f` 为左侧基准，格式为“主线独有 / 分支独有”：

| 分支 | 分叉计数 | 结论 |
| --- | ---: | --- |
| `upstream/dev` | `84 / 20` | 独立开发线，包含尚未进入主线的提交，也缺少较多主线提交 |
| `upstream/release/v0.4.3` | `79 / 0` | 旧发布线，完整落后于当前主线 |
| `origin/main` | `254 / 0` | Fork 主线长期未同步 |
| `origin/codex/session-permanent-delete` | `196 / 3` | 旧基线上的三提交功能分支 |
| `origin/codex/edit-sent-message` | `251 / 3` | 接近主线的三提交功能分支 |
| `origin/codex/model-picker-select-all` | `251 / 1` | 接近主线的一提交功能分支 |
| `origin/codex/fix-clipboard-permission` | `254 / 1` | Fork 旧主线上的一提交修复分支 |

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
├── Client 侧 conversation.input.left：已选模板预览
└── Client 侧 conversation.composer.dock：模式与模板参考区
        │
        ▼
DSH Desktop 0.1.2-alpha.1 patch + 内置 file: 依赖
        │
        ▼
Resources/workbuddy-ppt-runtime
├── skills/tencent-pptx
├── slidep
└── tencent-docs-ai-engine
```

标准适配器不复制 PPT 工具、提示词、存储、渲染器或文件系统权限。它只负责版本边界与 Composer 席位。外部端继续使用旧版 `conversation.hero.*` 席位；Desktop 使用 0.1.2 语义明确的输入框下方席位。

Desktop 0.1.2 原有 `conversation.composer.dock` 定义为输入框下方区域，但新会话页只在普通会话的输入框 footer 中渲染它。Desktop 补丁让新会话页也在 resident input card 之后渲染该席位。最终顺序为标题与工作区、输入框、Slides/PPT、分类与模板参考区。标准适配器使用 `conversation.input.left` 显示已选模板预览，使用 `conversation.composer.dock` 展示下方功能区；两个席位共享同一份 Host 选择状态。图库拥有独立纵向滚动和 overscroll 边界，正常流高度为 `clamp(360px, 52dvh, 680px)`。滚轮先恢复输入框的居中位置，再滚动图库；反向滚动先回到图库顶部，再把会话页恢复到初始位置。外部端的悬浮图库继续保持原行为。

模板点击调用 Host `template/select`，持久化 `selectedTemplateId`。每轮 Office PPT 上下文从这份 Host 状态生成 `selected_template_id`、模板名称和配色指导，并注入自动加载的 `tencent-pptx` Skill。输入框预览和模型上下文因此引用同一个选择结果。

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
bd469e8931ca1566a265b11865b87f30115b2597c7932d98d59d31a4fc071f41  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-self-contained.tgz
9d434e6b8fc3232bc4c08a9f854da813e1fa1bf9bd1a6e93730b0f9c811e21e1  deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-self-contained.tgz
```

两个产物都由 `pnpm pack` 生成，使 monorepo 的 `workspace:` 依赖转换为可独立安装的 semver。Desktop 构建只挂载标准适配器；适配器在同一个 Cordis fiber 中组合共享核心。

## 验证记录

| 证据层 | 状态 | 证据 |
| --- | --- | --- |
| 共享源码与双布局组件 | PASS | Office/adapter/suite 32 个测试文件、165 项测试通过；Host、legacy client 与 standard adapter 均完成干净构建 |
| Harness 契约与文档 | PASS | pre-commit staged lint 通过；翻译 1027 对、README model-experience/limitations、Agent Note 结构/格式与 Markdown wrap 门禁通过 |
| Desktop 插件闭包 | PASS | 固定代码产物 SHA、输入框选择席位、输入框下方功能席位、Host import 闭包、模板上下文与 Desktop patch 顺序测试通过 |
| Desktop 运行时闭包 | PASS | `darwin-arm64` 锁定 9,920 个文件的整体摘要、关键文件哈希与执行权限；缺少任一传递依赖的负向测试通过 |
| Desktop 自动化 | PASS | `npm ci` 从零应用全部补丁；81 个测试文件/653 项测试、typecheck、Electron main/preload build 通过 |
| 未签名开发包 | PASS | Electron 43.4.0 arm64 目录包构建成功；应用包含核心、适配器、全部 Host chunks 及 `Resources/workbuddy-ppt-runtime` 完整运行时 |
| 原生 Desktop 布局与滚动 | PASS | 隔离 bundle id `io.dsh.desktop.dev` 启动；顺序为标题/工作区、输入框、Slides/PPT、分类与模板；图库向下填充窗口，向下滚动保持输入框居中，反向滚动恢复初始位置 |
| 原生模板选择与模型上下文 | PASS | 选择 `Moss Green Transformation` 后输入框显示同名预览；会话注入 `office-ppt-skill` 与 `office-ppt-composer`，模型回读 `tencent-pptx` 和所选模板；无 unknown-Skill 错误 |
| 包内运行时路径 | PASS | 最终 Harness utility process 的 `DSH_WORKBUDDY_PPT_RUNTIME_ROOT` 指向当前开发 App 的 `Contents/Resources/workbuddy-ppt-runtime`；包内关键文件哈希与运行时锁一致 |
| macOS x64 / Windows x64 包 | NOT_RUN | 尚未取得并锁定对应平台的 SlideP 与编辑引擎运行时 |
| 正式签名与公证 | NOT_RUN | 当前只构建无签名开发目录包 |
| 实际完整演示文稿生成 | NOT_RUN | 本轮只执行 Skill 与模板上下文回读，未要求模型生成完整 PPTX |
| PowerPoint/WPS 往返 | NOT_RUN | 需要在真实生成 PPTX 后执行打开、编辑、保存、重开 |

第一次 Desktop 开发包启动暴露了 Host 动态 chunk 未进入 npm `files` 的闭包错误。共享包现在收录 `lib/*.js`，构建前清空生成目录，并用闭包测试校验每个相对 import 及孤立模块。后续原生截图暴露了绝对定位图库叠压输入框、标准席位顺序错误、模板选择缺少输入框反馈和滚轮恢复链路缺失。最终实现修正 0.1.2 新会话页对既有 `conversation.composer.dock` 的渲染顺序；标准适配器使用 `conversation.input.left` 展示选择结果，使用 `conversation.composer.dock` 展示下方功能区；legacy 外部端保持原布局。

完整运行时由 Electron Builder 从经过文件树门禁的目录递归复制。最终包与构建输入逐文件比较，仅忽略 Finder 的 `.DS_Store` 元数据；Skill、SlideP、`node_modules`、编辑引擎和 ICU 数据均进入 App Resources。Desktop main 再把这个包内目录显式注入 Harness，避免运行时回退到构建机或用户目录。

原生验收只运行隔离的 `DSH Desktop Dev`，并在验收后保留窗口供人工复核。已安装的正式 `DSH Desktop` 与本地 3080 WorkBuddy 服务保持原状态。
