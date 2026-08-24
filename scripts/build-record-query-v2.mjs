#!/usr/bin/env node
// 生成「记录查询_修正版.workflow」：
// 与旧版的区别——旧版只回传 query_sql，逼智能体补发 TABLE_SQL_EXECUTE（大段代码）；
// 修正版在工作流内部用 TableDataQuery 直接执行查询，只把结果行回传给智能体。
// 结构: 开始 → 校验+时间 → 类型路由(条件) → 3×TableDataQuery → 结果归并 → 结束
import { readFileSync, writeFileSync } from 'node:fs'

const D = 'E:/brick/desktop/'
// 从三个模板里提取 TableDataQuery 节点配置（含 tableId / originalTableConfig / outputArgs / tableFields）
const extract = (file) => {
  const wf = JSON.parse(readFileSync(D + file, 'utf8'))
  const node = wf.templateConfig.nodes.find((n) => n.type === 'TableDataQuery')
  return node.nodeConfig
}
const qMoodCfg = extract('测试.workflow')     // mood_log 4140
const qStudyCfg = extract('测试1.workflow')  // study_tasks 4141
const qCogCfg = extract('测试2.workflow')    // cognitive_practice 4142

const NOW = '2026-08-22 19:00:00'
const SPACE = 53260800
const WF_ID = 5258500
const ID = { start: 5326001, validate: 5326002, route: 5326003, mood: 5326004, study: 5326005, cog: 5326006, merge: 5326007, end: 5326008 }

const exc = (timeout = 180) => ({ exceptionHandleNodeIds: [], exceptionHandleType: 'INTERRUPT', retryCount: 0, specificContent: {}, timeout })
const base = (id, type, name, desc) => ({
  created: NOW, modified: NOW, id, type, name, description: desc,
  nextNodeIds: [], nextNodes: [], preNodes: [], spaceId: SPACE,
  virtualExecute: false, unreachableNextNodeIds: [], innerEndNode: false, workflowId: WF_ID,
})

// 过滤条件: uid == owner_uid 且 expires_at > current_time
const filters = (startId, timeRef) => ([
  {
    compareType: 'EQUAL',
    firstArg: { bindValue: 'uid', dataType: 'String', enable: true, require: false, systemVariable: false },
    secondArg: { bindValue: `${startId}.owner_uid`, bindValueType: 'Reference', dataType: 'String', enable: true, name: 'owner_uid', require: false, systemVariable: false },
  },
  {
    compareType: 'GREATER',
    firstArg: { bindValue: 'expires_at', dataType: 'String', enable: true, require: false, systemVariable: false },
    secondArg: { bindValue: timeRef, bindValueType: 'Reference', dataType: 'String', enable: true, name: 'current_time', require: false, systemVariable: false },
  },
])

const queryNode = (id, name, cfg, startId, timeRef) => ({
  ...base(id, 'TableDataQuery', name, cfg.description),
  nextNodeIds: [ID.merge],
  nodeConfig: { ...cfg, conditionArgs: filters(startId, timeRef), limit: 20, exceptionHandleConfig: exc() },
})

const startNode = {
  ...base(ID.start, 'Start', '开始', '接收查询类型/用户标识/条数上限'),
  nextNodeIds: [ID.validate],
  nodeConfig: {
    exceptionHandleConfig: exc(), extension: { x: 30, width: 220, y: 0, height: 44 },
    inputArgs: [
      { bindValue: '', bindValueType: 'Input', dataType: 'String', description: '查询类型：mood/study_task/cognitive_practice', enable: true, name: 'query_type', require: true, systemVariable: false },
      { bindValue: '', bindValueType: 'Input', dataType: 'String', description: '用户标识，建议在UI改绑系统变量 USER_UID', enable: true, name: 'owner_uid', require: true, systemVariable: false },
      { bindValue: '', bindValueType: 'Input', dataType: 'Integer', description: '返回条数上限', enable: true, name: 'limit', require: false, systemVariable: false },
    ],
  },
}

