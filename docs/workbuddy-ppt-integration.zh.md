# PPT Capability 桌面集成说明

## 目标与当前基线

本分支把 PPT Capability 作为 DSH Desktop 内置插件交付，并保留同一份 Slides/JSX 核心在外部 DeepSeek Harness 中装配的能力。

- PR：`dataelement/dsh-desktop#278`
- Desktop 分支：`codex/ppt-capability-alpha4`
- Desktop 上游基线：`upstream/main@7cb9e04`，包含 `0.8.0-rc.3`
- Harness 依赖基线：`0.1.2-alpha.4`
- Slides 源码分支：`codex/desktop-plugin-compatibility@fcb06ab786`

分支已经合入 2026-09-02 的最新 `upstream/main`。上游新增的启动维护与 dshmarket 产物修复进入同一个 PR；PPT Capability 保持现有 Composer 布局补丁和交互行为。

## 单一路线

桌面端只显示 Slides 模式。独立 PPT 模式、Kimi/PPTD Skill 注入、`pptd_*` 工具、PPTD CLI 与编译器已经退出发布包。模型使用以下五个 Host 工具完成可编辑 PPTX：

1. `ppt_list_templates`
2. `ppt_get_template_pages`
3. `ppt_create`
4. `ppt_write_page`
5. `ppt_render`

选中的模板由 Host 持久化为 `selectedTemplateId`。每轮任务从同一份状态得到模板 id、名称与配色，并自动注入 `tencent-pptx` Skill。模型读取真实源页图片和语义 JSX 构图，写入完整 SlideP JSX；Host 执行路径约束、素材准入、静态语法、字号、溢出、碰撞、内容关系、模板一致性、渲染校验、原子发布和审计。

## Desktop 适配结构

```text
dsh-workbuddy-ppt
├── Slides Host、状态、模板、Skill、质量门禁与文件交付
└── 标准 Composer 共享组件
        │
        ▼
@deepseek-ai/dsh-experimental-office-ppt-standard-adapter
├── conversation.hero.modeActions：agent preset 右侧的 Slides 入口
├── conversation.input.accessory：输入框内的已选模板参考
└── conversation.composer.dock：输入框下方的固定模板目录
        │
        ▼
DSH Desktop 0.8.0-rc.3 / Harness 0.1.2-alpha.4
        │
        ▼
Resources/workbuddy-ppt-runtime
├── skills/tencent-pptx
├── slidep
└── tencent-docs-ai-engine
```

Slides 入口位于 agent preset 右侧。打开 Slides 后输入框保持原位；分类栏紧接输入框下方，模板目录占用其余可视高度并独立滚动。选中模板后，缩略图占据输入区左侧的小区域，正文从右侧同行开始；空态占位词贴近输入区顶部。任务被会话接受后，缩略图、Slides 入口和模板目录一起收起。

## 运行时与包体积

Slides 路线依赖目标平台运行时。源码仓库只保存 `runtime-distribution.json` 的公开二进制地址与压缩包锁，以及 `runtime-lock.json` 的解压运行时锁。macOS arm64 首次执行 `npm run dev` 或打包命令时自动下载 207,169,828 字节的闭源运行时，先校验压缩包 SHA-256，再校验 9,919 个解压文件的完整目录树。开发进程通过校验后的缓存路径启用 Slides；构建则把同一运行时写入应用资源。编辑引擎在插件数据目录工作并写日志，App Resources 保持只读。SlideP 与 Tencent Docs 编辑引擎不进入 Git，也不适用本仓库的 MIT 许可证。macOS x64 与 Windows x64 尚未发布对应运行时，缺少运行时时保持插件禁用。

公开二进制制品：

```text
Release  https://github.com/SuperstructureJH/dsh-desktop/releases/tag/ppt-capability-runtime-v1
Archive  ppt-capability-runtime-darwin-arm64-5.4.1-0.2.112-wb.tar.gz
Size     207169828
SHA-256  ca273302786617b722e98aa0976386a497e287db72880d07257bb32cd3d33a1d
```

代码 tarball 的生产依赖只保留 Schemastery、FFlate、TypeScript 和 Zod。PPTD 相关渲染与编译依赖不会进入 Desktop 的生产 `node_modules`。包体积的主要部分仍是 332 张模板源页与平台 Slides 运行时。

固定代码产物：

```text
f6682e3c42cc946f28cdddd51c177d1411139feabb51448508fc0dbeb48220e2  29238986  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260903-public-gallery.tgz
e909330b53c179cca5ee49a9277ab1d87d3a84c5395e7e1cee8a50a1877f9184   6973632  deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260903-public-gallery.tgz
```

本地 macOS arm64 体验包：

```text
44a7892e56272f3685598b241168f75851bd6e75c3c5aedb3d7ada3bbf3242e5  412510079  ppt-capability-slides-adjacent-main-7cb9e04-mac-arm64.zip
```

体验包采用完整资源树的 ad-hoc 签名，仅用于本轮验证和内部体验。开发配置明确关闭自动证书选择，避免本机 Apple Development 身份在打包末尾部分替换签名。332 张模板源页与约 563 MiB 的腾讯 Slides 平台运行时仍是包体主体。

## 验证状态

| 证据层 | 状态 | 证据 |
| --- | --- | --- |
| 最新主线同步 | PASS | 分支合入 `upstream/main@7cb9e04`，基线包含 `0.8.0-rc.3` |
| Slides 源码 bundle | PASS | Host、Client 与标准适配器完成干净 bundle；聚焦 Client 31 项测试与两套 Client TypeScript 构建通过；发布归档只含 Slides 路线 |
| 发布归档闭包 | PASS | 固定 SHA；无 PPTD CLI、PPTD bundle、独立 PPT 工具与生产编译依赖；332 张模板源页保留 |
| Desktop 自动化 | PASS | 插件闭包测试通过；全量 84 个测试文件、695 项测试通过；`npm run typecheck` 与 `npm run build` 通过 |
| 公开运行时获取 | PASS | 新建空缓存后从公开 GitHub Release 下载 207,169,828 字节；压缩包 SHA-256、9,919 文件运行时树、关键文件与执行权限全部通过；第二次执行直接复用缓存 |
| macOS arm64 目录包 | PASS | 自动下载的运行时通过严格校验并进入 arm64 目录包；App ad-hoc 签名严格校验通过，Electron 43.4.0 命令行启动通过；Slides 运行时约 563 MiB |
| 原生 Slides 回归 | NOT_RUN | 用户复核 Slides 顶部入口、固定输入框、分类/模板独立滚动、模板选中态、任务开始收起与真实生成 |
| PowerPoint/WPS 往返 | NOT_RUN | 新包生成后执行编辑、保存、关闭与重开 |
| 正式签名与公证 | NOT_RUN | 开发候选使用 ad-hoc 签名；正式发布另行执行 Developer ID 签名与公证 |

自动化验证证明代码、依赖和打包闭包；原生 UI 与 Office 往返继续作为独立验收层。
