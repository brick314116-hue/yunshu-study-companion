<script setup lang="ts">
import {
  CheckCircle2,
  CloudRain,
  Headphones,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Wind,
} from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ambientSound } from '../utils/ambient-sound'

const emit = defineEmits<{
  askAgent: [prompt: string]
}>()

// ==================== 1. 番茄时钟系统 ====================
type TimerPreset = 15 | 25 | 45
const timerPreset = ref<TimerPreset>(25)
const timerRemaining = ref(25 * 60)
const timerRunning = ref(false)
const timerFinished = ref(false)
const isFullscreen = ref(false)
let timerInterval: ReturnType<typeof setInterval> | undefined

const setPreset = (mins: TimerPreset) => {
  timerPreset.value = mins
  timerRemaining.value = mins * 60
  timerRunning.value = false
  timerFinished.value = false
  clearInterval(timerInterval)
}

const formattedMinutes = computed(() => {
  const m = Math.floor(timerRemaining.value / 60)
  return m.toString().padStart(2, '0')
})

const formattedSeconds = computed(() => {
  const s = timerRemaining.value % 60
  return s.toString().padStart(2, '0')
})

const progressPercent = computed(() => {
  const total = timerPreset.value * 60
  return Math.round(((total - timerRemaining.value) / total) * 100)
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
      recordCompletedFocus(timerPreset.value)
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

// 记录完成的专注时长
const recordCompletedFocus = (minutes: number) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const key = `yunshu_focus_${today}`
    const current = Number(localStorage.getItem(key) || '0')
    localStorage.setItem(key, String(current + minutes))

    const totalKey = 'yunshu_total_focus_count'
    const totalCount = Number(localStorage.getItem(totalKey) || '0')
    localStorage.setItem(totalKey, String(totalCount + 1))
  } catch {
    /* ignore */
  }
}

const tellAgentFocusDone = () => {
  emit('askAgent', `云小舒，我刚刚在专注自习室完成了 ${timerPreset.value} 分钟专注学习！感觉很充实，接下来想梳理下一步。`)
}

// ==================== 2. 白噪音调音台 ====================
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

// ==================== 3. 今日微任务便签清单 ====================
interface MicroTask {
  id: string
  text: string
  done: boolean
}

const tasks = ref<MicroTask[]>([])
const newTaskInput = ref('')
const TASKS_STORAGE_KEY = 'yunshu_focus_micro_tasks'

onMounted(() => {
  try {
    const saved = localStorage.getItem(TASKS_STORAGE_KEY)
    if (saved) {
      tasks.value = JSON.parse(saved)
    } else {
      tasks.value = []
    }
  } catch {
    /* ignore */
  }
})

const saveTasks = () => {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks.value))
  } catch {
    /* ignore */
  }
}

const addTask = () => {
  const text = newTaskInput.value.trim()
  if (!text) return
  tasks.value.push({
    id: Date.now().toString(),
    text,
    done: false,
  })
  newTaskInput.value = ''
  saveTasks()
}

const toggleTask = (task: MicroTask) => {
  task.done = !task.done
  saveTasks()
}

const removeTask = (index: number) => {
  tasks.value.splice(index, 1)
  saveTasks()
}

const askAgentDecompose = () => {
  emit('askAgent', '云小舒，我手头的作业/任务有点大，不知道怎么开始，请帮我拆解成 3 个 15 分钟内能做完的微步骤！')
}

onBeforeUnmount(() => {
  clearInterval(timerInterval)
  ambientSound.stop()
})
</script>

