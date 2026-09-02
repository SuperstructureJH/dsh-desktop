# WorkBuddy PPT 内置产物

本目录固定 DSH Desktop 私有内置插件所需的两个 npm 产物：

- `dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-layout.tgz`：共享 Host、PPTD 渲染器、Skill、策略、审计与交付核心。
- `deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-layout.tgz`：Harness 0.1.2 标准 Composer 适配器；图库在输入框上方以独立正常流区域展开。

源码来自相邻 `deepseek-harness` 工作树的 `codex/desktop-plugin-compatibility` 分支，以
`codex/workbuddy-suite` 的稳定提交 `d3ce73b` 为基线。两个产物通过 Desktop 根 `package.json` 的仓库相对
`file:` 依赖安装；构建补丁只挂载适配器，适配器在同一 Cordis fiber 下组合共享核心。

SHA-256：

```text
c0b4aad5c304a0918d26ea04a88a4ed82c3daa6bd5f2b68e7d8b58a4df5c1c13  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-layout.tgz
79f6d16fefacb6a283fa552c6a9b8373c93eb70ec0f4dec7b452bc53c390fee5  deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-layout.tgz
```

更新产物时，应同时更新两个 tarball、根依赖、这里的哈希、插件闭包测试和集成说明。
