#!/usr/bin/env node
/**
 * 兼容入口：请使用 repair-platform-assets.mjs 生成基于已发布女娲导出的修正版资产。
 * 旧版脚本依赖不存在的外部 TableDataQuery 模板，且会生成不完整草稿，已停止直接写出 workflow。
 */
import { spawnSync } from 'node:child_process'

const result = spawnSync(process.execPath, ['scripts/repair-platform-assets.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit',
})
process.exitCode = result.status ?? 1
