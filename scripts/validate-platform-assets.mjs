import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('E:/DeskBox/documents/我的桌面/yunshu')
const assetRoot = path.join(root, 'platform-assets/repaired')
const workflowDir = path.join(assetRoot, 'workflows')
const tableDir = path.join(assetRoot, 'data-tables')
const promptFile = path.join(assetRoot, 'system-prompt/系统提示词_云舒学伴_身份安全版.txt')
const errors = []
const warnings = []
const checks = []

const pass = (name, detail = '') => checks.push({ name, ok: true, detail })
const fail = (name, detail) => {
  errors.push({ name, detail })
  checks.push({ name, ok: false, detail })
}
const warn = (name, detail) => {
  warnings.push({ name, detail })
  checks.push({ name, ok: 'warning', detail })
}
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const requiredTemplateKeys = [
  'category', 'created', 'creator', 'creatorId', 'description', 'endNode', 'icon', 'id',
  'inputArgs', 'modified', 'name', 'nodes', 'outputArgs', 'publishStatus', 'scope',
  'spaceId', 'startNode', 'systemVariables', 'type',
]
const requiredNodeKeys = ['id', 'type', 'name', 'workflowId', 'nextNodeIds', 'nodeConfig']
const requiredTableNodeKeys = ['description', 'exceptionHandleConfig', 'extension', 'inputArgs', 'name', 'originalTableConfig', 'outputArgs', 'tableFields', 'tableId']
const requiredSystemVariables = ['SYS_USER_ID', 'USER_UID', 'USER_LANG', 'USER_NAME', 'AGENT_ID', 'CONVERSATION_ID', 'REQUEST_ID', 'AGENT_USER_MSG', 'CHAT_CONTEXT']

function collectReferences(node) {
  const config = node.nodeConfig || {}
  const refs = []
  for (const arg of [...(config.inputArgs || []), ...(config.outputArgs || [])]) {
    if (typeof arg.bindValue === 'string') {
      const match = arg.bindValue.match(/^(\d+)\./)
      if (match) refs.push(Number(match[1]))
    }
  }
  for (const branch of config.conditionBranchConfigs || []) {
    for (const arg of branch.conditionArgs || []) {
      for (const side of [arg.firstArg, arg.secondArg]) {
        const match = typeof side?.bindValue === 'string' && side.bindValue.match(/^(\d+)\./)
        if (match) refs.push(Number(match[1]))
      }
    }
  }
  for (const id of config.exceptionHandleConfig?.exceptionHandleNodeIds || []) refs.push(id)
  return refs
}

