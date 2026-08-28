<script setup lang="ts">
import {
  ArrowUp,
  Check,
  LoaderCircle,
  MessageCircleMore,
  MessageSquareText,
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
    <section
      ref="messageList"
      class="message-list"
      aria-label="对话内容"
      role="log"
      aria-live="polite"
      :aria-busy="sending"
    >
      <div v-if="messages.length === 0" class="welcome-state">
        <SplitText :text="module.title" class="welcome-title" />
        <p class="welcome-description">{{ module.description }}</p>
        <ul class="welcome-features">
          <li v-for="feature in module.features" :key="feature">
            <Check :size="14" :stroke-width="2" aria-hidden="true" />
            <span>{{ feature }}</span>
          </li>
        </ul>
        <div class="welcome-example-wrap">
          <small>示例输入</small>
          <button
            class="welcome-example"
            type="button"
            @click="emit('starter', module.exampleInput)"
          >
            <MessageSquareText :size="16" :stroke-width="1.8" aria-hidden="true" />
            <span>{{ module.exampleInput }}</span>
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
          maxlength="500"
          :disabled="sending"
          placeholder="想聊点什么？学习、心情都可以"
          aria-label="输入消息"
          @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
          @keydown="handleKeydown"
        />
        <div class="composer-actions">
          <span
            v-if="modelValue.length >= 400"
            class="composer-count"
            :class="{ full: modelValue.length >= 500 }"
          >{{ modelValue.length }}/500</span>
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
    </footer>
  </main>
</template>
