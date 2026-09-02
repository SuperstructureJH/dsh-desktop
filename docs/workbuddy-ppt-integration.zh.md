# WorkBuddy PPT 桌面集成说明

## 目标与基线

本分支把当前本地 WorkBuddy PPT 能力作为 DSH Desktop 的私有内置插件交付，同时保留同一份共享核心在外部 DeepSeek Harness 上的运行方式。

- Desktop 分支：`codex/workbuddy-desktop-integration`
- Desktop 上游基线：`dataelement/dsh-desktop` 的 `upstream/main@31aa27f`
- 外部端兼容分支：`codex/desktop-plugin-compatibility@f8c771b`
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
└── Client 侧只注册 conversation.composer.dock
        │
        ▼
DSH Desktop 0.1.2-alpha.1 patch + 内置 file: 依赖
```

标准适配器不复制 PPT 工具、提示词、存储、渲染器或文件系统权限。它只负责版本边界与 Composer 席位。外部端继续使用旧版 `conversation.hero.*` 席位；Desktop 使用 0.1.2 语义明确的输入框下方席位。

Desktop 0.1.2 原有 `conversation.composer.dock` 定义为输入框下方区域，但新会话页只在普通会话的输入框 footer 中渲染它。Desktop 补丁让新会话页也在 resident input card 之后渲染该席位。最终顺序为标题与工作区、输入框、Slides/PPT、分类与模板参考区。标准适配器只占用 `conversation.composer.dock`，已选模板通过下方图库的选中态表达，输入框内部保持原生工具栏。图库拥有独立纵向滚动和 overscroll 边界，正常流高度为 `clamp(360px, 52dvh, 680px)`，在桌面大窗口中向下多展示约一行半至两行；外部端的悬浮图库继续保持原行为。

## 文件上传边界

DSH Desktop 0.1.2 已有附件与原生目录选择链路，Electron 壳本身不构成 PPT 集成阻塞。当前内置插件继续复用 DSH 的标准附件入口与工作区路径，不新增宽权限 Electron IPC。面向外部 Harness 的通用上传入口属于独立适配层，后续可按宿主能力注入；Host 的工作区约束、策略和审计边界保持一致。

## 固定产物

内部包版本保留 `0.1.1-rc.2`，Desktop 文件名与 SHA-256 固定本次不可变产物：

```text
c6b607bcc3b90f1abda279455669185153464ecce4e00a86ea3395c061a6b308  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-expanded-gallery.tgz
ae329876072ef65480be1e3ef1b746dd4f39717669350ccca9b85cb7a3b8c05c  deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-expanded-gallery.tgz
```

两个产物都由 `pnpm pack` 生成，使 monorepo 的 `workspace:` 依赖转换为可独立安装的 semver。Desktop 构建只挂载标准适配器；适配器在同一个 Cordis fiber 中组合共享核心。

## 验证记录

| 证据层 | 状态 | 证据 |
| --- | --- | --- |
| 共享源码与双布局组件 | PASS | Office/adapter 30 个测试文件、159 项测试通过；Host、legacy client、standard adapter 均完成干净构建 |
| Harness 契约与文档 | PASS | staged lint 通过；翻译 1027 对、导出 JSDoc、README model-experience/limitations 与 Markdown wrap 门禁通过；完整 28/28 doc-sync 沿用变更前基线 |
| Desktop 插件闭包 | PASS | 固定 SHA、`conversation.composer.dock` 单席位、Host 相对 import 闭包、Desktop patch 顺序、响应式图库高度与打包后文件存在性测试通过 |
| Desktop 自动化 | PASS | `npm ci` 从零应用全部补丁；80 个测试文件/648 项测试、typecheck、Electron main/preload build 通过 |
| 未签名开发包 | PASS | Electron 43.4.0 arm64 目录包构建成功；打包应用包含核心、适配器及全部 Host chunks |
| 原生 Desktop 布局 | PASS | 隔离 bundle id `io.dsh.desktop.dev` 启动；实际顺序为标题/工作区、输入框、Slides/PPT、分类与 44 个模板；768px 高窗口显示两行完整模板及第三行预览并填充到窗口底部；选择模板后输入框内部仍无模板附件；下方图库独立滚动与模式/模板切换可用 |
| 正式签名与公证 | NOT_RUN | 当前只构建无签名开发目录包 |
| 实际模型生成 | NOT_RUN | 开发 Profile 未配置模型 API Key |
| PowerPoint/WPS 往返 | NOT_RUN | 需要在真实生成 PPTX 后执行打开、编辑、保存、重开 |

第一次 Desktop 开发包启动暴露了 Host 动态 chunk 未进入 npm `files` 的闭包错误。共享包现在收录 `lib/*.js`，构建前清空生成目录，并用闭包测试校验每个相对 import 及孤立模块。后续两次原生截图依次暴露旧绝对定位图库叠压输入框、标准适配器把模式与图库接到输入框上方并把选中模板接入输入框内部。最终实现修正 0.1.2 新会话页对既有 `conversation.composer.dock` 的渲染顺序，标准适配器只占用这个输入框下方席位；legacy 外部端保持原布局。

原生验收只运行隔离的 `DSH Desktop Dev`，并在验收后保留窗口供人工复核。已安装的正式 `DSH Desktop` 与本地 3080 WorkBuddy 服务保持原状态。
