<script setup lang="ts">
import {
  Brain,
  HeartHandshake,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wind,
} from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const emit = defineEmits<{
  askAgent: [prompt: string]
  checkin: []
}>()

// ==================== 1. 正念呼吸引导系统 ====================
type BreathMode = '4-7-8' | 'box'
const breathMode = ref<BreathMode>('4-7-8')

type BreathPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'hold2' | 'done'
const breathPhase = ref<BreathPhase>('idle')
const breathSeconds = ref(0)
let breathTimer: ReturnType<typeof setInterval> | undefined

const setMode = (mode: BreathMode) => {
  stopBreathing()
  breathMode.value = mode
}

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
  clearInterval(breathTimer)

  if (breathMode.value === '4-7-8') {
    // 4s 吸气 -> 7s 屏气 -> 8s 呼气
    breathPhase.value = 'inhale'
    breathSeconds.value = 4

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
  } else {
    // 箱式呼吸：4s 吸气 -> 4s 屏气 -> 4s 呼气 -> 4s 屏气
    breathPhase.value = 'inhale'
    breathSeconds.value = 4

    breathTimer = setInterval(() => {
      breathSeconds.value--
      if (breathSeconds.value <= 0) {
        if (breathPhase.value === 'inhale') {
          breathPhase.value = 'hold'
          breathSeconds.value = 4
        } else if (breathPhase.value === 'hold') {
          breathPhase.value = 'exhale'
          breathSeconds.value = 4
        } else if (breathPhase.value === 'exhale') {
          breathPhase.value = 'hold2'
          breathSeconds.value = 4
        } else if (breathPhase.value === 'hold2') {
          breathPhase.value = 'done'
          clearInterval(breathTimer)
        }
      }
    }, 1000)
  }
}

const breathPhaseText = computed(() => {
  switch (breathPhase.value) {
    case 'inhale': return '缓缓吸气...'
    case 'hold': return '屏住呼吸，感受此刻平静...'
    case 'exhale': return '均匀吐气，放下紧绷...'
    case 'hold2': return '空腹屏息，维持稳定...'
    case 'done': return '练习完成，感觉放松些了吗？'
    default: return '点击圆球，开启深呼吸'
  }
})

// ==================== 2. ABC 认知解离沙盒 ====================
interface ReframingItem {
  id: string
  fact: string
  thought: string
  reframe?: string
}

const notes = ref<ReframingItem[]>([])
const newFact = ref('')
const newThought = ref('')
const NOTES_KEY = 'yunshu_cbt_reframing_notes'

onMounted(() => {
  try {
    const saved = localStorage.getItem(NOTES_KEY)
    if (saved) {
      notes.value = JSON.parse(saved)
    } else {
      notes.value = [
        {
          id: '1',
          fact: '数学模拟考有 2 道大题没来得及动笔',
          thought: '我觉得自己脑子笨，下次高考肯定完蛋了',
          reframe: '事实只是一次小测时间分配没把握好，与能力无关。下次先易后难即可。',
        },
      ]
    }
  } catch {
    /* ignore */
  }
})

const saveNotes = () => {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes.value))
  } catch {
    /* ignore */
  }
}

const addNote = () => {
  const f = newFact.value.trim()
  const t = newThought.value.trim()
  if (!f && !t) return
  notes.value.unshift({
    id: Date.now().toString(),
    fact: f || '未填写具体事实',
    thought: t || '未填写脑补想法',
  })
  newFact.value = ''
  newThought.value = ''
  saveNotes()
}

const removeNote = (index: number) => {
  notes.value.splice(index, 1)
  saveNotes()
}

const askAgentReframe = (item: ReframingItem) => {
  emit(
    'askAgent',
    `云小舒，我正在做认知想法理清练习。\n【客观事实】：${item.fact}\n【我脑补的想法】：${item.thought}\n能帮我把事实和想法解离开，找找别的积极可能吗？`,
  )
}

onBeforeUnmount(() => {
  clearInterval(breathTimer)
})
</script>

