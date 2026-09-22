<script setup lang="ts">
import {
  ArrowDown,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  Cloud,
  HeartHandshake,
  ListTodo,
  Lock,
  LogIn,
  LogOut,
  MessageCircleMore,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wind,
} from '@lucide/vue'
import { onBeforeUnmount, ref } from 'vue'
import Prism from './Prism.vue'
import type { ModuleId } from '../types'

defineProps<{
  userName: string | null
  authReady: boolean
}>()

const emit = defineEmits<{
  start: []
  startWith: [payload: { module: ModuleId; prompt?: string }]
  intro: []
  login: []
  account: []
  logout: []
}>()

const scrollToMatrix = () => {
  const el = document.getElementById('capability-matrix')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

// 呼吸微交互状态
type BreathPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'done'
const breathPhase = ref<BreathPhase>('idle')
const breathSeconds = ref(0)
let breathTimer: ReturnType<typeof setInterval> | undefined

const startBreathing = () => {
  if (breathPhase.value !== 'idle' && breathPhase.value !== 'done') {
    stopBreathing()
    return
  }
  runBreathCycle()
}

const stopBreathing = () => {
  clearInterval(breathTimer)
  breathPhase.value = 'idle'
  breathSeconds.value = 0
}

const runBreathCycle = () => {
  breathPhase.value = 'inhale'
  breathSeconds.value = 4
  clearInterval(breathTimer)

  breathTimer = setInterval(() => {
    breathSeconds.value--
    if (breathSeconds.value <= 0) {
      if (breathPhase.value === 'inhale') {
        breathPhase.value = 'hold'
        breathSeconds.value = 7
      } else if (breathPhase.value === 'hold') {
        breathPhase.value = 'exhale'
        breathSeconds.value = 8
      } else if (breathPhase.value === 'exhale') {
        breathPhase.value = 'done'
        clearInterval(breathTimer)
      }
    }
  }, 1000)
}

onBeforeUnmount(() => {
  clearInterval(breathTimer)
})
</script>

<template>
  <main class="landing-page home-page">
    <!-- 顶部登录与账户状态 -->
    <header class="landing-topbar">
      <div v-if="userName" class="landing-account">
        <button class="landing-account-btn" type="button" title="设置你的称呼" @click="emit('account')">
          <UserRound :size="16" :stroke-width="1.7" />
          <span>{{ userName }}</span>
        </button>
        <button class="landing-logout" type="button" title="退出登录" aria-label="退出登录" @click="emit('logout')">
          <LogOut :size="16" :stroke-width="1.8" />
        </button>
      </div>
      <button v-else class="landing-login" type="button" :disabled="!authReady" @click="emit('login')">
        <LogIn :size="16" :stroke-width="1.8" />
        <span>{{ !authReady ? '正在检查...' : '登录' }}</span>
      </button>
    </header>

    <!-- 第一屏：Hero 英雄区 + 3D Prism 棱镜背景 -->
    <section class="home-hero" aria-labelledby="home-title">
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

      <div class="home-hero-copy">
        <div class="hero-agent-badge">
          <Sparkles :size="14" :stroke-width="2" class="badge-sparkle" />
          <span>以智能体为主 · 学习与心理协同支持</span>
        </div>

        <h1 id="home-title">云舒学伴</h1>
        <p class="home-slogan">云舒少年忧，学伴逐光游</p>
        <p class="home-summary">
          我是云小舒。作业不知从何下手、复习感到压力，或此刻有些烦躁？我陪你把大任务拆小、把想法理清、把节奏稳住。非说教、零评判，随时由你掌控。
        </p>

        <div class="landing-actions">
          <button type="button" class="start-chat-button" @click="emit('start')">
            <MessageCircleMore :size="20" :stroke-width="1.8" />
            <span>开始伴学对话</span>
            <ArrowRight :size="19" :stroke-width="1.8" />
          </button>
          <div class="landing-sub-actions">
            <button type="button" class="matrix-scroll-btn" @click="scrollToMatrix">
              <span>探索能力矩阵</span>
              <ArrowDown :size="16" :stroke-width="1.8" />
            </button>
            <button type="button" class="intro-button" @click="emit('intro')">
              <Cloud :size="18" :stroke-width="1.8" />
              <span>认识云小舒</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 向下探索提示 -->
      <button class="hero-scroll-indicator" type="button" aria-label="向下滚动查看功能矩阵" @click="scrollToMatrix">
        <span>向下了解功能全景</span>
        <ChevronDown :size="18" :stroke-width="1.8" class="bounce-icon" />
      </button>
    </section>

    <!-- 第二屏：Bento Grid 四大能力矩阵 -->
    <section id="capability-matrix" class="matrix-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tag">能力矩阵 · CAPABILITY MATRIX</span>
          <h2>智能体为轴，连接学业专注与心灵从容</h2>
          <p>不只是文本聊天框，更是你的全天候伴学工作站与思维缓压坞</p>
        </div>

        <div class="bento-grid">
          <!-- 卡片 1：智能体交互中枢 (焦点大卡) -->
          <article class="bento-card bento-card-primary">
            <div class="card-header">
              <div class="card-tag-wrap">
                <span class="card-icon-box"><Brain :size="20" :stroke-width="1.8" /></span>
                <span class="card-pill">核心中枢</span>
              </div>
              <span class="card-sub-tag">自主意图感知</span>
            </div>

            <div class="card-content">
              <h3>多轮自主感知与非评判引导</h3>
              <p>
                能够敏锐识别你是遇到了具体学科任务卡点，还是陷入了逃避与焦虑情绪中。不讲大道理、不盲目说教，先共情倾听，再引导你聚焦眼前可行动的一小步。
              </p>

              <!-- 模拟会话片段 -->
              <div class="mock-dialogue">
                <div class="mock-bubble mock-user">
                  <span class="mock-sender">你</span>
                  <p>作业太多了完全不想碰，下周又要模考，整个人好烦躁...</p>
                </div>
                <div class="mock-bubble mock-agent">
                  <span class="mock-sender">云小舒</span>
                  <p>抱抱你，压力大时想逃避是人的正常保护机制。我们先不想整周的事，今天哪一科最容易？我们花5分钟只看第一道题，做完随时可以停，好吗？</p>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <button
                type="button"
                class="card-action-btn"
                @click="emit('startWith', { module: 'study', prompt: '云小舒，我今天有点学不进去，能陪我聊聊并帮我拆分一下任务吗？' })"
              >
                <span>向小舒倾诉</span>
                <ArrowRight :size="16" :stroke-width="1.8" />
              </button>
            </div>
          </article>

          <!-- 卡片 2：轻量伴学微工坊 (学习为辅) -->
          <article class="bento-card">
            <div class="card-header">
              <div class="card-tag-wrap">
                <span class="card-icon-box card-icon-study"><ListTodo :size="20" :stroke-width="1.8" /></span>
                <span class="card-pill">伴学工坊</span>
              </div>
              <span class="card-sub-tag">阻抗消除</span>
            </div>

            <div class="card-content">
              <h3>大任务微拆解与 5 分钟启动法</h3>
              <p>
                将庞大复杂的作业或长篇论文拆解成 15 分钟番茄粒度的微步骤，消除心理阻抗。拒绝沉重题库灌输，只做敏捷专注伴学。
              </p>

              <!-- 任务拆解演示清单 -->
              <div class="mock-checklist">
                <div class="check-item checked">
                  <CheckCircle2 :size="16" :stroke-width="2" class="icon-success" />
                  <span>5分钟启动法：只看第一道选择题</span>
                </div>
                <div class="check-item">
                  <span class="dot-todo" />
                  <span>错题思维归因：找出卡点而非死记</span>
                </div>
                <div class="check-item">
                  <span class="dot-todo" />
                  <span>走神温和接纳：记录一次事实不自责</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <button
                type="button"
                class="card-action-btn"
                @click="emit('startWith', { module: 'study', prompt: '帮我把今天的作业拆成小步骤，先做哪个？' })"
              >
                <span>开启任务拆解</span>
                <ArrowRight :size="16" :stroke-width="1.8" />
              </button>
            </div>
          </article>

          <!-- 卡片 3：心灵缓压空间 (心理为辅 + 呼吸微交互彩蛋) -->
          <article class="bento-card">
            <div class="card-header">
              <div class="card-tag-wrap">
                <span class="card-icon-box card-icon-heart"><HeartHandshake :size="20" :stroke-width="1.8" /></span>
                <span class="card-pill">心灵缓压</span>
              </div>
              <span class="card-sub-tag">非临床调适</span>
            </div>

            <div class="card-content">
              <h3>正念呼吸与认知解离体验</h3>
              <p>
                焦虑时身体会紧绷、思维会窄化。在这里通过科学的 4-7-8 呼吸节律和认知解离练习，将事实与灾难化想法分离开。
              </p>

              <!-- 原地交互式呼吸球彩蛋 -->
              <div class="breath-pacer-box" :class="[breathPhase]">
                <div class="breath-visual" @click="startBreathing">
                  <div class="breath-halo" />
                  <div class="breath-core">
                    <Wind v-if="breathPhase === 'idle'" :size="22" :stroke-width="1.8" />
                    <RotateCcw v-else-if="breathPhase === 'done'" :size="22" :stroke-width="1.8" />
                    <span v-else class="breath-count">{{ breathSeconds }}</span>
                  </div>
                </div>

                <div class="breath-tips">
                  <p v-if="breathPhase === 'idle'">
                    <strong>点击微球，体验 4-7-8 呼吸引导</strong>
                    <span>紧张或走神时，带你快速平复</span>
                  </p>
                  <p v-else-if="breathPhase === 'inhale'">
                    <strong>深吸一口气... (4秒)</strong>
                    <span>慢慢吸满，感受胸腔扩张</span>
                  </p>
                  <p v-else-if="breathPhase === 'hold'">
                    <strong>屏住呼吸... (7秒)</strong>
                    <span>感受此刻身体的平稳停顿</span>
                  </p>
                  <p v-else-if="breathPhase === 'exhale'">
                    <strong>缓缓吐气... (8秒)</strong>
                    <span>把所有紧绷和压力吐出来</span>
                  </p>
                  <p v-else-if="breathPhase === 'done'">
                    <strong>太棒了！感觉平静些了吗？</strong>
                    <button class="breath-retry-link" type="button" @click="startBreathing">再来一组</button>
                  </p>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <button
                type="button"
                class="card-action-btn"
                @click="emit('startWith', { module: 'emotion', prompt: '带我做一个3分钟的放松练习，我想稳下来。' })"
              >
                <span>进入深度缓压</span>
                <ArrowRight :size="16" :stroke-width="1.8" />
              </button>
            </div>
          </article>

          <!-- 卡片 4：合规隐私与伦理守护 -->
          <article class="bento-card">
            <div class="card-header">
              <div class="card-tag-wrap">
                <span class="card-icon-box card-icon-shield"><ShieldCheck :size="20" :stroke-width="1.8" /></span>
                <span class="card-pill">隐私伦理</span>
              </div>
              <span class="card-sub-tag">零敏感采集</span>
            </div>

            <div class="card-content">
              <h3>零敏感信息追踪，7 天物理自毁</h3>
              <p>
                严格遵循非临床心理学伦理与隐私保护法案。无需学号与实名，不打病理标签，你的成长秘密完全属于你自己。
              </p>

              <div class="privacy-badges">
                <div class="privacy-badge-item">
                  <Lock :size="15" :stroke-width="1.8" />
                  <span>无实名制，端到端隔离</span>
                </div>
                <div class="privacy-badge-item">
                  <ShieldCheck :size="15" :stroke-width="1.8" />
                  <span>不设抑郁/焦虑打分量表</span>
                </div>
                <div class="privacy-badge-item">
                  <Clock :size="15" :stroke-width="1.8" />
                  <span>7天自动自毁，支持一键清空</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <button
                type="button"
                class="card-action-btn"
                @click="emit('startWith', { module: 'records', prompt: '看看我最近7天的记录，按事实汇总，不要打分。' })"
              >
                <span>查看我的记录说明</span>
                <ArrowRight :size="16" :stroke-width="1.8" />
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- 第三屏：3 步智能体协同流 -->
    <section class="workflow-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tag">协同流程 · AGENTIC WORKFLOW</span>
          <h2>简单三步，重拾专注与从容</h2>
          <p>无需准备长篇大论，想到什么就说什么</p>
        </div>

        <div class="workflow-steps">
          <div class="step-card">
            <span class="step-num">01</span>
            <h4>说出当下的困扰</h4>
            <p>从手头的一道具体作业、一次考试失误，或此刻莫名的坐立难安开始。</p>
          </div>
          <div class="step-divider" aria-hidden="true">
            <ArrowRight :size="18" :stroke-width="1.8" />
          </div>
          <div class="step-card">
            <span class="step-num">02</span>
            <h4>小舒协同梳理拆解</h4>
            <p>分清客观事实与灾难化想法，将大难点拆分为 2~3 个立即可行的一小步。</p>
          </div>
          <div class="step-divider" aria-hidden="true">
            <ArrowRight :size="18" :stroke-width="1.8" />
          </div>
          <div class="step-card">
            <span class="step-num">03</span>
            <h4>按你的节奏前行</h4>
            <p>做完一步再看下一步。随时可以喊停，没有强制任务，更没有考核压力。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 第四屏：底部 CTA 与合规说明 -->
    <footer class="landing-footer">
      <div class="section-container footer-content">
        <div class="footer-cta-card">
          <h2>让成长的每一次跋涉，都不再孤单</h2>
          <p>无论今天过得怎样，云小舒都在这里，准备好与你一起出发。</p>
          <div class="footer-cta-actions">
            <button type="button" class="start-chat-button" @click="emit('start')">
              <MessageCircleMore :size="20" :stroke-width="1.8" />
              <span>开始今日伴学</span>
              <ArrowRight :size="19" :stroke-width="1.8" />
            </button>
          </div>
        </div>

        <div class="footer-legal-notice">
          <div class="legal-badge">
            <ShieldCheck :size="16" :stroke-width="1.8" />
            <span>合规与安全申明</span>
          </div>
          <p>
            云舒学伴是由智能体驱动的伴学与情绪调适支持工具，<strong>不提供临床医学、精神心理障碍诊断或处方药物建议</strong>。
            若你或身边的伙伴正面临生命安全紧急状况，请立刻拨打全国24小时心理援助热线：<a href="tel:4001619995">400-161-9995</a> 或紧急求助电话 110。
          </p>
          <p class="copyright">© 云舒学伴 · 专注于青少年与大学生的自主伴学智能体系统</p>
        </div>
      </div>
    </footer>
  </main>
</template>

<style scoped>
/* 允许首页纵向顺畅滚动 */
.landing-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  background: var(--surface);
}