<template>
  <main class="focus-room" :class="{ fullscreen: isFullscreen }">
    <div class="focus-container">
      <!-- 顶部信息栏 -->
      <header class="focus-header">
        <div class="header-left">
          <div class="focus-badge">
            <Sparkles :size="15" :stroke-width="2" class="badge-sparkle" />
            <span>沉浸专注伴学室 · 心流空间</span>
          </div>
          <h2>把大任务放在一边，现在只专注当下这一刻</h2>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="header-tool-btn"
            :title="isFullscreen ? '退出全屏' : '全屏沉浸专注'"
            @click="isFullscreen = !isFullscreen"
          >
            <Minimize2 v-if="isFullscreen" :size="16" :stroke-width="1.8" />
            <Maximize2 v-else :size="16" :stroke-width="1.8" />
            <span>{{ isFullscreen ? '还原' : '全屏专注' }}</span>
          </button>
        </div>
      </header>

      <!-- 核心三栏/双栏主体 -->
      <div class="focus-main-grid">
        <!-- 左栏：今日微任务清单 -->
        <section class="focus-card task-card">
          <div class="card-header-bar">
            <div class="card-title-group">
              <CheckCircle2 :size="16" :stroke-width="2" class="icon-accent" />
              <h3>今日微步骤清单</h3>
            </div>
            <button class="decompose-agent-btn" type="button" @click="askAgentDecompose">
              <Sparkles :size="13" :stroke-width="2" />
              <span>让小舒帮我拆解</span>
            </button>
          </div>

          <p class="card-sub-hint">只放 15 分钟能做完的一小步，做完一个划掉一个</p>

          <div class="task-input-row">
            <input
              v-model="newTaskInput"
              type="text"
              placeholder="添加一条微任务，如：整理第一道错题..."
              maxlength="40"
              @keydown.enter="addTask"
            />
            <button type="button" class="add-task-btn" :disabled="!newTaskInput.trim()" @click="addTask">
              <Plus :size="16" :stroke-width="2" />
            </button>
          </div>

          <div v-if="tasks.length === 0" class="task-empty-state">
            <p>暂无待办微任务。在上方输入你当下最容易开始的一个小步骤，或点击右上角让小舒帮你拆解。</p>
          </div>
          <div v-else class="task-list-wrap">
            <div
              v-for="(task, index) in tasks"
              :key="task.id"
              class="micro-task-item"
              :class="{ done: task.done }"
            >
              <button
                type="button"
                class="task-check-box"
                :aria-label="task.done ? '标记为未完成' : '标记为已完成'"
                @click="toggleTask(task)"
              >
                <CheckCircle2 v-if="task.done" :size="18" :stroke-width="2" class="icon-checked" />
                <span v-else class="check-circle" />
              </button>
              <span class="task-label">{{ task.text }}</span>
              <button
                type="button"
                class="task-delete-btn"
                title="删除此任务"
                aria-label="删除此任务"
                @click="removeTask(index)"
              >
                <Trash2 :size="14" :stroke-width="1.8" />
              </button>
            </div>

            <div v-if="tasks.length === 0" class="empty-task-tip">
              暂无微任务，在上方输入或点击“让小舒帮我拆解”
            </div>
          </div>
        </section>

        <!-- 中央：大番茄钟与伴学核心 -->
        <section class="focus-card clock-card" :class="{ running: timerRunning, finished: timerFinished }">
          <div class="preset-selector">
            <button
              type="button"
              class="preset-item"
              :class="{ active: timerPreset === 15 }"
              @click="setPreset(15)"
            >
              15m 破冰启动
            </button>
            <button
              type="button"
              class="preset-item"
              :class="{ active: timerPreset === 25 }"
              @click="setPreset(25)"
            >
              25m 标准番茄
            </button>
            <button
              type="button"
              class="preset-item"
              :class="{ active: timerPreset === 45 }"
              @click="setPreset(45)"
            >
              45m 深度心流
            </button>
          </div>

          <!-- 大号倒计时主表盘 -->
          <div class="big-clock-wrap">
            <div class="clock-progress-ring" :style="{ '--progress': `${progressPercent}%` }">
              <div class="clock-time-digits">
                <span class="digit-part">{{ formattedMinutes }}</span>
                <span class="digit-colon">:</span>
                <span class="digit-part">{{ formattedSeconds }}</span>
              </div>
            </div>

            <p class="clock-status-desc">
              <template v-if="timerFinished">
                🎉 太棒了！本轮 {{ timerPreset }} 分钟专注达成！
              </template>
              <template v-else-if="timerRunning">
                云小舒正在安静陪伴中，请保持平稳呼吸与专注
              </template>
              <template v-else>
                消除外界杂音，准备好后点击下方开始
              </template>
            </p>
          </div>

          <!-- 完成结算卡 -->
          <div v-if="timerFinished" class="finish-congrats-card">
            <button type="button" class="tell-agent-big-btn" @click="tellAgentFocusDone">
              <Sparkles :size="17" :stroke-width="2" />
              <span>向小舒汇报总结本次专注 ➔</span>
            </button>
          </div>

          <!-- 时钟控制按钮群 -->
          <div class="clock-controls-bar">
            <button
              v-if="!timerRunning"
              type="button"
              class="main-action-btn start-btn"
              @click="startTimer"
            >
              <Play :size="18" :stroke-width="2.2" />
              <span>{{ timerRemaining < timerPreset * 60 ? '继续专注' : '开始专注' }}</span>
            </button>
            <button
              v-else
              type="button"
              class="main-action-btn pause-btn"
              @click="pauseTimer"
            >
              <Pause :size="18" :stroke-width="2.2" />
              <span>暂停片刻</span>
            </button>

            <button
              type="button"
              class="reset-icon-btn"
              title="重置本轮时钟"
              aria-label="重置时钟"
              @click="resetTimer"
            >
              <RotateCcw :size="17" :stroke-width="1.8" />
            </button>
          </div>
        </section>

        <!-- 右栏：声学白噪音与求助小舒卡 -->
        <section class="focus-card audio-agent-card">
          <div class="card-header-bar">
            <div class="card-title-group">
              <Headphones :size="16" :stroke-width="2" class="icon-accent" />
              <h3>声学白噪音调音台</h3>
            </div>
          </div>

          <p class="card-sub-hint">Web Audio 纯算法实时合成，遮蔽寝室与自习室杂音</p>

          <div class="sound-grid">
            <button
              type="button"
              class="sound-tile"
              :class="{ active: currentSound === 'rain' }"
              @click="toggleSound('rain')"
            >
              <CloudRain :size="20" :stroke-width="1.8" />
              <div class="sound-tile-text">
                <strong>细雨敲窗</strong>
                <small>柔和低通粉红噪</small>
              </div>
            </button>

            <button
              type="button"
              class="sound-tile"
              :class="{ active: currentSound === 'white' }"
              @click="toggleSound('white')"
            >
              <Wind :size="20" :stroke-width="1.8" />
              <div class="sound-tile-text">
                <strong>静音白噪</strong>
                <small>阻隔交谈碎语</small>
              </div>
            </button>
          </div>

          <div v-if="currentSound !== 'none'" class="sound-volume-box">
            <div class="volume-header">
              <Volume2 :size="15" :stroke-width="1.8" />
              <span>音量调节：{{ Math.round(soundVolume * 100) }}%</span>
              <button class="mute-link" type="button" @click="stopAllSound">
                <VolumeX :size="13" /> 静音关闭
              </button>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              :value="soundVolume * 100"
              class="room-volume-slider"
              @input="onVolumeChange"
            />
          </div>

          <!-- 智能体随时待命卡 -->
          <div class="agent-standby-card">
            <div class="standby-header">
              <Sparkles :size="16" :stroke-width="2" class="standby-icon" />
              <strong>云小舒随时在侧</strong>
            </div>
            <p>写题遇到想不通的卡点，或是走神看不进书？随时向小舒求助，小舒陪你理顺。</p>
            <div class="standby-actions">
              <button
                type="button"
                class="standby-btn"
                @click="emit('askAgent', '云小舒，我这道题有些卡住了，想让你帮我从思维卡点上理一理。')"
              >
                <span>这道题卡住了，理理思维 ➔</span>
              </button>
              <button
                type="button"
                class="standby-btn"
                @click="emit('askAgent', '云小舒，我学着学着走神了，有点心烦，能帮我收收心吗？')"
              >
                <span>我走神了，帮我收收心 ➔</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.focus-room {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--surface-soft);
  padding: 32px 24px 60px;
}

