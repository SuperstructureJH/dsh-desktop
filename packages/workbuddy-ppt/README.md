# PPT Capability 内置产物

本目录固定 DSH Desktop 私有内置插件所需的代码产物与平台运行时契约：

- `dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-self-contained.tgz`：共享 Host、PPTD 渲染器、Skill 注册、模板状态、策略、审计与交付核心。
- `deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-self-contained.tgz`：Harness 0.1.2 标准 Composer 适配器；空白会话中，已选模板显示在输入框内部的参考附件区，Slides/PPT 与模板参考区在输入框下方展开；任务开始后整组模板界面收起。
- `runtime-lock.json`：按平台固定 `tencent-pptx` Skill、SlideP、Tencent Docs 编辑引擎和关键文件 SHA-256。

源码来自相邻 `deepseek-harness` 工作树的 `codex/desktop-plugin-compatibility` 分支，以
`codex/workbuddy-suite` 的稳定提交 `d3ce73b` 为基线；当前桌面兼容源码提交为 `6a3f475`。两个产物通过 Desktop 根 `package.json` 的仓库相对
`file:` 依赖安装；构建补丁只挂载适配器，适配器在同一 Cordis fiber 下组合共享核心。

SHA-256：

```text
36db528dc325ed1a37583f878969b77ff66d9f89959a7e50c2405fcacca13d93  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-self-contained.tgz
ccb7805a92669fc21ded7df69fa22f77cce4c3265bfdd9a160b5c583ebc462c9  deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-self-contained.tgz
```

## 桌面运行时闭包

桌面构建必须设置绝对路径 `DSH_WORKBUDDY_PPT_RUNTIME_ROOT`。`npm run runtime:verify` 先按
`runtime-lock.json` 检查平台、版本、完整文件树、关键哈希和可执行权限，Electron Builder 再把整个目录复制到
`Contents/Resources/workbuddy-ppt-runtime`（Windows 为对应 Resources 目录）。Desktop main 通过
`DSH_WORKBUDDY_PPT_RUNTIME_ROOT` 把该目录传给 Harness 子进程。打包后的应用直接从资源目录加载
Skill、SlideP 和编辑引擎，不依赖用户目录或单独部署的 PPT 服务。

当前仓库已锁定并验证 `darwin-arm64`。运行时包含无法从公开 npm 重新获取的许可二进制，因此源码仓库保存版本锁与打包规则，内部构建环境提供受控运行时目录；最终 Desktop 安装包包含完整文件。新增 macOS x64 或 Windows x64 产物前，需要提供对应平台运行时并加入同一份锁。

更新产物时，应同时更新两个 tarball、根依赖、这里的哈希、运行时锁、插件闭包测试和集成说明。