<template>
  <main class="mind-sanctuary">
    <div class="sanctuary-container">
      <!-- 顶部信息栏 -->
      <header class="sanctuary-header">
        <div class="header-left">
          <div class="sanctuary-badge">
            <HeartHandshake :size="15" :stroke-width="2" class="badge-icon" />
            <span>心灵缓压避风港 · 非临床情绪调适</span>
          </div>
          <h2>烦躁紧绷时，先照顾好当下的心情，再继续前行</h2>
        </div>

        <button type="button" class="checkin-hero-btn" @click="emit('checkin')">
          <Sparkles :size="15" :stroke-width="2" />
          <span>做一次情绪微打卡</span>
        </button>
      </header>

      <!-- 双栏核心内容 -->
      <div class="sanctuary-grid">
        <!-- 左侧：正念呼吸冥想岛 -->
        <section class="sanctuary-card breath-card">
          <div class="card-top-bar">
            <div class="title-with-icon">
              <Wind :size="17" :stroke-width="2" class="icon-accent" />
              <h3>正念呼吸减压岛</h3>
            </div>

            <div class="mode-pills">
              <button
                type="button"
                class="mode-pill"
                :class="{ active: breathMode === '4-7-8' }"
                @click="setMode('4-7-8')"
              >
                4-7-8 平复法
              </button>
              <button
                type="button"
                class="mode-pill"
                :class="{ active: breathMode === 'box' }"
                @click="setMode('box')"
              >
                4-4-4 箱式呼吸
              </button>
            </div>
          </div>

          <p class="card-desc">
            {{ breathMode === '4-7-8' ? '通过长吐气激活副交感神经，帮助紧绷的心率与肌肉迅速平稳' : '四拍对称节律，常用于运动员与特战员考前快速找回沉着自控力' }}
          </p>

          <!-- 巨大呼吸球主视觉 -->
          <div class="breath-visual-area">
            <div class="large-breath-halo" :class="[breathPhase]" />
            <div class="large-breath-circle" :class="[breathPhase]" @click="startBreathing">
              <div class="circle-inner">
                <Wind v-if="breathPhase === 'idle'" :size="36" :stroke-width="1.8" />
                <RotateCcw v-else-if="breathPhase === 'done'" :size="36" :stroke-width="1.8" />
                <span v-else class="breath-large-num">{{ breathSeconds }}</span>
              </div>
            </div>
            <p class="breath-instruction">{{ breathPhaseText }}</p>
          </div>

          <div class="breath-controls-row">
            <button
              v-if="breathPhase === 'idle' || breathPhase === 'done'"
              type="button"
              class="breath-start-btn"
              @click="startBreathing"
            >
              <Wind :size="16" :stroke-width="2" />
              <span>开启一轮呼吸引导</span>
            </button>
            <button
              v-else
              type="button"
              class="breath-stop-btn"
              @click="stopBreathing"
            >
              <span>结束练习</span>
            </button>
          </div>
        </section>

        <!-- 右侧：ABC 认知解离对照沙盒 -->
        <section class="sanctuary-card cbt-card">
          <div class="card-top-bar">
            <div class="title-with-icon">
              <Brain :size="17" :stroke-width="2" class="icon-accent" />
              <h3>认知解离沙盒 (事实 vs 想法)</h3>
            </div>
          </div>

          <p class="card-desc">
            难受的往往不是事实本身，而是大脑自动产生的灾难化推论。把它们分离开，打破内耗循环。
          </p>

          <!-- 输入便签框 -->
          <div class="cbt-create-box">
            <div class="cbt-inputs">
              <div class="input-col">
                <label>① 客观事实 (发生了什么)</label>
                <input
                  v-model="newFact"
                  type="text"
                  placeholder="例：今天英语模拟考听力错了 6 题"
                  maxlength="60"
                />
              </div>
              <div class="input-col">
                <label>② 自动想法 (我脑补了什么)</label>
                <input
                  v-model="newThought"
                  type="text"
                  placeholder="例：我觉得自己听力没救了，以后肯定考不上"
                  maxlength="60"
                  @keydown.enter="addNote"
                />
              </div>
            </div>
            <button
              type="button"
              class="cbt-submit-btn"
              :disabled="!newFact.trim() && !newThought.trim()"
              @click="addNote"
            >
              <Plus :size="16" :stroke-width="2" />
              <span>记下一条想法便签</span>
            </button>
          </div>

          <!-- 便签列表 -->
          <div class="cbt-notes-list">
            <div v-for="(note, index) in notes" :key="note.id" class="cbt-note-card">
              <div class="note-columns">
                <div class="fact-block">
                  <span class="block-tag">客观事实</span>
                  <p>{{ note.fact }}</p>
                </div>
                <div class="thought-block">
                  <span class="block-tag tag-warn">脑补推论</span>
                  <p>{{ note.thought }}</p>
                </div>
              </div>

              <div v-if="note.reframe" class="reframe-block">
                <span class="block-tag tag-success">理清后的可能</span>
                <p>{{ note.reframe }}</p>
              </div>

              <div class="note-footer">
                <button type="button" class="ask-reframe-btn" @click="askAgentReframe(note)">
                  <Sparkles :size="14" :stroke-width="2" />
                  <span>让小舒陪我理顺这个想法 ➔</span>
                </button>
                <button type="button" class="note-del-btn" title="删除便签" @click="removeNote(index)">
                  <Trash2 :size="14" :stroke-width="1.8" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- 底部安全与合规免责声明 -->
      <footer class="sanctuary-legal">
        <div class="legal-badge">
          <ShieldCheck :size="15" :stroke-width="2" />
          <span>非临床调适 · 绝对隐私保障</span>
        </div>
        <p>
          认知练习与呼吸引导旨在提供认知行为（CBT）轻量微练习，<strong>不构成任何医学性精神心理诊断与处方治疗</strong>。
          所有便签数据均在本地运行并受 7 天自动销毁机制保护。遇严重危机请立即拨打全国 24 小时心理援助热线：400-161-9995。
        </p>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.mind-sanctuary {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--surface-soft);
  padding: 32px 24px 60px;
}

