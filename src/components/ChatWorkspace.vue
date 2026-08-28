<script setup lang="ts">
import {
  ArrowUp,
  Check,
  LoaderCircle,
  MessageCircleMore,
  MessageSquareText,
  Paperclip,
  X,
} from '@lucide/vue'
import { nextTick, ref, watch } from 'vue'
import { uploadAttachment } from '../chat-api'
import type { ChatAttachment, ChatMessage, ModuleDefinition } from '../types'
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
  send: [attachments: ChatAttachment[]]
  starter: [prompt: string]
}>()

const messageList = ref<HTMLElement | null>(null)

// 附件上传限制：数量/大小/类型
const MAX_FILES = 5
const MAX_SIZE = 6 * 1024 * 1024
const ACCEPT = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md'
const attachments = ref<ChatAttachment[]>([])
const uploading = ref(false)
const uploadError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const isAllowedType = (file: File) =>
  file.type.startsWith('image/') ||
  /\.(png|jpe?g|gif|webp|pdf|docx?|xlsx?|pptx?|txt|md)$/i.test(file.name)

const onPickFiles = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  uploadError.value = ''
  for (const file of files) {
    if (attachments.value.length >= MAX_FILES) { uploadError.value = `最多上传 ${MAX_FILES} 个文件`; break }
    if (!isAllowedType(file)) { uploadError.value = `「${file.name}」不支持，仅支持图片或常见文档`; continue }
    if (file.size > MAX_SIZE) { uploadError.value = `「${file.name}」超过 6MB`; continue }
    uploading.value = true
    try {
      attachments.value = [...attachments.value, await uploadAttachment(file)]
    } catch (error) {
      uploadError.value = error instanceof Error ? error.message : '上传失败'
    } finally {
      uploading.value = false
    }
  }
}

const removeAttachment = (index: number) => {
  attachments.value = attachments.value.filter((_, i) => i !== index)
}

const doSend = () => {
  const list = attachments.value
  attachments.value = []
  emit('send', list)
}

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
    doSend()
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
        <div v-if="attachments.length || uploadError" class="composer-files">
          <span v-for="(file, i) in attachments" :key="file.fileKey || i" class="file-chip">
            {{ file.fileName }}
            <button type="button" aria-label="移除附件" @click="removeAttachment(i)">
              <X :size="13" :stroke-width="2" />
            </button>
          </span>
          <span v-if="uploadError" class="file-error">{{ uploadError }}</span>
        </div>
        <div class="composer-actions">
          <input
            ref="fileInput"
            type="file"
            multiple
            :accept="ACCEPT"
            hidden
            @change="onPickFiles"
          />
          <button
            class="attach-button"
            type="button"
            title="上传图片或文档（最多5个，单个≤6MB）"
            aria-label="上传附件"
            :disabled="uploading || sending"
            @click="fileInput?.click()"
          >
            <LoaderCircle v-if="uploading" class="send-spinner" :size="16" :stroke-width="1.8" />
            <Paperclip v-else :size="16" :stroke-width="1.8" />
          </button>
          <span
            v-if="modelValue.length >= 400"
            class="composer-count"
            :class="{ full: modelValue.length >= 500 }"
          >{{ modelValue.length }}/500</span>
          <button
            class="send-button"
            type="button"
            :title="sending ? '正在回复' : '发送'"
            :aria-label="sending ? '正在回复' : '发送消息'"
            :disabled="sending || (!modelValue.trim() && attachments.length === 0)"
            @click="doSend"
          >
            <LoaderCircle v-if="sending" class="send-spinner" :size="18" :stroke-width="1.8" />
            <ArrowUp v-else :size="19" :stroke-width="2" />
          </button>
        </div>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.composer-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px 0;
}

.file-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 180px;
  padding: 4px 8px;
  color: var(--text-muted);
  background: var(--surface-muted);
  border-radius: 8px;
  font-size: 12px;
}

.file-chip > button {
  display: grid;
  place-items: center;
  color: var(--text-soft);
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.file-chip > button:hover {
  color: var(--danger);
}

.file-error {
  color: var(--danger);
  font-size: 12px;
  align-self: center;
}

.attach-button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 9px;
  transition: all 0.18s ease;
}

.attach-button:hover {
  color: var(--accent-strong);
  background: var(--hover);
}

.attach-button:disabled {
  opacity: 0.5;
}
</style>