/* 顶部操作区 */
.landing-topbar {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  padding: 18px 28px;
}

.landing-account {
  display: flex;
  align-items: center;
  gap: 8px;
}

.landing-account-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  color: var(--text);
  background: rgb(255 255 255 / 90%);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
  transition: all 0.2s ease;
}

.landing-account-btn:hover {
  border-color: var(--accent);
  color: var(--accent-strong);
}

.landing-account-btn span {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.landing-logout {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  color: var(--text-muted);
  background: rgb(255 255 255 / 90%);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line);
  border-radius: 999px;
  transition: all 0.2s ease;
}

.landing-logout:hover {
  color: var(--text);
  border-color: var(--line-strong);
}

.landing-login {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 20px;
  color: #FFFFFF;
  background: var(--ink);
  border: 0;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 500;
  box-shadow: 0 2px 10px rgb(26 34 51 / 15%);
  transition: all 0.2s ease;
}

.landing-login:hover {
  background: var(--ink-hover);
}

.landing-login:disabled {
  opacity: 0.6;
}

/* ================== Hero 英雄区 ================== */
.home-hero {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 80px 24px 70px;
  text-align: center;
  overflow: hidden;
}

.home-prism {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.home-hero-copy {
  position: relative;
  z-index: 2;
  display: flex;
  max-width: 780px;
  flex-direction: column;
  align-items: center;
  margin-top: -20px;
}

/* Agent 定位徽章 */
.hero-agent-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  margin-bottom: 20px;
  color: var(--accent-strong);
  background: rgb(234 242 252 / 85%);
  backdrop-filter: blur(8px);
  border: 1px solid rgb(61 125 214 / 20%);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.badge-sparkle {
  color: var(--accent);
  animation: pulse-sparkle 2.4s ease-in-out infinite;
}

@keyframes pulse-sparkle {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.2); opacity: 1; }
}

