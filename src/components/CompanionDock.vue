<script setup lang="ts">
import {
  ArrowRight,
  Clock,
  CloudRain,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
  Wind,
  X,
} from '@lucide/vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import { ambientSound } from '../utils/ambient-sound'
import type { ModuleDefinition } from '../types'

defineProps<{
  module: ModuleDefinition
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  prompt: [value: string]
  action: [value: 'mood-checkin']
}>()

// ==================== 1. 沉浸番茄钟 (支持快速预设与自定义时间) ====================
const timerPreset = ref<number>(25)
const timerRemaining = ref(25 * 60)
const timerRunning = ref(false)
const timerFinished = ref(false)
const isCustomMode = ref(false)
const showCustomInput = ref(false)
const customMinutes = ref<number>(30)
let timerInterval: ReturnType<typeof setInterval> | undefined

const setPreset = (mins: number, isCustom = false) => {
  timerPreset.value = mins
  timerRemaining.value = mins * 60
  timerRunning.value = false
  timerFinished.value = false
  isCustomMode.value = isCustom
  clearInterval(timerInterval)
}

const applyCustomMinutes = () => {
  const mins = Math.max(1, Math.min(180, Math.floor(Number(customMinutes.value)) || 25))
  customMinutes.value = mins
  setPreset(mins, true)
  showCustomInput.value = false
}

const toggleCustomDrawer = () => {
  showCustomInput.value = !showCustomInput.value
}

const formattedTime = computed(() => {
  const m = Math.floor(timerRemaining.value / 60)
  const s = timerRemaining.value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

const startTimer = () => {
  if (timerRunning.value) return
  timerRunning.value = true
  timerFinished.value = false
  clearInterval(timerInterval)

  timerInterval = setInterval(() => {
    if (timerRemaining.value > 0) {
      timerRemaining.value--
    } else {
      timerRunning.value = false
      timerFinished.value = true
      clearInterval(timerInterval)
    }
  }, 1000)
}

const pauseTimer = () => {
  timerRunning.value = false
  clearInterval(timerInterval)
}

const resetTimer = () => {
  setPreset(timerPreset.value)
}

const tellAgentFocusDone = () => {
  emit('prompt', `心小隅，我刚刚完成了 ${timerPreset.value} 分钟的专注学习！感觉还挺顺利的。`)
  resetTimer()
}

// ==================== 2. 白噪音控制 ====================
const currentSound = ref<'none' | 'rain' | 'white'>('none')
const soundVolume = ref(0.5)

const toggleSound = (type: 'rain' | 'white') => {
  if (currentSound.value === type) {
    ambientSound.stop()
    currentSound.value = 'none'
  } else {
    ambientSound.play(type)
    ambientSound.setVolume(soundVolume.value)
    currentSound.value = type
  }
}

const stopAllSound = () => {
  ambientSound.stop()
  currentSound.value = 'none'
}

const onVolumeChange = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value) / 100
  soundVolume.value = val
  ambientSound.setVolume(val)
}

// ==================== 3. 4-7-8 呼吸引导 ====================
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
  clearInterval(timerInterval)
  clearInterval(breathTimer)
  ambientSound.stop()
})

const onToolClick = (tool: { prompt: string; action?: 'mood-checkin' }) => {
  if (tool.action) emit('action', tool.action)
  else emit('prompt', tool.prompt)
}
</script>

