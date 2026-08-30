#!/usr/bin/env node
/**
 * 生成器：表单情绪打卡保存 工作流（.workflow 文件）
 *
 * 用法: node scripts/build-mood-checkin-workflow.mjs
 * 输出: 表单情绪打卡保存.workflow
 *
 * 工作流流程:
 *   Start (表单参数) → Code (校验+准备) → Condition (valid?)
 *     ├→ YES: TableDataAdd (mood_checkin) → Variable SET → End
 *     └→ NO:  Variable SET (error) → End
 *
 * 调用方式: POST /api/v1/workflow/{id}/execute
 * 请求体示例: {"emotion_name":"焦虑","intensity":3,"trigger_summary":"考试压力","psych_consent":"accepted"}
 *
 * 注意:
 * 1. 数据写入女娲侧的 mood_log 表，表必须已在平台内存在
 * 2. API 调用时需传入 nuwax-user-uid 头以关联用户
 * 3. 重新导入前更换所有 ID
 */

import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';

// ============ ID 配置 (每次重新导入需更换) ============
const WORKFLOW_ID = 5257662; // 实际发布的工作流 ID（2026-08-17 由女娲平台导入后确认）
const NODE_ID_BASE = 5340000;
const nodeId = (() => { let n = NODE_ID_BASE; return () => ++n; })();

const S_START    = nodeId();  // 开始
const S_CODE     = nodeId();  // 校验 + 数据准备
const S_COND     = nodeId();  // 条件分支
const S_DATA     = nodeId();  // mood_log 数据新增
const S_VAR_OK   = nodeId();  // 成功输出
const S_VAR_ERR  = nodeId();  // 错误输出
const S_END      = nodeId();  // 结束

const SPACE_ID = 53260800;    // 与现有工作流一致
const NOW = '2026-08-17 12:00:00';

// ============ UUID 生成 ============
const uid = () => randomUUID();

// ============ 辅助: 异常处理配置 ============
const exceptionCfg = (timeout = 180) => ({
  exceptionHandleNodeIds: [],
  exceptionHandleType: 'INTERRUPT',
  retryCount: 0,
  specificContent: {},
  timeout,
});

// ============ 辅助: 节点骨架 ============
const nodeSkeleton = (id, type, name, description, workflowId) => ({
  created: NOW,
  description,
  id,
  innerEndNode: false,
  modified: NOW,
  name,
  nextNodeIds: [],
  nextNodes: [],
  nodeConfig: {
    exceptionHandleConfig: exceptionCfg(),
    inputArgs: [],
    outputArgs: [],
  },
  preNodes: [],
  spaceId: SPACE_ID,
  type,
  unreachableNextNodeIds: [],
  virtualExecute: false,
  workflowId,
});

// ============ 参考变量 ============
const ref = (nodeId, varName, dataType) => ({
  bindValue: `${nodeId}.${varName}`,
  bindValueType: 'Reference',
  dataType,
  enable: true,
  name: varName,
  require: false,
  systemVariable: false,
});

// ============ 输入变量 ============
const inputArg = (name, dataType, description, required = false) => ({
  bindValue: '',
  bindValueType: 'Input',
  dataType,
  description,
  enable: true,
  key: uid(),
  name,
  require: required,
  systemVariable: false,
});

// ============ 输出变量 (独立输出) ============
const outputArg = (name, dataType, description = '') => ({
  bindValue: '',
  bindValueType: 'Input',
  dataType,
  description,
  enable: true,
  key: uid(),
  name,
  require: false,
  systemVariable: false,
});

// ============ 构建节点 ============

// --- 开始节点 ---
const startNode = {
  ...nodeSkeleton(S_START, 'Start', '开始', '工作流起始节点，接收表单情绪打卡数据', WORKFLOW_ID),
  nextNodeIds: [S_CODE],
  nodeConfig: {
    ...nodeSkeleton(S_START, 'Start', '开始', '', WORKFLOW_ID).nodeConfig,
    extension: { x: 30, width: 220, y: -30.5, height: 44 },
    inputArgs: [
      inputArg('emotion_name', 'String', '情绪名称（如焦虑、低落、平静等）', true),
      inputArg('intensity', 'Integer', '情绪强度 1-5', true),
      inputArg('trigger_summary', 'String', '触发原因简述', false),
      inputArg('psych_consent', 'String', '知情同意状态 accepted/declined', true),
      inputArg('subject_id', 'String', '匿名用户标识（HMAC），用于数据隔离', true),
    ],
  },
};

