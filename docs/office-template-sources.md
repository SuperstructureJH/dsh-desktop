# Office 案例与业务方法来源

迁入内容来自用户原 PR #424 的 `08fe8ce64db6e30ebc701be8120fd4aca2ec0c2e`。

- 六份旧案例：`packages/dsh-office/templates` 的原生 DOCX/XLSX、设计说明、登记的 JSON/PNG 和计算检查输入。设计说明调整为官方 Office Skill、安装级 Python 和 Kit 的交付流程。预览和目录哈希重新生成。
- `meeting-recap`、`saas-metrics-coach`、`dataset-health-audit`、`data-viz-gen`：原 PR 收录的用户提供 Skill 归档，保留各自 MIT 许可和归属文件。
- `research-writer`：保留 Apache-2.0 许可及原文来源声明，原来源为 ComposioHQ/awesome-claude-skills 的 content-research-writer。
- `gov-doc-writing`：原 PR 中用户授权的本地公文写作 Skill 2.0.4 及其参考资源，沿用原资源说明和条款。
- 原业务归档 `开源skill-185个 (1).zip` 的 SHA-256：`84a0352d4625803aa30b9f9807b38655f0a0097420a8523c04cf5ac5893f1a04`。本次选取六个与案例匹配的方法；其余内容可从原 PR 恢复。

会议纪要流程根据当前材料直接制作初稿，未知字段使用待确认；所有业务 Skill 由 Desktop provider 补充官方文件制作与交付说明。新增会议纪要、工作总结、项目方案、预算费用、项目台账和销售报表由本仓库生成器维护，作为结构与版式示例。

导入的文本资源统一为 LF，并清理行尾空白；保留原文内容、许可和归属声明。原生案例输入保持原文件内容。

官方基础依赖来自 deepseek-ai/deepseek-harness 的 `dsh-v0.2.0-rc.2`，保留 npm 依赖本身的许可文件。原有业务 Skill 的许可文本随安装资源分发。