<template>
  <aside class="companion-dock" :class="{ open }" aria-label="伴学协同工具箱">
    <div class="dock-header">
      <div class="dock-title">
        <Sparkles :size="15" :stroke-width="1.8" class="dock-icon" />
        <strong>伴学工具箱</strong>
      </div>
      <button class="dock-close-btn" type="button" title="收起工具箱" aria-label="收起工具箱" @click="emit('close')">
        <X :size="15" :stroke-width="1.8" />
      </button>
    </div>

    <div class="dock-body">
      <!-- 板块 1：沉浸专注岛 (极细现代字体悬浮番茄钟) -->
      <section class="dock-section focus-island">
        <div class="section-title-bar">
          <div class="title-with-icon">
            <Clock :size="14" :stroke-width="1.8" />
            <span>专注番茄钟</span>
          </div>
          <span v-if="timerRunning" class="live-dot" title="专注计时中">计时中</span>
        </div>

        <!-- 预设时长切换：温和胶囊 + 自定义时间 -->
        <div class="preset-pills">
          <button
            type="button"
            class="preset-pill"
            :class="{ active: timerPreset === 15 && !isCustomMode }"
            @click="setPreset(15, false); showCustomInput = false"
          >
            15m 极速
          </button>
          <button
            type="button"
            class="preset-pill"
            :class="{ active: timerPreset === 25 && !isCustomMode }"
            @click="setPreset(25, false); showCustomInput = false"
          >
            25m 经典
          </button>
          <button
            type="button"
            class="preset-pill"
            :class="{ active: timerPreset === 45 && !isCustomMode }"
            @click="setPreset(45, false); showCustomInput = false"
          >
            45m 攻坚
          </button>
          <button
            type="button"
            class="preset-pill custom-toggle-pill"
            :class="{ active: isCustomMode || showCustomInput }"
            title="自定义专注分钟数"
            @click="toggleCustomDrawer"
          >
            <SlidersHorizontal :size="11" :stroke-width="1.8" />
            <span>{{ isCustomMode ? `${timerPreset}m` : '自定义' }}</span>
          </button>
        </div>

        <!-- 自定义时长调节面板 -->
        <Transition name="shadcn-accordion">
          <div v-if="showCustomInput" class="custom-timer-drawer">
            <span class="custom-timer-label">设定分钟 (1~180)：</span>
            <div class="custom-timer-controls">
              <button
                type="button"
                class="step-adjust-btn"
                :disabled="customMinutes <= 5"
                @click="customMinutes = Math.max(1, customMinutes - 5)"
              >
                -5
              </button>
              <input
                v-model.number="customMinutes"
                type="number"
                min="1"
                max="180"
                class="custom-minutes-input"
                @keydown.enter.prevent="applyCustomMinutes"
              />
              <button
                type="button"
                class="step-adjust-btn"
                :disabled="customMinutes >= 175"
                @click="customMinutes = Math.min(180, customMinutes + 5)"
              >
                +5
              </button>
              <button
                type="button"
                class="apply-custom-btn"
                @click="applyCustomMinutes"
              >
                确定
              </button>
            </div>
          </div>
        </Transition>

        <!-- 悬浮时钟显示：去掉厚重粗边框与进度环，数字极细高级 -->
        <div class="timer-display-box" :class="{ active: timerRunning, finished: timerFinished }">
          <div class="timer-digits">{{ formattedTime }}</div>
          <p v-if="!timerFinished" class="timer-subtext">
            {{ timerRunning ? '保持呼吸，心小隅在一旁陪你' : '准备好后，点击开始进入专注' }}
          </p>
          <div v-else class="timer-finish-notice">
            <p>🎉 本轮专注完成！辛苦啦！</p>
            <button class="tell-agent-btn" type="button" @click="tellAgentFocusDone">
              <span>向心小隅汇报总结 ➔</span>
            </button>
          </div>
        </div>

        <!-- 时钟操作按钮：仅开始专注保留最深主色 -->
        <div class="timer-controls">
          <button
            v-if="!timerRunning"
            type="button"
            class="timer-btn timer-btn-primary shadcn-shimmer-btn"
            @click="startTimer"
          >
            <Play :size="14" :stroke-width="2" />
            <span>{{ timerRemaining < timerPreset * 60 ? '继续专注' : '开始专注' }}</span>
          </button>
          <button
            v-else
            type="button"
            class="timer-btn timer-btn-pause"
            @click="pauseTimer"
          >
            <Pause :size="14" :stroke-width="2" />
            <span>暂停一下</span>
          </button>
          <button
            type="button"
            class="timer-btn timer-btn-reset"
            title="重置时钟"
            aria-label="重置时钟"
            @click="resetTimer"
          >
            <RotateCcw :size="14" :stroke-width="1.8" />
          </button>
        </div>

        <!-- 白噪音伴学微卡片 -->
        <div class="ambient-sound-bar">
          <div class="sound-selector">
            <span class="sound-label">
              <Headphones :size="13" :stroke-width="1.8" />
              <span>白噪音</span>
            </span>
            <div class="sound-buttons">
              <button
                type="button"
                class="sound-btn"
                :class="{ active: currentSound === 'rain' }"
                title="细雨敲窗"
                @click="toggleSound('rain')"
              >
                <CloudRain :size="13" :stroke-width="1.8" />
                <span>细雨</span>
              </button>
              <button
                type="button"
                class="sound-btn"
                :class="{ active: currentSound === 'white' }"
                title="均匀白噪"
                @click="toggleSound('white')"
              >
                <Wind :size="13" :stroke-width="1.8" />
                <span>白噪</span>
              </button>
              <button
                v-if="currentSound !== 'none'"
                type="button"
                class="sound-btn sound-btn-stop"
                title="关闭声音"
                aria-label="关闭声音"
                @click="stopAllSound"
              >
                <VolumeX :size="13" :stroke-width="1.8" />
              </button>
            </div>
          </div>

          <!-- 音量控制滑块 -->
          <div v-if="currentSound !== 'none'" class="volume-slider-row">
            <Volume2 :size="12" :stroke-width="1.8" class="vol-icon" />
            <input
              type="range"
              min="1"
              max="100"
              :value="soundVolume * 100"
              class="volume-slider"
              @input="onVolumeChange"
            />
            <span class="vol-num">{{ Math.round(soundVolume * 100) }}%</span>
          </div>
        </div>
      </section>

      <!-- 板块 2：4-7-8 呼吸平复微卡片 -->
      <section class="dock-section breath-dock">
        <div class="section-title-bar">
          <div class="title-with-icon">
            <Wind :size="14" :stroke-width="1.8" />
            <span>4-7-8 正念呼吸</span>
          </div>
        </div>

        <div class="dock-breath-card" :class="[breathPhase]" @click="startBreathing">
          <div class="dock-breath-visual">
            <div class="dock-breath-halo" />
            <div class="dock-breath-core">
              <Wind v-if="breathPhase === 'idle'" :size="16" :stroke-width="1.8" />
              <RotateCcw v-else-if="breathPhase === 'done'" :size="16" :stroke-width="1.8" />
              <span v-else class="dock-breath-num">{{ breathSeconds }}</span>
            </div>
          </div>
          <div class="dock-breath-text">
            <template v-if="breathPhase === 'idle'">
              <strong>1 分钟呼吸平复</strong>
              <span>紧绷焦虑时快速回稳身心</span>
            </template>
            <template v-else-if="breathPhase === 'inhale'">
              <strong>慢慢吸气... (4秒)</strong>
              <span>感受胸腔自然扩张</span>
            </template>
            <template v-else-if="breathPhase === 'hold'">
              <strong>屏住呼吸... (7秒)</strong>
              <span>感受当下的平静停顿</span>
            </template>
            <template v-else-if="breathPhase === 'exhale'">
              <strong>缓缓吐气... (8秒)</strong>
              <span>彻底释放焦躁与压力</span>
            </template>
            <template v-else-if="breathPhase === 'done'">
              <strong>感觉平静些了吗？</strong>
              <span class="retry-hint">点击再次练习</span>
            </template>
          </div>
        </div>
      </section>

      <!-- 板块 3：常用伴学技能列表（改用带微弱底部分割线的书本目录式 list） -->
      <section class="dock-section skills-dock">
        <div class="section-title-bar">
          <div class="title-with-icon">
            <Sparkles :size="14" :stroke-width="1.8" />
            <span>{{ module.label }} · 伴学技能</span>
          </div>
        </div>

        <div class="skills-directory-list">
          <button
            v-for="tool in module.tools"
            :key="tool.title"
            type="button"
            class="skill-directory-item"
            @click="onToolClick(tool)"
          >
            <div class="skill-info">
              <strong>{{ tool.title }}</strong>
              <span>{{ tool.description }}</span>
            </div>
            <ArrowRight :size="14" :stroke-width="1.8" class="skill-arrow" />
          </button>
        </div>
      </section>

      <!-- 底部使用边界与隐私：轻盈排版 -->
      <footer class="dock-footer-note">
        <strong>🛡️ 隐私与伦理边界</strong>
        <p>不进行医学诊断，7天数据物理自毁，你的学习与心情隐私完全由你掌控。</p>
      </footer>
    </div>
  </aside>
