<script setup lang="ts">
import { History, Trash2 } from '@lucide/vue'
import { ref } from 'vue'
import type { Conversation } from '../types'
import AnimatedList from './AnimatedList.vue'

defineProps<{
  items: Conversation[]
  activeId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  delete: [id: string]
}>()

const pendingDeleteId = ref<string | null>(null)

const selectConversation = (id: string) => {
  pendingDeleteId.value = null
  emit('select', id)
}

const requestDelete = (id: string) => {
  if (pendingDeleteId.value === id) {
    emit('delete', id)
    pendingDeleteId.value = null
    return
  }
  pendingDeleteId.value = id
}

const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const sameDay = date.toDateString() === new Date().toDateString()
  return new Intl.DateTimeFormat('zh-CN', sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { month: 'numeric', day: 'numeric' }).format(date)
}
</script>

<template>
  <div class="line-sidebar">
    <p v-if="items.length === 0" class="history-empty">还没有历史对话</p>
    <AnimatedList v-else :items="items">
      <template #item="{ item }">
        <div class="line-node" :class="{ active: item.id === activeId }">
          <button
            type="button"
            class="line-node-main"
            :aria-current="item.id === activeId ? 'true' : undefined"
            @click="selectConversation(item.id)"
          >
            <History :size="15" :stroke-width="1.7" aria-hidden="true" />
            <span>
              <strong :title="item.title">{{ item.title }}</strong>
              <small>{{ formatTime(item.updatedAt) }}</small>
            </span>
          </button>
          <button
            type="button"
            class="line-node-delete"
            :class="{ confirming: pendingDeleteId === item.id }"
            :title="pendingDeleteId === item.id ? '再次点击确认删除' : `删除对话：${item.title}`"
            :aria-label="pendingDeleteId === item.id ? '再次点击确认删除' : `删除对话：${item.title}`"
            @click="requestDelete(item.id)"
          >
            <Trash2 :size="14" :stroke-width="1.8" />
          </button>
        </div>
      </template>
    </AnimatedList>
  </div>
</template>
