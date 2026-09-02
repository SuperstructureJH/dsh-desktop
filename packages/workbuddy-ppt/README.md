# WorkBuddy PPT 内置产物

本目录固定 DSH Desktop 私有内置插件所需的两个 npm 产物：

- `dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902.tgz`：共享 Host、PPTD 渲染器、Skill、策略、审计与交付核心。
- `deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902.tgz`：Harness 0.1.2 标准 Composer 适配器。

源码来自相邻 `deepseek-harness` 工作树的 `codex/desktop-plugin-compatibility` 分支，以
`codex/workbuddy-suite` 的稳定提交 `d3ce73b` 为基线。两个产物通过 Desktop 根 `package.json` 的仓库相对
`file:` 依赖安装；构建补丁只挂载适配器，适配器在同一 Cordis fiber 下组合共享核心。

SHA-256：

```text
704038f119f5889190cecdb2ce51bfff3e34f2d3f0377576f433c31a118cae1d  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902.tgz
4182b8c17ae2b394ea26f3c2e311637660ccfc21273d6ad71567c214c299557a  deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902.tgz
```

更新产物时，应同时更新两个 tarball、根依赖、这里的哈希、插件闭包测试和集成说明。
