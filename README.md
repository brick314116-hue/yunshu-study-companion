# 云舒学伴（yunshu）部署与维护说明

> 给下一个维护者：本项目前端 + 云函数都已修通过「登录 → 对话」全流程。下面是所有踩过的坑和部署步骤，**改完代码后务必照做部署，否则线上还是旧逻辑，又会冒出 404 / 401 / CORS 错误**。

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `src/` | 前端源码（Vue3 + Vite + `@cloudbase/js-sdk` v3） |
| `dist/` | 构建产物（已被 `.gitignore` 忽略，**不入库**） |
| `cloudbase-functions/xinyu-chat/` | 云函数源码（部署到 CloudBase 函数名 **`nuwax-chat-proxy`**） |
| `platform-assets/` | 女娲平台资产（`source/` 原始备份、`repaired/` 生产修复版、`legacy/` 历史备份） |
| `docs/` | 项目说明与方案文档（含部署交接文档与方案 Word 设计稿） |
| `docx-build/` | 方案文档生成工程源码与资源 |
| `scripts/` | 工程规范检查与资产生成/校验脚本（`check.mjs` 等） |
| `deploy-package/` | 历史独立打包发布包 |
| `.env` | 本地前端环境变量（已被 `.gitignore` 忽略，**不入库**）；模板见 `.env.example` |
| `cloudbase-functions/xinyu-chat/.env.example` | 云函数环境变量模板（**可入库**） |

## ⚠️ 部署核心铁律（不照做就会复现老问题）

1. **前端 env 必须在构建期注入**
   Vite 在 `npm run build` 时把 `import.meta.env.VITE_*` 硬编码进 JS。在 CloudBase 控制台「上传 dist」时再填环境变量是**无效的**——dist 是成品改不了。务必本地配好 `.env` 再 build。
2. **静态托管上传路径是 `/xueyu`**
   webapps 应用的 `AppPath=/xueyu`，构建后把 `dist/` 整个上传到托管目录 `/xueyu`（不是托管根 `/`，根目录是系统文件）。
3. **云函数必须带 `node_modules` 一起部署**
   函数依赖 `@cloudbase/js-sdk`、`@cloudbase/signature-nodejs`、`ws`。用 CloudBase 工具 `updateFunctionCode` 时，`functionRootPath` 指向包含 `xinyu-chat/` 子目录的**父目录**，函数名填 `nuwax-chat-proxy`。
   `@cloudbase/signature-nodejs` 是 js-sdk 在 Node 端做请求签名的必需依赖（已在 package.json 声明）：云函数环境自带腾讯云临时密钥，js-sdk 检测到密钥后走签名请求路径，缺这个包会在运行时报「缺少依赖 @cloudbase/signature-nodejs」，可能表现为数据库写入静默失败。
4. **改完源码必须重新部署**
   只改本地文件不部署，线上仍是旧逻辑。

## 前端环境变量（`.env`）

```
VITE_CLOUDBASE_ENV_ID=xueou-d7gwem7g2452a7ea3
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CHAT_API_URL=https://xueou-d7gwem7g2452a7ea3-1462770697.ap-shanghai.app.tcloudbase.com/nuwax/api/chat
```

## 云函数环境变量（在 CloudBase 函数配置里设置，**勿入库**）

| 变量 | 作用 |
| --- | --- |
| `CLOUDBASE_ENV_ID` / `CLOUDBASE_REGION` | 环境标识 |
| `CLOUDBASE_DATABASE_INSTANCE` | 文档数据库实例 ID；本项目为 `tnt-nsoau01qw` |
| `CLOUDBASE_DATABASE_NAME` | 数据库名；使用实例默认数据库时留空 |
| `NUWAX_BASE_URL` / `NUWAX_API_KEY` / `NUWAX_AGENT_ID` | 上游智能体接口地址、密钥、Agent ID |
| `NUWAX_SANDBOX_ID` | 可选；从女娲网页端会话使用的沙箱 ID，需固定沙箱时填写 |
| `NUWAX_SKILL_IDS` | 可选；逗号分隔的 Skill ID，网页端手动选择 Skill 时填写 |
| `NUWAX_AGENT_MODE` | 可选；默认 `yolo`，与女娲网页端对话模式保持一致 |
| `NUWAX_REQUEST_TIMEOUT_MS` | 可选；默认 `180000`，范围 30000-240000 |
| `USER_ID_SECRET` | 用于 HMAC 派生 subject_id / 会话文档 id（64 位 hex） |
| `ALLOWED_ORIGIN` | 允许的 CORS 来源，值为前端 webapps 域名 |