.home-hero h1 {
  margin: 0;
  color: var(--text);
  font-size: clamp(42px, 5.8vw, 68px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.5px;
}

.home-slogan {
  margin: 18px 0 0;
  color: var(--text-muted);
  font-size: clamp(18px, 2.2vw, 22px);
  font-weight: 500;
  line-height: 1.5;
}

.home-summary {
  max-width: 640px;
  margin: 18px 0 38px;
  color: var(--text-muted);
  font-size: 15.5px;
  line-height: 1.8;
}

/* 按钮组 */
.landing-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: min(100%, 420px);
}

.start-chat-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 54px;
  padding: 0 28px;
  color: #FFFFFF;
  background: var(--ink);
  border: 0;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 18px rgb(26 34 51 / 18%);
  transition: all 0.2s ease;
}

.start-chat-button:hover {
  background: var(--ink-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgb(26 34 51 / 24%);
}

.landing-sub-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}

.matrix-scroll-btn,
.intro-button {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 16px;
  color: var(--text);
  background: rgb(255 255 255 / 85%);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.matrix-scroll-btn:hover,
.intro-button:hover {
  border-color: var(--accent);
  color: var(--accent-strong);
  background: var(--accent-faint);
}

/* 底部滚动指示器 */
.hero-scroll-indicator {
  position: absolute;
  bottom: 24px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-soft);
  background: transparent;
  border: 0;
  font-size: 12.5px;
  transition: color 0.2s ease;
  cursor: pointer;
}

