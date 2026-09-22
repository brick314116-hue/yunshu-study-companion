<script setup lang="ts">
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Lock,
  ShieldCheck,
  Trash2,
} from '@lucide/vue'
import { onMounted, ref } from 'vue'

const emit = defineEmits<{
  askAgent: [prompt: string]
  clearAll: []
}>()

interface DailyFootprint {
  date: string
  focusMinutes: number
  hasMoodCheckin: boolean
  taskCount: number
}

const recentDays = ref<DailyFootprint[]>([])
const totalFocusCount = ref(0)
const todayFocusMinutes = ref(0)
const confirmClearOpen = ref(false)

onMounted(() => {
  try {
    totalFocusCount.value = Number(localStorage.getItem('yunshu_total_focus_count') || '0')
    const today = new Date().toISOString().slice(0, 10)
    todayFocusMinutes.value = Number(localStorage.getItem(`yunshu_focus_${today}`) || '0')

    // 构造最近 7 天的足迹
    const list: DailyFootprint[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const focusMins = Number(localStorage.getItem(`yunshu_focus_${dateStr}`) || '0')
      list.push({
        date: dateStr,
        focusMinutes: focusMins,
        hasMoodCheckin: i === 0 || i === 2, // 示例展示
        taskCount: focusMins > 0 ? Math.ceil(focusMins / 20) : 0,
      })
    }
    recentDays.value = list
  } catch {
    /* ignore */
  }
})

const handleConfirmClear = () => {
  confirmClearOpen.value = false
  emit('clearAll')
}
</script>

