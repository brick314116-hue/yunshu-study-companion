<script setup lang="ts">
import {
  ArrowRight,
  Clock,
  CloudRain,
  Headphones,
  Pause,
  Play,
  RotateCcw,
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

// ==================== 1. 沉浸番茄钟 ====================
type TimerPreset = 15 | 25 | 45
const timerPreset = ref<TimerPreset>(25)
const timerRemaining = ref(25 * 60)
const timerRunning = ref(false)
const timerFinished = ref(false)
let timerInterval: ReturnType<typeof setInterval> | undefined

const setPreset = (mins: TimerPreset) => {
  timerPreset.value = mins
  timerRemaining.value = mins * 60
  timerRunning.value = false
  timerFinished.value = false
  clearInterval(timerInterval)
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
  emit('prompt', `云小舒，我刚刚完成了 ${timerPreset.value} 分钟的专注学习！感觉还挺顺利的。`)
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
        <Sparkles :size="16" :stroke-width="2" class="dock-icon" />
        <strong>伴学工具箱</strong>
        <span class="dock-pill">FOCUS & CARE</span>
      </div>
      <button class="dock-close-btn" type="button" title="收起工具箱" aria-label="收起工具箱" @click="emit('close')">
        <X :size="16" :stroke-width="2" />
      </button>
    </div>

    <div class="dock-body">
      <!-- 板块 1：沉浸专注岛 -->
      <section class="dock-section focus-island">
        <div class="section-title-bar">
          <div class="title-with-icon">
            <Clock :size="15" :stroke-width="2" />
            <span>沉浸专注岛</span>
          </div>
          <span v-if="timerRunning" class="live-dot" title="专注计时中">正在计时</span>
        </div>

        <!-- 预设时长切换 -->
        <div class="preset-pills">
          <button
            type="button"
            class="preset-pill"
            :class="{ active: timerPreset === 15 }"
            @click="setPreset(15)"
          >
            15m 极速启动
          </button>
          <button
            type="button"
            class="preset-pill"
            :class="{ active: timerPreset === 25 }"
            @click="setPreset(25)"
          >
            25m 经典番茄
          </button>
          <button
            type="button"
            class="preset-pill"
            :class="{ active: timerPreset === 45 }"
            @click="setPreset(45)"
          >
            45m 深度攻坚
          </button>
        </div>

        <!-- 时钟显示板 -->
        <div class="timer-display-box" :class="{ active: timerRunning, finished: timerFinished }">
          <div class="timer-digits">{{ formattedTime }}</div>
          <p v-if="!timerFinished" class="timer-subtext">
            {{ timerRunning ? '保持呼吸与专注，小舒在一旁陪你' : '准备好后，点击开始进入专注状态' }}
          </p>
          <div v-else class="timer-finish-notice">
            <p>🎉 本轮专注完成！辛苦啦！</p>
            <button class="tell-agent-btn" type="button" @click="tellAgentFocusDone">
              <span>向小舒汇报总结 ➔</span>
            </button>
          </div>
        </div>

        <!-- 时钟操作按钮 -->
        <div class="timer-controls">
          <button
            v-if="!timerRunning"
            type="button"
            class="timer-btn timer-btn-primary"
            @click="startTimer"
          >
            <Play :size="15" :stroke-width="2" />
            <span>{{ timerRemaining < timerPreset * 60 ? '继续专注' : '开始专注' }}</span>
          </button>
          <button
            v-else
            type="button"
            class="timer-btn timer-btn-pause"
            @click="pauseTimer"
          >
            <Pause :size="15" :stroke-width="2" />
            <span>暂停一下</span>
          </button>
          <button
            type="button"
            class="timer-btn timer-btn-reset"
            title="重置时钟"
            aria-label="重置时钟"
            @click="resetTimer"
          >
            <RotateCcw :size="15" :stroke-width="1.8" />
          </button>
        </div>

        <!-- 纯前端环境白噪音 -->
        <div class="ambient-sound-bar">
          <div class="sound-selector">
            <span class="sound-label">
              <Headphones :size="13" :stroke-width="1.8" />
              <span>白噪音伴学</span>
            </span>
            <div class="sound-buttons">
              <button
                type="button"
                class="sound-btn"
                :class="{ active: currentSound === 'rain' }"
                title="细雨敲窗"
                @click="toggleSound('rain')"
              >
                <CloudRain :size="14" :stroke-width="1.8" />
                <span>细雨</span>
              </button>
              <button
                type="button"
                class="sound-btn"
                :class="{ active: currentSound === 'white' }"
                title="均匀白噪"
                @click="toggleSound('white')"
              >
                <Wind :size="14" :stroke-width="1.8" />
                <span>白噪</span>
              </button>
              <button
                v-if="currentSound !== 'none'"
                type="button"
                class="sound-btn sound-btn-stop"
                title="关闭声音"
                @click="stopAllSound"
              >
                <VolumeX :size="14" :stroke-width="1.8" />
              </button>
            </div>
          </div>

          <!-- 音量控制滑块 -->
          <div v-if="currentSound !== 'none'" class="volume-slider-row">
            <Volume2 :size="13" :stroke-width="1.8" class="vol-icon" />
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

      <!-- 板块 2：4-7-8 呼吸平复坞 -->
      <section class="dock-section breath-dock">
        <div class="section-title-bar">
          <div class="title-with-icon">
            <Wind :size="15" :stroke-width="2" />
            <span>4-7-8 正念呼吸平复</span>
          </div>
        </div>

        <div class="dock-breath-card" :class="[breathPhase]" @click="startBreathing">
          <div class="dock-breath-visual">
            <div class="dock-breath-halo" />
            <div class="dock-breath-core">
              <Wind v-if="breathPhase === 'idle'" :size="18" :stroke-width="1.8" />
              <RotateCcw v-else-if="breathPhase === 'done'" :size="18" :stroke-width="1.8" />
              <span v-else class="dock-breath-num">{{ breathSeconds }}</span>
            </div>
          </div>
          <div class="dock-breath-text">
            <template v-if="breathPhase === 'idle'">
              <strong>点击开启 1 分钟深呼吸</strong>
              <span>题做不出来、焦虑紧绷时快速回稳</span>
            </template>
            <template v-else-if="breathPhase === 'inhale'">
              <strong>慢慢吸气... (4秒)</strong>
              <span>感受胸腔扩张</span>
            </template>
            <template v-else-if="breathPhase === 'hold'">
              <strong>屏住呼吸... (7秒)</strong>
              <span>感受当下的平静停顿</span>
            </template>
            <template v-else-if="breathPhase === 'exhale'">
              <strong>缓缓吐气... (8秒)</strong>
              <span>释放掉所有焦躁紧绷</span>
            </template>
            <template v-else-if="breathPhase === 'done'">
              <strong>感觉平静些了吗？</strong>
              <span class="retry-hint">点击再次练习</span>
            </template>
          </div>
        </div>
      </section>

      <!-- 板块 3：当前场景技能快捷卡片 -->
      <section class="dock-section skills-dock">
        <div class="section-title-bar">
          <div class="title-with-icon">
            <Sparkles :size="15" :stroke-width="2" />
            <span>{{ module.label }} · 常用伴学技能</span>
          </div>
        </div>

        <div class="skills-card-list">
          <button
            v-for="tool in module.tools"
            :key="tool.title"
            type="button"
            class="skill-mini-card"
            @click="onToolClick(tool)"
          >
            <div class="skill-info">
              <strong>{{ tool.title }}</strong>
              <span>{{ tool.description }}</span>
            </div>
            <ArrowRight :size="15" :stroke-width="1.8" class="skill-arrow" />
          </button>
        </div>
      </section>

      <!-- 底部使用边界与隐私 -->
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
  background: var(--surface);
  border-left: 1px solid var(--line);
  transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), width 0.24s ease;
  overflow: hidden;
  z-index: 10;
}

