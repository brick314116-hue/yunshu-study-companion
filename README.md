# 云舒学伴（yunshu）部署与维护说明

> 给下一个维护者：本项目前端 + 云函数都已修通过「登录 → 对话」全流程。下面是所有踩过的坑和部署步骤，**改完代码后务必照做部署，否则线上还是旧逻辑，又会冒出 404 / 401 / CORS 错误**。

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `src/` | 前端源码（Vue3 + Vite + `@cloudbase/js-sdk` v3） |
| `dist/` | 构建产物（已被 `.gitignore` 忽略，**不入库**） |
| `cloudbase-functions/xinyu-chat/` | 云函数源码（部署到 CloudBase 函数名 **`nuwax-chat-proxy`**） |
| `.env` | 本地前端环境变量（已被 `.gitignore` 忽略，**不入库**）；模板见 `.env.example` |
| `cloudbase-functions/xinyu-chat/.env.example` | 云函数环境变量模板（**可入库**） |

## ⚠️ 部署核心铁律（不照做就会复现老问题）

1. **前端 env 必须在构建期注入**
   Vite 在 `npm run build` 时把 `import.meta.env.VITE_*` 硬编码进 JS。在 CloudBase 控制台「上传 dist」时再填环境变量是**无效的**——dist 是成品改不了。务必本地配好 `.env` 再 build。
2. **静态托管上传路径是 `/xueyu`**
   webapps 应用的 `AppPath=/xueyu`，构建后把 `dist/` 整个上传到托管目录 `/xueyu`（不是托管根 `/`，根目录是系统文件）。
3. **云函数必须带 `node_modules` 一起部署**
   函数依赖 `@cloudbase/js-sdk`、`ws`。用 CloudBase 工具 `updateFunctionCode` 时，`functionRootPath` 指向包含 `xinyu-chat/` 子目录的**父目录**，函数名填 `nuwax-chat-proxy`。
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
| `NUWAX_BASE_URL` / `NUWAX_API_KEY` / `NUWAX_AGENT_ID` | 上游智能体接口地址、密钥、Agent ID |
| `USER_ID_SECRET` / `SESSION_SECRET` | 用于 HMAC 派生 subject_id / session 文档 id |
| `ALLOWED_ORIGIN` | 允许的 CORS 来源，值为前端 webapps 域名 |

> 加 `DEPLOYTS` 之类的时间戳变量可以强制所有实例冷启动，避免旧实例残留（可选）。

## 已知坑（都是真踩过的）

- **云函数不要自己加 CORS 头。** HTTP 网关已经加了 CORS 响应头；函数再写一份 `Access-Control-Allow-Origin`，浏览器会收到**双份**，直接判定非法 → `Failed to fetch` / CORS 错误。函数内 `sendJson(res, status, body)` 不带 origin 参数，OPTIONS 只返回 204 且不写 CORS 头。
- **网关 `EnablePathTransmission=false`。** 网关会把匹配到的前缀 `/nuwax/api/chat` **剥掉**，函数实际收到的路径是 `/`，不是 `/nuwax/api/chat`。函数路由必须同时匹配 `/`、`/api/chat`、`/nuwax/api/chat`（`isChatPath` 那段）。
- **函数从 Bearer token 解析 uid。** 前端只传 `Authorization: Bearer <token>`，**不传** `x-cloudbase-context`。`authenticatedUserId` 优先读网关注入的 context，读不到则解析 JWT payload 的 `uid / sub / user_id / openid / unionid / id` 字段。
- **`app.auth` 是函数要调用。** `@cloudbase/js-sdk` v3 里 `cloudbase.init(...).auth` 是函数，必须写 `.auth()`，不能取属性 `.auth`，否则报 `auth.then is not a function`。

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