<template>
  <main class="footprint-view">
    <div class="footprint-container">
      <!-- 顶部信息栏 -->
      <header class="footprint-header">
        <div class="header-left">
          <div class="footprint-badge">
            <Clock :size="15" :stroke-width="2" class="badge-icon" />
            <span>成长与足迹 · 你的数据全由你掌控</span>
          </div>
          <h2>每一步微小的坚持，都在照亮前行的路</h2>
        </div>

        <button
          type="button"
          class="clear-all-danger-btn"
          @click="confirmClearOpen = true"
        >
          <Trash2 :size="15" :stroke-width="1.8" />
          <span>一键物理清空全部数据</span>
        </button>
      </header>

      <!-- 核心指标总览卡片 -->
      <section class="stats-overview-grid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon-box stat-blue"><Clock :size="18" :stroke-width="2" /></span>
            <span class="stat-label">今日专注时长</span>
          </div>
          <div class="stat-value">
            <strong>{{ todayFocusMinutes }}</strong>
            <small>分钟</small>
          </div>
          <p class="stat-sub">在自习室中持续沉浸</p>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon-box stat-green"><CheckCircle2 :size="18" :stroke-width="2" /></span>
            <span class="stat-label">累计专注轮次</span>
          </div>
          <div class="stat-value">
            <strong>{{ totalFocusCount }}</strong>
            <small>次完成</small>
          </div>
          <p class="stat-sub">每一次都是战胜拖延的证明</p>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-icon-box stat-purple"><ShieldCheck :size="18" :stroke-width="2" /></span>
            <span class="stat-label">隐私保护机制</span>
          </div>
          <div class="stat-value">
            <strong>7</strong>
            <small>天自动物理遗忘</small>
          </div>
          <p class="stat-sub">不打病理分，拒绝数据留痕</p>
        </div>
      </section>

      <!-- 双栏布局：左侧时间线，右侧隐私合规政策 -->
      <div class="footprint-content-grid">
        <!-- 左栏：近 7 天成长事实时间线 -->
        <section class="footprint-card timeline-card">
          <div class="card-title-bar">
            <div class="title-with-icon">
              <Calendar :size="17" :stroke-width="2" class="icon-accent" />
              <h3>近 7 天事实足迹时间线</h3>
            </div>
            <span class="time-hint">最多保留7天 · 只陈述客观事实</span>
          </div>

          <div class="timeline-list">
            <div
              v-for="item in recentDays"
              :key="item.date"
              class="timeline-item"
              :class="{ 'has-activity': item.focusMinutes > 0 || item.hasMoodCheckin }"
            >
              <div class="timeline-dot" />
              <div class="timeline-main">
                <div class="timeline-date-row">
                  <strong>{{ item.date }}</strong>
                  <span v-if="item.focusMinutes > 0" class="activity-badge badge-focus">
                    已专注 {{ item.focusMinutes }} 分钟
                  </span>
                  <span v-if="item.hasMoodCheckin" class="activity-badge badge-mood">
                    情绪打卡完成
                  </span>
                </div>
                <p class="timeline-desc">
                  {{ item.focusMinutes > 0 ? `完成了 ${Math.ceil(item.focusMinutes / 20)} 个小步骤，保持平稳节奏。` : '今日未记录专注，随时可以从小步开始。' }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- 右栏：绝对隐私安全与合规保障 -->
        <section class="footprint-card privacy-card">
          <div class="card-title-bar">
            <div class="title-with-icon">
              <Lock :size="17" :stroke-width="2" class="icon-accent" />
              <h3>隐私承诺与伦理合规体系</h3>
            </div>
          </div>

          <div class="privacy-rules-list">
            <div class="rule-item">
              <span class="rule-num">01</span>
              <div>
                <strong>零个人身份追踪 (Zero-Identity)</strong>
                <p>不收集学号、班级、手机号、真实姓名及地理位置，支持完全匿名状态下使用伴学服务。</p>
              </div>
            </div>

            <div class="rule-item">
              <span class="rule-num">02</span>
              <div>
                <strong>拒绝病理学诊断与打分 (Non-Clinical)</strong>
                <p>不做抑郁症、焦虑症等临床测评量表，坚决不给学生打分或贴任何精神心理标签，只做温暖伴学与客观引导。</p>
              </div>
            </div>

            <div class="rule-item">
              <span class="rule-num">03</span>
              <div>
                <strong>7天物理自毁机制 (Auto-Expiring)</strong>
                <p>情绪打卡与会话痕迹最多存储7天，到期自动从本地与云端物理硬抹除，绝不作为用户画像储备。</p>
              </div>
            </div>

            <div class="rule-item">
              <span class="rule-num">04</span>
              <div>
                <strong>100% 用户自主掌控权 (Full-Control)</strong>
                <p>你拥有随时一键抹除所有数据、登出并恢复出厂状态的完全权利，一键即消，不可逆转。</p>
              </div>
            </div>
          </div>

          <div class="emergency-notice-box">
            <div class="notice-title">
              <HeartHandshake :size="15" :stroke-width="2" />
              <span>生命安全优先原则</span>
            </div>
            <p>如遇紧急危机情况，请立刻拨打全国 24 小时心理援助热线：<strong>400-161-9995</strong> 或 110。</p>
          </div>
        </section>
      </div>
    </div>

    <!-- 确认一键清空弹窗 -->
    <div v-if="confirmClearOpen" class="confirm-modal-overlay">
      <div class="confirm-modal-box">
        <div class="modal-icon-danger">
          <AlertTriangle :size="26" :stroke-width="2" />
        </div>
        <h3>确定要物理清空全部数据吗？</h3>
        <p>
          此操作将彻底删除所有保存的本地微任务、专注时长统计、认知便签以及历史会话缓存，操作不可撤销。
        </p>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="confirmClearOpen = false">取消</button>
          <button type="button" class="btn-danger" @click="handleConfirmClear">立即物理清空并重置</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.footprint-view {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--surface-soft);
  padding: 32px 24px 60px;
}

.footprint-container {
  max-width: 1240px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 顶部信息栏 */
.footprint-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
}

.footprint-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #EEF2FF;
  border: 1px solid rgb(99 102 241 / 25%);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #4F46E5;
  margin-bottom: 8px;
}