.focus-room.fullscreen {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #FFFFFF;
  padding: 32px 40px;
}

.focus-container {
  max-width: 1240px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 顶部信息条 */
.focus-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
}

.focus-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--accent-soft);
  border: 1px solid rgb(61 125 214 / 20%);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-strong);
  margin-bottom: 8px;
}

.badge-sparkle {
  color: var(--accent);
}

.focus-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.header-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.18s ease;
}

.header-tool-btn:hover {
  border-color: var(--accent);
  color: var(--accent-strong);
}

/* 核心三栏网格 */
.focus-main-grid {
  display: grid;
  grid-template-columns: 310px 1fr 310px;
  gap: 20px;
  align-items: stretch;
}

.focus-card {
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 2px 10px rgb(26 34 51 / 3%);
  display: flex;
  flex-direction: column;
}

.card-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-accent {
  color: var(--accent);
}

.card-title-group h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.card-sub-hint {
  margin: 0 0 16px;
  font-size: 12px;
  color: var(--text-soft);
  line-height: 1.5;
}

/* ================== 左栏：微任务清单 ================== */
.decompose-agent-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--accent-soft);
  border: 0;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--accent-strong);
  cursor: pointer;
  transition: all 0.16s ease;
}

.decompose-agent-btn:hover {
  background: #DEECFC;
}