// --- 代码节点: 校验 + 数据准备 ---
const codePython = `# -*- coding: utf-8 -*-
"""
工作流: 表单情绪打卡保存
节点: 校验与数据准备
输入: emotion_name (String), intensity (Integer), trigger_summary (String), psych_consent (String)
输出: valid (Boolean), error_msg (String), mood_type (String), intensity_self (Integer),
      trigger_event (String), duration_hours (Number), impact_study (String),
      impact_life (String), raw_text (String), confidence (Number), expires_at (String)
"""

def main(emotion_name="", intensity=0, trigger_summary="", psych_consent="", subject_id=""):
    # 兼容字典传参（平台可能把所有输入打包为字典传给第一个参数）
    if isinstance(emotion_name, dict):
        inputs = emotion_name
        emotion_name = inputs.get("emotion_name", "")
        intensity = inputs.get("intensity", 0)
        trigger_summary = inputs.get("trigger_summary", "")
        psych_consent = inputs.get("psych_consent", "")
        subject_id = inputs.get("subject_id", "")

    # ---- 校验逻辑 ----
    consent_ok = psych_consent == "accepted"
    name_ok = bool((emotion_name or "").strip())

    try:
        intensity_val = int(intensity or 0)
    except (ValueError, TypeError):
        intensity_val = 0
    intensity_ok = 1 <= intensity_val <= 5

    valid = consent_ok and name_ok and intensity_ok

    # ---- 错误信息 ----
    error_msg = ""
    if not consent_ok:
        error_msg = "未通过知情同意校验"
    elif not name_ok:
        error_msg = "情绪名称不能为空"
    elif not intensity_ok:
        error_msg = "强度必须在 1-5 之间"

    # ---- 准备写入数据 ----
    mood_type = (emotion_name or "").strip()
    trigger_event = (trigger_summary or "").strip() or "未填写"

    raw_text = f"情绪打卡: {mood_type}, 强度: {intensity_val}/5"
    if trigger_event != "未填写":
        raw_text += f", 触发原因: {trigger_event}"

    # ---- 计算过期时间 (7天后, UTC ISO8601) ----
    from datetime import datetime, timezone, timedelta
    expires_dt = datetime.now(timezone.utc) + timedelta(days=7)
    expires_at = expires_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "valid": valid,
        "error_msg": error_msg,
        "mood_type": mood_type,
        "intensity_self": intensity_val,
        "trigger_event": trigger_event,
        "duration_hours": 0,
        "impact_study": "",
        "impact_life": "",
        "expires_at": expires_at,
        "subject_id": (subject_id or "").strip(),
    }
`;

const codeNode = {
  ...nodeSkeleton(S_CODE, 'Code', '校验与数据准备', '校验输入有效性并准备 mood_log 写入数据', WORKFLOW_ID),
  nextNodeIds: [S_COND],
  nodeConfig: {
    ...nodeSkeleton(S_CODE, 'Code', '校验与数据准备', '', WORKFLOW_ID).nodeConfig,
    codeJavaScript: '// JS 模板（未使用）\nexport default async function main(args) {\n    return { key: "value" };\n}\n',
    codeLanguage: 'Python',
    codePython,
    exceptionHandleConfig: exceptionCfg(10),
    extension: { x: 300, width: 220, y: -88, height: 79 },
    inputArgs: [
      ref(S_START, 'emotion_name', 'String'),
      ref(S_START, 'intensity', 'Integer'),
      ref(S_START, 'trigger_summary', 'String'),
      ref(S_START, 'psych_consent', 'String'),
      ref(S_START, 'subject_id', 'String'),
    ],
    outputArgs: [
      outputArg('valid', 'Boolean'),
      outputArg('error_msg', 'String'),
      outputArg('mood_type', 'String'),
      outputArg('intensity_self', 'Integer'),
      outputArg('trigger_event', 'String'),
      outputArg('duration_hours', 'Number'),
      outputArg('impact_study', 'String'),
      outputArg('impact_life', 'String'),
      outputArg('expires_at', 'String'),
      outputArg('subject_id', 'String'),
    ],
  },
};

