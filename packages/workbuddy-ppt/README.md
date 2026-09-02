# WorkBuddy PPT 内置产物

本目录固定 DSH Desktop 私有内置插件所需的两个 npm 产物：

- `dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-expanded-gallery.tgz`：共享 Host、PPTD 渲染器、Skill、策略、审计与交付核心；桌面正常流图库使用 `clamp(360px, 52dvh, 680px)` 填充纵向空间。
- `deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-expanded-gallery.tgz`：Harness 0.1.2 标准 Composer 适配器；Slides/PPT 与模板参考区在输入框下方展开。

源码来自相邻 `deepseek-harness` 工作树的 `codex/desktop-plugin-compatibility` 分支，以
`codex/workbuddy-suite` 的稳定提交 `d3ce73b` 为基线。两个产物通过 Desktop 根 `package.json` 的仓库相对
`file:` 依赖安装；构建补丁只挂载适配器，适配器在同一 Cordis fiber 下组合共享核心。

SHA-256：

```text
c6b607bcc3b90f1abda279455669185153464ecce4e00a86ea3395c061a6b308  dsh-workbuddy-ppt-0.1.1-rc.2-desktop-20260902-expanded-gallery.tgz
ae329876072ef65480be1e3ef1b746dd4f39717669350ccca9b85cb7a3b8c05c  deepseek-ai-dsh-experimental-office-ppt-standard-adapter-0.1.1-rc.2-desktop-20260902-expanded-gallery.tgz
```

更新产物时，应同时更新两个 tarball、根依赖、这里的哈希、插件闭包测试和集成说明。