.hero-scroll-indicator:hover {
  color: var(--text);
}

.bounce-icon {
  animation: bounce-down 2s infinite;
}

@keyframes bounce-down {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(5px); }
  60% { transform: translateY(3px); }
}

/* ================== 通用容器与标题 ================== */
.section-container {
  width: min(100%, 1160px);
  margin: 0 auto;
  padding: 0 24px;
}

.section-header {
  text-align: center;
  max-width: 680px;
  margin: 0 auto 52px;
}

.section-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.2px;
  color: var(--accent);
  margin-bottom: 12px;
}

.section-header h2 {
  margin: 0 0 14px;
  font-size: clamp(26px, 3.2vw, 36px);
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
}

.section-header p {
  margin: 0;
  font-size: 15.5px;
  color: var(--text-muted);
  line-height: 1.6;
}

/* ================== Bento Grid 能力矩阵 ================== */
.matrix-section {
  position: relative;
  z-index: 2;
  padding: 96px 0;
  background: linear-gradient(180deg, rgb(255 255 255 / 0%) 0%, var(--surface-soft) 120px, var(--surface-soft) 100%);
  border-top: 1px solid var(--line);
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.bento-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 32px;
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: 0 2px 12px rgb(26 34 51 / 3%);
  transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

.bento-card:hover {
  transform: translateY(-3px);
  border-color: var(--line-strong);
  box-shadow: 0 10px 30px rgb(26 34 51 / 7%);
}

.bento-card-primary {
  border-color: rgb(61 125 214 / 28%);
  background: linear-gradient(180deg, #FFFFFF 0%, #FAFCFF 100%);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.card-tag-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-icon-box {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 10px;
}

.card-icon-study {
  color: #10B981;
  background: #ECFDF5;
}

.card-icon-heart {
  color: #F59E0B;
  background: #FFFBEB;
}

.card-icon-shield {
  color: #6366F1;
  background: #EEF2FF;
}

.card-pill {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
}

.card-sub-tag {
  font-size: 12px;
  color: var(--text-soft);
  background: var(--surface-muted);
  padding: 3px 10px;
  border-radius: 999px;
}

.card-content h3 {
  margin: 0 0 10px;
  font-size: 19px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}

.card-content p {
  margin: 0 0 22px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.7;
}

/* 模拟对话片段 */
.mock-dialogue {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--surface-muted);
  border-radius: 12px;
  border: 1px solid var(--line);
  font-size: 13px;
  margin-bottom: 24px;
}

.mock-bubble {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.mock-bubble p {
  margin: 0;
  padding: 8px 12px;
  border-radius: 10px;
  line-height: 1.5;
}

.mock-sender {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-soft);
}

.mock-user p {
  align-self: flex-start;
  color: var(--text);
  background: #FFFFFF;
  border: 1px solid var(--line);
}

.mock-agent p {
  align-self: flex-start;
  color: var(--text);
  background: var(--accent-soft);
  border: 1px solid rgb(61 125 214 / 15%);
}

/* 模拟清单演示 */
.mock-checklist {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--surface-muted);
  border-radius: 12px;
  border: 1px solid var(--line);
  margin-bottom: 24px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text);
}

