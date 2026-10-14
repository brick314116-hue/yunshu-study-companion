<script setup lang="ts">
import {
  Cloud,
  LogIn,
  LogOut,
  Menu,
  Sparkles,
  UserRound,
} from '@lucide/vue'
import { computed } from 'vue'
import type { AppTab } from '../types'

const props = defineProps<{
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

const currentWorkspaceTitle = computed(() => {
  switch (props.activeTab) {
    case 'chat': return '会话中枢'
    case 'focus': return '专注自习室'
    case 'mind': return '心灵避风港'
    case 'footprint': return '成长足迹'
    case 'intro': return '认识云小舒'
    default: return '工作台'
  }
})
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
            <UserRound :size="15" :stroke-width="1.7" />
            <span>{{ userName }}</span>
          </button>
          <button class="topbar-icon" type="button" title="退出登录" aria-label="退出登录" @click="emit('logout')">
            <LogOut :size="15" :stroke-width="1.8" />
          </button>
        </template>
        <button v-else class="topbar-login" type="button" :disabled="!authReady" @click="emit('login')">
          <LogIn :size="15" :stroke-width="1.8" />
          <span>{{ !authReady ? '正在检查...' : '登录' }}</span>
        </button>
      </div>
    </template>

    <!-- 工作区常规模式：极低调单行面包屑，砍掉重复Tabs，释放大片留白 -->
    <template v-else>
      <div class="topbar-left">
        <button class="topbar-hamburger" type="button" aria-label="打开侧边栏" @click="emit('menu')">
          <Menu :size="17" :stroke-width="1.8" />
        </button>
        <nav class="topbar-breadcrumb" aria-label="当前路径">
          <button class="breadcrumb-item breadcrumb-home" type="button" @click="emit('home')">云舒学伴</button>
          <span class="breadcrumb-separator" aria-hidden="true">/</span>
          <span class="breadcrumb-item current">{{ currentWorkspaceTitle }}</span>
        </nav>
      </div>

      <div class="topbar-right">
        <button
          v-if="activeTab === 'chat'"
          type="button"
          class="topbar-dock-btn"
          :class="{ active: dockOpen }"
          title="展开/收起伴学锦囊（专注钟·白噪音·呼吸平复）"
          aria-label="展开/收起伴学锦囊"
          @click="emit('toggleDock')"
        >
          <Sparkles :size="14" :stroke-width="1.8" />
          <span class="dock-btn-label">伴学锦囊</span>
        </button>

        <button
          v-if="userName"
          class="topbar-account-mini"
          type="button"
          title="设置称呼"
          @click="emit('account')"
        >
          <UserRound :size="14" :stroke-width="1.7" />
          <span class="topbar-user-name">{{ userName }}</span>
        </button>
        <button
          v-else
          class="topbar-login-mini"
          type="button"
          :disabled="!authReady"
          @click="emit('login')"
        >
          <LogIn :size="14" :stroke-width="1.8" />
          <span>登录</span>
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
  justify-content: space-between;
  height: 48px;
  padding: 0 24px;
  background: rgba(248, 250, 252, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
  z-index: 10;
  box-sizing: border-box;
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
  width: 30px;
  height: 30px;
  place-items: center;
  color: #FFFFFF;
  background: var(--ink);
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-breadcrumb {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  line-height: 1;
}

.breadcrumb-home {
  background: none;
  border: none;
  padding: 0;
  color: var(--text-soft);
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: color 0.15s ease;
}

.breadcrumb-home:hover {
  color: var(--text);
}

.breadcrumb-separator {
  margin: 0 8px;
  color: #CBD5E1;
  font-weight: 300;
  user-select: none;
}

.breadcrumb-item.current {
  color: var(--text);
  font-weight: 500;
}

.topbar-hamburger {
  display: none;
  width: 32px;
  height: 32px;
  place-items: center;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.topbar-hamburger:hover {
  color: var(--text);
  background: var(--hover);
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
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  color: var(--text);
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 12px;
  font-size: 12.5px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.topbar-account span {
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: var(--text-muted);
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.topbar-icon:hover {
  color: var(--text);
  border-color: rgba(15, 23, 42, 0.15);
}

.topbar-login,
.topbar-login-mini {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  color: #2563EB;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 12px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}

.topbar-login:hover,
.topbar-login-mini:hover {
  background: rgba(37, 99, 235, 0.14);
}

.topbar-dock-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  color: var(--text-muted);
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  transition: all 0.18s ease;
}

.topbar-dock-btn:hover {
  color: #2563EB;
  border-color: rgba(37, 99, 235, 0.2);
  background: #F8FAFC;
}

.topbar-dock-btn.active {
  color: #2563EB;
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.18);
  font-weight: 500;
}

.topbar-account-mini {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  color: var(--text-muted);
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  transition: all 0.18s ease;
}

.topbar-account-mini:hover {
  color: var(--text);
  border-color: rgba(15, 23, 42, 0.15);
}

.topbar-user-name {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1000px) {
  .topbar-hamburger {
    display: grid;
  }
}

@media (max-width: 640px) {
  .app-topbar {
    padding: 0 16px;
  }
  .dock-btn-label {
    display: none;
  }
  .topbar-dock-btn {
    padding: 0 8px;
  }
}
</style>