> 加 `DEPLOYTS` 之类的时间戳变量可以强制所有实例冷启动，避免旧实例残留（可选）。

## 已知坑（都是真踩过的）

- **用户资料复用聊天网关。** `user_profiles` 的读写请求使用同一个 `/nuwax/api/chat?resource=profile` 地址，由云函数从 Bearer token 取得真实 `uid`；不要另建 `/profile` 前端直连路由，也不要信任浏览器传入的 `userId`。
- **云函数不要自己加 CORS 头。** HTTP 网关已经加了 CORS 响应头；函数再写一份 `Access-Control-Allow-Origin`，浏览器会收到**双份**，直接判定非法 → `Failed to fetch` / CORS 错误。函数内 `sendJson(res, status, body)` 不带 origin 参数，OPTIONS 只返回 204 且不写 CORS 头。
- **网关 `EnablePathTransmission=false`。** 网关会把匹配到的前缀 `/nuwax/api/chat` **剥掉**，函数实际收到的路径是 `/`，不是 `/nuwax/api/chat`。函数路由必须同时匹配 `/`、`/api/chat`、`/nuwax/api/chat`（`isChatPath` 那段）。
- **函数从 Bearer token 解析 uid。** 前端只传 `Authorization: Bearer <token>`，**不传** `x-cloudbase-context`。`authenticatedUserId` 优先读网关注入的 context，读不到则解析 JWT payload 的 `uid / sub / user_id / openid / unionid / id` 字段。
- **`app.auth` 是函数要调用。** `@cloudbase/js-sdk` v3 里 `cloudbase.init(...).auth` 是函数，必须写 `.auth()`，不能取属性 `.auth`，否则报 `auth.then is not a function`。
- **云函数数据库必须绑定实例。** 通过 `CLOUDBASE_DATABASE_INSTANCE=tnt-nsoau01qw` 明确写入控制台当前实例。`agent_sessions` 保持 `ADMINONLY`（安全规则 `read/write=false`）是正常配置，不需要开放客户端权限。
- **女娲 API 与网页端不是同一条会话路径。** 网页端会把 `sandboxId`、`skillIds`、`agentMode` 带给 `/api/v1/chat/{conversationId}`；云函数现在可通过同名 `NUWAX_*` 环境变量传入。未配置固定沙箱时，女娲会按默认沙箱启动，若出现 ACP 初始化超时，应先检查沙箱服务和该 ID，而不是修改 `project_id`。
- **55 秒 504 是代理自己的超时。** 女娲后端 `/computer/chat` 的允许等待时间可到 180 秒，云函数默认等待 180 秒；`project_id=1674213` 是女娲根据会话生成的内部项目 ID，不是本项目配置项。
- **上线后先验新包。** 给 HTTP 函数访问 `/health`（带正式 Origin）应看到 `version=2026-09-12-user-identity-bridge`、`databaseInstance=tnt-nsoau01qw`、`upstreamTimeoutMs=180000`。若不是这三个值，说明仍在运行旧版本或旧实例。
- **仍出现 ACP 初始化超时时的检查顺序。** 先重新登录取得新 Token，再在女娲网页端开发者工具中查看成功对话的 `/api/v1/chat/{conversationId}` 请求；若 payload 有数字 `sandboxId`，把它填入函数环境变量 `NUWAX_SANDBOX_ID`。若无该字段，检查女娲平台的默认沙箱服务状态。`agent_sessions` 和 `user_profiles` 都由函数 Admin SDK 写入，两个表同时为空时只检查函数包、`CLOUDBASE_ENV_ID` 和 `CLOUDBASE_DATABASE_INSTANCE`，不要开放 `agent_sessions` 权限。

## 本地构建 + 部署流程

```bash
# —— 前端 ——
cp .env.example .env          # 填好真实 envId / region / chat api url
npm install
npm run build                 # = vue-tsc -b && vite build，产出 dist/

# 然后用 CloudBase 工具把 dist/ 上传到静态托管 /xueyu

# —— 云函数（源码在 cloudbase-functions/xinyu-chat）——
# 用 CloudBase 工具 updateFunctionCode：
#   functionName = nuwax-chat-proxy
#   functionRootPath = 包含 xinyu-chat/ 的父目录（连同 node_modules 一起传）
# 并在函数配置里设置上面的环境变量
```

> 构建时若遇 `dist/` 清理被安全策略拦截，先把 `dist` 目录整体 `mv` 走（不要 `rm -rf`），再重新 `npm run build`，让 Vite 新建一个干净的 `dist`。

## 验证

