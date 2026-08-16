<script setup lang="ts">
/**
 * Vue Bits <Stepper /> —— TypeScript + Tailwind 版本。
 *
 * 说明：官方实现依赖 motion-v（AnimatePresence / Motion）。本机 npm 缓存被系统
 * 拦截（EPERM）、pnpm store 只读，motion-v 及其 framer-motion / @vueuse 依赖链
 * 装不上，因此这里用 Vue 原生 <Transition> + CSS 实现完全等价的动画：
 *   · 步骤内容左右滑入滑出 + 淡入淡出（对应 stepVariants）
 *   · 容器高度随内容自适应过渡（对应 StepContentWrapper 的 animate height）
 *   · 指示器圆点 / 连接线的颜色与形态过渡（对应 StepIndicator / StepConnector）
 * API、DOM 结构、类名与官方组件保持一致，另外补了 nextDisabled / nextLoading
 * 两个业务上必需的门控属性。
 */
import { Check } from '@lucide/vue'
import {
  Comment,
  Fragment,
  Text,
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  useSlots,
  watch,
  type VNode,
} from 'vue'
import Step from './Step.vue'

interface StepperProps {
  initialStep?: number
  backButtonText?: string
  nextButtonText?: string
  completeButtonText?: string
  disableStepIndicators?: boolean
  /** 禁用「下一步 / 完成」，用于表单校验门控 */
  nextDisabled?: boolean
  /** 「下一步 / 完成」显示加载态 */
  nextLoading?: boolean
  /** 隐藏内置底部按钮，由调用方自行渲染 */
  hideFooter?: boolean
  stepCircleContainerClass?: string
  stepContainerClass?: string
  contentClass?: string
  footerClass?: string
}

const props = withDefaults(defineProps<StepperProps>(), {
  initialStep: 1,
  backButtonText: '上一步',
  nextButtonText: '下一步',
  completeButtonText: '完成',
  disableStepIndicators: false,
  nextDisabled: false,
  nextLoading: false,
  hideFooter: false,
  stepCircleContainerClass: '',
  stepContainerClass: '',
  contentClass: '',
  footerClass: '',
})

const emit = defineEmits<{
  stepChange: [step: number]
  finalStepCompleted: []
  back: [step: number]
}>()

const slots = useSlots()

/** 递归展开 Fragment，过滤注释 / 空白文本，只保留 <Step> */
const flattenVNodes = (nodes: VNode[]): VNode[] => {
  const out: VNode[] = []
  for (const node of nodes) {
    if (node.type === Fragment) {
      out.push(...flattenVNodes((node.children as VNode[]) ?? []))
    } else if (node.type !== Comment && node.type !== Text) {
      out.push(node)
    }
  }
  return out
}

const stepVNodes = computed<VNode[]>(() => {
  const children = slots.default?.() ?? []
  const flat = flattenVNodes(children)
  const steps = flat.filter((vnode) => vnode.type === Step)
  // 允许调用方不使用 <Step> 包裹（退化为单步），保持组件健壮。
  return steps.length ? steps : flat
})

const totalSteps = computed(() => stepVNodes.value.length)

const currentStep = ref(props.initialStep)
const direction = ref(0)
const isCompleted = ref(false)

const isLastStep = computed(() => currentStep.value === totalSteps.value)

/** 当前步骤的 vnode，用函数式组件渲染，避免直接把 VNode 传给 :is */
const CurrentStep = () => stepVNodes.value[currentStep.value - 1] ?? null

const updateStep = (next: number) => {
  direction.value = next > currentStep.value ? 1 : -1
  currentStep.value = next
  if (next > totalSteps.value) {
    isCompleted.value = true
    emit('finalStepCompleted')
  } else {
    emit('stepChange', next)
  }
}

const handleBack = () => {
  if (currentStep.value <= 1) return
  emit('back', currentStep.value - 1)
  updateStep(currentStep.value - 1)
}

