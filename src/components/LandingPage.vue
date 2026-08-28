<script setup lang="ts">
import { ArrowRight, MessageCircleMore } from '@lucide/vue'
import Prism from './Prism.vue'

defineProps<{
  userName: string | null
}>()

const emit = defineEmits<{
  start: []
}>()
</script>

<template>
  <main class="landing-page home-page">
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
        <p class="home-summary">我是云小舒，陪你学习、也听你聊心情。作业太多、心情不好、或者只是想找人说说话，都可以来找我。</p>
        <button type="button" class="start-chat-button" @click="emit('start')">
          <MessageCircleMore :size="20" :stroke-width="1.8" />
          <span>开始对话</span>
          <ArrowRight :size="19" :stroke-width="1.8" />
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* 落地页禁用滚动：覆盖 .home-page 的 overflow-y:auto */
.landing-page {
  overflow-y: hidden;
}
</style>
