# Kimi PPT 内置产物

本目录固定 DSH Desktop 的 Kimi-only 演示文稿插件：

- `dsh-workbuddy-ppt-0.1.1-rc.2-desktop-kimi-20260904.tgz`：PPTD 编辑、渲染、模板、Skill、审计和交付核心。
- `deepseek-ai-dsh-experimental-kimi-ppt-standard-adapter-0.1.1-rc.2-desktop-kimi-20260904.tgz`：Harness 0.1.2 标准 Composer 适配器。

这条分支只挂载 `experimental-kimi-ppt-standard-adapter`，Host 只注册 `pptd_*` 与 Kimi 模板工具。模板目录按 7 个分类各保留 3 套，共 21 套。产物不包含腾讯 `editor_sdk`、SlideP 运行时和腾讯专用 `ppt_*` 工具。

SHA-256：

```text
013621ccdb07dbfa441e9367c714c64915485ee160e3d51f091ec55766a8d7d7  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-kimi-20260904.tgz
455917d21483f932346e85ef60070a6feca25400f9596b9332187dcd6e9fb176  deepseek-ai-dsh-experimental-kimi-ppt-standard-adapter-0.1.1-rc.2-desktop-kimi-20260904.tgz
```

更新产物时，应同时更新两个 tarball、根依赖、这里的哈希、插件闭包测试和集成测试。