.check-item.checked {
  color: var(--text-muted);
}

.icon-success {
  color: #10B981;
}

.dot-todo {
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--text-soft);
  border-radius: 4px;
}

/* 呼吸微交互球容器 */
.breath-pacer-box {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  background: var(--surface-muted);
  border-radius: 14px;
  border: 1px solid var(--line);
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.breath-visual {
  position: relative;
  width: 64px;
  height: 64px;
  flex: 0 0 64px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.breath-halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(61 125 214 / 25%) 0%, rgb(61 125 214 / 0%) 70%);
  transform: scale(1);
  transition: transform 1s ease, opacity 1s ease;
}

.breath-core {
  position: relative;
  z-index: 2;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  background: #FFFFFF;
  color: var(--accent);
  border: 2px solid var(--accent);
  border-radius: 50%;
  box-shadow: 0 4px 14px rgb(61 125 214 / 20%);
  transition: transform 1s ease;
}

.breath-count {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent);
}

.breath-tips p {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.breath-tips strong {
  font-size: 13.5px;
  color: var(--text);
}

.breath-tips span {
  font-size: 12px;
  color: var(--text-soft);
}

.breath-retry-link {
  margin-top: 4px;
  background: transparent;
  border: 0;
  padding: 0;
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
}

.breath-retry-link:hover {
  text-decoration: underline;
}

/* 呼吸各阶段动画 */
.breath-pacer-box.inhale .breath-halo {
  transform: scale(1.6);
  opacity: 1;
}

.breath-pacer-box.inhale .breath-core {
  transform: scale(1.22);
}

.breath-pacer-box.hold .breath-halo {
  transform: scale(1.55);
  opacity: 0.9;
}

.breath-pacer-box.hold .breath-core {
  transform: scale(1.2);
}

.breath-pacer-box.exhale .breath-halo {
  transform: scale(1);
  opacity: 0.4;
}

.breath-pacer-box.exhale .breath-core {
  transform: scale(0.95);
}

/* 隐私徽章列表 */
.privacy-badges {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--surface-muted);
  border-radius: 12px;
  border: 1px solid var(--line);
  margin-bottom: 24px;
}

