# Kimi PPT 内置产物

本目录固定 DSH Desktop 的 Kimi-only 演示文稿插件：

- `dsh-workbuddy-ppt-0.1.1-rc.2-desktop-kimi-20260904.tgz`：PPTD 编辑、渲染、模板、Skill、审计和交付核心。
- `deepseek-ai-dsh-experimental-kimi-ppt-standard-adapter-0.1.1-rc.2-desktop-kimi-20260904.tgz`：Harness 0.1.2 标准 Composer 适配器。

这条分支只挂载 `experimental-kimi-ppt-standard-adapter`，Host 只注册 `pptd_*` 与 Kimi 模板工具。产物不包含腾讯 `editor_sdk`、SlideP 运行时和腾讯专用 `ppt_*` 工具。

SHA-256：

```text
bc88c1d1d6bdd0c846aabfa8c419ba8272ab31a82d7516b8dd3d7f322ccbe631  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-kimi-20260904.tgz
d38d3c2ca6dc9526a988ecd5ece750a1a11a71c851318a09ff690bb306a96688  deepseek-ai-dsh-experimental-kimi-ppt-standard-adapter-0.1.1-rc.2-desktop-kimi-20260904.tgz
```

更新产物时，应同时更新两个 tarball、根依赖、这里的哈希、插件闭包测试和集成测试。