</template>

<style scoped>
.companion-dock {
  display: flex;
  width: 320px;
  min-width: 320px;
  flex-direction: column;
  height: 100%;
  background: #F8FAFC;
  border-left: 1px solid rgba(15, 23, 42, 0.05);
  transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), width 0.24s ease;
  overflow: hidden;
  z-index: 10;
  box-sizing: border-box;
}

.dock-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
  background: rgba(248, 250, 252, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0;
}

.dock-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dock-icon {
  color: #2563EB;
}

.dock-title strong {
  font-size: 13.5px;
  font-weight: 600;
  color: #1E293B;
}

.dock-close-btn {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: #64748B;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.dock-close-btn:hover {
  color: #1E293B;
  background: rgba(15, 23, 42, 0.05);
}

/* 抽屉可滚动正文：严格 16px / 24px 间距法则 */
.dock-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  scrollbar-width: thin;
}

.dock-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.02em;
}

.title-with-icon svg {
  color: #2563EB;
}

.live-dot {
  font-size: 11px;
  font-weight: 500;
  color: #10B981;
  display: flex;
  align-items: center;
  gap: 4px;
}

.live-dot::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10B981;
  animation: pulse-live 1.8s infinite;
}

@keyframes pulse-live {
  0%, 100% { opacity: 0.6; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* 预设切换微胶囊 */
.preset-pills {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 3px;
  background: rgba(15, 23, 42, 0.04);
  border-radius: 12px;
}

.preset-pill {
  border: 0;
  background: transparent;
  padding: 6px 0;
  font-size: 11px;
  font-weight: 500;
  color: #64748B;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.preset-pill.active {
  background: #FFFFFF;
  color: #0F172A;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.preset-pill.custom-toggle-pill.active {
  color: var(--accent, #2563EB);
}

/* 自定义番茄钟展开面板 (shadcn accordion 风格) */
.custom-timer-drawer {
  margin-top: 8px;
  padding: 8px 10px;
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.04);
}

.custom-timer-label {
  font-size: 11px;
  color: var(--text-muted, #64748B);
  white-space: nowrap;
}

.custom-timer-controls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.step-adjust-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-soft, #F8FAFC);
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text, #1E293B);
  cursor: pointer;
  transition: all 0.15s ease;
}

.step-adjust-btn:hover:not(:disabled) {
  border-color: var(--accent, #2563EB);
  color: var(--accent, #2563EB);
  background: var(--accent-soft, #EFF6FF);
}

.step-adjust-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.custom-minutes-input {
  width: 42px;
  height: 24px;
  text-align: center;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 6px;
  background: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
  color: var(--text, #1E293B);
  outline: none;
  transition: border-color 0.15s ease;
}

.custom-minutes-input:focus {
  border-color: var(--accent, #2563EB);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.apply-custom-btn {
  height: 24px;
  padding: 0 9px;
  background: var(--accent, #2563EB);
  color: #FFFFFF;
  border: 0;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.apply-custom-btn:hover {
  background: var(--accent-strong, #1D4ED8);
}

/* 折叠动效 */
.shadcn-accordion-enter-active,
.shadcn-accordion-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.shadcn-accordion-enter-from,
.shadcn-accordion-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

.preset-pill.active {
  background: #FFFFFF;
  color: #0F172A;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

/* 悬浮数字时钟：极细高雅现代字体，直接悬浮 */
.timer-display-box {
  padding: 20px 0 16px;
  background: transparent;
  border: none;
  box-shadow: none;
  text-align: center;
}

.timer-digits {
  font-size: 52px;
  font-weight: 200;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  letter-spacing: -1.5px;
  color: #0F172A;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.timer-subtext {
  margin: 10px 0 0;
  font-size: 12px;
  color: #64748B;
  font-weight: 400;
  line-height: 1.4;
}

.timer-finish-notice p {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: #065F46;
}

.tell-agent-btn {
  background: transparent;
  border: 0;
  padding: 0;
  font-size: 12px;
  font-weight: 500;
  color: #059669;
  cursor: pointer;
  text-decoration: underline;
}

/* 按钮行：圆角胶囊规范，只保留开始专注为主色 */
.timer-controls {
  display: flex;
  gap: 8px;
}

.timer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}

.timer-btn-primary {
  flex: 1;
  background: #2563EB;
  color: #FFFFFF;
  border: 0;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
}

.timer-btn-primary:hover {
  background: #1D4ED8;
  transform: translateY(-1px);
}

.timer-btn-pause {
  flex: 1;
  background: rgba(37, 99, 235, 0.08);
  color: #2563EB;
  border: 1px solid rgba(37, 99, 235, 0.15);
}

.timer-btn-pause:hover {
  background: rgba(37, 99, 235, 0.14);
}

.timer-btn-reset {
  width: 38px;
  background: #FFFFFF;
  color: #64748B;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.timer-btn-reset:hover {
  background: #F8FAFC;
  color: #1E293B;
  border-color: rgba(15, 23, 42, 0.15);
}

/* 白噪音伴学微卡片 */
.ambient-sound-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.05);
  border-radius: 14px;
  box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.03);
}

.sound-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sound-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: #64748B;
}

.sound-buttons {
  display: flex;
  gap: 4px;
}

.sound-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(15, 23, 42, 0.03);
  border: 1px solid transparent;
  border-radius: 10px;
  font-size: 11.5px;
  color: #64748B;
  cursor: pointer;
  transition: all 0.16s ease;
}

.sound-btn:hover {
  background: rgba(15, 23, 42, 0.06);
  color: #1E293B;
}

.sound-btn.active {
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.2);
  color: #2563EB;
  font-weight: 500;
}

.sound-btn-stop {
  color: #EF4444;
}

.volume-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px dashed rgba(15, 23, 42, 0.06);
}

.vol-icon {
  color: #94A3B8;
}

.volume-slider {
  flex: 1;
  height: 4px;
  accent-color: #2563EB;
  cursor: pointer;
}

.vol-num {
  font-size: 11px;
  color: #94A3B8;
  width: 28px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* ==================== 呼吸平复微卡片 ==================== */
.dock-breath-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.05);
  border-radius: 14px;
  box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.03);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dock-breath-card:hover {
  border-color: rgba(37, 99, 235, 0.2);
  background: #F8FAFC;
}

.dock-breath-visual {
  position: relative;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  display: grid;
  place-items: center;
}

.dock-breath-halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, transparent 70%);
  transform: scale(1);
  transition: transform 1s ease;
}

