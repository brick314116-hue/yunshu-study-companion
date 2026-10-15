<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdown'

const props = defineProps<{
  content: string
}>()

const renderedHtml = computed(() => renderMarkdown(props.content))
</script>

<template>
  <div class="markdown-body" v-html="renderedHtml" />
</template>

<style scoped>
.markdown-body {
  color: inherit;
  font-size: 14.5px;
  line-height: 1.68;
  word-break: break-word;
}

/* 段落间距控制：段首与段尾消除空白塌陷 */
.markdown-body :deep(p) {
  margin: 0 0 0.85em;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

/* 强调与加粗 */
.markdown-body :deep(strong) {
  font-weight: 650;
  color: var(--text, #1e293b);
}

.markdown-body :deep(em) {
  font-style: italic;
}

/* 标题样式：层次分明且尺寸克制 */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 1em 0 0.45em;
  font-weight: 650;
  line-height: 1.35;
  color: var(--text, #0f172a);
}

.markdown-body :deep(h1:first-child),
.markdown-body :deep(h2:first-child),
.markdown-body :deep(h3:first-child),
.markdown-body :deep(h4:first-child) {
  margin-top: 0;
}

.markdown-body :deep(h1) { font-size: 1.25em; }
.markdown-body :deep(h2) { font-size: 1.15em; }
.markdown-body :deep(h3) { font-size: 1.05em; }
.markdown-body :deep(h4) { font-size: 1em; }

/* 列表样式 */
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0.4em 0 0.8em;
  padding-left: 1.4em;
}

.markdown-body :deep(li) {
  margin-bottom: 0.3em;
}

.markdown-body :deep(li:last-child) {
  margin-bottom: 0;
}

/* 代码与代码块 */
.markdown-body :deep(code) {
  padding: 0.15em 0.35em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.9em;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
}

.markdown-body :deep(pre) {
  margin: 0.7em 0;
  padding: 10px 14px;
  overflow-x: auto;
  background: #1e293b;
  border-radius: 8px;
  color: #f8fafc;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 0.88em;
}

/* 引用块 */
.markdown-body :deep(blockquote) {
  margin: 0.6em 0;
  padding: 6px 12px;
  border-left: 3px solid var(--accent, #3f8fd2);
  background: rgba(63, 143, 210, 0.06);
  border-radius: 0 6px 6px 0;
  color: var(--text-soft, #475569);
}

.markdown-body :deep(blockquote p) {
  margin: 0;
}

/* 表格支持 */
.markdown-body :deep(table) {
  width: 100%;
  margin: 0.8em 0;
  border-collapse: collapse;
  font-size: 0.92em;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 6px 10px;
  border: 1px solid var(--line, #e2e8f0);
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--surface-muted, #f8fafc);
  font-weight: 600;
}

/* KaTeX 数学公式容器优化 */
.markdown-body :deep(.katex-display-wrapper) {
  margin: 0.8em 0;
  padding: 6px 0;
  overflow-x: auto;
  overflow-y: hidden;
  text-align: center;
}

.markdown-body :deep(.katex-display) {
  margin: 0;
}

/* 移动端或小屏横向公式滚动条微调 */
.markdown-body :deep(.katex-display-wrapper::-webkit-scrollbar) {
  height: 4px;
}

.markdown-body :deep(.katex-display-wrapper::-webkit-scrollbar-thumb) {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 2px;
}
</style>