function validateWorkflow(file) {
  let workflow
  try {
    workflow = readJson(file)
  } catch (error) {
    fail(`workflow:${path.basename(file)}`, `JSON 无法解析：${error.message}`)
    return null
  }
  const t = workflow.templateConfig
  const label = `workflow:${path.basename(file)}`
  if (workflow.type !== 'Workflow' || !t || t.type !== 'Workflow') fail(label, '顶层或 templateConfig.type 不是 Workflow')
  else pass(`${label}:type`)
  for (const key of requiredTemplateKeys) {
    if (!(key in (t || {}))) fail(`${label}:template.${key}`, '缺少真实发布格式要求的字段')
  }
  if (t?.publishStatus !== 'Developing') warn(`${label}:publishStatus`, `当前为 ${t?.publishStatus}，导入前应保持待发布状态`)
  if ('publishDate' in (t || {})) fail(`${label}:publishDate`, '修正版不应伪装成已发布版本')
  const nodes = Array.isArray(t?.nodes) ? t.nodes : []
  if (!nodes.length) {
    fail(`${label}:nodes`, '节点为空')
    return workflow
  }
  const ids = new Set(nodes.map((node) => node.id))
  if (ids.size !== nodes.length) fail(`${label}:nodeIds`, '存在重复节点 ID')
  const workflowId = t.id
  for (const node of nodes) {
    for (const key of requiredNodeKeys) if (!(key in node)) fail(`${label}:node:${node.id}:${key}`, '缺少节点字段')
    if (node.workflowId !== workflowId) fail(`${label}:node:${node.id}:workflowId`, `节点 workflowId=${node.workflowId} 与模板 id=${workflowId} 不一致`)
    for (const next of node.nextNodeIds || []) if (!ids.has(next)) fail(`${label}:node:${node.id}:next`, `引用了不存在的节点 ${next}`)
    for (const ref of collectReferences(node)) if (!ids.has(ref)) fail(`${label}:node:${node.id}:reference`, `绑定引用了不存在的节点 ${ref}`)
    for (const branch of node.nodeConfig?.conditionBranchConfigs || []) {
      for (const next of branch.nextNodeIds || []) if (!ids.has(next)) fail(`${label}:node:${node.id}:branch`, `条件分支引用了不存在的节点 ${next}`)
    }
    if (node.type === 'TableDataAdd' || node.type === 'TableSQL') {
      for (const key of requiredTableNodeKeys) if (!(key in (node.nodeConfig || {}))) fail(`${label}:node:${node.id}:${key}`, '表节点缺少真实归档字段')
      try {
        if (typeof node.nodeConfig.originalTableConfig !== 'string') throw new Error('originalTableConfig 不是字符串')
        JSON.parse(node.nodeConfig.originalTableConfig)
      } catch (error) {
        fail(`${label}:node:${node.id}:originalTableConfig`, error.message)
      }
      if (!Number.isSafeInteger(Number(node.nodeConfig.tableId))) fail(`${label}:node:${node.id}:tableId`, 'tableId 不是安全整数')
      if (!Array.isArray(node.nodeConfig.tableFields) || !node.nodeConfig.tableFields.length) fail(`${label}:node:${node.id}:tableFields`, 'tableFields 为空')
    }
  }
  if (!t.startNode || !ids.has(t.startNode.id)) fail(`${label}:startNode`, 'startNode 不在 nodes 中')
  if (!t.endNode || !ids.has(t.endNode.id)) fail(`${label}:endNode`, 'endNode 不在 nodes 中')
  if (t.startNode && !deepEqual(t.startNode, nodes.find((node) => node.id === t.startNode.id))) fail(`${label}:startNodeCopy`, 'startNode 与 nodes 中副本不一致')
  if (t.endNode && !deepEqual(t.endNode, nodes.find((node) => node.id === t.endNode.id))) fail(`${label}:endNodeCopy`, 'endNode 与 nodes 中副本不一致')
  const systemNames = new Set((t.systemVariables || []).map((item) => item.name))
  for (const name of requiredSystemVariables) if (!systemNames.has(name)) fail(`${label}:system:${name}`, '缺少标准女娲系统变量')
  if (t.startNode?.nodeConfig?.inputArgs?.some((arg) => arg.name === 'owner_uid')) fail(`${label}:owner_uid`, 'Start 仍暴露普通 owner_uid 身份输入')
  pass(`${label}:structure`, `workflowId=${workflowId}, nodes=${nodes.length}`)
  return workflow
}

const workflowFiles = fs.existsSync(workflowDir) ? fs.readdirSync(workflowDir).filter((file) => file.endsWith('.workflow')).sort() : []
if (workflowFiles.length !== 8) fail('workflow:file-count', `期望 8 个修正版工作流，实际 ${workflowFiles.length}`)
const workflowMap = Object.fromEntries(workflowFiles.map((file) => [file, validateWorkflow(path.join(workflowDir, file))]))
const ids = workflowFiles.map((file) => workflowMap[file]?.templateConfig?.id).filter(Boolean)
if (new Set(ids).size !== ids.length) fail('workflow:unique-ids', '修正版 workflowId 不唯一')
else pass('workflow:unique-ids')

function nodesOf(file) {
  return workflowMap[file]?.templateConfig?.nodes || []
}
function hasUserSql(file, fragment) {
  return nodesOf(file).some((node) => typeof node.nodeConfig?.sql === 'string' && node.nodeConfig.sql.includes(fragment))
}
function checkNoOwnerInput(file) {
  const inputs = workflowMap[file]?.templateConfig?.inputArgs || []
  if (inputs.some((arg) => arg.name === 'owner_uid')) fail(`workflow:${file}:owner_uid`, '模板输入仍包含 owner_uid')
}

for (const file of ['记录查询_网站用户版.workflow', 'E1_近7天事实查询_网站用户版.workflow']) {
  const nodes = nodesOf(file)
  const sqlNodes = nodes.filter((node) => node.type === 'TableSQL')
  if (!sqlNodes.length) fail(`workflow:${file}:query-nodes`, '没有真实 TableSQL 查询节点')
  for (const node of sqlNodes) {
    if (!node.nodeConfig.sql.includes("uid = '[USER_UID]'")) fail(`workflow:${file}:node:${node.id}:uid`, '查询 SQL 没有固定使用 [USER_UID]')
    if (!node.nodeConfig.sql.includes('[current_time]') && !node.nodeConfig.sql.includes('[end_time]')) fail(`workflow:${file}:node:${node.id}:expiry`, '查询 SQL 没有有效期条件')
    if (node.nodeConfig.sql.includes('${')) fail(`workflow:${file}:node:${node.id}:template`, 'SQL 使用了平台不支持的 ${} 模板')
  }
  checkNoOwnerInput(file)
  pass(`workflow:${file}:identity`, `TableSQL=${sqlNodes.length}`)
}

