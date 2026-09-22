<script setup lang="ts">
import { Cloud, LogIn, LogOut, Menu, MessageCircleMore, Sparkles, UserRound } from '@lucide/vue'
import type { AppTab } from '../types'

defineProps<{
  activeTab: AppTab
  minimal?: boolean
  userName?: string
  authReady?: boolean
  dockOpen?: boolean
}>()

const emit = defineEmits<{
  select: [tab: AppTab]
  menu: []
  home: []
  login: []
  account: []
  logout: []
  toggleDock: []
}>()
</script>

<template>
  <header class="app-topbar" :class="{ minimal }">
    <!-- 极简模式（认识页）：左上 logo + 右上登录 -->
    <template v-if="minimal">
      <button class="topbar-brand" type="button" aria-label="回到首页" @click="emit('home')">
        <span class="brand-mark" aria-hidden="true"><Cloud :size="18" :stroke-width="1.8" /></span>
        <strong>云舒学伴</strong>
      </button>
      <div class="topbar-right">
        <template v-if="userName">
          <button class="topbar-account" type="button" title="设置你的称呼" @click="emit('account')">
            <UserRound :size="16" :stroke-width="1.7" />
            <span>{{ userName }}</span>
          </button>
          <button class="topbar-icon" type="button" title="退出登录" aria-label="退出登录" @click="emit('logout')">
            <LogOut :size="16" :stroke-width="1.8" />
          </button>
        </template>
        <button v-else class="topbar-login" type="button" :disabled="!authReady" @click="emit('login')">
          <LogIn :size="16" :stroke-width="1.8" />
          <span>{{ !authReady ? '正在检查...' : '登录' }}</span>
        </button>
      </div>
    </template>

    <!-- 常规模式：汉堡 + 对话 tab + 右侧工具箱开关 -->
    <template v-else>
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

      <div class="topbar-right">
        <button
          v-if="activeTab === 'chat'"
          type="button"
          class="topbar-dock-btn"
          :class="{ active: dockOpen }"
          title="展开/收起伴学工具箱（专注钟·白噪音·呼吸平复）"
          aria-label="展开/收起伴学工具箱"
          @click="emit('toggleDock')"
        >
          <Sparkles :size="15" :stroke-width="2" />
          <span class="dock-btn-label">伴学工具箱</span>
        </button>
      </div>
    </template>
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

.app-topbar.minimal {
  justify-content: space-between;
}

.topbar-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  background: transparent;
  border: 0;
  font-size: 15px;
  font-weight: 600;
}

.topbar-brand .brand-mark {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: #FFFFFF;
  background: var(--ink);
  border-radius: 9px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-account {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 13px;
  color: var(--text);
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 13px;
}

.topbar-account span {
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: var(--text-muted);
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 999px;
}

.topbar-login {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 16px;
  color: #FFFFFF;
  background: var(--ink);
  border: 0;
  border-radius: 999px;
  font-size: 13px;
}

.topbar-login:disabled {
  opacity: 0.6;
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

.topbar-dock-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  color: var(--text-muted);
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}

.topbar-dock-btn:hover {
  color: var(--accent-strong);
  border-color: var(--accent);
  background: var(--accent-faint);
}

.topbar-dock-btn.active {
  color: var(--accent-strong);
  background: var(--accent-soft);
  border-color: rgb(61 125 214 / 30%);
  font-weight: 600;
}

@media (max-width: 640px) {
  .dock-btn-label {
    display: none;
  }
  .topbar-dock-btn {
    padding: 0 10px;
  }
}
</style>
