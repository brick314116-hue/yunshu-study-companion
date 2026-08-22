# 情绪打卡表单功能 · 部署交接文档

> 本文档自包含，可直接交给任何能连接 CloudBase 的部署助手执行。
> 代码改动已全部完成并通过测试（前端 vue-tsc 构建、check.mjs、云函数 3/3 单测）。

## 功能概览

用户在「情绪调节」模块点击"情绪打卡"→ 三步表单（情绪名称 / 强度1-5 / 选填原因）→
云函数 `?resource=mood-checkin`（鉴权 + consent 门禁 + 校验）→
女娲工作流 `POST /api/v1/workflow/{id}/execute` → 写入女娲侧 `mood_checkin` 数据表（7 天过期）。

## 部署任务清单（按顺序）

### 任务 1：女娲平台（网页控制台，需登录）

1. 「组件资源 → 数据表」导入配置：`E:\brick\desktop\yunshu\mood_checkin.table`
   - 确认表创建成功，字段含 `subject_id / mood_type / intensity_self / trigger_summary / expires_at`
2. 「组件资源 → 工作流」导入配置：`E:\brick\desktop\yunshu\表单情绪打卡保存.workflow`
   - 确认只新增 1 个工作流、无 `开始_2`/`结束_2` 重复节点
   - 打开工作流，确认 `mood_checkin` 数据节点的字段绑定完整（5 个映射字段）
3. 试运行（用工作流画布的"试运行"）：
   - 输入 `{emotion_name:"焦虑", intensity:3, trigger_summary:"考试压力", psych_consent:"accepted", subject_id:"test123"}`
   - 预期：`success=true`，去 `mood_checkin` 表确认新增记录、`expires_at` 为 7 天后
   - 反例 `psych_consent:"declined"` → `success=false`
4. **发布工作流**（publishStatus 当前为 Developing，不发布 API 调不通）
5. 左下角「API Key 管理」创建 API Key（`ak-` 开头），授权范围需包含**工作流执行**

### 任务 2：CloudBase 云函数部署

云函数目录：`E:\brick\desktop\yunshu\cloudbase-functions\xinyu-chat\`
线上函数名：`nuwax-chat-proxy`（HTTP 访问型，网关路径 `/nuwax/api/chat`）

1. 部署新版本（BUILD_VERSION = `2026-08-18-agent-action`，剥离 SSE 工具标签噪声 + 抽取 `[[action:xxx]]` 标记为结构化 action）
2. 设置新增环境变量（其余 NUWAX_*/CLOUDBASE_* 环境变量保持现状不动）：

   | 变量 | 值 |
   |---|---|
   | `NUWAX_CHECKIN_WORKFLOW_ID` | `5257662`（女娲平台实际 ID，已确认） |
   | `NUWAX_WORKFLOW_API_KEY` | 任务 1 第 5 步生成的 `ak-` key（不设则回落用 NUWAX_API_KEY） |

3. 依赖无变化（无新增 npm 包）

### 任务 3：前端部署

`E:\brick\desktop\yunshu\` 执行 `npm run build`（已验证通过），按现有静态托管流程发布 `dist/`。

## 女娲智能体提示词约定（重要）

让智能体在回复末尾追加 `[[action:mood-checkin]]` 标记，云函数会自动剥离标记并把 `action: 'mood-checkin'` 透传给前端，前端据此弹打卡表单。

在女娲智能体后台的 system prompt 里加一句类似：

```
当用户表达想做情绪打卡、记录此刻情绪的意图时，简短回应一句引导（如"好，我们打开表单记一下"），并在回复末尾追加 [[action:mood-checkin]] 标记。不要自己保存数据，由前端表单收集。
```

智能体不需要调用保存工作流——数据保存走前端表单 → 云函数 `?resource=mood-checkin` → 女娲工作流执行 API 的确定性链路。

## 部署后验证

1. `GET {网关}/nuwax/api/chat/health` → `version` 应为 `2026-08-17-mood-checkin`
2. 浏览器登录后 `GET {网关}/nuwax/api/chat?resource=db-check` → status ok
3. 真机流程：进入「情绪调节」→ 点「情绪打卡」→ 选情绪+强度 → 确认
   - 已同意使用边界的用户：提示"情绪打卡已保存"
   - 未同意用户：按钮应不可达（前端收起）；直接调接口返回 403
4. 女娲平台 `mood_checkin` 表出现新记录，`subject_id` 为 64 位十六进制 HMAC

## 失败排查

| 现象 | 检查 |
|---|---|
| 接口 503「打卡服务尚未配置」 | `NUWAX_WORKFLOW_API_KEY`/`NUWAX_API_KEY` 是否已设 |
| 接口 502「打卡保存失败」 | 云函数日志过滤 `checkin-workflow`：工作流 ID 是否对、工作流是否已**发布**、表是否已建 |
| 接口 504 | 工作流试运行卡节点（代码节点超时配置 10s） |
| 写表成功但查不到 | 女娲侧确认查询过滤条件用 `subject_id` 而非 `uid` |
