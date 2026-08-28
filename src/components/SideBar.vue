<script setup lang="ts">
import {
  Compass,
  LogIn,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
} from '@lucide/vue'
import LineSidebar from './LineSidebar.vue'
import type { Conversation, PsychConsent } from '../types'

defineProps<{
  conversations: Conversation[]
  activeConversationId: string | null
  psychConsent: PsychConsent
  userName: string
  authReady: boolean
  collapsed: boolean
}>()

const emit = defineEmits<{
  home: []
  newChat: []
  openMenu: []
  selectConversation: [id: string]
  deleteConversation: [id: string]
  guide: []
  safety: []
  account: []
  logout: []
  login: []
  toggleCollapse: []
}>()
</script>

<template>
  <aside class="app-sidebar" :class="{ collapsed }">
    <div class="sidebar-top">
      <button class="sidebar-brand" type="button" aria-label="回到首页" @click="emit('home')">
        <div class="brand-mark" aria-hidden="true">
          <Sparkles :size="20" :stroke-width="1.8" />
        </div>
        <div v-if="!collapsed" class="sidebar-brand-text">
          <strong>云舒学伴</strong>
          <span>让成长不再孤单</span>
        </div>
      </button>
      <button
        class="sidebar-collapse"
        type="button"
        :title="collapsed ? '展开侧栏' : '收起侧栏'"
        :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
        @click="emit('toggleCollapse')"
      >
        <PanelLeftOpen v-if="collapsed" :size="16" :stroke-width="1.8" />
        <PanelLeftClose v-else :size="16" :stroke-width="1.8" />
      </button>
    </div>

    <div class="sidebar-actions">
      <button class="sidebar-primary" type="button" :title="'新对话'" @click="emit('newChat')">
        <Plus :size="16" :stroke-width="1.9" />
        <span v-if="!collapsed">新对话</span>
      </button>
      <button class="sidebar-menu" type="button" :title="'想做点什么'" @click="emit('openMenu')">
        <Sparkles :size="16" :stroke-width="1.8" />
        <span v-if="!collapsed">想做点什么</span>
      </button>
    </div>

    <div v-if="!collapsed" class="sidebar-history">
      <p class="sidebar-history-label">历史对话</p>
      <LineSidebar
        :items="conversations"
        :active-id="activeConversationId"
        @select="emit('selectConversation', $event)"
        @delete="emit('deleteConversation', $event)"
      />
    </div>

    <div class="sidebar-footer">
      <button class="sidebar-foot" type="button" :title="'新手引导'" @click="emit('guide')">
        <Compass :size="16" :stroke-width="1.8" />
        <span v-if="!collapsed">新手引导</span>
      </button>
      <button class="sidebar-foot safety" type="button" :title="'安全求助'" @click="emit('safety')">
        <ShieldCheck :size="16" :stroke-width="1.8" />
        <span v-if="!collapsed">安全求助</span>
      </button>

      <div v-if="userName" class="sidebar-account">
        <button class="sidebar-foot" type="button" :title="'设置你的称呼'" @click="emit('account')">
          <UserRound :size="16" :stroke-width="1.7" />
          <span v-if="!collapsed">{{ userName }}</span>
        </button>
        <button v-if="!collapsed" class="sidebar-logout" type="button" title="退出登录" aria-label="退出登录" @click="emit('logout')">
          <LogOut :size="16" :stroke-width="1.8" />
        </button>
      </div>
      <button v-else class="sidebar-login" type="button" :title="'登录'" :disabled="!authReady" @click="emit('login')">
        <LogIn :size="16" :stroke-width="1.8" />
        <span v-if="!collapsed">{{ !authReady ? '正在检查...' : '登录' }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.app-sidebar {
  display: flex;
  width: 264px;
  flex: 0 0 264px;
  flex-direction: column;
  min-height: 0;
  background: var(--surface-soft);
  border-right: 1px solid var(--line);
  transition: width 0.2s ease, flex-basis 0.2s ease;
}

.app-sidebar.collapsed {
  width: 64px;
  flex: 0 0 64px;
}

.sidebar-top {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 12px 10px;
}

.sidebar-brand {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 12px;
  color: var(--text);
  background: transparent;
  border: 0;
  text-align: left;
}

.collapsed .sidebar-brand {
  justify-content: center;
}

.sidebar-brand .brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  color: #FFFFFF;
  background: var(--ink);
  border-radius: 10px;
}

.sidebar-brand-text strong {
  display: block;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}

.sidebar-brand-text span {
  display: block;
  margin-top: 2px;
  color: var(--text-soft);
  font-size: 11px;
}

.sidebar-collapse {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  color: var(--text-soft);
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.sidebar-collapse:hover {
  color: var(--text);
  background: var(--hover);
}

.collapsed .sidebar-collapse {
  margin: 0 auto;
}

.sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 12px 12px;
}

.collapsed .sidebar-actions {
  padding: 4px 10px 12px;
}

.sidebar-primary,
.sidebar-menu {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  border: 0;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.18s ease;
}

.sidebar-primary {
  color: #FFFFFF;
  background: var(--ink);
}

.sidebar-primary:hover {
  background: var(--ink-hover);
}

.sidebar-menu {
  color: var(--text);
  background: #FFFFFF;
  border: 1px solid var(--line);
}

.sidebar-menu:hover {
  border-color: var(--accent);
  color: var(--accent-strong);
}

.sidebar-history {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 4px 12px;
}

.sidebar-history-label {
  margin: 0 0 6px 4px;
  color: var(--text-soft);
  font-size: 11.5px;
  font-weight: 500;
}

.sidebar-history :deep(.line-sidebar) {
  flex: 1;
  min-height: 0;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px 14px;
  border-top: 1px solid var(--line);
}

.collapsed .sidebar-footer {
  padding: 10px 8px 14px;
  align-items: center;
}

.sidebar-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 8px;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 8px;
  font-size: 13px;
  text-align: left;
  transition: all 0.18s ease;
}

.collapsed .sidebar-foot {
  justify-content: center;
  padding: 9px 0;
  width: 40px;
}

.sidebar-foot:hover {
  color: var(--text);
  background: var(--hover);
}

.sidebar-foot.safety:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.sidebar-account {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sidebar-account .sidebar-foot {
  flex: 1;
  min-width: 0;
}

.sidebar-account .sidebar-foot span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-logout {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.sidebar-logout:hover {
  color: var(--text);
  background: var(--hover);
}

.sidebar-login {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  color: #FFFFFF;
  background: var(--ink);
  border: 0;
  border-radius: 10px;
  font-size: 14px;
}

.collapsed .sidebar-login {
  width: 40px;
}

.sidebar-login:hover {
  background: var(--ink-hover);
}

.sidebar-login:disabled {
  opacity: 0.6;
}
</style>
