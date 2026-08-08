<script setup lang="ts">
import {
  Brain,
  CircleHelp,
  HeartHandshake,
  LogOut,
  MessageCircleMore,
  NotebookPen,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
} from '@lucide/vue'
import { computed } from 'vue'
import { modules } from '../modules'
import type { Conversation, ModuleId, PsychConsent } from '../types'
import GlareHover from './GlareHover.vue'
import LineSidebar from './LineSidebar.vue'

const emit = defineEmits<{
  home: []
  select: [id: ModuleId]
  newChat: []
  selectConversation: [id: string]
  deleteConversation: [id: string]
  safety: []
  logout: []
}>()

const props = defineProps<{
  activeModule: ModuleId
  conversations: Conversation[]
  activeConversationId: string | null
  psychConsent: PsychConsent
  userName: string
}>()

const visibleModules = computed(() => props.psychConsent === 'declined'
  ? modules.filter((item) => item.id !== 'thought' && item.id !== 'emotion')
  : modules)

const icons = {
  chat: MessageCircleMore,
  study: NotebookPen,
  thought: Brain,
  emotion: HeartHandshake,
  growth: Sparkles,
}

</script>

<template>
  <div class="app-navigation">
    <aside class="sidebar" aria-label="主导航">
    <button class="brand" type="button" aria-label="返回首页" @click="emit('home')">
      <div class="brand-mark" aria-hidden="true">
        <MessageCircleMore :size="20" :stroke-width="1.8" />
      </div>
      <div>
        <strong>云舒学伴</strong>
        <span>云小舒 · 学习与心理支持</span>
      </div>
    </button>

    <button class="new-chat-button" type="button" @click="emit('newChat')">
      <Plus :size="17" :stroke-width="1.8" />
      <span>新对话</span>
    </button>

    <nav class="module-nav" aria-label="支持模块">
      <p class="nav-label">支持模块</p>
      <GlareHover
        v-for="item in visibleModules"
        :key="item.id"
      >
        <button
          type="button"
          class="nav-item"
          :class="{ active: item.id === activeModule }"
          :aria-current="item.id === activeModule ? 'page' : undefined"
          @click="emit('select', item.id)"
        >
          <component :is="icons[item.id]" :size="18" :stroke-width="1.8" />
          <span>{{ item.label }}</span>
        </button>
      </GlareHover>
    </nav>

    <div class="recent-block">
      <div class="history-heading">
        <p class="nav-label">历史对话</p>
        <small>本次打开期间</small>
      </div>
      <LineSidebar
        :items="conversations"
        :active-id="activeConversationId"
        @select="emit('selectConversation', $event)"
        @delete="emit('deleteConversation', $event)"
      />
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-account">
        <span aria-hidden="true"><UserRound :size="18" :stroke-width="1.7" /></span>
        <div>
          <strong>{{ userName }}</strong>
          <small>CloudBase 账号</small>
        </div>
        <button type="button" title="退出登录" aria-label="退出登录" @click="emit('logout')">
          <LogOut :size="17" :stroke-width="1.8" />
        </button>
      </div>

      <button class="safety-nav-button" type="button" @click="emit('safety')">
        <ShieldCheck :size="18" :stroke-width="1.8" />
        <span>
          <strong>安全求助</strong>
          <small>需要帮助时立即打开</small>
        </span>
        <CircleHelp :size="16" :stroke-width="1.8" aria-hidden="true" />
      </button>
    </div>
    </aside>

    <nav
      class="mobile-nav"
      aria-label="移动端模块导航"
      :style="{ gridTemplateColumns: `repeat(${visibleModules.length}, minmax(0, 1fr))` }"
    >
      <button
        v-for="item in visibleModules"
        :key="item.id"
        type="button"
        :class="{ active: item.id === activeModule }"
        :aria-current="item.id === activeModule ? 'page' : undefined"
        @click="emit('select', item.id)"
      >
        <component :is="icons[item.id]" :size="20" :stroke-width="1.8" />
        <span>{{ item.shortLabel }}</span>
      </button>
    </nav>
  </div>
</template>