.dock-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  flex-shrink: 0;
}

.dock-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dock-icon {
  color: var(--accent);
}

.dock-title strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.dock-pill {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--accent-strong);
  background: var(--accent-soft);
  padding: 2px 6px;
  border-radius: 4px;
}

.dock-close-btn {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--text-muted);
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s var(--ease-spring);
}

.dock-close-btn:hover {
  color: var(--text);
  background: var(--hover);
  border-color: var(--line-strong);
  transform: rotate(90deg);
}

.dock-close-btn:active {
  transform: rotate(90deg) scale(0.92);
}

/* 抽屉可滚动正文 */
.dock-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
}

.title-with-icon svg {
  color: var(--accent);
}

.live-dot {
  font-size: 11px;
  font-weight: 600;
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

/* 预设切换小药丸 */
.preset-pills {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 3px;
  background: var(--surface-muted);
  border-radius: 8px;
}

.preset-pill {
  border: 0;
  background: transparent;
  padding: 6px 0;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap;
  text-align: center;
}

.preset-pill.active {
  background: #FFFFFF;
  color: var(--text);
  font-weight: 600;
  box-shadow: 0 1px 3px rgb(0 0 0 / 6%);
}

/* 时钟展示框：Double-Bezel 硬件微质感 */
.timer-display-box {
  padding: 18px 14px;
  background: #FFFFFF;
  border: 1px solid rgba(226, 232, 240, 0.85);
  border-radius: 16px;
  box-shadow: 0 4px 16px -4px rgba(15, 23, 42, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.9);
  text-align: center;
  transition: all 0.24s var(--ease-spring);
}

.timer-display-box.active {
  border-color: rgba(37, 99, 235, 0.35);
  background: #F8FAFC;
  box-shadow: 0 8px 24px -6px rgba(37, 99, 235, 0.08);
}

.timer-display-box.finished {
  border-color: rgba(16, 185, 129, 0.35);
  background: #ECFDF5;
}

.timer-digits {
  font-size: 34px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.timer-subtext {
  margin: 6px 0 0;
  font-size: 11.5px;
  color: var(--text-muted);
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
  font-weight: 600;
  color: #059669;
  cursor: pointer;
  text-decoration: underline;
}

/* 按钮行 */
.timer-controls {
  display: flex;
  gap: 8px;
}

.timer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.timer-btn-primary {
  flex: 1;
  background: var(--ink);
  color: #FFFFFF;
  border: 0;
}

.timer-btn-primary:hover {
  background: var(--ink-hover);
}

.timer-btn-pause {
  flex: 1;
  background: var(--accent-soft);
  color: var(--accent-strong);
  border: 1px solid rgb(61 125 214 / 20%);
}

.timer-btn-pause:hover {
  background: #DEECFC;
}

.timer-btn-reset {
  width: 36px;
  background: var(--surface-soft);
  color: var(--text-muted);
  border: 1px solid var(--line);
}

.timer-btn-reset:hover {
  background: var(--hover);
  color: var(--text);
}

/* 白噪音伴学条 */
.ambient-sound-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 10px;
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
  color: var(--text-muted);
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
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 11.5px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.16s ease;
}

.sound-btn:hover {
  border-color: var(--accent);
  color: var(--text);
}

.sound-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent-strong);
  font-weight: 600;
}