const deleteFile = '数据管理_用户删除_网站用户版.workflow'
checkNoOwnerInput(deleteFile)
for (const table of ['mood_log', 'study_tasks', 'cognitive_practice']) {
  if (!hasUserSql(deleteFile, `DELETE FROM ${table} WHERE uid = '[USER_UID]'`)) fail(`workflow:${deleteFile}:${table}`, '删除 SQL 未固定到 [USER_UID]')
}
pass(`workflow:${deleteFile}:identity`)

const updateFile = '学业任务状态更新_网站用户版.workflow'
checkNoOwnerInput(updateFile)
const updateCode = nodesOf(updateFile).find((node) => node.name === '生成更新参数')?.nodeConfig?.codePython || ''
if (!updateCode.includes("AND uid = '[USER_UID]'")) fail(`workflow:${updateFile}:identity`, '任务更新 SQL 没有 uid = [USER_UID] 条件')
else pass(`workflow:${updateFile}:identity`)

const formFile = workflowMap['表单情绪打卡保存_网站用户版.workflow']
const formAdd = nodesOf('表单情绪打卡保存_网站用户版.workflow').find((node) => node.type === 'TableDataAdd')
if (formAdd?.nodeConfig?.inputArgs?.some((arg) => arg.key === 'subject_id' || arg.name === 'subject_id')) fail('workflow:form:subject_id-input', '表单仍接受外部 subject_id 输入')
else pass('workflow:form:subject_id-input')

const tableFiles = fs.existsSync(tableDir) ? fs.readdirSync(tableDir).filter((file) => file.endsWith('.table')).sort() : []
if (tableFiles.length !== 4) fail('table:file-count', `期望 4 个修正版数据表，实际 ${tableFiles.length}`)
const expectedTables = { cognitive_practice: 4142, mood_checkin_1: 4337, mood_log: 4140, study_tasks: 4141 }
for (const file of tableFiles) {
  let table
  try { table = readJson(path.join(tableDir, file)) } catch (error) { fail(`table:${file}`, `JSON 无法解析：${error.message}`); continue }
  const t = table.templateConfig
  const name = file.replace('_网站用户版.table', '')
  if (table.type !== 'Table' || !t) fail(`table:${file}:type`, '不是完整 Table 导出结构')
  if (expectedTables[name] !== t?.id) fail(`table:${file}:id`, `tableId=${t?.id} 与期望 ${expectedTables[name]} 不一致`)
  const fields = t?.fieldList || []
  const uid = fields.find((field) => field.fieldName === 'uid')
  if (!uid || uid.nullableFlag !== -1 || uid.systemFieldFlag !== 1) fail(`table:${file}:uid`, 'uid 不是必填系统字段')
  else pass(`table:${file}:uid`)
  if (name === 'mood_checkin_1') {
    const subject = fields.find((field) => field.fieldName === 'subject_id')
    if (!subject || subject.nullableFlag !== 1 || subject.systemFieldFlag !== -1) fail(`table:${file}:subject_id`, 'subject_id 不符合可选兼容字段约束')
  } else if (fields.some((field) => field.fieldName === 'subject_id')) {
    fail(`table:${file}:subject_id`, '非打卡表不应新增第二套身份字段')
  }
  pass(`table:${file}:structure`, `tableId=${t?.id}, fields=${fields.length}`)
}

if (!fs.existsSync(promptFile)) fail('prompt:file', '优化后的系统提示词不存在')
else {
  const prompt = fs.readFileSync(promptFile, 'utf8')
  for (const phrase of ['USER_UID', 'External-Username', 'uid = \'[USER_UID]\'', '不向用户索要或复述内部用户标识', '保存工作流真实执行成功', '危机安全门优先']) {
    if (!prompt.includes(phrase)) fail(`prompt:${phrase}`, '提示词缺少关键规则')
  }
  pass('prompt:contract')
}

const report = {
  generatedAt: new Date().toISOString(),
  source: {
    workflows: 'E:/wechat/xwechat_files/wxid_imxr25jxekyu22_26cd/msg/file/2026-09/工作流.zip',
    tables: 'E:/wechat/xwechat_files/wxid_imxr25jxekyu22_26cd/msg/file/2026-09/数据表.zip',
  },
  errors,
  warnings,
  checks,
  summary: { errors: errors.length, warnings: warnings.length, checks: checks.length },
}
fs.writeFileSync(path.join(assetRoot, 'validate-report.json'), JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report.summary, null, 2))
if (errors.length) process.exitCode = 1
