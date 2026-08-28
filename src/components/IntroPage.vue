<script setup lang="ts">
import {
  ArrowRight,
  Check,
  Cloud,
  Compass,
  HeartHandshake,
  MessageCircleMore,
  NotebookPen,
  Brain,
  ClipboardList,
  ShieldCheck,
} from '@lucide/vue'
import type { Component } from 'vue'
import { modules } from '../modules'
import type { ModuleId } from '../types'
import ScrollStack from './ScrollStack.vue'

defineProps<{
  userName: string | null
}>()

const emit = defineEmits<{
  start: []
  enter: [id: ModuleId]
}>()

const sellingPoints = [
  '学习上：陪你拆任务、理错题',
  '心情上：听你说，陪你慢慢放松',
  '节奏由你定，随时可以停',
  '不评判、不说教，只陪你',
]

const moduleIcons: Record<ModuleId, Component> = {
  study: NotebookPen,
  thought: Brain,
  emotion: HeartHandshake,
  records: ClipboardList,
}

const introExample = '云小舒，介绍一下你自己，说说你能帮我做什么。'

const conversationFlow = [
  { title: '说一件具体的事', description: '从作业、一次考试、一个想法或此刻的感受开始。' },
  { title: '一起看清重点', description: '我会问几个小问题，帮你分清事实和感受，先挑最重要的。' },
  { title: '由你选择下一步', description: '从几个可行的小动作中做决定，也可以只聊到这里。' },
]
</script>

<template>
  <main class="home-page">
    <section class="home-story" aria-labelledby="story-title">
      <div class="home-story-inner">
        <header class="home-story-copy">
          <h2 id="story-title">让成长不再孤单</h2>
          <p>云舒学伴是一个陪你学习、也听你聊心情的伙伴。它帮你把任务拆小、把想法理清楚、把心情说出来，一步一步慢慢来。</p>
          <div class="story-notice">
            <Compass :size="19" :stroke-width="1.7" aria-hidden="true" />
            <span>它不会替你写作业或做决定，也会听你的节奏——不想聊的可以随时跳过或停下。</span>
          </div>
        </header>

        <ScrollStack class="capability-list">
          <article :style="{ '--stack-index': 0, '--stack-top': '92px' }">
            <header class="capability-card-header">
              <span class="capability-icon" aria-hidden="true">
                <Cloud :size="21" :stroke-width="1.6" />
              </span>
              <span>认识云小舒</span>
            </header>
            <h3>你好，我叫云小舒</h3>
            <p>我是云小舒。学习上，我陪你把任务拆小、把错题理清楚；心情上，我听你说，陪你慢慢放松。你不用组织好语言再来，想到什么说什么。</p>
            <ul>
              <li v-for="point in sellingPoints" :key="point">
                <Check :size="15" :stroke-width="2" aria-hidden="true" />
                <span>{{ point }}</span>
              </li>
            </ul>
            <div class="capability-prompt">
              <MessageCircleMore :size="17" :stroke-width="1.7" aria-hidden="true" />
              <span><small>你可以这样开口</small>{{ introExample }}</span>
            </div>
          </article>

          <article
            v-for="(module, index) in modules"
            :key="module.id"
            :style="{ '--stack-index': index + 1, '--stack-top': `${106 + index * 14}px` }"
          >
            <header class="capability-card-header">
              <span class="capability-icon" aria-hidden="true">
                <component :is="moduleIcons[module.id]" :size="21" :stroke-width="1.6" />
              </span>
              <span>{{ module.label }}</span>
            </header>
            <h3>{{ module.title }}</h3>
            <p>{{ module.description }}</p>
            <ul>
              <li v-for="feature in module.features" :key="feature">
                <Check :size="15" :stroke-width="2" aria-hidden="true" />
                <span>{{ feature }}</span>
              </li>
            </ul>
            <div class="capability-prompt">
              <MessageCircleMore :size="17" :stroke-width="1.7" aria-hidden="true" />
              <span><small>示例输入</small>{{ module.exampleInput }}</span>
            </div>
            <button type="button" class="capability-enter" @click="emit('enter', module.id)">
              进入{{ module.label }}
              <ArrowRight :size="15" :stroke-width="1.8" aria-hidden="true" />
            </button>
          </article>
        </ScrollStack>
      </div>
    </section>

    <section class="home-how" aria-labelledby="flow-title">
      <div class="home-how-inner">
        <header>
          <h2 id="flow-title">一次对话怎样进行</h2>
          <p>你可以按自己的节奏慢慢说，每次只处理此刻最想谈的一小部分。</p>
        </header>
        <ol class="conversation-flow">
          <li v-for="(item, index) in conversationFlow" :key="item.title">
            <span>{{ index + 1 }}</span>
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
            </div>
          </li>
        </ol>
        <div class="home-boundary">
          <ShieldCheck :size="19" :stroke-width="1.7" aria-hidden="true" />
          <p>云小舒不是医生或老师，不做诊断、不给你贴标签。如果真的遇到危险，请马上告诉身边你信任的大人，或拨打紧急电话。</p>
        </div>
      </div>
    </section>
  </main>
</template>