.dock-breath-core {
  position: relative;
  z-index: 2;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  background: #FFFFFF;
  color: #2563EB;
  border: 1.5px solid #2563EB;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.15);
  transition: transform 1s ease;
}

.dock-breath-num {
  font-size: 12px;
  font-weight: 700;
  color: #2563EB;
}

.dock-breath-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dock-breath-text strong {
  font-size: 12.5px;
  font-weight: 600;
  color: #1E293B;
}

.dock-breath-text span {
  font-size: 11px;
  color: #64748B;
}

.retry-hint {
  color: #2563EB !important;
  font-weight: 500;
}

.dock-breath-card.inhale .dock-breath-halo { transform: scale(1.5); }
.dock-breath-card.inhale .dock-breath-core { transform: scale(1.12); }
.dock-breath-card.hold .dock-breath-halo { transform: scale(1.35); }
.dock-breath-card.exhale .dock-breath-halo { transform: scale(1); }
.dock-breath-card.exhale .dock-breath-core { transform: scale(0.92); }

/* ==================== 伴学技能：书本目录式 List ==================== */
.skills-directory-list {
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.05);
  box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.03);
  overflow: hidden;
}

.skill-directory-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.04);
  text-align: left;
  cursor: pointer;
  transition: all 0.16s ease;
}

