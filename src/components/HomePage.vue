<script setup lang="ts">
import {
  ArrowDown,
  ArrowRight,
  Brain,
  Check,
  Cloud,
  Compass,
  HeartHandshake,
  MessageCircleMore,
  NotebookPen,
  ShieldCheck,
} from '@lucide/vue'
import type { Component } from 'vue'
import { modules } from '../modules'
import type { ModuleId } from '../types'
import Prism from './Prism.vue'
import ScrollStack from './ScrollStack.vue'

defineProps<{
  userName: string | null
}>()

const emit = defineEmits<{
  start: []
  enter: [id: ModuleId]
}>()

const sellingPoints = [
  '双模式陪伴：学业规划梳理+日常情绪疏导',
  '三维服务体系：学业支持、认知培育、情绪疏导',
  '轻量化交互设计，适配初中学习成长节奏',
  '坚持以人为本，充分尊重个人意愿与心理边界',
]

const moduleIcons: Record<ModuleId, Component> = {
  study: NotebookPen,
  thought: Brain,
  emotion: HeartHandshake,
}

const introExample = '云小舒，介绍一下你自己，说说你能帮我做什么。'

const conversationFlow = [
  { title: '说一件具体的事', description: '从作业、一次考试、一个想法或此刻的感受开始。' },
  { title: '一起看清重点', description: '通过简短问题区分事实、需要和最值得先处理的部分。' },
  { title: '由你选择下一步', description: '从几个可行的小动作中做决定，也可以只聊到这里。' },
]
</script>

<template>
  <main class="home-page">
    <div class="home-prism" aria-hidden="true">
      <Prism
        animation-type="3drotate"
        :time-scale="0.18"
        :height="3.3"
        :base-width="5.2"
        :scale="3.1"
        :hue-shift="-0.25"
        :color-frequency="0.72"
        :noise="0"
        :glow="0.94"
        :bloom="0.86"
      />
    </div>

    <section class="home-hero" aria-labelledby="home-title">
      <div class="home-hero-copy">
        <h1 id="home-title">云舒学伴</h1>
        <p class="home-slogan">云舒少年忧，学伴逐光游</p>
        <p class="home-summary">面向青少年学业发展与心理健康的一体化智能助手，结合初中学生身心发展特点，搭建学业辅导与轻量化情绪陪伴体系，致力于成为青少年值得信任的成长伙伴，让成长不再孤单。</p>
        <button type="button" class="start-chat-button" @click="emit('start')">
          <MessageCircleMore :size="20" :stroke-width="1.8" />
          <span>{{ userName ? '开始对话' : '登录后开始对话' }}</span>
          <ArrowRight :size="19" :stroke-width="1.8" />
        </button>
      </div>
      <div class="home-scroll-cue" aria-hidden="true">
        <span>继续了解</span>
        <ArrowDown :size="16" :stroke-width="1.7" />
      </div>
    </section>

    <section class="home-story" aria-labelledby="story-title">
      <div class="home-story-inner">
        <header class="home-story-copy">
          <h2 id="story-title">让成长不再孤单</h2>
          <p>云舒学伴定位于学业支持与心理关怀的辅助型智能工具，打造学业辅导＋轻量化情绪陪伴双服务体系，意在协助青少年梳理学习规划、厘清认知思路，同时引导个体觉察、梳理与调节情绪状态，将学业与心理层面的复杂困境条理化、具象化，护航青少年身心协同发展。</p>
          <div class="story-notice">
            <Compass :size="19" :stroke-width="1.7" aria-hidden="true" />
            <span>使用须知：平台不会代替用户完成课业任务，亦不会代为作出重要决策。用户拥有充分对话自主权，可随时变更交互形式、跳过议题或终止本次对话。</span>
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
            <p>我是云小舒，专为青少年打造的AI成长助手。我打破传统智能学习的单一答疑局限，兼具学业辅导与情绪陪伴双重能力。既能帮你拆解学习难点、提升学习效率，也能温柔疏导学业压力与青春期负面情绪，陪你轻松治学、舒心成长。</p>
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
          <p>云舒学伴不进行心理诊断、测评或风险分级，也不替代老师、监护人或专业机构。遇到紧迫危险时，请立即联系身边可信任的成年人或紧急服务。</p>
        </div>
      </div>
    </section>
  </main>
</template>