.sound-btn-stop {
  color: var(--danger);
}

.volume-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px dashed var(--line);
}

.vol-icon {
  color: var(--text-soft);
}

.volume-slider {
  flex: 1;
  height: 4px;
  accent-color: var(--accent);
  cursor: pointer;
}

.vol-num {
  font-size: 11px;
  color: var(--text-soft);
  width: 28px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* ==================== 呼吸平复坞 ==================== */
.dock-breath-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.24s ease;
}

.dock-breath-card:hover {
  border-color: var(--accent);
  background: var(--accent-faint);
}

.dock-breath-visual {
  position: relative;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  display: grid;
  place-items: center;
}

.dock-breath-halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(61 125 214 / 30%) 0%, transparent 70%);
  transform: scale(1);
  transition: transform 1s ease;
}

.dock-breath-core {
  position: relative;
  z-index: 2;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: #FFFFFF;
  color: var(--accent);
  border: 1.5px solid var(--accent);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgb(61 125 214 / 20%);
  transition: transform 1s ease;
}

.dock-breath-num {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}

.dock-breath-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dock-breath-text strong {
  font-size: 12.5px;
  color: var(--text);
}

.dock-breath-text span {
  font-size: 11px;
  color: var(--text-soft);
}

.retry-hint {
  color: var(--accent) !important;
  font-weight: 500;
}

.dock-breath-card.inhale .dock-breath-halo {
  transform: scale(1.5);
}

.dock-breath-card.inhale .dock-breath-core {
  transform: scale(1.15);
}

.dock-breath-card.hold .dock-breath-halo {
  transform: scale(1.4);
}

.dock-breath-card.exhale .dock-breath-halo {
  transform: scale(1);
}

.dock-breath-card.exhale .dock-breath-core {
  transform: scale(0.92);
}

/* ==================== 快捷技能卡片 ==================== */
.skills-card-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skill-mini-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.skill-mini-card:hover {
  background: var(--accent-faint);
  border-color: var(--accent);
  transform: translateX(2px);
}

.skill-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.skill-info strong {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
}

.skill-info span {
  font-size: 11px;
  color: var(--text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-arrow {
  color: var(--text-soft);
  flex-shrink: 0;
  transition: transform 0.18s ease;
}

.skill-mini-card:hover .skill-arrow {
  color: var(--accent);
  transform: translateX(2px);
}

/* 底部提示 */
.dock-footer-note {
  margin-top: auto;
  padding: 12px;
  background: var(--surface-muted);
  border-radius: 8px;
  font-size: 11px;
  color: var(--text-soft);
  line-height: 1.5;
}

.dock-footer-note strong {
  display: block;
  margin-bottom: 3px;
  color: var(--text-muted);
}

.dock-footer-note p {
  margin: 0;
}

/* 响应式收起 */
@media (max-width: 1100px) {
  .companion-dock {
    position: fixed;
    top: 52px;
    right: 0;
    bottom: 0;
    width: min(320px, calc(100vw - 32px));
    box-shadow: -4px 0 24px rgb(0 0 0 / 12%);
    transform: translateX(105%);
    transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .companion-dock.open {
    transform: translateX(0);
  }
}
</style>
