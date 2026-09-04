# Kimi PPT 内置产物

本目录固定 DSH Desktop 的 Kimi-only 演示文稿插件：

- `dsh-workbuddy-ppt-0.1.1-rc.2-desktop-kimi-20260904.tgz`：PPTD 编辑、渲染、模板、Skill、审计和交付核心。
- `deepseek-ai-dsh-experimental-kimi-ppt-standard-adapter-0.1.1-rc.2-desktop-kimi-20260904.tgz`：Harness 0.1.2 标准 Composer 适配器。

这条分支只挂载 `experimental-kimi-ppt-standard-adapter`，Host 只注册 `pptd_*` 与 Kimi 模板工具。模板目录包含 22 套：7 个分类各保留 3 套核心模板，并在商务分类增加用户提供的 58 页活力蓝逻辑图表模板。活力蓝模板已在共享版式层移除右上角 logo，58 页预览与源页语义索引完整保留。详细 PPTD 模板参考会为每个文本区提供按区域几何计算的 `textCapacity`，Kimi Skill 按容量控制标题和正文长度。产物不包含腾讯 `editor_sdk`、SlideP 运行时和腾讯专用 `ppt_*` 工具。

SHA-256：

```text
7c7969d95c28bb04b7d7c8a907e88515f32069f7cb771d1a8170ebf4389d2a5d  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-kimi-20260904.tgz
dd8feab1d62643375fe7478b98a5c19748b03fdaea73dee59689636047a0ee3d  deepseek-ai-dsh-experimental-kimi-ppt-standard-adapter-0.1.1-rc.2-desktop-kimi-20260904.tgz
```

更新核心能力时，同步更新 core tarball、根依赖完整性、这里的哈希、插件闭包测试和集成测试；适配器接口变化时再同步更新 adapter tarball。
