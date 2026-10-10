# Implementation status

## Office r9：精简 Excel 案例与双页阅读 — 2026-10-10

- 基线沿用已核实的 `V0.12.0@6c25786d`，Harness `0.2.0-rc.2`。
- 删除预算与费用表、项目任务台账、销售数据报表及对应生成逻辑；目录保留 6 个 Word 和 3 个 Excel 案例，共 58 页。
- Excel 复用 Word 双页阅读区，相邻两页等比并排，逐页展示工作表名称和页码。工作表标签定位到该表准确起始页；每次翻两页，奇数末页居中。
- 184 文件 / 1661 项全量回归（含 21 项 Office UI 行为）、类型检查及 9 案例 / 58 页资源校验 PASS；9 项 Excel 数值核对通过。工作表偶数起始页的末组键盘右翻与按钮边界一致。最终构建、包内 Office 制作 / PDF 转换、8 个插件源文件与 9 案例 / 58 页资源一致性、严格开发签名及 ZIP CRC PASS。实际视觉、真实模型、原生 Office 编辑保存重开、Windows、Apple 公证 NOT_RUN。
- [r9 交付记录与 macOS ARM64 测试包](/Users/dongjianghan/Documents/ChatGPT/workbuddy/outputs/office-template-harness-rc2-20261010/delivery-r9.md)。

## Office r8：对齐 PPT PR #675 详细预览 — 2026-10-10

- 已核实远端 `V0.12.0@6c25786d` 并合入当前 `codex/v012-office-templates`，安装 Harness `0.2.0-rc.2`。参照固定 `#675@fe63bb3c` 的详细模板 viewer。
- 实现：Word / Excel 共用 1280×900 弹窗、32px 外边距、浅灰内容区、左上小眼睛、居中翻页和黑底做同款；保留 Word 双页及 Excel 工作表。键盘焦点循环，内侧留白和外部遮罩按实际边界判断。
- 验证：184 文件 / 1659 项全量回归（含 19 项 Office UI 行为）、类型检查和构建 PASS。独立临时 Harness 启动 PASS；浏览器安全策略阻止访问本地预览页，实际深浅主题 / 窄窗口视觉验收 NOT_RUN。最终开发包构建、包内 Office 制作 / PDF 转换、8 个源文件及 12 案例 / 64 页哈希、严格开发签名 PASS；真实模型、原生 Office 编辑保存重开、Windows、Apple 公证 NOT_RUN。


## Word / Excel 案例 — 2026-10-09

- r7 实现：删除预览放大入口及缩放状态；Excel 封面与输入框缩略图从表头 / 上半部分裁切，卡片前景延伸至底边；Word 浅蓝背景浓度 5%、Excel 浅绿 6%。Word / Excel 模式选中使用主题前景底色和反色文字，浅色主题黑底白字。实际 Harness 封面、双页、Excel 工作表 / 做同款、深浅主题和 520px 窄窗口 PASS；184 文件 / 1656 项最终回归与类型检查 PASS；最终开发包构建、包内 Office 制作 / PDF 转换、8 源文件与业务资源一致、12 案例 / 64 页哈希、严格签名 PASS；真实模型、原生 Office 编辑保存重开、Windows、Apple 公证 NOT_RUN。

- r6 实现：Word 多页预览采用双页并排、逐页编号与范围页码；按钮和方向键每次切换两页，奇数末页同尺度居中，翻页保持焦点并复位滚动。两页预览原子加载，失败可重新加载，旧请求随翻页取消。实际 Harness 默认窗口、520px 窄窗口、520px 高窗口、末页居中、放大、键盘及做同款 PASS；Excel 工作表切换 PASS。184 文件 / 1656 项最终回归与类型检查 PASS；最终开发包构建、包内 Office 制作 / PDF 转换、8 个插件源文件与业务资源一致、12 案例 / 64 页哈希、严格签名 PASS；真实模型、原生 Office 编辑保存重开、Windows、Apple 公证 NOT_RUN。