// --- 条件分支节点 ---
const conditionNode = {
  ...nodeSkeleton(S_COND, 'Condition', '条件分支', '校验通过则写入 mood_log，否则返回错误', WORKFLOW_ID),
  nextNodeIds: [S_DATA, S_VAR_ERR],  // 主 IF 分支 + ELSE 分支
  nodeConfig: {
    ...nodeSkeleton(S_COND, 'Condition', '条件分支', '', WORKFLOW_ID).nodeConfig,
    conditionBranchConfigs: [
      {
        branchType: 'IF',
        conditionArgs: [
          {
            compareType: 'EQUAL',
            firstArg: {
              bindValue: `${S_CODE}.valid`,
              bindValueType: 'Reference',
              dataType: 'Boolean',
              enable: true,
              name: 'valid',
              require: false,
              systemVariable: false,
            },
            secondArg: {
              bindValue: 'true',
              bindValueType: 'Input',
              dataType: 'String',
              enable: true,
              require: false,
              systemVariable: false,
            },
          },
        ],
        conditionType: 'AND',
        nextNodeIds: [S_DATA],
        uuid: uid(),
      },
      {
        branchType: 'ELSE',
        conditionArgs: [],
        conditionType: 'AND',
        nextNodeIds: [S_VAR_ERR],
        uuid: uid(),
      },
    ],
    exceptionHandleConfig: exceptionCfg(),
    extension: { x: 600, width: 300, y: -100, height: 119 },
    inputArgs: [],
    outputArgs: [],
  },
};

// --- TableDataAdd 节点: mood_checkin ---
const tableDataAddNode = {
  ...nodeSkeleton(S_DATA, 'TableDataAdd', 'mood_log', '情绪记录表（对话+表单共用）', WORKFLOW_ID),
  nextNodeIds: [S_VAR_OK],
  nodeConfig: {
    ...nodeSkeleton(S_DATA, 'TableDataAdd', 'mood_log', '', WORKFLOW_ID).nodeConfig,
    description: '情绪记录表（对话+表单共用）',
    extension: { x: 1000, width: 220, y: -88, height: 79 },
    icon: 'https://agent.nuwax.com/api/f/s3/icon/20260817/checkin.svg',
    name: 'mood_log',
    // inputArgs: 写入的字段（key 与 mood_log 表字段对应；uid/created 由系统自动填）
    inputArgs: [
      { ...ref(S_CODE, 'mood_type', 'String'), key: 'mood_type' },
      { ...ref(S_CODE, 'intensity_self', 'Integer'), key: 'intensity_self' },
      { ...ref(S_CODE, 'trigger_event', 'String'), key: 'trigger_summary' },
      { ...ref(S_CODE, 'expires_at', 'String'), key: 'expires_at' },
      { ...ref(S_CODE, 'subject_id', 'String'), key: 'subject_id' },
    ],
    outputArgs: [
      {
        dataType: 'Number',
        description: 'Data unique ID',
        enable: true,
        key: 'id',
        name: 'id',
        require: true,
        systemVariable: true,
      },
      {
        dataType: 'Boolean',
        description: '是否新增成功',
        enable: true,
        key: 'success',
        name: 'success',
        require: true,
        systemVariable: true,
      },
    ],
    // tableFields: mood_checkin 表的完整字段定义
    tableFields: [
      { dataType: 'String', description: '主键ID', enable: true, key: 'id', name: 'id', require: true, systemVariable: true },
      { dataType: 'String', description: '用户唯一标识', enable: true, key: 'uid', name: 'uid', require: true, systemVariable: true },
      { dataType: 'String', description: '用户名', enable: true, key: 'user_name', name: 'user_name', require: false, systemVariable: true },
      { dataType: 'String', description: '用户昵称', enable: true, key: 'nick_name', name: 'nick_name', require: false, systemVariable: true },
      { dataType: 'String', description: '智能体唯一标识', enable: true, key: 'agent_id', name: 'agent_id', require: false, systemVariable: true },
      { dataType: 'String', description: '智能体名称', enable: true, key: 'agent_name', name: 'agent_name', require: false, systemVariable: true },
      { bindValue: 'CURRENT_TIMESTAMP', dataType: 'String', description: '数据创建时间', enable: true, key: 'created', name: 'created', require: true, systemVariable: true },
      { bindValue: 'CURRENT_TIMESTAMP', dataType: 'String', description: '数据修改时间', enable: true, key: 'modified', name: 'modified', require: true, systemVariable: true },
      { ...ref(S_CODE, 'mood_type', 'String'), key: 'mood_type', require: false },
      { ...ref(S_CODE, 'intensity_self', 'Integer'), key: 'intensity_self', require: false },
      { ...ref(S_CODE, 'duration_hours', 'Number'), key: 'duration_hours', require: false },
      { ...ref(S_CODE, 'trigger_event', 'String'), key: 'trigger_summary', require: false },
      { ...ref(S_CODE, 'impact_study', 'String'), key: 'impact_study', require: false },
      { ...ref(S_CODE, 'impact_life', 'String'), key: 'impact_life', require: false },
      { ...ref(S_CODE, 'expires_at', 'String'), key: 'expires_at', require: false },
      { ...ref(S_CODE, 'subject_id', 'String'), key: 'subject_id', require: false },
    ],
  },
};