.task-input-row {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}

.task-input-row input {
  flex: 1;
  height: 38px;
  padding: 0 12px;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text);
  outline: none;
  transition: border-color 0.18s ease;
}

.task-input-row input:focus {
  border-color: var(--accent);
  background: #FFFFFF;
}

.add-task-btn {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--ink);
  color: #FFFFFF;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.18s ease;
}

.add-task-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.task-empty-state {
  padding: 24px 16px;
  text-align: center;
  background: var(--surface-muted);
  border: 1px dashed var(--line);
  border-radius: 10px;
  color: var(--text-soft);
  font-size: 12.5px;
  line-height: 1.6;
}

.task-empty-state p {
  margin: 0;
}

.task-list-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  max-height: 340px;
}

.micro-task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 10px;
  transition: all 0.16s ease;
}

.micro-task-item:hover {
  border-color: var(--line-strong);
}

.micro-task-item.done {
  background: #FAFAFA;
  opacity: 0.65;
}

.micro-task-item.done .task-label {
  text-decoration: line-through;
  color: var(--text-soft);
}

.task-check-box {
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.check-circle {
  width: 17px;
  height: 17px;
  border: 1.8px solid var(--text-soft);
  border-radius: 50%;
}

.icon-checked {
  color: #10B981;
}

.task-label {
  flex: 1;
  font-size: 13px;
  color: var(--text);
  line-height: 1.4;
}

.task-delete-btn {
  background: transparent;
  border: 0;
  color: var(--text-soft);
  cursor: pointer;
  padding: 4px;
  opacity: 0.4;
  transition: opacity 0.16s ease;
}

.micro-task-item:hover .task-delete-btn {
  opacity: 1;
}

.task-delete-btn:hover {
  color: var(--danger);
}

.empty-task-tip {
  padding: 24px 12px;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-soft);
  background: var(--surface-muted);
  border-radius: 10px;
}

