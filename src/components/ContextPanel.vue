<script setup lang="ts">
import { ArrowUpRight, Sparkles } from '@lucide/vue'
import type { ModuleDefinition } from '../types'

defineProps<{
  module: ModuleDefinition
}>()

const emit = defineEmits<{
  prompt: [value: string]
}>()
</script>

<template>
  <aside class="context-panel" aria-label="当前模块工具">
    <div class="context-content">
      <Transition name="panel" mode="out-in">
        <div :key="module.id" class="context-module">
          <header>
            <span class="context-icon" :style="{ color: module.accent }">
              <Sparkles :size="19" :stroke-width="1.7" />
            </span>
            <div>
              <strong>{{ module.title }}</strong>
              <p>{{ module.description }}</p>
            </div>
          </header>

          <div class="tool-list">
            <p class="section-label">可以从这里开始</p>
            <button
              v-for="tool in module.tools"
              :key="tool.title"
              type="button"
              @click="emit('prompt', tool.prompt)"
            >
              <span>
                <strong>{{ tool.title }}</strong>
                <small>{{ tool.description }}</small>
              </span>
              <ArrowUpRight :size="17" :stroke-width="1.8" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Transition>

      <div class="context-note">
        <strong>使用边界</strong>
        <p>不进行心理诊断、测评或风险分级；原始对话默认不保存，结构化摘要须经你确认且最多保留7天。</p>
      </div>
    </div>
  </aside>
</template>
