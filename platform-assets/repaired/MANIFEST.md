# 云舒学伴女娲平台修正版资产

生成时间：2026-09-14 11:57:04

## 来源

- 工作流源：`E:/wechat/xwechat_files/wxid_imxr25jxekyu22_26cd/msg/file/2026-09/工作流.zip`
- 数据表源：`E:/wechat/xwechat_files/wxid_imxr25jxekyu22_26cd/msg/file/2026-09/数据表.zip`
- 原始文件未覆盖；本目录是待导入、待发布的修正版。

## 身份契约

- 网站云函数从 Bearer token 解析用户并生成 HMAC `subject_id`。
- 女娲通过 `External-Username` 将该值映射到系统变量 `USER_UID`。
- 四张数据表的归属字段统一为系统字段 `uid`。
- 查询、删除、任务更新的 SQL 使用 `[USER_UID]`，不接受 `owner_uid` 作为授权输入。
- `mood_checkin_1.subject_id` 仅保留为兼容字段，不是授权或查询键。

## 修正版工作流

| 文件 | 原 workflowId | 新 workflowId | 用途 |
| --- | ---: | ---: | --- |
| 情绪保存_网站用户版.workflow | 5257687 | 5258503 | save |
| 学业任务保存_网站用户版.workflow | 5257686 | 5258504 | save |
| ABC练习保存_网站用户版.workflow | 5257688 | 5258505 | save |
| 表单情绪打卡保存_网站用户版.workflow | 5257662 | 5258506 | save |
| 数据管理_用户删除_网站用户版.workflow | 5257901 | 5258507 | delete |
| 学业任务状态更新_网站用户版.workflow | 5257641 | 5258508 | update |
| 记录查询_网站用户版.workflow | 5257645 | 5258501 | query |
| E1_近7天事实查询_网站用户版.workflow | 5257646 | 5258502 | query |

## 修正版数据表

| 文件 | tableId | 来源 |
| --- | ---: | --- |
| cognitive_practice_网站用户版.table | 4142 | cognitive_practice.table |
| mood_checkin_1_网站用户版.table | 4337 | mood_checkin_1.table |
| mood_log_网站用户版.table | 4140 | mood_log.table |
| study_tasks_网站用户版.table | 4141 | study_tasks.table |

## 导入顺序

1. 核对/导入四张数据表；不要新建重复表。
2. 导入修正版工作流，确认状态为 Developing 后逐个发布。
3. 将女娲 Agent 工具重新绑定到新的记录查询、E1、保存、删除和更新 workflowId。
4. 替换系统提示词为 `system-prompt/系统提示词_云舒学伴_身份安全版.txt`。
5. 用两个网站账号执行跨用户隔离验收。

## 必测场景

- 账号 A 保存后，A 能查询到自己的记录。
- 账号 B 查询不到 A 的记录。
- 在消息中伪造 A 的 uid/owner_uid/subject_id 不改变查询归属。
- A 删除只删除 A 的记录。
- A 不能更新 B 的任务。
- 过期记录不返回。
- consent 为 unknown/declined 时不调用记录类工作流。

## 重要限制

- 原始归档没有真实 TableDataQuery 节点；本修正版使用已验证的 TableSQL 节点结构。
- 资产生成不会自动发布到女娲平台；发布和工具重绑定必须在平台侧完成。