// --- 变量节点: 成功输出 ---
const varOkNode = {
  ...nodeSkeleton(S_VAR_OK, 'Variable', '成功输出', '写入成功后设置返回变量', WORKFLOW_ID),
  nextNodeIds: [S_END],
  nodeConfig: {
    ...nodeSkeleton(S_VAR_OK, 'Variable', '成功输出', '', WORKFLOW_ID).nodeConfig,
    configType: 'SET_VARIABLE',
    exceptionHandleConfig: exceptionCfg(),
    extension: { x: 1280, width: 220, y: -88, height: 44 },
    inputArgs: [],
    outputArgs: [
      {
        bindValue: 'true',
        dataType: 'String',
        enable: true,
        key: uid(),
        name: 'success',
        require: false,
        systemVariable: false,
      },
      {
        ...ref(S_DATA, 'id', 'String'),
        key: uid(),
        name: 'record_id',
      },
      {
        bindValue: '',
        dataType: 'String',
        enable: true,
        key: uid(),
        name: 'error_msg',
        require: false,
        systemVariable: false,
      },
    ],
  },
};

// --- 变量节点: 错误输出 ---
const varErrNode = {
  ...nodeSkeleton(S_VAR_ERR, 'Variable', '错误输出', '校验失败时返回错误信息', WORKFLOW_ID),
  nextNodeIds: [S_END],
  nodeConfig: {
    ...nodeSkeleton(S_VAR_ERR, 'Variable', '错误输出', '', WORKFLOW_ID).nodeConfig,
    configType: 'SET_VARIABLE',
    exceptionHandleConfig: exceptionCfg(),
    extension: { x: 960, width: 220, y: 10, height: 44 },
    inputArgs: [],
    outputArgs: [
      {
        bindValue: 'false',
        dataType: 'String',
        enable: true,
        key: uid(),
        name: 'success',
        require: false,
        systemVariable: false,
      },
      {
        bindValue: '',
        dataType: 'String',
        enable: true,
        key: uid(),
        name: 'record_id',
        require: false,
        systemVariable: false,
      },
      {
        ...ref(S_CODE, 'error_msg', 'String'),
        key: uid(),
        name: 'error_msg',
      },
    ],
  },
};

// --- 结束节点 ---
const endNode = {
  ...nodeSkeleton(S_END, 'End', '结束', '返回打卡结果', WORKFLOW_ID),
  nextNodeIds: [],
  nodeConfig: {
    ...nodeSkeleton(S_END, 'End', '结束', '', WORKFLOW_ID).nodeConfig,
    exceptionHandleConfig: exceptionCfg(),
    extension: { x: 1550, width: 220, y: -30, height: 44 },
    outputArgs: [
      {
        bindValue: `${S_VAR_OK}.success`,
        bindValueType: 'Reference',
        dataType: 'String',
        description: '是否成功',
        enable: true,
        name: 'success',
        require: false,
        systemVariable: false,
      },
      {
        bindValue: `${S_VAR_OK}.record_id`,
        bindValueType: 'Reference',
        dataType: 'String',
        description: '新增记录 ID',
        enable: true,
        name: 'record_id',
        require: false,
        systemVariable: false,
      },
      {
        bindValue: `${S_VAR_ERR}.error_msg`,
        bindValueType: 'Reference',
        dataType: 'String',
        description: '错误信息（成功时为空）',
        enable: true,
        name: 'error_msg',
        require: false,
        systemVariable: false,
      },
    ],
    returnType: 'VARIABLE',
  },
};

// ============ 组装工作流 ============
const nodes = [endNode, startNode, codeNode, conditionNode, tableDataAddNode, varOkNode, varErrNode];

const systemVariables = [
  { dataType: 'String', description: '平台用户ID', enable: true, name: 'SYS_USER_ID', require: true, systemVariable: true },
  { dataType: 'String', description: '用户唯一标识', enable: true, name: 'USER_UID', require: true, systemVariable: true },
  { dataType: 'String', description: '用户语言环境', enable: true, name: 'USER_LANG', require: true, systemVariable: true },
  { dataType: 'String', description: '用户名称', enable: true, name: 'USER_NAME', require: true, systemVariable: true },
  { dataType: 'String', description: '智能体唯一标识', enable: true, name: 'AGENT_ID', require: true, systemVariable: true },
  { dataType: 'String', description: '会话唯一标识', enable: true, name: 'CONVERSATION_ID', require: true, systemVariable: true },
  { dataType: 'String', description: '请求唯一标识', enable: true, name: 'REQUEST_ID', require: true, systemVariable: true },
  { dataType: 'String', description: '用户消息', enable: true, name: 'AGENT_USER_MSG', require: true, systemVariable: true },
  { dataType: 'String', description: '会话上下文消息列表', enable: true, name: 'CHAT_CONTEXT', require: true, systemVariable: true },
];