- 浏览器访问 `https://xueyu-xueou-d7gwem7g2452a7ea3.webapps.tcloudbase.com/`
- 用已注册账号登录后发消息，应正常回复。
- 控制台不应再出现 404 / 401 / CORS / `auth.then is not a function`。
- 若仍 404：多半是旧 JS 缓存，清缓存强刷；若仍 401：检查网关鉴权开关与函数 `authenticatedUserId` 逻辑。

## 数据表不更新排查（「能对话但 user_profiles / agent_sessions 是空表」）

**先跑自诊断**：浏览器登录后直接访问
`https://xueou-d7gwem7g2452a7ea3-1462770697.ap-shanghai.app.tcloudbase.com/nuwax/api/chat?resource=db-check`
（或已登录状态的页面里 `fetch(VITE_CHAT_API_URL + '?resource=db-check', {headers:{Authorization:'Bearer '+token}})`）。
返回的 JSON 会逐步报告 `profiles-read / sessions-probe-write / sessions-probe-read / sessions-probe-delete` 四步的成败与错误码，同时给出函数实际连接的 `envId / databaseInstance / databaseName`——**先核对这三项和你控制台里看的是否同一个实例**。

按失败步骤对号入座：

| 失败步骤 | 含义 | 处理 |
| --- | --- | --- |
| `envId/instance` 与控制台不一致 | 写入落在另一个环境/实例 | 修正函数环境变量 `CLOUDBASE_ENV_ID`、`CLOUDBASE_DATABASE_INSTANCE` |
| `sessions-probe-write` 失败，错误含 permission / 权限 / signature | 函数内 js-sdk 身份被安全规则拦下，或缺签名依赖 | 确认部署包里含 `@cloudbase/signature-nodejs`（见部署铁律 3）；仍失败则临时把 `agent_sessions` 权限放开为「所有用户可读写」验证链路，再收紧并由函数 Admin 写入 |
| 全部 ok 但控制台仍看不到数据 | 看错了实例/集合 | 用 db-check 返回的 instance 去控制台对应实例找 |

**函数日志关键字**：云函数日志里按 `DB-` 过滤可看到每次 `SESSION-CREATE / SESSION-SAVE-OK / PROFILE-WRITE-OK`；`SESSION-SAVE-OK` 缺失而对话正常，说明会话映射写入失败被容错放行（此时每次发言都会新建女娲会话、上下文丢失），按上表处理根因。

## 会话与会话变量（前端 ↔ 云函数 ↔ 女娲）

- 前端每个本地会话有唯一 `conversationKey`（本地会话 id），云函数按 `HMAC(uid, key)` 在 `agent_sessions` 里一一对应地存女娲 `conversationId`；切换历史对话不会再互相覆盖上下文。
- 云函数每次对话都会把 `subject_id`（uid 的 HMAC 匿名身份）、`display_name`、`consent_version`、`psych_consent`（accepted/declined/unknown）作为会话变量下发给女娲。创建会话和后续聊天请求的 `External-Username` 均使用同一个 `subject_id`，以便女娲平台把系统变量 `USER_UID` 稳定映射到当前网站用户。
- 用户身份桥接链路为：`Authorization: Bearer token` → 云函数解析真实 `uid` → `HMAC(uid, USER_ID_SECRET)` 得到 `subject_id` → 女娲 `External-Username`/`USER_UID` → 数据表系统字段 `uid`。原始 `uid`、openid、unionid、手机号和 access token 不发送给女娲，也不从浏览器请求体读取。
- “我的记录”查询必须使用固定条件 `uid = USER_UID`，不能使用用户消息中的 `owner_uid` 或其他自报身份。`owner_uid` 如为兼容旧工具保留，只能绑定到女娲系统变量 `USER_UID`。
- 女娲侧的情绪/认知/记录增删改查工作流必须检查 `psych_consent=accepted` 且使用当前系统用户身份过滤数据表，declined/unknown 时拒绝并引导学业功能。

### 身份桥接验收

1. 网站账号 A 保存记录后，数据表中的 `uid` 等于 A 的 `subject_id`，不是明文 CloudBase uid。
2. 账号 A 查询“我的记录”时，工作流实际条件为 `uid = USER_UID`，且 `USER_UID` 等于 A 的 `subject_id`。
3. 账号 B 使用同样入口只能得到 B 的记录，不能通过消息中的 `uid`、`owner_uid` 或 `subject_id` 查询 A 的记录。
4. 记录查询工作流必须执行查询并返回结果行，不能只把 `query_sql` 文本返回给智能体；同时保留 `expires_at > current_time` 的 7 天生命周期过滤。
5. 发布后先检查 `/health` 的版本 `2026-09-12-user-identity-bridge`，再使用登录态访问 `?resource=db-check`。
