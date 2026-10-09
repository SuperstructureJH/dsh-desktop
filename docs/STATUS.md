# Implementation status

## Word / Excel 案例 — 2026-10-09

- 基于 `upstream/V0.12.0@35b9f85a`，安装 Harness `0.2.0-rc.2`，分支 `codex/v012-office-templates`。
- 实现 12 个案例和 64 页预览；公文、会议纪要、工作总结、项目方案、预算费用、项目台账、销售报表直接展示。Word 与 PPT 使用一致的案例查看和「做同款」流程；Excel 增加工作表标签。
- 案例卡片与输入框选中图共用竖版上 50% / 横版整图的缩略图；选中图宽 112px，输入框展示图片和取消按钮，名称保留在列表及无障碍标签。实际 Harness 裁切、选择、完整预览和 520px 窄窗口 PASS，1644 项全量测试 PASS；r2 开发包构建、包内 Office 制作 / PDF 转换、8 文件源码一致及严格签名 PASS。用户将在 DSH 中用会议原文进行模型生成验收。
- 复用官方 Office Skill、锁定 Python 和 Kit；六个业务 Skill 独立注册。模板复制走真实会话策略、Sandbox/Subprocess、版本哈希和既有审计。
- 类型检查、构建、183 文件 / 1644 项全量测试、23 项 Excel 数值检查及实际 Harness 浏览器交互 PASS。重复 Kit 重算的原生工作簿哈希一致；生成器统一归档时间、元数据和图表轴引用 ID。首次目录加载和重连已按完整响应状态修复并验证。
- 最终 macOS ARM64 开发应用构建 PASS；包内 Office 激活 / 原生文件制作 / PDF 转换、8 个 Office 源文件逐字节一致、严格签名、全部 12 案例真实工具复制和哈希检查通过，包内 Harness 浏览器复测 Word 目录、会议纪要查看及选择。Apple 公证、真实模型、Windows、原生 Office 编辑保存重开 NOT_RUN。WPS 尝试打开独立会议纪要副本，完整原生验收待取得稳定证据。
- 详情见 [实现与验证记录](office-templates-v012.md)。