const workflow = {
  name: '表单情绪打卡保存',
  templateConfig: {
    category: 'Other',
    created: NOW,
    creator: { nickName: '', userId: 0, userName: '' },
    creatorId: 0,
    description: '接收表单提交的情绪打卡数据，校验后写入 mood_checkin 数据表。通过 API POST /api/v1/workflow/{id}/execute 调用。',
    endNode,
    icon: 'https://agent.nuwax.com/api/f/s3/icon/20260817/default.svg',
    id: WORKFLOW_ID,
    inputArgs: startNode.nodeConfig.inputArgs,
    modified: NOW,
    name: '表单情绪打卡保存',
    nodes,
    outputArgs: endNode.nodeConfig.outputArgs,
    publishStatus: 'Developing',
    scope: 'Space',
    spaceId: SPACE_ID,
    startNode,
    systemVariables,
    type: 'Workflow',
  },
  type: 'Workflow',
};

// ============ 写入文件 ============
const outPath = 'E:/brick/desktop/yunshu/表单情绪打卡保存.workflow';
writeFileSync(outPath, JSON.stringify(workflow), 'utf-8');

// ============ 打印校验信息 ============
console.log(`✅ 工作流已生成: ${outPath}`);
console.log(`   Workflow ID: ${WORKFLOW_ID}`);
console.log(`   节点数: ${nodes.length}`);
console.log(`   节点 ID: ${nodes.map(n => `${n.name}(${n.id})`).join(', ')}`);
console.log('');

// 基础静态校验
const nodeIdSet = new Set(nodes.map(n => n.id));
const allNextIds = new Set();
nodes.forEach(n => {
  (n.nextNodeIds || []).forEach(id => allNextIds.add(id));
  const branches = n.nodeConfig?.conditionBranchConfigs || [];
  branches.forEach(b => { (b.nextNodeIds || []).forEach(id => allNextIds.add(id)); });
  (n.nodeConfig?.exceptionHandleConfig?.exceptionHandleNodeIds || []).forEach(id => allNextIds.add(id));
});

const orphanIds = [...allNextIds].filter(id => !nodeIdSet.has(id));
if (orphanIds.length) {
  console.error(`❌ 无效引用: 以下节点 ID 被引用但不存在: ${orphanIds.join(', ')}`);
} else {
  console.log('✅ 所有 nextNodeIds 引用有效');
}

// 检查重复 ID
if (nodeIdSet.size !== nodes.length) {
  console.error('❌ 存在重复节点 ID');
} else {
  console.log('✅ 节点 ID 唯一');
}

// 检查 start/end 一致性
if (workflow.templateConfig.startNode.id === startNode.id &&
    workflow.templateConfig.endNode.id === endNode.id) {
  console.log('✅ startNode/endNode 与 nodes 一致');
} else {
  console.error('❌ startNode/endNode 与 nodes 不一致');
}

// 检查可达性 (BFS)
const reachable = new Set();
const queue = [startNode.id];
while (queue.length) {
  const id = queue.shift();
  if (reachable.has(id)) continue;
  reachable.add(id);
  const node = nodes.find(n => n.id === id);
  if (!node) continue;
  (node.nextNodeIds || []).forEach(nid => queue.push(nid));
  const branches = node.nodeConfig?.conditionBranchConfigs || [];
  branches.forEach(b => { (b.nextNodeIds || []).forEach(nid => queue.push(nid)); });
}
const unreachable = nodes.filter(n => !reachable.has(n.id));
if (unreachable.length) {
  console.error(`❌ 不可达节点: ${unreachable.map(n => `${n.name}(${n.id})`).join(', ')}`);
} else {
  console.log('✅ 所有节点从开始节点可达');
}

console.log('\n📋 导入前准备:');
console.log('   1. 先在平台导入 mood_checkin.table 创建数据表');
console.log('   2. API Key 是否已在控制台创建并授权工作流执行权限');
console.log('\n📋 导入后需人工检查:');
console.log('   1. mood_checkin 表是否存在、字段是否匹配');
console.log('   2. 条件分支连线是否正常显示');
console.log('   3. 试运行: 正常打卡用例 → 应写入 mood_checkin');
console.log('   4. 试运行: 空名称/越界强度/declined 用户 → 应返回错误');