const validateNode = {
  ...base(ID.validate, 'Code', '校验与时间', '校验参数并生成当前UTC时间'),
  nextNodeIds: [ID.route],
  nodeConfig: {
    exceptionHandleConfig: exc(60), extension: { x: 300, width: 220, y: 0, height: 79 },
    codeLanguage: 'Python',
    codeJavaScript: 'export default async function main(args){return {}}',
    codePython: `# -*- coding: utf-8 -*-
from datetime import datetime

def scalar(v, d=None):
    if isinstance(v, (list, tuple)):
        return v[0] if v else d
    return d if v is None else v

def main(query_type="", owner_uid="", limit=10):
    if isinstance(query_type, dict):
        i = query_type
        query_type = i.get("query_type", ""); owner_uid = i.get("owner_uid", ""); limit = i.get("limit", 10)
    query_type = str(scalar(query_type, "") or "").strip()
    owner_uid = str(scalar(owner_uid, "") or "").strip()
    if not owner_uid:
        return {"valid": False, "error_message": "缺少用户标识", "current_time": ""}
    if query_type not in ("mood", "study_task", "cognitive_practice"):
        return {"valid": False, "error_message": "查询类型非法", "current_time": ""}
    return {"valid": True, "error_message": "", "current_time": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")}
`,
    inputArgs: [
      { bindValue: `${ID.start}.query_type`, bindValueType: 'Reference', dataType: 'String', enable: true, name: 'query_type', require: false, systemVariable: false },
      { bindValue: `${ID.start}.owner_uid`, bindValueType: 'Reference', dataType: 'String', enable: true, name: 'owner_uid', require: false, systemVariable: false },
      { bindValue: `${ID.start}.limit`, bindValueType: 'Reference', dataType: 'Integer', enable: true, name: 'limit', require: false, systemVariable: false },
    ],
    outputArgs: [
      { bindValue: '', bindValueType: 'Input', dataType: 'Boolean', enable: true, name: 'valid', require: false, systemVariable: false },
      { bindValue: '', bindValueType: 'Input', dataType: 'String', enable: true, name: 'error_message', require: false, systemVariable: false },
      { bindValue: '', bindValueType: 'Input', dataType: 'String', enable: true, name: 'current_time', require: false, systemVariable: false },
    ],
  },
}

const refOf = (nodeId, name, dt) => ({ bindValue: `${nodeId}.${name}`, bindValueType: 'Reference', dataType: dt, enable: true, name, require: false, systemVariable: false })

const routeNode = {
  ...base(ID.route, 'Condition', '类型路由', '按 query_type 路由到对应表查询'),
  nextNodeIds: [ID.mood, ID.study, ID.cog],
  nodeConfig: {
    exceptionHandleConfig: exc(), extension: { x: 600, width: 300, y: -40, height: 151 },
    inputArgs: [], outputArgs: [],
    conditionBranchConfigs: [
      { branchType: 'IF', conditionType: 'AND', nextNodeIds: [ID.mood], uuid: 'rq-route-mood',
        conditionArgs: [{ compareType: 'EQUAL', firstArg: refOf(ID.start, 'query_type', 'String'), secondArg: { bindValue: 'mood', bindValueType: 'Input', dataType: 'String', enable: true, require: false, systemVariable: false } }] },
      { branchType: 'ELSE_IF', conditionType: 'AND', nextNodeIds: [ID.study], uuid: 'rq-route-study',
        conditionArgs: [{ compareType: 'EQUAL', firstArg: refOf(ID.start, 'query_type', 'String'), secondArg: { bindValue: 'study_task', bindValueType: 'Input', dataType: 'String', enable: true, require: false, systemVariable: false } }] },
      { branchType: 'ELSE', conditionType: 'AND', nextNodeIds: [ID.cog], uuid: 'rq-route-cog', conditionArgs: [] },
    ],
  },
}

const timeRef = `${ID.validate}.current_time`
const moodNode = queryNode(ID.mood, 'mood_log', qMoodCfg, ID.start, timeRef)
const studyNode = queryNode(ID.study, 'study_tasks', qStudyCfg, ID.start, timeRef)
const cogNode = queryNode(ID.cog, 'cognitive_practice', qCogCfg, ID.start, timeRef)