/* ================== 中央：大番茄钟 ================== */
.clock-card {
  justify-content: space-between;
  align-items: center;
  text-align: center;
  background: linear-gradient(180deg, #FFFFFF 0%, #FAFCFF 100%);
  border-color: rgb(61 125 214 / 22%);
  padding: 32px 24px;
}

.preset-selector {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--surface-muted);
  border-radius: 10px;
  margin-bottom: 20px;
}

.preset-item {
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.preset-item.active {
  background: #FFFFFF;
  color: var(--accent-strong);
  font-weight: 600;
  box-shadow: 0 1px 4px rgb(0 0 0 / 6%);
}

.big-clock-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin: 12px 0 24px;
}

.clock-progress-ring {
  width: 240px;
  height: 240px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: conic-gradient(var(--accent) var(--progress), var(--line) 0deg);
  padding: 10px;
  transition: all 0.4s ease;
  box-shadow: 0 8px 32px rgb(61 125 214 / 12%);
}

.clock-card.running .clock-progress-ring {
  box-shadow: 0 12px 40px rgb(61 125 214 / 22%);
}

.clock-time-digits {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 58px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
}

.digit-colon {
  margin: 0 2px -4px;
  animation: blink-colon 1s infinite;
}

@keyframes blink-colon {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.clock-status-desc {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-muted);
  max-width: 320px;
  line-height: 1.5;
}

.clock-controls-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(100%, 280px);
}

.main-action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.start-btn {
  background: var(--ink);
  color: #FFFFFF;
  border: 0;
  box-shadow: 0 4px 14px rgb(26 34 51 / 18%);
}

.start-btn:hover {
  background: var(--ink-hover);
}

.pause-btn {
  background: var(--accent-soft);
  color: var(--accent-strong);
  border: 1px solid rgb(61 125 214 / 25%);
}

.pause-btn:hover {
  background: #DCEAFC;
}

.reset-icon-btn {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.18s ease;
}

.reset-icon-btn:hover {
  background: var(--hover);
  color: var(--text);
}

.finish-congrats-card {
  margin-bottom: 18px;
  width: 100%;
}

.tell-agent-big-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 18px;
  background: #ECFDF5;
  border: 1.5px solid #10B981;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  color: #065F46;
  cursor: pointer;
  transition: all 0.18s ease;
}

.tell-agent-big-btn:hover {
  background: #D1FAE5;
  transform: translateY(-1px);
}

/* ================== 右栏：声学与小舒卡 ================== */
.sound-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.sound-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 14px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.18s ease;
}

.sound-tile:hover {
  border-color: var(--accent);
}

.sound-tile.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent-strong);
}

.sound-tile-text strong {
  display: block;
  font-size: 13px;
  color: var(--text);
}

.sound-tile.active .sound-tile-text strong {
  color: var(--accent-strong);
}

.sound-tile-text small {
  font-size: 11px;
  color: var(--text-soft);
}

.sound-volume-box {
  padding: 12px;
  background: var(--surface-muted);
  border-radius: 10px;
  margin-bottom: 20px;
}

.volume-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.mute-link {
  background: transparent;
  border: 0;
  padding: 0;
  font-size: 11px;
  color: var(--danger);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
}

.room-volume-slider {
  width: 100%;
  height: 4px;
  accent-color: var(--accent);
  cursor: pointer;
}

.agent-standby-card {
  margin-top: auto;
  padding: 16px;
  background: var(--surface-soft);
  border: 1px dashed var(--line-strong);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.standby-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text);
}

.standby-icon {
  color: var(--accent);
}

.agent-standby-card p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.55;
}

.standby-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.standby-btn {
  padding: 7px 10px;
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--accent-strong);
  text-align: left;
  cursor: pointer;
  transition: all 0.16s ease;
}

.standby-btn:hover {
  background: var(--accent-faint);
  border-color: var(--accent);
  transform: translateX(2px);
}

/* 响应式适配 */
@media (max-width: 1080px) {
  .focus-main-grid {
    grid-template-columns: 1fr;
  }
}
</style>
