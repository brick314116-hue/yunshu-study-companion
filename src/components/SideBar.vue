<script setup lang="ts">
import {
  ClipboardList,
  Clock,
  Compass,
  LogIn,
  LogOut,
  MessageCircleMore,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wind,
} from '@lucide/vue'
import LineSidebar from './LineSidebar.vue'
import type { AppTab, Conversation, PsychConsent } from '../types'

defineProps<{
  conversations: Conversation[]
  activeConversationId: string | null
  psychConsent: PsychConsent
  userName: string
  authReady: boolean
  collapsed: boolean
  activeTab?: AppTab
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
  checkin: []
  selectTab: [tab: AppTab]
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

    <!-- 四大工作区切换 -->
    <nav class="sidebar-workspaces" aria-label="工作区导航">
      <div v-if="!collapsed" class="workspaces-header">工作区</div>
      <button
        type="button"
        class="workspace-tab-btn"
        :class="{ active: activeTab === 'chat' }"
        :title="'会话中枢'"
        @click="emit('selectTab', 'chat')"
      >
        <MessageCircleMore :size="16" :stroke-width="1.8" />
        <span v-if="!collapsed">会话中枢</span>
      </button>
      <button
        type="button"
        class="workspace-tab-btn"
        :class="{ active: activeTab === 'focus' }"
        :title="'专注自习室'"
        @click="emit('selectTab', 'focus')"
      >
        <Clock :size="16" :stroke-width="1.8" />
        <span v-if="!collapsed">专注自习室</span>
      </button>
      <button
        type="button"
        class="workspace-tab-btn"
        :class="{ active: activeTab === 'mind' }"
        :title="'心灵避风港'"
        @click="emit('selectTab', 'mind')"
      >
        <Wind :size="16" :stroke-width="1.8" />
        <span v-if="!collapsed">心灵避风港</span>
      </button>
      <button
        type="button"
        class="workspace-tab-btn"
        :class="{ active: activeTab === 'footprint' }"
        :title="'成长足迹'"
        @click="emit('selectTab', 'footprint')"
      >
        <ShieldCheck :size="16" :stroke-width="1.8" />
        <span v-if="!collapsed">成长足迹</span>
      </button>
    </nav>

    <div class="sidebar-actions">
      <button class="sidebar-primary" type="button" :title="'新对话'" @click="emit('newChat')">
        <Plus :size="16" :stroke-width="1.9" />
        <span v-if="!collapsed">新对话</span>
      </button>
      <button class="sidebar-menu" type="button" :title="'伴学锦囊'" @click="emit('openMenu')">
        <Sparkles :size="16" :stroke-width="1.8" />
        <span v-if="!collapsed">伴学锦囊</span>
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
      <button class="sidebar-foot checkin" type="button" :title="'情绪打卡'" @click="emit('checkin')">
        <ClipboardList :size="16" :stroke-width="1.8" />
        <span v-if="!collapsed">情绪打卡</span>
      </button>
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

.collapsed .sidebar-top {
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 0 10px;
}

.collapsed .sidebar-brand {
  flex: 0 0 auto;
  justify-content: center;
}

.sidebar-brand .brand-mark {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  color: #FFFFFF;
  background: linear-gradient(135deg, #2563EB, #3B82F6);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
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

.sidebar-workspaces {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 12px 10px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 6px;
}

.collapsed .sidebar-workspaces {
  padding: 4px 8px 10px;
  align-items: center;
}

.workspaces-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 4px 6px;
}

.workspace-tab-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font-size: 13.5px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.collapsed .workspace-tab-btn {
  width: 40px;
  justify-content: center;
  padding: 0;
}

.workspace-tab-btn:hover {
  background: rgba(15, 23, 42, 0.04);
  color: var(--text);
}

.workspace-tab-btn.active {
  background: #FFFFFF;
  color: #1E293B;
  border-color: rgba(15, 23, 42, 0.06);
  font-weight: 600;
  box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.04);
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
  height: 38px;
  border-radius: 14px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}

.sidebar-primary {
  color: #2563EB;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.15);
}

.sidebar-primary:hover {
  background: rgba(37, 99, 235, 0.14);
  color: #1D4ED8;
  border-color: rgba(37, 99, 235, 0.25);
}

.sidebar-menu {
  color: #475569;
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.sidebar-menu:hover {
  background: #F8FAFC;
  border-color: rgba(15, 23, 42, 0.12);
  color: #1E293B;
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
  padding: 8px 10px;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 12px;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.collapsed .sidebar-foot {
  justify-content: center;
  padding: 8px 0;
  width: 40px;
}

.sidebar-foot:hover {
  color: var(--text);
  background: rgba(15, 23, 42, 0.04);
}

.sidebar-foot.safety:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.sidebar-foot.checkin:hover {
  color: var(--accent-strong);
  background: var(--accent-soft);
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
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.sidebar-logout:hover {
  color: var(--text);
  background: rgba(15, 23, 42, 0.04);
}

.sidebar-login {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 38px;
  color: #2563EB;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}

.collapsed .sidebar-login {
  width: 40px;
}

.sidebar-login:hover {
  background: rgba(37, 99, 235, 0.14);
}

.sidebar-login:disabled {
  opacity: 0.6;
}

@media (max-width: 1000px) {
  .app-sidebar,
  .app-sidebar.collapsed {
    width: 100% !important;
    flex: 1 1 auto !important;
  }
}
</style>
