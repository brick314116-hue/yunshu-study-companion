<script setup lang="ts">
import {
  Brain,
  Cloud,
  HeartHandshake,
  History,
  LogIn,
  LogOut,
  NotebookPen,
  Plus,
  ShieldCheck,
  UserRound,
} from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Component } from 'vue'
import { modules } from '../modules'
import type { AppTab, Conversation, ModuleId, PsychConsent } from '../types'
import LineSidebar from './LineSidebar.vue'

const emit = defineEmits<{
  select: [tab: AppTab]
  newChat: []
  selectConversation: [id: string]
  deleteConversation: [id: string]
  safety: []
  account: []
  logout: []
  login: []
}>()

const props = defineProps<{
  activeTab: AppTab
  conversations: Conversation[]
  activeConversationId: string | null
  psychConsent: PsychConsent
  userName: string
  authReady: boolean
}>()

const visibleModules = computed(() => props.psychConsent === 'declined'
  ? modules.filter((item) => item.id !== 'thought' && item.id !== 'emotion')
  : modules)

const moduleIcons: Record<ModuleId, Component> = {
  study: NotebookPen,
  thought: Brain,
  emotion: HeartHandshake,
}

const historyOpen = ref(false)
const historyPanel = ref<HTMLElement | null>(null)
const historyButton = ref<HTMLElement | null>(null)

const toggleHistory = () => {
  historyOpen.value = !historyOpen.value
}

const closeHistory = (event: MouseEvent) => {
  if (!historyOpen.value) return
  const target = event.target as Node
  if (historyPanel.value?.contains(target) || historyButton.value?.contains(target)) return
  historyOpen.value = false
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') historyOpen.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', closeHistory)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', closeHistory)
  document.removeEventListener('keydown', onKeydown)
})

const onSelectConversation = (id: string) => {
  historyOpen.value = false
  emit('selectConversation', id)
}
</script>

<template>
  <header class="app-topbar">
    <button class="topbar-brand" type="button" aria-label="返回首页" @click="emit('select', 'home')">
      <div class="brand-mark" aria-hidden="true">
        <Cloud :size="20" :stroke-width="1.8" />
      </div>
      <div>
        <strong>云舒学伴</strong>
        <span>让成长不再孤单</span>
      </div>
    </button>

    <nav class="topbar-tabs" aria-label="主导航">
      <button
        type="button"
        class="topbar-tab"
        :class="{ active: activeTab === 'home' }"
        :aria-current="activeTab === 'home' ? 'page' : undefined"
        @click="emit('select', 'home')"
      >
        <Cloud :size="17" :stroke-width="1.8" aria-hidden="true" />
        <span>认识云小舒</span>
      </button>
      <button
        v-for="item in visibleModules"
        :key="item.id"
        type="button"
        class="topbar-tab"
        :class="{ active: activeTab === item.id }"
        :aria-current="activeTab === item.id ? 'page' : undefined"
        @click="emit('select', item.id)"
      >
        <component :is="moduleIcons[item.id]" :size="17" :stroke-width="1.8" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="topbar-actions">
      <button class="topbar-action-button" type="button" @click="emit('newChat')">
        <Plus :size="16" :stroke-width="1.9" />
        <span>新对话</span>
      </button>

      <div class="history-entry">
        <button
          ref="historyButton"
          class="topbar-action-button"
          type="button"
          :class="{ active: historyOpen }"
          :aria-expanded="historyOpen"
          aria-haspopup="true"
          @click="toggleHistory"
        >
          <History :size="16" :stroke-width="1.8" />
          <span>历史对话</span>
        </button>
        <div v-if="historyOpen" ref="historyPanel" class="history-dropdown">
          <p class="history-dropdown-label">历史对话 <small>本次打开期间</small></p>
          <LineSidebar
            :items="conversations"
            :active-id="activeConversationId"
            @select="onSelectConversation"
            @delete="emit('deleteConversation', $event)"
          />
        </div>
      </div>

      <button
        class="topbar-action-button safety"
        type="button"
        title="需要帮助时立即打开"
        @click="emit('safety')"
      >
        <ShieldCheck :size="16" :stroke-width="1.8" />
        <span>安全求助</span>
      </button>

      <div v-if="userName" class="topbar-account">
        <button
          type="button"
          class="topbar-action-button account"
          title="设置你的称呼"
          @click="emit('account')"
        >
          <UserRound :size="16" :stroke-width="1.7" />
          <span>{{ userName }}</span>
        </button>
        <button
          type="button"
          class="topbar-icon-button"
          title="退出登录"
          aria-label="退出登录"
          @click="emit('logout')"
        >
          <LogOut :size="16" :stroke-width="1.8" />
        </button>
      </div>
      <button
        v-else
        class="topbar-action-button login"
        type="button"
        :disabled="!authReady"
        @click="emit('login')"
      >
        <LogIn :size="16" :stroke-width="1.8" />
        <span>{{ !authReady ? '正在检查...' : '登录' }}</span>
      </button>
    </div>
  </header>
</template>