.privacy-badge-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-muted);
}

.privacy-badge-item svg {
  color: var(--accent);
  flex-shrink: 0;
}

/* 卡片底部操作按钮 */
.card-footer {
  display: flex;
  justify-content: flex-start;
  padding-top: 6px;
}

.card-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text);
  transition: all 0.18s ease;
}

.card-action-btn:hover {
  background: var(--accent-faint);
  border-color: var(--accent);
  color: var(--accent-strong);
  transform: translateX(2px);
}

/* ================== 3 步协同工作流 ================== */
.workflow-section {
  position: relative;
  z-index: 2;
  padding: 88px 0;
  background: var(--surface);
  border-top: 1px solid var(--line);
}

.workflow-steps {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 16px;
}

.step-card {
  flex: 1;
  padding: 30px 24px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 16px;
  transition: all 0.2s ease;
}

.step-card:hover {
  background: #FFFFFF;
  border-color: var(--line-strong);
  box-shadow: 0 4px 16px rgb(26 34 51 / 4%);
}

.step-num {
  display: inline-block;
  font-size: 28px;
  font-weight: 800;
  color: var(--accent);
  opacity: 0.85;
  margin-bottom: 12px;
  letter-spacing: -1px;
}

.step-card h4 {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
}

.step-card p {
  margin: 0;
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.65;
}

.step-divider {
  display: flex;
  align-items: center;
  color: var(--text-soft);
}

/* ================== 底部 CTA 与声明 ================== */
.landing-footer {
  position: relative;
  z-index: 2;
  padding: 64px 0 48px;
  background: var(--surface-soft);
  border-top: 1px solid var(--line);
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.footer-cta-card {
  text-align: center;
  padding: 48px 32px;
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: 0 4px 20px rgb(26 34 51 / 4%);
}

.footer-cta-card h2 {
  margin: 0 0 12px;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 700;
  color: var(--text);
}

.footer-cta-card p {
  margin: 0 0 28px;
  font-size: 15.5px;
  color: var(--text-muted);
}

.footer-cta-actions {
  display: flex;
  justify-content: center;
}

.footer-cta-actions .start-chat-button {
  width: auto;
  min-width: 240px;
}

.footer-legal-notice {
  text-align: center;
  max-width: 740px;
  margin: 0 auto;
  font-size: 12.5px;
  color: var(--text-soft);
  line-height: 1.8;
}

.legal-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--surface-muted);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.footer-legal-notice a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}

.footer-legal-notice a:hover {
  text-decoration: underline;
}

.copyright {
  margin-top: 16px;
  color: var(--text-soft);
  font-size: 12px;
}

/* ================== 响应式微调 ================== */
@media (max-width: 900px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }

  .workflow-steps {
    flex-direction: column;
    gap: 12px;
  }

  .step-divider {
    transform: rotate(90deg);
    justify-content: center;
    padding: 6px 0;
  }

  .landing-actions {
    width: 100%;
  }

  .landing-sub-actions {
    flex-direction: column;
  }

  .footer-cta-actions .start-chat-button {
    width: 100%;
  }
}
</style>
