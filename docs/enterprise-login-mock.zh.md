# DSH Desktop × BiSheng 本地联调

本地 Mock 实现 `client-api.md` 的 0.4.0 客户端合同，用于验证 DSH 侧的 PKCE 登录、双 Token 轮换、模型列表、SSE 调用、逐模型用量与退出。它不代表 BiSheng/Gateway 后端已经部署，也不计入真实联调验收。

## 启动

```bash
npm run mock:enterprise
```

Mock 仅监听 `127.0.0.1:17860`。使用 DSH Desktop Dev 包，在「设置 → 账号与企业」填写：

```text
http://127.0.0.1:17860
```

正式包只接受 HTTPS。Dev 包通过专用开发开关接受 `127.0.0.1` HTTP，不能连接其他明文地址。

## 测试账号

| 身份 | 账号 | 密码 | 模型 |
| --- | --- | --- | --- |
| 员工 | `alice@demo.bisheng.local` | `WorkBuddy123!` | 毕昇 Mock Chat |
| 管理员 | `admin@demo.bisheng.local` | `Admin123!` | 毕昇 Mock Chat、毕昇 Mock Reasoner |

## 验证步骤

1. 输入 Mock BASE，点击「在浏览器中登录」。
2. 使用测试账号登录并允许授权；浏览器应返回 Desktop。
3. 账号页显示用户、租户、会话到期、模型与本月用量。
4. 在模型选择器中选择毕昇 Mock 模型并发送消息；回复包含“Mock 联调成功”。
5. 点击「刷新模型与用量」，用量应增加。
6. 点击「退出登录」，企业 provider 立即移除，本地加密凭证清空，Mock 会话被撤销。

浏览器回传被拦截时，页面会显示当前 `identity_ticket`。保持 Desktop 当前登录事务不变，将该票据粘贴到账号页完成兑换。

## 证据边界

- 本地自动化与 Mock：可验证 DSH 客户端合同和错误处理。
- 真实 BiSheng/Gateway：仍需逐项执行 `client-api.md` 的 C01–C18，并核对 Nginx 路由、真实模型适配、SSE 超时与服务端日志。
