# Word / Excel 案例与官方 Harness 集成

本次在 `codex/v012-office-templates` 实现 Word、Excel 的案例入口、逐页查看和「做同款」。常用办公内容直接展示在模板列表，用户选择案例后，Agent 获得对应业务方法、官方 Office Skill 和可编辑工作副本。

## 基线与来源

- Desktop：远端 `upstream/V0.12.0@35b9f85ae06d6b19faa070b1c32f5f631bb474a2`。
- 安装的官方 Harness：`0.2.0-rc.2`；源码标签 `dsh-v0.2.0-rc.2@639ed015397290b3745d163aafe02ffee4aa3f84`。官方 Office 依赖、服务注入、工具和客户端协议均按该版本接入。
- 原 Word / Excel PR：#387、#424 均 CLOSED，合并时间为空。复用 #424 的 `08fe8ce64db6e30ebc701be8120fd4aca2ec0c2e` 中六个案例原始文件和六个业务 Skill。
- 官方 Office / 离线 Python 已由 #649 进入 V0.12.0；本次复用现有安装级运行时和 `@deepseek-ai/libreoffice-kit@0.1.3`。Python 3.12.14、python-docx、openpyxl 等依赖继续使用仓库锁定版本。
- 工作树：`.worktrees/dsh-desktop-v012-office-templates`。相邻 PPT 验收和旧 Office 工作树保持原状态。

## 外显案例

| 格式 | 常用办公 | 专业案例 |
| --- | --- | --- |
| Word | 公文写作 · 通知、通用会议纪要、工作总结、项目方案 | 中国现制咖啡市场调研报告、小米汽车研究报告 |
| Excel | 预算与费用表、项目任务台账、销售数据报表 | 年度经营与客户分析、青岚港货物流向与作业效率、荧光酶活性筛选与批次质控 |

共 12 个案例、64 页预览。六个常用新案例通过维护的 Python 生成器制作；六个旧案例以原生 DOCX/XLSX、设计说明和登记的输入材料为权威源。业务方法包含公文写作、会议纪要、研究写作、经营指标、数据质量和数据图表。示例事实与用户本次材料分别标识，缺失字段使用待确认。

Word 沿用 PPT 的交互：案例卡片 → 预览弹窗 → 翻页 →「做同款」。增加适合页面 / 放大阅读，支持键盘翻页和 Esc 关闭。Excel 使用同一交互，并按工作表切换预览。模板选择随会话保存；Word、Excel、PPT 共用已有 Host 状态和审计层，切换输出格式时清理前一格式的模板选择。

客户端以完整响应记录目录的加载完成状态；首次请求期间连接重置、重连及 PPT 切换均取消旧请求并读取当前目录。已选择的输出格式继续保留，初始空状态与有效目录分别处理。

## 依赖与执行路径

`dsh-desktop-office` 保留官方 `office-docx`、`office-xlsx`、`office-pptx`，通过独立的 `dsh-desktop-office-business` provider 加入业务方法。客户端使用公开 Slots、Locale、Connection；Host 在已鉴权的 Connection 通道注册精确 Office 路由。模板目录保留完整 SHA-256 与版本，预览和选择都校验当前版本。

Agent 每一步从当前会话恢复格式和案例上下文，覆盖压缩、恢复及任务中途选择。`office_template` 工具校验所选版本、当前工作区写入策略和调用取消信号，通过官方 Sandbox/Subprocess 执行固定资源复制器，在工作区创建独立目录。复制完成核对文件哈希，并记录审计事件。后续制作由官方 Skill、安装级 Python 和 Kit 完成，最终通过 `present` 交付。

模板预览由相同的官方 Kit 重算、渲染原生文件后生成，全部资源放在安装目录的 `office-runtime/templates`；业务 Skill 放在 `office-runtime/business-skills`。dev、build、pretest、package 统一调用 `office:prepare`；生成的预览、清单和缓存位于忽略的 `.build`。Git 维护原始输入、生成器、客户端、Host 和测试。

生成器统一 ZIP 顺序、时间和文件元数据，并把 Kit 分配的随机图表轴 ID 映射为稳定的局部 ID，完整保留轴引用关系。重复官方重算的哈希检查覆盖该契约。

本次迁移范围为案例与对应业务方法。旧 PR 的全部 186 个业务 Skill、17 个独立编辑工具及旧 Windows 运行时保留在原 PR；此分支采用官方文件制作、重算与预览依赖。

## 验证记录

| 验证 | 状态 | 证据 |
| --- | --- | --- |
| 类型检查 | PASS | `npm run typecheck` |
| 构建 | PASS | `npm run build` |
| 全量回归 | PASS | 183 个文件、1644 项测试，含真实 Harness、工作区沙箱复制、重复重算的稳定哈希及首次目录加载 / 重连 |
| 案例资源 | PASS | 12 份原生文件、64 页预览完整哈希、ZIP CRC |
| Excel 数值 / 原生结构 | PASS | 23 项独立数值核对；公式错误为 0，图表和原有冻结位置保留 |
| 实际 Harness 浏览器 | PASS | Word 案例、会议纪要翻页与选择、刷新恢复、Excel 工作表切换、Esc、Excel→PPT→Word |
| macOS ARM64 开发应用 | PASS | 最终包内 12 案例 / 6 业务 Skill / 官方运行时；原生制作与转换、8 个 Office 源文件逐字节一致、严格签名、全部 12 案例真实工具复制与哈希核对；包内 Harness 浏览器复测 Word 目录、会议纪要预览和选择 |
| 真实模型生成 | NOT_RUN | 当前验证使用真实 Host 和工具，模型调用单独验收 |
| 原生 Word/WPS/Excel 编辑、保存、重开 | NOT_RUN | 独立于 Kit 预览和文件结构检查 |
| Windows / macOS x64 安装 | NOT_RUN | 需各自原生构建与验收环境 |

Kit 报告部分字体缺失，现有中文页面已目视检查。目标系统字体与原生 Office 排版保真需在安装后的 Word/WPS 中继续验收。发布、公证及 PR 合并分别记录。

WPS 使用独立临时副本尝试打开会议纪要，原生窗口短暂显示文件名，随后回到原文档窗口；本次未取得稳定查看、编辑、保存与重开的完整证据。原生 Office 验收继续保持 `NOT_RUN`。开发应用采用 Apple Development 签名，Apple 公证 `NOT_RUN`；实际 Harness 联验使用独立临时 Profile，测试与用户已有数据分开。
