<script setup lang="ts">
import { HeartHandshake, MessageCircleMore, NotebookPen, Sparkles } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import type { ModuleId } from '../types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  close: []
  pick: [module: ModuleId, prompt: string]
}>()

type StateKey = 'study' | 'mood' | 'chat'

const step = ref<1 | 2 | 3>(1)
const chosen = ref<StateKey>('study')

const states = [
  { key: 'study' as StateKey, label: '学习上卡住了', icon: NotebookPen },
  { key: 'mood' as StateKey, label: '心情不太好', icon: HeartHandshake },
  { key: 'chat' as StateKey, label: '就想随便聊聊', icon: MessageCircleMore },
]

const examples = computed<Array<{ module: ModuleId; text: string }>>(() => {
  if (chosen.value === 'study') {
    return [
      { module: 'study', text: '帮我把今天的作业拆成小步骤，先做哪个？' },
      { module: 'study', text: '我学不进去、不想学，怎么办？' },
    ]
  }
  if (chosen.value === 'mood') {
    return [
      { module: 'emotion', text: '我今天有点烦，想聊聊。' },
      { module: 'emotion', text: '带我做一个 3 分钟的放松练习。' },
    ]
  }
  return [
    { module: 'emotion', text: '随便聊聊，今天发生了一件小事。' },
    { module: 'study', text: '陪我定一个今天的小目标吧。' },
  ]
})

watch(
  () => props.open,
  (open) => {
    if (open) step.value = 1
  },
)

const skip = () => emit('close')
const pickExample = (module: ModuleId, text: string) => emit('pick', module, text)
</script>

<template>
  <div v-if="open" class="onboard-mask" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
    <div class="onboard-card">
      <button class="onboard-skip" type="button" @click="skip">跳过</button>

      <template v-if="step === 1">
        <div class="onboard-mark" aria-hidden="true"><Sparkles :size="24" :stroke-width="1.7" /></div>
        <h2 id="onboard-title">你好，我是心小隅</h2>
        <p class="onboard-lead">
          我陪你学习、也听你聊心情。我不是医生或老师，不做诊断。
          聊天内容不会乱存，记录最多保留 7 天、可随时删除。
        </p>
        <button class="onboard-primary" type="button" @click="step = 2">继续</button>
      </template>

      <template v-else-if="step === 2">
        <h2 id="onboard-title">你现在更想？</h2>
        <p class="onboard-lead">选一个，我给你几个可以直接点的开头。</p>
        <div class="onboard-states">
          <button
            v-for="s in states"
            :key="s.key"
            type="button"
            class="onboard-state"
            @click="chosen = s.key; step = 3"
          >
            <component :is="s.icon" :size="20" :stroke-width="1.7" aria-hidden="true" />
            <span>{{ s.label }}</span>
          </button>
        </div>
      </template>

      <template v-else>
        <h2 id="onboard-title">点一个试试，直接发送</h2>
        <p class="onboard-lead">不用自己想怎么说，点下面任意一句，我就开始陪你。</p>
        <div class="onboard-examples">
          <button
            v-for="e in examples"
            :key="e.text"
            type="button"
            class="onboard-example"
            @click="pickExample(e.module, e.text)"
          >
            {{ e.text }}
          </button>
        </div>
        <button class="onboard-back" type="button" @click="step = 2">返回重选</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.onboard-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(26 34 51 / 38%);
}

.onboard-card {
  position: relative;
  width: min(100%, 440px);
  padding: 28px;
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow-card);
  text-align: center;
}

.onboard-skip {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 4px 10px;
  color: var(--text-soft);
  background: transparent;
  border: 0;
  border-radius: 8px;
  font-size: 12.5px;
}

.onboard-skip:hover {
  color: var(--text);
  background: var(--hover);
}

.onboard-mark {
  display: grid;
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  place-items: center;
  color: var(--text);
  background: var(--surface-muted);
  border-radius: 12px;
}

.onboard-card h2 {
  margin: 0 0 8px;
  color: var(--text);
  font-size: 19px;
  font-weight: 600;
}

.onboard-lead {
  margin: 0 0 18px;
  color: var(--text-muted);
  font-size: 13.5px;
  line-height: 1.7;
}

.onboard-primary {
  width: 100%;
  height: 44px;
  color: #FFFFFF;
  background: var(--ink);
  border: 0;
  border-radius: 10px;
  font-size: 15px;
}

.onboard-primary:hover {
  background: var(--ink-hover);
}

.onboard-states {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.onboard-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  color: var(--text);
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 12px;
  font-size: 14.5px;
  text-align: left;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.onboard-state:hover {
  border-color: var(--accent);
  background: var(--accent-faint);
}

.onboard-examples {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.onboard-example {
  padding: 13px 16px;
  color: var(--text);
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 12px;
  font-size: 14px;
  text-align: left;
  line-height: 1.6;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.onboard-example:hover {
  border-color: var(--accent);
  background: var(--accent-faint);
}

.onboard-back {
  margin-top: 14px;
  padding: 4px 10px;
  color: var(--text-soft);
  background: transparent;
  border: 0;
  font-size: 12.5px;
}

.onboard-back:hover {
  color: var(--text);
}
</style>
