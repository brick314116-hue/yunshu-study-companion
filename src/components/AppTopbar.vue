<script setup lang="ts">
import { Menu, MessageCircleMore } from '@lucide/vue'
import type { AppTab } from '../types'

defineProps<{ activeTab: AppTab }>()

const emit = defineEmits<{
  select: [tab: AppTab]
  menu: []
}>()
</script>

<template>
  <header class="app-topbar">
    <button class="topbar-hamburger" type="button" aria-label="打开菜单" @click="emit('menu')">
      <Menu :size="18" :stroke-width="1.8" />
    </button>

    <nav class="topbar-tabs" aria-label="主导航">
      <button
        type="button"
        class="topbar-tab"
        :class="{ active: activeTab === 'chat' }"
        :aria-current="activeTab === 'chat' ? 'page' : undefined"
        @click="emit('select', 'chat')"
      >
        <MessageCircleMore :size="16" :stroke-width="1.8" aria-hidden="true" />
        <span>对话</span>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.app-topbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 20px;
  background: #FFFFFF;
  border-bottom: 1px solid var(--line);
}

.topbar-hamburger {
  display: none;
  width: 36px;
  height: 36px;
  place-items: center;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 9px;
}

.topbar-hamburger:hover {
  color: var(--text);
  background: var(--hover);
}

.topbar-tabs {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
}

.topbar-tab {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 10px;
  font-size: 13.5px;
  transition: all 0.18s ease;
}

.topbar-tab:hover {
  color: var(--text);
  background: var(--hover);
}

.topbar-tab.active {
  color: var(--accent-strong);
  background: var(--accent-soft);
  font-weight: 600;
}

@media (max-width: 1000px) {
  .topbar-hamburger {
    display: grid;
  }
}
</style>
