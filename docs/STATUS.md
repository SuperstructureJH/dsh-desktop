# Office 功能实施与验证状态

更新日期：2026-09-11。独立 PR 分支基于上游 main `f7aebb5`。

## 已实施

- 新会话输入框上方提供 Word、Excel 与 PPT 模式；共享持久化、串行化和审计的会话状态，切换后按所选格式加载基础 Skill。
- 内置 DSH 自有 Word / Excel 基础 Skill、186 个业务 Skill 和 17 个工作区工具；业务资源按需读取并核验哈希，原始条款及出处保留。
- 支持文档和工作簿创建、版本绑定的局部修改、公式重算、检查与 PDF 预览。macOS 使用 Seatbelt 开发沙箱，Linux 运行路径要求 bubblewrap；执行时使用独立任务目录及声明的输入副本。
- Word 三例：现制咖啡市场调研、小米汽车研究、中国中车质量安全月通知。Excel 三例：年度经营与客户分析、港口货物流向与作业效率、荧光酶活性筛选与批次质控。卡片打开只读预览；Word 按页滚动，Excel 支持切 Sheet 与连续滚动。年度经营案例原件及全部预览已统一纯白背景。
- macOS arm64 开发包可显式装入 Python/openpyxl 与 LibreOffice；提供运行时装配和完整包验证脚本。

## 验证证据

| 检查 | 状态与范围 |
| --- | --- |
| 干净依赖安装 | PASS：当前锁文件 npm ci，20 个补丁全部应用 |
| 自动回归 | PASS：99 个文件、848 项测试；包含真实 Office 沙箱生成、编辑、重算、预览与隔离检查 |
| 类型与构建 | PASS：npm run typecheck、npm run build |
| 模式切换资源 | PASS：PPT 包变动限于模式状态、客户端同步与类型；192 项预览清单语义一致，其余包内资源字节一致 |
| Office 制品一致性 | PASS：PR 的运行代码、Skill、原件及预览与用户已验收的 macOS 包逐字节一致；两份 README 同步最新案例 |
| 打包工具链 | PASS：PR 的三个插件装入已验证 macOS 运行时包，加载 188 个 Skill、678 个业务资源与 17 个工具；五个可执行/可修改案例及基础读写链路通过 |
| Desktop 原生界面 | PASS：已验收包的案例封面、白底预览、切 Sheet、上下滚动和关闭返回；截图随证据存档 |

结构化证据与截图见 [office-acceptance](office-acceptance/)。已验收测试包 SHA-256：`544be60cf9cfa69207e732cae34d04c167aa6039bd1208eb6cc295479348578a`。

## 独立验收边界

本轮交付范围为 macOS 开发链路。Windows 作者代码隔离、Linux 实机、生产资源配额、目标模型自主完成、原生 Word/Excel/WPS 编辑保存重开、Developer ID 签名及 Apple 公证均需各自的验收证据。包内工具验证与 Desktop 界面验证分别记录。
