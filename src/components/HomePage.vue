<script setup lang="ts">
import {
  ArrowDown,
  ArrowRight,
  Brain,
  Check,
  Cloud,
  Compass,
  HeartHandshake,
  LogIn,
  LogOut,
  MessageCircleMore,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  UserRound,
} from '@lucide/vue'
import Prism from './Prism.vue'
import BorderGlow from './BorderGlow.vue'
import ScrollStack from './ScrollStack.vue'

defineProps<{
  userName: string | null
  authReady: boolean
}>()

const emit = defineEmits<{
  start: []
  safety: []
  login: []
  logout: []
}>()

const capabilities = [
  {
    icon: NotebookPen,
    label: '学业支持',
    title: '把任务缩到现在能开始的一步',
    description: '当作业太多、计划太乱或不知道从哪里动手时，先找到一个五分钟内能完成的动作。',
    points: ['拆分作业与复习任务', '安排短时学习段', '按四个角度复盘错题'],
    prompt: '帮我把今天最难开始的作业拆成第一步。',
  },
  {
    icon: Brain,
    label: '认知建构',
    title: '把经历整理成更完整的理解',
    description: '从事件、想法、情绪与影响出发，在ABC结构中寻找证据、反证据和可检验的替代解释，逐步搭起你自己的理解。',
    points: ['区分事件、想法与情绪', '寻找支持与不支持的证据', '形成中性、可检验的替代解释'],
    prompt: '我总觉得一次没做好就说明我不行，带我做一次ABC练习。',
  },
  {
    icon: HeartHandshake,
    label: '情绪调节',
    title: '先安顿此刻，再决定要不要继续',
    description: '当焦虑、烦躁或压力影响学习时，用轻量化心理陪伴承接此刻，再从情绪命名、呼吸放松、感官着陆或简短书写中选择一种适合你的方式。',
    points: ['为感受找到更准确的名字', '选择呼吸、着陆或书写练习', '暂停学习任务，并在准备好后继续'],
    prompt: '我现在有点慌，想先照顾好情绪，再决定要不要继续学习。',
  },
  {
    icon: Sparkles,
    label: '短期记录',
    title: '只保存你确认过的结构化摘要',
    description: '情绪、学习任务和认知练习默认只在对话中展示；只有你确认后才保存，最多保留7天，也可以主动删除。',
    points: ['保存前展示待保存内容', '不保存时不会再次劝说', '7天到期删除，也可主动清除'],
    prompt: '我想记录今天的情绪，请先把待保存内容给我确认。',
  },
]

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

    <header class="home-topbar">
      <div class="home-mobile-brand">
        <MessageCircleMore :size="20" :stroke-width="1.7" />
        <strong>云舒学伴</strong>
      </div>
      <div class="home-topbar-actions">
        <button type="button" class="home-safety-button" @click="emit('safety')">
          <ShieldCheck :size="18" :stroke-width="1.7" />
          <span>安全求助</span>
        </button>
        <button
          v-if="userName"
          type="button"
          class="home-account-button"
          title="退出登录"
          @click="emit('logout')"
        >
          <UserRound :size="17" :stroke-width="1.7" />
          <span>{{ userName }}</span>
          <LogOut :size="15" :stroke-width="1.8" aria-hidden="true" />
        </button>
        <button v-else type="button" class="home-login-button" :disabled="!authReady" @click="emit('login')">
          <LogIn :size="17" :stroke-width="1.8" />
          <span>{{ authReady ? '登录' : '正在检查...' }}</span>
        </button>
      </div>
    </header>

    <section class="home-hero" aria-labelledby="home-title">
      <div class="home-hero-copy">
        <h1 id="home-title">云舒学伴</h1>
        <p class="home-slogan">云舒少年忧，学伴逐光游</p>
        <p class="home-summary">面向初中生的学习与心理支持助手。从任务启动、认知建构到情绪调节，陪你把眼前的问题说清楚、拆小，再由你选择下一步。</p>
        <BorderGlow>
          <button type="button" class="start-chat-button" @click="emit('start')">
            <MessageCircleMore :size="22" :stroke-width="1.8" />
            <span>{{ userName ? '开始对话' : '登录后开始对话' }}</span>
            <ArrowRight :size="20" :stroke-width="1.8" />
          </button>
        </BorderGlow>
      </div>
      <div class="home-scroll-cue" aria-hidden="true">
        <span>继续了解</span>
        <ArrowDown :size="16" :stroke-width="1.7" />
      </div>
    </section>

    <section class="home-story" aria-labelledby="capabilities-title">
      <div class="home-story-inner">
        <header class="home-story-copy">
          <h2 id="capabilities-title">一朵软云，分忧，也解学愁</h2>
          <p>云舒学伴不会替你完成作业，也不会替你做重要决定。云小舒会陪你整理学习任务、认知线索和情绪状态，让问题逐渐变得清楚、具体、能开始。</p>
          <div class="story-principle">
            <Compass :size="20" :stroke-width="1.7" aria-hidden="true" />
            <span>你始终可以跳过问题、换一种方式，或随时结束对话。</span>
          </div>
        </header>

        <ScrollStack class="capability-list">
          <article
            class="brand-intro-card"
            :style="{ '--stack-index': 0, '--stack-top': '92px' }"
          >
            <header class="capability-card-header">
              <span class="capability-icon">
                <Cloud :size="22" :stroke-width="1.6" aria-hidden="true" />
              </span>
              <span>认识云小舒</span>
            </header>
            <h3>云舒学伴（云小舒）</h3>
            <p>依托云朵温柔意象，搭建学业辅导与轻量化情绪陪伴双体系，依托AI技术提高学生学业水平，缓解青春期情绪压力，助力青少年健康成长。</p>
          </article>
          <article
            v-for="(item, index) in capabilities"
            :key="item.title"
            :style="{ '--stack-index': index + 1, '--stack-top': `${106 + index * 14}px` }"
          >
            <header class="capability-card-header">
              <span class="capability-icon">
                <component :is="item.icon" :size="22" :stroke-width="1.6" aria-hidden="true" />
              </span>
              <span>{{ item.label }}</span>
            </header>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
            <ul>
              <li v-for="point in item.points" :key="point">
                <Check :size="15" :stroke-width="2" aria-hidden="true" />
                <span>{{ point }}</span>
              </li>
            </ul>
            <div class="capability-prompt">
              <MessageCircleMore :size="17" :stroke-width="1.7" aria-hidden="true" />
              <span><small>你可以这样开口</small>{{ item.prompt }}</span>
            </div>
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
          <ShieldCheck :size="19" :stroke-width="1.7" />
          <p>云舒学伴不进行心理诊断、测评或风险分级，也不替代老师、监护人或专业机构。遇到紧迫危险时，请立即联系身边可信任的成年人或紧急服务。</p>
        </div>
      </div>
    </section>
  </main>
</template>