const handleNext = () => {
  if (props.nextDisabled || props.nextLoading) return
  if (isLastStep.value) {
    emit('finalStepCompleted')
    return
  }
  updateStep(currentStep.value + 1)
}

const handleIndicatorClick = (step: number) => {
  if (props.disableStepIndicators) return
  // 只允许回退到已完成的步骤，向前必须走校验。
  if (step >= currentStep.value) return
  updateStep(step)
}

const statusOf = (step: number) => {
  if (currentStep.value > step) return 'complete'
  if (currentStep.value === step) return 'active'
  return 'inactive'
}

/** 供外部（父组件）驱动步进 */
const goTo = (step: number) => {
  if (step < 1 || step > totalSteps.value) return
  updateStep(step)
}
defineExpose({ goTo, next: handleNext, back: handleBack, currentStep })

// ─── 内容高度自适应（对应 motion 的 animate={{ height }}）────────────────
const paneRef = ref<HTMLElement | null>(null)
const contentHeight = ref<number | null>(null)
let observer: ResizeObserver | undefined

const observePane = () => {
  observer?.disconnect()
  const el = paneRef.value
  if (!el) return
  observer = new ResizeObserver(() => {
    contentHeight.value = el.offsetHeight
  })
  observer.observe(el)
  contentHeight.value = el.offsetHeight
}

watch(currentStep, () => nextTick(observePane), { flush: 'post' })
watch(paneRef, () => nextTick(observePane), { flush: 'post' })
onBeforeUnmount(() => observer?.disconnect())

const wrapperStyle = computed(() => ({
  height: contentHeight.value === null ? 'auto' : `${contentHeight.value}px`,
}))
</script>