- r5 实现：Word 使用 Kit PDF 导出页面预览，解决 Writer 图片编辑边界造成的公文灰框；会议纪要 DOCX、design.md、Skill 与结构校验器已重写。来源链路已核实为此前称作“Kimi 185”的用户归档，公文 Skill 来自 WorkBuddy。会议案例两页及公文四页目视 PASS；184 文件 / 1652 项全量测试、类型检查、实际 Harness 公文查看 / 会议纪要两页与做同款 PASS；开发包构建、包内原生 Office 制作 / PDF 转换、8 个插件源文件与会议 Skill / 校验器 / 许可一致、12 案例 / 64 页哈希及严格签名 PASS。真实模型、原生 Office 编辑保存重开、Windows、Apple 公证 NOT_RUN。

- r4 样式：依据改版 PPT 的 chooser / input accessory / opening preview 统一分类栏、卡片标题和圆角、模式图标、选中图及预览标题 / 关闭 / 翻页；Word / Excel 保留浅色底板及文档 hover。远端 V0.12.0 SHA 与安装 Harness 0.2.0-rc.2 已重新核实。183 文件 / 1646 测试、类型检查、实际 Harness 几何与选用 / 查看 / 翻页 / 做同款、520px 窄窗口、官方主题静态深色 fixture PASS。r4 构建、包内 Office 制作 / PDF 转换、8 文件源码一致及严格签名 PASS。

- r3 交互：模板区采用与 PPT 相同的 Composer seat 几何，输入框位置稳定；点击卡片直接选用，小眼睛独立查看。Word 浅蓝 / Excel 浅绿背景与圆角文档分层，悬停仅放大前景 4.5%。实际 Harness 面板位置比对、选用 / 查看、Excel 工作表和 520px 窄窗口 PASS；独立深色主题 / 减少动画样式 fixture PASS；183 文件 / 1646 测试、类型检查及构建 PASS。开发包原生 Office 制作 / PDF 转换、8 文件源码一致与严格签名 PASS。

- 基于 `upstream/V0.12.0@35b9f85a`，安装 Harness `0.2.0-rc.2`，分支 `codex/v012-office-templates`。
- 实现 12 个案例和 64 页预览；公文、会议纪要、工作总结、项目方案、预算费用、项目台账、销售报表直接展示。Word 与 PPT 使用一致的案例查看和「做同款」流程；Excel 增加工作表标签。
- r2 记录：案例卡片与输入框选中图共用竖版上 50% / 横版整图的缩略图；选中图宽 112px，输入框展示图片和取消按钮，名称保留在列表及无障碍标签。实际 Harness 裁切、选择、完整预览和 520px 窄窗口 PASS，1644 项全量测试 PASS；r2 开发包构建、包内 Office 制作 / PDF 转换、8 文件源码一致及严格签名 PASS。用户将在 DSH 中用会议原文进行模型生成验收。
- 复用官方 Office Skill、锁定 Python 和 Kit；六个业务 Skill 独立注册。模板复制走真实会话策略、Sandbox/Subprocess、版本哈希和既有审计。
- 类型检查、构建、183 文件 / 1644 项全量测试、23 项 Excel 数值检查及实际 Harness 浏览器交互 PASS。重复 Kit 重算的原生工作簿哈希一致；生成器统一归档时间、元数据和图表轴引用 ID。首次目录加载和重连已按完整响应状态修复并验证。
- 最终 macOS ARM64 开发应用构建 PASS；包内 Office 激活 / 原生文件制作 / PDF 转换、8 个 Office 源文件逐字节一致、严格签名、全部 12 案例真实工具复制和哈希检查通过，包内 Harness 浏览器复测 Word 目录、会议纪要查看及选择。Apple 公证、真实模型、Windows、原生 Office 编辑保存重开 NOT_RUN。WPS 尝试打开独立会议纪要副本，完整原生验收待取得稳定证据。
- 详情见 [实现与验证记录](office-templates-v012.md)。