const mergeNode = {
  ...base(ID.merge, 'Code', '结果归并', '取非空的查询结果并序列化为文本'),
  nextNodeIds: [ID.end],
  nodeConfig: {
    exceptionHandleConfig: exc(60), extension: { x: 1250, width: 220, y: 0, height: 79 },
    codeLanguage: 'Python',
    codeJavaScript: 'export default async function main(args){return {}}',
    codePython: `# -*- coding: utf-8 -*-
import json

def as_list(v):
    if isinstance(v, dict):
        return [v]
    if isinstance(v, (list, tuple)):
        return list(v)
    return []

def main(mood_list=None, study_list=None, cog_list=None, error_message=""):
    if isinstance(mood_list, dict) and "mood_list" in mood_list:
        i = mood_list
        mood_list, study_list, cog_list = i.get("mood_list"), i.get("study_list"), i.get("cog_list")
        error_message = i.get("error_message", error_message)
    rows = as_list(mood_list) or as_list(study_list) or as_list(cog_list)
    text = json.dumps(rows, ensure_ascii=False) if rows else ""
    return {"records_text": text, "count": len(rows), "error_message": "" if rows else (error_message or "无记录")}
`,
    inputArgs: [
      { ...refOf(ID.mood, 'outputList', 'Array_Object'), name: 'mood_list' },
      { ...refOf(ID.study, 'outputList', 'Array_Object'), name: 'study_list' },
      { ...refOf(ID.cog, 'outputList', 'Array_Object'), name: 'cog_list' },
      refOf(ID.validate, 'error_message', 'String'),
    ],
    outputArgs: [
      { bindValue: '', bindValueType: 'Input', dataType: 'String', enable: true, name: 'records_text', require: false, systemVariable: false },
      { bindValue: '', bindValueType: 'Input', dataType: 'Number', enable: true, name: 'count', require: false, systemVariable: false },
      { bindValue: '', bindValueType: 'Input', dataType: 'String', enable: true, name: 'error_message', require: false, systemVariable: false },
    ],
  },
}

const endNode = {
  ...base(ID.end, 'End', '结束', '返回查询结果文本'),
  nodeConfig: {
    exceptionHandleConfig: exc(), extension: { x: 1550, width: 220, y: 0, height: 44 }, returnType: 'VARIABLE',
    outputArgs: [
      refOf(ID.merge, 'records_text', 'String'),
      refOf(ID.merge, 'count', 'Number'),
      refOf(ID.merge, 'error_message', 'String'),
    ],
  },
}

const nodes = [endNode, startNode, validateNode, routeNode, moodNode, studyNode, cogNode, mergeNode]

const workflow = {
  name: '记录查询_修正版',
  templateConfig: {
    category: 'FinanceAndCommerce', created: NOW, modified: NOW, id: WF_ID, name: '记录查询_修正版',
    description: '内部执行数据查询并只回传结果行（不再回传SQL，避免智能体补发TABLE_SQL_EXECUTE产生大段代码）',
    spaceId: SPACE, publishStatus: 'Developing', scope: 'Space',
    inputArgs: startNode.nodeConfig.inputArgs,
    outputArgs: endNode.nodeConfig.outputArgs,
    nodes, startNode, endNode,
    systemVariables: [
      { dataType: 'String', description: '平台用户ID', enable: true, name: 'SYS_USER_ID', require: true, systemVariable: true },
      { dataType: 'String', description: '用户唯一标识', enable: true, name: 'USER_UID', require: true, systemVariable: true },
      { dataType: 'String', description: '用户语言环境', enable: true, name: 'USER_LANG', require: true, systemVariable: true },
      { dataType: 'String', description: '用户名称', enable: true, name: 'USER_NAME', require: true, systemVariable: true },
      { dataType: 'String', description: '智能体唯一标识', enable: true, name: 'AGENT_ID', require: true, systemVariable: true },
      { dataType: 'String', description: '会话唯一标识', enable: true, name: 'CONVERSATION_ID', require: true, systemVariable: true },
      { dataType: 'String', description: '请求唯一标识', enable: true, name: 'REQUEST_ID', require: true, systemVariable: true },
      { dataType: 'String', description: '用户消息', enable: true, name: 'AGENT_USER_MSG', require: true, systemVariable: true },
      { dataType: 'String', description: '会话上下文消息列表', enable: true, name: 'CHAT_CONTEXT', require: true, systemVariable: true },
    ],
    type: 'Workflow',
  },
  type: 'Workflow',
}

const out = D + '记录查询_修正版.workflow'
writeFileSync(out, JSON.stringify(workflow), 'utf8')
console.log('written', out, 'nodes:', nodes.map((n) => `${n.name}(${n.id})`).join(', '))