.skill-directory-item:last-child {
  border-bottom: 0;
}

.skill-directory-item:hover {
  background: #F8FAFC;
}

.skill-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.skill-info strong {
  font-size: 12.5px;
  font-weight: 500;
  color: #1E293B;
}

.skill-info span {
  font-size: 11px;
  color: #64748B;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-arrow {
  color: #94A3B8;
  flex-shrink: 0;
  transition: all 0.16s ease;
}

.skill-directory-item:hover .skill-arrow {
  color: #2563EB;
  transform: translateX(2px);
}

/* 底部轻提示 */
.dock-footer-note {
  margin-top: auto;
  padding: 8px 4px 0;
  font-size: 11px;
  color: #94A3B8;
  line-height: 1.5;
}

.dock-footer-note strong {
  display: block;
  margin-bottom: 2px;
  color: #64748B;
  font-size: 11px;
}

.dock-footer-note p {
  margin: 0;
}

/* 响应式收起 */
@media (max-width: 1100px) {
  .companion-dock {
    position: fixed;
    top: 48px;
    right: 0;
    bottom: 0;
    width: min(320px, calc(100vw - 32px));
    box-shadow: -4px 0 24px rgba(15, 23, 42, 0.08);
    transform: translateX(105%);
    transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .companion-dock.open {
    transform: translateX(0);
  }
}
</style>
