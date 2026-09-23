<script setup lang="ts">
import {
  Clock,
  Cloud,
  LogIn,
  LogOut,
  Menu,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wind,
} from '@lucide/vue'
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

    <!-- 常规模式：汉堡 + 四大工作区 Tab + 右侧工具箱开关 -->
    <template v-else>
      <button class="topbar-hamburger" type="button" aria-label="打开菜单" @click="emit('menu')">
        <Menu :size="18" :stroke-width="1.8" />
      </button>
      <nav class="topbar-tabs" aria-label="工作区导航">
        <button
          type="button"
          class="topbar-tab"
          :class="{ active: activeTab === 'chat' }"
          :aria-current="activeTab === 'chat' ? 'page' : undefined"
          @click="emit('select', 'chat')"
        >
          <MessageCircleMore :size="16" :stroke-width="1.8" aria-hidden="true" />
          <span>会话中枢</span>
        </button>

        <button
          type="button"
          class="topbar-tab"
          :class="{ active: activeTab === 'focus' }"
          :aria-current="activeTab === 'focus' ? 'page' : undefined"
          @click="emit('select', 'focus')"
        >
          <Clock :size="16" :stroke-width="1.8" aria-hidden="true" />
          <span>专注自习室</span>
        </button>

        <button
          type="button"
          class="topbar-tab"
          :class="{ active: activeTab === 'mind' }"
          :aria-current="activeTab === 'mind' ? 'page' : undefined"
          @click="emit('select', 'mind')"
        >
          <Wind :size="16" :stroke-width="1.8" aria-hidden="true" />
          <span>心灵避风港</span>
        </button>

        <button
          type="button"
          class="topbar-tab"
          :class="{ active: activeTab === 'footprint' }"
          :aria-current="activeTab === 'footprint' ? 'page' : undefined"
          @click="emit('select', 'footprint')"
        >
          <ShieldCheck :size="16" :stroke-width="1.8" aria-hidden="true" />
          <span>成长足迹</span>
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

        <button
          v-if="userName"
          class="topbar-account-mini"
          type="button"
          title="设置称呼"
          @click="emit('account')"
        >
          <UserRound :size="15" :stroke-width="1.8" />
          <span class="topbar-user-name">{{ userName }}</span>
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
  height: 54px;
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  z-index: 10;
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
  cursor: pointer;
  transition: opacity 0.18s ease;
}

.topbar-brand:hover {
  opacity: 0.85;
}

.topbar-brand .brand-mark {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: #FFFFFF;
  background: var(--ink);
  border-radius: 9px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
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
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
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
  cursor: pointer;
  transition: all 0.18s ease;
}

.topbar-icon:hover {
  color: var(--text);
  border-color: var(--line-strong);
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
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
  cursor: pointer;
  transition: transform 0.18s var(--ease-spring), opacity 0.18s ease;
}

.topbar-login:hover {
  transform: translateY(-1px);
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
  cursor: pointer;
  transition: all 0.18s ease;
}

.topbar-hamburger:hover {
  color: var(--text);
  background: var(--hover);
}

.topbar-tabs {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: rgba(241, 245, 249, 0.75);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.03);
}

.topbar-tab {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s var(--ease-spring);
}

.topbar-tab:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.5);
}

.topbar-tab.active {
  color: var(--accent-strong);
  background: #FFFFFF;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08), inset 0 1px 1px #FFFFFF;
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
  gap: 7px;
  height: 34px;
  padding: 0 13px;
  color: var(--text-muted);
  background: #FFFFFF;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: all 0.2s var(--ease-spring);
}

.topbar-dock-btn:hover {
  color: var(--accent-strong);
  border-color: rgba(99, 102, 241, 0.4);
  background: var(--accent-faint);
  transform: translateY(-1px);
}

.topbar-dock-btn.active {
  color: var(--accent-strong);
  background: var(--accent-soft);
  border-color: rgba(99, 102, 241, 0.35);
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.12);
}

.topbar-account-mini {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  color: var(--text-muted);
  background: #FFFFFF;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: all 0.18s ease;
}

.topbar-account-mini:hover {
  color: var(--accent-strong);
  border-color: var(--accent);
}

.topbar-user-name {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .topbar-tabs button span {
    display: none;
  }
  .topbar-tab {
    padding: 6px 9px;
  }
  .topbar-user-name {
    display: none;
  }
}

@media (max-width: 640px) {
  .dock-btn-label {
    font-size: 11px;
  }
  .topbar-dock-btn {
    padding: 0 8px;
    height: 32px;
  }
}
</style>
