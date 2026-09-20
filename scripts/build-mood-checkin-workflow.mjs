#!/usr/bin/env node
/**
 * 兼容入口：请使用 repair-platform-assets.mjs 生成完整格式的打卡工作流资产。
 * 旧版脚本会生成 Developing 草稿，缺少 tableId/originalTableConfig，且把 subject_id 当作外部输入；已停止直接写出 workflow。
 */
import { spawnSync } from 'node:child_process'

const result = spawnSync(process.execPath, ['scripts/repair-platform-assets.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit',
})
process.exitCode = result.status ?? 1