.badge-icon {
  color: #6366F1;
}

.footprint-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.clear-all-danger-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #FFF5F5;
  border: 1px solid #FED7D7;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--danger);
  cursor: pointer;
  transition: all 0.18s ease;
}

.clear-all-danger-btn:hover {
  background: #FED7D7;
  border-color: var(--danger);
}

/* 核心指标统计卡 */
.stats-overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.stat-card {
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px 24px;
  box-shadow: 0 2px 10px rgb(26 34 51 / 3%);
  display: flex;
  flex-direction: column;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.stat-icon-box {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 10px;
}

.stat-blue { color: var(--accent); background: var(--accent-soft); }
.stat-green { color: #10B981; background: #ECFDF5; }
.stat-purple { color: #6366F1; background: #EEF2FF; }

.stat-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}

.stat-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 6px;
}

.stat-value strong {
  font-size: 32px;
  font-weight: 800;
  color: var(--text);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat-value small {
  font-size: 12px;
  color: var(--text-soft);
  font-weight: 500;
}

.stat-sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-soft);
}

/* 双栏排版 */
.footprint-content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: stretch;
}

.footprint-card {
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 2px 12px rgb(26 34 51 / 3%);
  display: flex;
  flex-direction: column;
}

.card-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
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

.time-hint {
  font-size: 12px;
  color: var(--text-soft);
}

/* 时间线列表 */
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  padding-left: 20px;
}

.timeline-list::before {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 6px;
  width: 2px;
  background: var(--line);
}

.timeline-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-dot {
  position: absolute;
  left: -20px;
  top: 6px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 2.5px solid var(--line-strong);
  transition: all 0.2s ease;
}

.timeline-item.has-activity .timeline-dot {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.timeline-main {
  padding: 10px 14px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 10px;
}

.timeline-date-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.timeline-date-row strong {
  font-size: 13px;
  color: var(--text);
}

.activity-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge-focus {
  color: #059669;
  background: #ECFDF5;
}

.badge-mood {
  color: #D97706;
  background: #FFFBEB;
}

.timeline-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

/* 隐私规则条款 */
.privacy-rules-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.rule-num {
  font-size: 15px;
  font-weight: 800;
  color: var(--accent);
  background: var(--accent-soft);
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 8px;
}

.rule-item strong {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 3px;
}

.rule-item p {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.6;
}

.emergency-notice-box {
  margin-top: auto;
  padding: 14px 16px;
  background: #FFFBEB;
  border: 1px solid rgb(245 158 11 / 25%);
  border-radius: 12px;
  font-size: 12.5px;
  color: #92400E;
}

.notice-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  margin-bottom: 4px;
}

.emergency-notice-box p {
  margin: 0;
}

/* 二次确认弹窗 */
.confirm-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgb(26 34 51 / 45%);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 20px;
}

.confirm-modal-box {
  max-width: 440px;
  width: 100%;
  background: #FFFFFF;
  border-radius: 18px;
  padding: 28px 24px;
  box-shadow: 0 12px 36px rgb(0 0 0 / 20%);
  text-align: center;
}

.modal-icon-danger {
  width: 52px;
  height: 52px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: #FFF5F5;
  color: var(--danger);
  display: grid;
  place-items: center;
}

.confirm-modal-box h3 {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.confirm-modal-box p {
  margin: 0 0 24px;
  font-size: 13.5px;
  color: var(--text-muted);
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.btn-cancel, .btn-danger {
  flex: 1;
  height: 42px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn-cancel {
  background: var(--surface-muted);
  border: 1px solid var(--line);
  color: var(--text-muted);
}

.btn-danger {
  background: var(--danger);
  color: #FFFFFF;
  border: 0;
}

.btn-danger:hover {
  background: #991B1B;
}

@media (max-width: 960px) {
  .stats-overview-grid {
    grid-template-columns: 1fr;
  }

  .footprint-content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