<template>
  <div class="stepper-root flex w-full flex-1 flex-col">
    <div :class="`stepper-card w-full ${props.stepCircleContainerClass}`">
      <!-- ── 步骤指示器 ─────────────────────────────── -->
      <div :class="`stepper-indicators flex w-full items-center ${props.stepContainerClass}`">
        <template v-for="index in totalSteps" :key="index">
          <button
            type="button"
            class="stepper-dot"
            :class="[statusOf(index), { clickable: !props.disableStepIndicators && index < currentStep }]"
            :aria-current="index === currentStep ? 'step' : undefined"
            :aria-label="`第 ${index} 步`"
            :tabindex="index < currentStep && !props.disableStepIndicators ? 0 : -1"
            @click="handleIndicatorClick(index)"
          >
            <Check v-if="statusOf(index) === 'complete'" :size="15" :stroke-width="2.6" aria-hidden="true" />
            <span v-else-if="statusOf(index) === 'active'" class="stepper-dot-core" aria-hidden="true" />
            <span v-else class="stepper-dot-num">{{ index }}</span>
          </button>
          <div v-if="index < totalSteps" class="stepper-connector">
            <div class="stepper-connector-fill" :class="{ complete: currentStep > index }" />
          </div>
        </template>
      </div>

      <!-- ── 步骤内容 ───────────────────────────────── -->
      <div class="stepper-content-wrap" :class="props.contentClass" :style="wrapperStyle">
        <Transition :name="direction >= 0 ? 'stepslide-fwd' : 'stepslide-bwd'">
          <div :key="currentStep" ref="paneRef" class="stepper-pane">
            <component :is="CurrentStep" />
          </div>
        </Transition>
      </div>

      <!-- ── 底部操作 ───────────────────────────────── -->
      <div v-if="!props.hideFooter && !isCompleted" :class="`stepper-footer ${props.footerClass}`">
        <div class="stepper-footer-row" :class="{ single: currentStep === 1 }">
          <button
            v-if="currentStep !== 1"
            type="button"
            class="stepper-btn-back"
            :disabled="props.nextLoading"
            @click="handleBack"
          >
            {{ props.backButtonText }}
          </button>
          <button
            type="button"
            class="stepper-btn-next"
            :disabled="props.nextDisabled || props.nextLoading"
            @click="handleNext"
          >
            <span v-if="props.nextLoading" class="stepper-spinner" aria-hidden="true" />
            {{ isLastStep ? props.completeButtonText : props.nextButtonText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stepper-card {
  display: flex;
  flex-direction: column;
}

/* ── 指示器 ───────────────────────────────────────── */
.stepper-indicators {
  gap: 0;
  padding: 2px 2px 20px;
}

.stepper-dot {
  position: relative;
  display: grid;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  place-items: center;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-soft);
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: default;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease,
    color 0.3s ease,
    box-shadow 0.3s ease,
    transform 0.3s ease;
}

.stepper-dot.clickable {
  cursor: pointer;
}

.stepper-dot.clickable:hover {
  transform: scale(1.06);
}

.stepper-dot.active {
  color: #fff;
  background: var(--ink);
  border-color: var(--ink);
}

.stepper-dot.complete {
  color: #fff;
  background: var(--ink);
  border-color: var(--ink);
}

.stepper-dot-core {
  width: 11px;
  height: 11px;
  background: #fff;
  border-radius: 999px;
  animation: stepper-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes stepper-pop {
  from {
    transform: scale(0.2);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

.stepper-connector {
  position: relative;
  flex: 1;
  height: 2px;
  margin: 0 8px;
  overflow: hidden;
  background: var(--line);
  border-radius: 2px;
}

.stepper-connector-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0;
  background: var(--ink);
  transition: width 0.4s ease;
}

.stepper-connector-fill.complete {
  width: 100%;
}

/* ── 内容区（滑动 + 高度自适应）────────────────────── */
.stepper-content-wrap {
  position: relative;
  overflow: hidden;
  transition: height 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.stepper-pane {
  position: absolute;
  inset: 0 0 auto;
  width: 100%;
}

.stepslide-fwd-enter-active,
.stepslide-fwd-leave-active,
.stepslide-bwd-enter-active,
.stepslide-bwd-leave-active {
  transition:
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.35s ease;
}

.stepslide-fwd-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.stepslide-fwd-leave-to {
  transform: translateX(-50%);
  opacity: 0;
}

.stepslide-bwd-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.stepslide-bwd-leave-to {
  transform: translateX(50%);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .stepper-content-wrap,
  .stepslide-fwd-enter-active,
  .stepslide-fwd-leave-active,
  .stepslide-bwd-enter-active,
  .stepslide-bwd-leave-active {
    transition-duration: 0.01ms;
  }
}

/* ── 底部按钮 ─────────────────────────────────────── */
.stepper-footer {
  padding-top: 20px;
}

.stepper-footer-row {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.stepper-footer-row.single {
  justify-content: flex-end;
}

.stepper-btn-back {
  padding: 11px 18px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.stepper-btn-back:hover:not(:disabled) {
  color: var(--text);
  background: var(--surface-soft);
  border-color: var(--text-soft);
}

.stepper-btn-back:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 主按钮：墨色，无渐变无辉光 */
.stepper-btn-next {
  display: inline-flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-width: 132px;
  padding: 12px 22px;
  font-size: 14.5px;
  font-weight: 500;
  color: #fff;
  background: var(--ink);
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.stepper-btn-next:hover:not(:disabled) {
  background: var(--ink-hover);
  transform: translateY(-1px);
}

.stepper-btn-next:active:not(:disabled) {
  transform: translateY(0);
  background: var(--ink-active);
}

.stepper-btn-next:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stepper-footer-row.single .stepper-btn-next {
  flex: 1;
}

.stepper-spinner {
  width: 15px;
  height: 15px;
  border: 2.4px solid rgb(255 255 255 / 35%);
  border-top-color: #fff;
  border-radius: 50%;
  animation: stepper-spin 0.65s linear infinite;
}

@keyframes stepper-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