.sanctuary-container {
  max-width: 1240px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 顶部信息栏 */
.sanctuary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
}

.sanctuary-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #FFFBEB;
  border: 1px solid rgb(245 158 11 / 25%);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #D97706;
  margin-bottom: 8px;
}

.badge-icon {
  color: #F59E0B;
}

.sanctuary-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.checkin-hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--ink);
  color: #FFFFFF;
  border: 0;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgb(26 34 51 / 15%);
  transition: all 0.18s ease;
}

.checkin-hero-btn:hover {
  background: var(--ink-hover);
  transform: translateY(-1px);
}

/* 双栏网格 */
.sanctuary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: stretch;
}

.sanctuary-card {
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 2px 12px rgb(26 34 51 / 3%);
  display: flex;
  flex-direction: column;
}

.card-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-accent {
  color: var(--accent);
}

.title-with-icon h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.card-desc {
  margin: 0 0 22px;
  font-size: 13px;
  color: var(--text-soft);
  line-height: 1.6;
}

/* 模式切换小药丸 */
.mode-pills {
  display: flex;
  gap: 4px;
  padding: 3px;
  background: var(--surface-muted);
  border-radius: 8px;
}

.mode-pill {
  padding: 5px 12px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.mode-pill.active {
  background: #FFFFFF;
  color: var(--accent-strong);
  font-weight: 600;
  box-shadow: 0 1px 3px rgb(0 0 0 / 6%);
}

/* ================== 左侧：呼吸大球 ================== */
.breath-card {
  align-items: center;
  text-align: center;
  background: linear-gradient(180deg, #FFFFFF 0%, #FAFCFF 100%);
  border-color: rgb(61 125 214 / 22%);
}

.breath-visual-area {
  position: relative;
  width: 260px;
  height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 16px 0 28px;
}

.large-breath-halo {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(61 125 214 / 30%) 0%, transparent 70%);
  transform: scale(0.9);
  transition: transform 1.2s ease, opacity 1.2s ease;
}

.large-breath-circle {
  position: relative;
  z-index: 2;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 3px solid var(--accent);
  box-shadow: 0 8px 30px rgb(61 125 214 / 20%);
  display: grid;
  place-items: center;
  cursor: pointer;
  transform: scale(1);
  transition: transform 1.2s ease;
}

.circle-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--accent);
}

.breath-large-num {
  font-size: 48px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.breath-instruction {
  position: absolute;
  bottom: -18px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

/* 呼吸动画缩放 */
.large-breath-halo.inhale {
  transform: scale(1.6);
}

.large-breath-circle.inhale {
  transform: scale(1.28);
}

.large-breath-halo.hold {
  transform: scale(1.5);
}

.large-breath-circle.hold {
  transform: scale(1.25);
}

.large-breath-halo.exhale {
  transform: scale(0.85);
}

.large-breath-circle.exhale {
  transform: scale(0.92);
}

.breath-controls-row {
  margin-top: auto;
  width: min(100%, 260px);
}

.breath-start-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  background: var(--ink);
  color: #FFFFFF;
  border: 0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.breath-start-btn:hover {
  background: var(--ink-hover);
}

.breath-stop-btn {
  width: 100%;
  height: 44px;
  background: var(--surface-muted);
  color: var(--text-muted);
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

/* ================== 右侧：CBT 认知解离沙盒 ================== */
.cbt-create-box {
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cbt-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.input-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-col label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
}

.input-col input {
  height: 38px;
  padding: 0 12px;
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--text);
  outline: none;
  transition: border-color 0.18s ease;
}

.input-col input:focus {
  border-color: var(--accent);
}

.cbt-submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  border: 1px solid rgb(61 125 214 / 20%);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.cbt-submit-btn:hover:not(:disabled) {
  background: #DEECFC;
}

.cbt-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cbt-notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 380px;
  overflow-y: auto;
}

.cbt-note-card {
  padding: 14px 16px;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.fact-block, .thought-block, .reframe-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.block-tag {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-soft);
  background: rgb(0 0 0 / 5%);
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
}

.tag-warn {
  color: #D97706;
  background: #FFFBEB;
}

.tag-success {
  color: #059669;
  background: #ECFDF5;
}

.note-columns p, .reframe-block p {
  margin: 0;
  font-size: 12.5px;
  color: var(--text);
  line-height: 1.5;
}

.note-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px dashed var(--line);
}

.ask-reframe-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 0;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}

.ask-reframe-btn:hover {
  text-decoration: underline;
}

.note-del-btn {
  background: transparent;
  border: 0;
  color: var(--text-soft);
  cursor: pointer;
  padding: 2px;
  opacity: 0.5;
  transition: opacity 0.16s ease;
}

.note-del-btn:hover {
  color: var(--danger);
  opacity: 1;
}

/* 底部合规声明 */
.sanctuary-legal {
  padding: 16px 20px;
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-soft);
  line-height: 1.6;
}

.legal-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.sanctuary-legal p {
  margin: 0;
}

/* 响应式 */
@media (max-width: 960px) {
  .sanctuary-grid {
    grid-template-columns: 1fr;
  }

  .cbt-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
