<script setup lang="ts">
import { Brain, ClipboardList, HeartHandshake, NotebookPen, X } from '@lucide/vue'
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Component } from 'vue'
import { modules } from '../modules'
import type { ModuleDefinition, ModuleId, PsychConsent } from '../types'

const props = defineProps<{ open: boolean; psychConsent: PsychConsent }>()
const emit = defineEmits<{
  close: []
  pick: [module: ModuleId, prompt: string]
  pickAction: [action: 'mood-checkin']
}>()

const icons: Record<ModuleId, Component> = {
  study: NotebookPen,
  thought: Brain,
  emotion: HeartHandshake,
  records: ClipboardList,
}

// 学途助力 / 转念梳理 / 心叙倾诉 / 我的心隅记录（情绪打卡已作为独立专属功能剥离）
const groups = computed<ModuleDefinition[]>(() => {
  const order: ModuleId[] = ['study', 'thought', 'emotion', 'records']
  const list = order
    .map((id) => modules.find((m) => m.id === id))
    .filter((m): m is ModuleDefinition => Boolean(m))
  // 不同意情绪/认知功能时：仅显示 学途助力
  if (props.psychConsent === 'declined') return list.filter((m) => m.id === 'study')
  return list
})

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

const clickTool = (module: ModuleDefinition, tool: ModuleDefinition['tools'][number]) => {
  if (tool.action) {
    emit('pickAction', tool.action)
  } else {
    emit('pick', module.id, tool.prompt)
  }
  emit('close')
}

// 点击遮罩关闭（点击弹窗内部不关闭）
const onMask = (e: MouseEvent) => {
  if ((e.target as HTMLElement).dataset.mask) emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      // no-op; 弹窗每次打开重置滚动
    }
  },
)

const dialogRef = ref<HTMLElement | null>(null)
</script>

<template>
  <div v-if="open" class="am-mask" data-mask="1" @click="onMask" role="dialog" aria-modal="true" aria-labelledby="am-title">
    <div class="am-dialog" ref="dialogRef">
      <button class="am-close" type="button" aria-label="关闭" @click="emit('close')">
        <X :size="18" :stroke-width="1.8" />
      </button>

      <h2 id="am-title">伴学锦囊</h2>
      <p class="am-sub">精选高频伴学提示词与场景灵感，点击一键开好头。</p>

      <div class="am-body">
        <section v-for="group in groups" :key="group.id" class="am-group">
          <header>
            <span class="am-group-icon" aria-hidden="true">
              <component :is="icons[group.id]" :size="16" :stroke-width="1.7" />
            </span>
            <span>{{ group.label }}</span>
          </header>
          <div class="am-list">
            <button
              v-for="tool in group.tools"
              :key="tool.title"
              type="button"
              class="am-item"
              @click="clickTool(group, tool)"
            >
              <strong>{{ tool.title }}</strong>
              <small>{{ tool.description }}</small>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.am-mask {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(26 34 51 / 40%);
}

.am-dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(92vw, 760px);
  max-height: 84vh;
  padding: 26px 26px 22px;
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow-card);
}

.am-close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 9px;
  transition: all 0.18s ease;
}

.am-close:hover {
  color: var(--text);
  background: var(--hover);
}

.am-dialog h2 {
  margin: 0 0 4px;
  color: var(--text);
  font-size: 19px;
  font-weight: 600;
}

.am-sub {
  margin: 0 0 16px;
  color: var(--text-muted);
  font-size: 13px;
}

.am-body {
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: thin;
}

.am-group {
  margin-bottom: 20px;
}

.am-group:last-child {
  margin-bottom: 4px;
}

.am-group header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
}

.am-group-icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: var(--text);
  background: var(--surface-muted);
  border-radius: 8px;
}

.am-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.am-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 14px;
  color: var(--text);
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 12px;
  text-align: left;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.am-item:hover {
  border-color: var(--accent);
  background: var(--accent-faint);
}

.am-item strong {
  font-size: 14px;
  font-weight: 600;
}

.am-item small {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 600px) {
  .am-list {
    grid-template-columns: 1fr;
  }
}
</style>
