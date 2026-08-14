<script setup lang="ts">
import {
  ArrowUp,
  BookOpenCheck,
  Heart,
  LoaderCircle,
  LogOut,
  MessageCircleMore,
  Plus,
  ShieldCheck,
  Stars,
} from '@lucide/vue'
import { nextTick, ref, watch } from 'vue'
import type { ChatMessage, ModuleDefinition } from '../types'
import ShinyText from './ShinyText.vue'
import SplitText from './SplitText.vue'

const props = defineProps<{
  module: ModuleDefinition
  messages: ChatMessage[]
  modelValue: string
  userName: string
  sending: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
  starter: [prompt: string]
  newChat: []
  safety: []
  logout: []
}>()

const messageList = ref<HTMLElement | null>(null)

watch(
  () => props.messages.map((message) => message.text.length),
  async () => {
    await nextTick()
    messageList.value?.scrollTo({
      top: messageList.value.scrollHeight,
      behavior: 'smooth',
    })
  },
  { deep: true },
)

const handleKeydown = (event: KeyboardEvent) => {
  if (props.sending) return
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    emit('send')
  }
}
</script>

<template>
  <main class="chat-workspace">
    <header class="chat-header">
      <div class="chat-header-title">
        <div>
          <strong>{{ module.label }}</strong>
          <span>学习支持、认知建构与轻量情绪调节</span>
        </div>
      </div>
      <div class="mobile-header-actions">
        <button
          class="mobile-new-chat-button"
          type="button"
          title="新对话"
          aria-label="新对话"
          @click="emit('newChat')"
        >
          <Plus :size="19" :stroke-width="1.8" />
        </button>
        <button
          class="mobile-safety-button"
          type="button"
          title="安全求助"
          aria-label="打开安全求助"
          @click="emit('safety')"
        >
          <ShieldCheck :size="19" :stroke-width="1.8" />
          <span>求助</span>
        </button>
        <button
          class="mobile-account-button"
          type="button"
          :title="`退出 ${userName}`"
          aria-label="退出登录"
          @click="emit('logout')"
        >
          <LogOut :size="18" :stroke-width="1.8" />
        </button>
      </div>
    </header>

    <section
      ref="messageList"
      class="message-list"
      aria-label="对话内容"
      role="log"
      aria-live="polite"
      :aria-busy="sending"
    >
      <div v-if="messages.length === 0" class="welcome-state">
        <div class="welcome-visual" :style="{ '--module-accent': module.accent }">
          <BookOpenCheck :size="32" :stroke-width="1.5" />
          <Heart class="welcome-heart" :size="17" :stroke-width="1.8" />
          <Stars class="welcome-stars" :size="18" :stroke-width="1.6" />
        </div>
        <SplitText :text="module.title" />
        <p>{{ module.description }}</p>
        <div class="starter-grid">
          <button
            v-for="starter in module.starters"
            :key="starter"
            type="button"
            @click="emit('starter', starter)"
          >
            <span>{{ starter }}</span>
            <ArrowUp :size="16" :stroke-width="1.8" aria-hidden="true" />
          </button>
        </div>
      </div>

      <TransitionGroup v-else name="message" tag="div" class="message-thread">
        <article
          v-for="message in messages"
          :key="message.id"
          class="message-row"
          :class="message.role"
        >
          <div v-if="message.role === 'assistant'" class="assistant-avatar" aria-hidden="true">
            <MessageCircleMore :size="17" :stroke-width="1.8" />
          </div>
          <div class="message-content">
            <div class="message-meta">
              <strong>{{ message.role === 'assistant' ? '云小舒' : '你' }}</strong>
              <time>{{ message.time }}</time>
            </div>
            <ShinyText
              v-if="message.role === 'assistant' && message.status === 'streaming' && !message.text"
              text="正在思考..."
            />
            <p v-else>{{ message.text }}</p>
            <small v-if="message.status === 'stopped'">已停止生成</small>
            <small v-else-if="message.status === 'error'">回复失败，请稍后重试</small>
          </div>
        </article>
      </TransitionGroup>
    </section>

    <footer class="composer-area">
      <div class="composer-box" :class="{ focused: modelValue.length > 0 }">
        <textarea
          :value="modelValue"
          rows="1"
          maxlength="1000"
          :disabled="sending"
          :placeholder="`和云小舒聊聊${module.id === 'chat' ? '' : module.label}`"
          aria-label="输入消息"
          @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
          @keydown="handleKeydown"
        />
        <div class="composer-actions">
          <span class="composer-mode">{{ module.shortLabel }}</span>
          <button
            class="send-button"
            type="button"
            :title="sending ? '正在回复' : '发送'"
            :aria-label="sending ? '正在回复' : '发送消息'"
            :disabled="sending || !modelValue.trim()"
            @click="emit('send')"
          >
            <LoaderCircle v-if="sending" class="send-spinner" :size="18" :stroke-width="1.8" />
            <ArrowUp v-else :size="19" :stroke-width="2" />
          </button>
        </div>
      </div>
      <p>重要决定请与可信任的成年人共同确认；结构化记录仅在你确认后保存。</p>
    </footer>
  </main>
</template>
