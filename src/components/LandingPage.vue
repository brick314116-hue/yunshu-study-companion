<script setup lang="ts">
import { ArrowRight, Cloud, LogIn, LogOut, MessageCircleMore, UserRound } from '@lucide/vue'
import Prism from './Prism.vue'

defineProps<{
  userName: string | null
  authReady: boolean
}>()

const emit = defineEmits<{
  start: []
  intro: []
  login: []
  account: []
  logout: []
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

    <div class="landing-topbar">
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
    </div>

    <section class="home-hero" aria-labelledby="home-title">
      <div class="home-hero-copy">
        <h1 id="home-title">云舒学伴</h1>
        <p class="home-slogan">云舒少年忧，学伴逐光游</p>
        <p class="home-summary">我是云小舒，陪你学习、也听你聊心情。作业太多、心情不好、或者只是想找人说说话，都可以来找我。</p>
        <div class="landing-actions">
          <button type="button" class="start-chat-button" @click="emit('start')">
            <MessageCircleMore :size="20" :stroke-width="1.8" />
            <span>开始对话</span>
            <ArrowRight :size="19" :stroke-width="1.8" />
          </button>
          <button type="button" class="intro-button" @click="emit('intro')">
            <Cloud :size="20" :stroke-width="1.8" />
            <span>认识云小舒</span>
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* 落地页禁用滚动：覆盖 .home-page 的 overflow-y:auto */
.landing-page {
  overflow-y: hidden;
}

.landing-topbar {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  display: flex;
  justify-content: flex-end;
  padding: 18px 24px;
}

.landing-account {
  display: flex;
  align-items: center;
  gap: 6px;
}

.landing-account-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  color: var(--text);
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 13.5px;
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
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 999px;
}

.landing-logout:hover {
  color: var(--text);
}

.landing-login {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 18px;
  color: #FFFFFF;
  background: var(--ink);
  border: 0;
  border-radius: 999px;
  font-size: 13.5px;
}

.landing-login:hover {
  background: var(--ink-hover);
}

.landing-login:disabled {
  opacity: 0.6;
}

.landing-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* 挖空按钮：与开始对话同尺寸，仅边框 */
.intro-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 52px;
  padding: 0 26px;
  color: var(--text);
  background: transparent;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.intro-button:hover {
  border-color: var(--accent);
  color: var(--accent-strong);
  background: var(--accent-faint);
}
</style>
