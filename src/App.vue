<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { authConfigured, restoreAuth, signOut } from './auth'
import { loadUserProfile, saveDisplayName, sanitizeDisplayName, saveConsent, restoreConsent } from './user-profile'
import { requestChat } from './chat-api'
import ActionMenuDialog from './components/ActionMenuDialog.vue'
import AppTopbar from './components/AppTopbar.vue'
import AuthDialog from './components/AuthDialog.vue'
import ChatWorkspace from './components/ChatWorkspace.vue'
import CompanionDock from './components/CompanionDock.vue'
import ConsentDialog from './components/ConsentDialog.vue'
import IntroPage from './components/IntroPage.vue'
import LandingPage from './components/LandingPage.vue'
import MoodCheckinDialog from './components/MoodCheckinDialog.vue'
import OnboardingGuide from './components/OnboardingGuide.vue'
import NicknameDialog from './components/NicknameDialog.vue'
import RegisterDialog from './components/RegisterDialog.vue'
import SafetyDialog from './components/SafetyDialog.vue'
import SideBar from './components/SideBar.vue'
import { clearLegacyConversationHistory, titleFromMessage } from './conversation-store'
import { getModule } from './modules'
import type { AppTab, AuthUser, ChatAttachment, ChatMessage, Conversation, ModuleId, PsychConsent } from './types'

// landing / intro 为免登录免同意的展示页；chat（合并学业·认知·情绪·记录）需要登录+同意。
const isFreeTab = (tab: AppTab): tab is 'landing' | 'intro' => tab === 'landing' || tab === 'intro'

const activeTab = ref<AppTab>('landing')
const chatModule = ref<ModuleId>('study')
const pendingTab = ref<AppTab>('chat')
const messages = ref<ChatMessage[]>([])
const draft = ref('')
const consentOpen = ref(false)
const psychConsent = ref<PsychConsent>('unknown')
const safetyOpen = ref(false)
const conversations = ref<Conversation[]>([])
const activeConversationId = ref<string | null>(null)
const authUser = ref<AuthUser | null>(null)
const authReady = ref(false)
const loginNotice = ref('')
const sending = ref(false)
const sidebarOpen = ref(false)
const actionMenuOpen = ref(false)
const sidebarCollapsed = ref(false)

const activeModule = computed(() => getModule(chatModule.value))
const userName = computed(() => authUser.value?.displayName ?? '')
const now = () =>
  new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date())

const cloneMessages = (items: ChatMessage[]) => items.map((message) => ({ ...message }))

const syncActiveConversation = () => {
  if (!activeConversationId.value) return
  const current = conversations.value.find((item) => item.id === activeConversationId.value)
  if (!current) return

  const updated: Conversation = {
    ...current,
    moduleId: isFreeTab(activeTab.value) ? current.moduleId : chatModule.value,
    messages: cloneMessages(messages.value),
    updatedAt: new Date().toISOString(),
  }
  conversations.value = [updated, ...conversations.value.filter((item) => item.id !== updated.id)]
}

let conversationSyncTimer: ReturnType<typeof setTimeout> | undefined
watch(
  messages,
  () => {
    if (!activeConversationId.value) return
    clearTimeout(conversationSyncTimer)
    conversationSyncTimer = setTimeout(syncActiveConversation, 250)
  },
  { deep: true },
)

const dockOpen = ref(true)
const toggleDock = () => {
  dockOpen.value = !dockOpen.value
}

const isMobile = ref(false)
const updateMobileState = () => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth <= 1000
    if (isMobile.value) {
      sidebarCollapsed.value = false
      dockOpen.value = false
    }
  }
}

onMounted(async () => {
  updateMobileState()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateMobileState)
  }
  clearLegacyConversationHistory()
  try {
    authUser.value = await restoreAuth()
    if (authUser.value) await refreshProfile(authUser.value.id)
  } catch (error) {
    console.warn('恢复登录状态失败：', error)
  } finally {
    authReady.value = true
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateMobileState)
  }
  clearTimeout(conversationSyncTimer)
  clearTimeout(loginNoticeTimer)
  syncActiveConversation()
})

const resetConversation = () => {
  syncActiveConversation()
  activeConversationId.value = null
  messages.value = []
  draft.value = ''
}

let loginNoticeTimer: ReturnType<typeof setTimeout> | undefined

const showLoginNotice = (message: string) => {
  loginNotice.value = message
  clearTimeout(loginNoticeTimer)
  loginNoticeTimer = setTimeout(() => {
    loginNotice.value = ''
  }, 4200)
}

const authDialogOpen = ref(false)
const nicknameDialogOpen = ref(false)
const registerDialogOpen = ref(false)
const moodCheckinOpen = ref(false)

// 进入对话类视图的准入门禁：登录 + 同意。返回 false 表示已弹出登录/同意框。
const requireAccess = (): boolean => {
  if (!authUser.value) {
    void openLogin()
    return false
  }
  if (psychConsent.value === 'unknown') {
    pendingTab.value = 'chat'
    consentOpen.value = true
    return false
  }
  return true
}

const safeModule = (m: ModuleId): ModuleId =>
  psychConsent.value === 'declined' && m !== 'study' ? 'study' : m

const runToolAction = (action: 'mood-checkin') => {
  if (action !== 'mood-checkin') return
  if (!authUser.value) {
    void openLogin()
    return
  }
  moodCheckinOpen.value = true
}

const onMoodCheckinSubmitted = () => {
  showLoginNotice('情绪打卡已保存，7 天后自动删除。')
}

const openLogin = () => {
  if (!authConfigured) {
    showLoginNotice('登录暂时不可用，请稍后再试。')
    return
  }
  authDialogOpen.value = true
}

const onAuthSuccess = async () => {
  try {
    const user = await restoreAuth()
    if (user) {
      authUser.value = user
      await refreshProfile(user.id)
    }
  } catch (error) {
    console.warn('恢复登录状态失败：', error)
  }
}

const onRegisterSuccess = async () => {
  await onAuthSuccess()
}

const refreshProfile = async (uid: string) => {
  try {
    const profile = await loadUserProfile(uid)
    if (profile?.displayName && authUser.value) {
      authUser.value = { ...authUser.value, displayName: profile.displayName }
    }
    const restored = restoreConsent(profile)
    if (restored !== 'unknown') {
      psychConsent.value = restored
    }
  } catch (error) {
    console.warn('读取用户资料失败：', error)
  }
}

const openNickname = () => {
  if (authUser.value) nicknameDialogOpen.value = true
}

const saveNickname = async (name: string) => {
  if (!authUser.value) return
  const clean = sanitizeDisplayName(name)
  try {
    await saveDisplayName(authUser.value.id, clean)
    authUser.value = { ...authUser.value, displayName: clean || authUser.value.displayName }
    showLoginNotice('称呼已保存。')
  } catch (error) {
    showLoginNotice(error instanceof Error ? error.message : '保存失败，请稍后重试。')
  }
}

const handleSessionExpired = async () => {
  try {
    if (authConfigured && authUser.value) await signOut()
  } catch {
    // 已过期时登出可能失败，忽略。
  }
  authUser.value = null
  showLoginNotice('登录状态已失效，请重新登录。')
  openLogin()
}

// 顶栏切换：chat 需准入；intro/landing 免准入。
const selectTab = (tab: AppTab) => {
  sidebarOpen.value = false
  if (tab === 'chat' && !requireAccess()) return
  if (tab === 'chat' && psychConsent.value === 'declined') chatModule.value = 'study'
  syncActiveConversation()
  activeTab.value = tab
}

const goHome = () => {
  syncActiveConversation()
  activeTab.value = 'landing'
  sidebarOpen.value = false
}

// 从首页/认识页"进入xx"或侧栏菜单进入某模块（合并到 chat 视图）。
const enterModule = (moduleId: ModuleId) => {
  if (!requireAccess()) return
  chatModule.value = safeModule(moduleId)
  syncActiveConversation()
  activeTab.value = 'chat'
  sidebarOpen.value = false
  if (messages.value.length === 0 && !draft.value.trim()) {
    const prefill = getModule(chatModule.value).prefill
    if (prefill) draft.value = prefill
  }
}

// 侧栏"想做点什么"：预填提示词并进入对话。
const onMenuPick = (moduleId: ModuleId, prompt: string) => {
  if (!requireAccess()) return
  chatModule.value = safeModule(moduleId)
  syncActiveConversation()
  activeTab.value = 'chat'
  draft.value = prompt
  sidebarOpen.value = false
}

const onMenuPickAction = (action: 'mood-checkin') => {
  sidebarOpen.value = false
  runToolAction(action)
}

const openSidebar = () => {
  if (isMobile.value || (typeof window !== 'undefined' && window.innerWidth <= 1000)) {
    sidebarCollapsed.value = false
  }
  sidebarOpen.value = true
}

const toggleSidebarCollapse = () => {
  if (isMobile.value || (typeof window !== 'undefined' && window.innerWidth <= 1000)) {
    sidebarOpen.value = false
    sidebarCollapsed.value = false
    return
  }
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const newChat = () => {
  if (!requireAccess()) return
  if (psychConsent.value === 'declined') chatModule.value = 'study'
  resetConversation()
  activeTab.value = 'chat'
  sidebarOpen.value = false
}

const startWithPrompt = (payload: { module: ModuleId; prompt?: string }) => {
  if (!requireAccess()) return
  chatModule.value = safeModule(payload.module)
  resetConversation()
  activeTab.value = 'chat'
  sidebarOpen.value = false
  if (payload.prompt) {
    draft.value = payload.prompt
  }
}

const logout = async () => {
  try {
    if (authConfigured && authUser.value) await signOut()
  } finally {
    clearTimeout(conversationSyncTimer)
    authUser.value = null
    psychConsent.value = 'unknown'
    consentOpen.value = false
    conversations.value = []
    activeConversationId.value = null
    messages.value = []
    draft.value = ''
    activeTab.value = 'landing'
    chatModule.value = 'study'
  }
}

const chooseConsent = async (consent: Exclude<PsychConsent, 'unknown'>) => {
  consentOpen.value = false
  if (authUser.value) {
    try {
      await saveConsent(authUser.value.id, consent)
    } catch (error) {
      console.warn('保存使用边界确认失败（不影响使用）：', error)
    }
  }
  psychConsent.value = consent
  const requested = pendingTab.value
  activeTab.value = consent === 'declined' && requested !== 'chat' && requested !== 'intro'
    ? 'chat'
    : requested
  if (consent === 'declined') chatModule.value = 'study'
}

const selectConversation = (id: string) => {
  syncActiveConversation()
  const conversation = conversations.value.find((item) => item.id === id)
  if (!conversation) return

  activeConversationId.value = id
  messages.value = cloneMessages(conversation.messages)
  draft.value = ''
  chatModule.value = conversation.moduleId
  activeTab.value = 'chat'
  sidebarOpen.value = false
}

const deleteConversation = (id: string) => {
  const deletingActive = activeConversationId.value === id
  conversations.value = conversations.value.filter((item) => item.id !== id)
  if (deletingActive) newChat()
}

// 新手引导：首次进入对话视图时弹一次。
const ONBOARD_KEY = 'yunshu_onboarded'
const onboardingOpen = ref(false)

watch(activeTab, (tab) => {
  if (tab !== 'chat') return
  if (!authUser.value || psychConsent.value !== 'accepted') return
  if (localStorage.getItem(ONBOARD_KEY)) return
  onboardingOpen.value = true
})

const finishOnboarding = () => {
  localStorage.setItem(ONBOARD_KEY, '1')
  onboardingOpen.value = false
}

const openGuide = () => {
  sidebarOpen.value = false
  onboardingOpen.value = true
}

const onOnboardingPick = (module: ModuleId, prompt: string) => {
  finishOnboarding()
  chatModule.value = safeModule(module)
  if (activeTab.value !== 'chat') activeTab.value = 'chat'
  sendMessage(prompt)
}

// 打字机效果：后端仍是完整回复，前端逐段显示。
// 新的发送会让进行中的打字立刻补完，避免两条消息交叠。
let typeOutSession = 0

const typeOutMessage = (messageId: string, full: string) =>
  new Promise<void>((resolve) => {
    const session = ++typeOutSession
    const patch = (text: string, status: 'streaming' | 'done') => {
      const idx = messages.value.findIndex((m) => m.id === messageId)
      if (idx >= 0) messages.value[idx] = { ...messages.value[idx], text, status }
    }
    if (!full) { resolve(); return }
    const perTick = Math.max(2, Math.ceil(full.length / 150))
    let shown = 0
    const tick = () => {
      if (session !== typeOutSession) {
        patch(full, 'done')
        resolve()
        return
      }
      shown = Math.min(full.length, shown + perTick)
      patch(full.slice(0, shown), shown >= full.length ? 'done' : 'streaming')
      if (shown < full.length) setTimeout(tick, 16)
      else resolve()
    }
    tick()
  })

const sendMessage = async (preset?: string, attachments?: ChatAttachment[]) => {
  if (!authUser.value) {
    void openLogin()
    return
  }
  if (sending.value) return
  typeOutSession++ // 新发送让进行中的打字立刻补完
  const text = (preset ?? draft.value).trim()
  const files = attachments || []
  if (!text && files.length === 0) return
  const displayText = text || `（发送了 ${files.length} 个附件）`

  messages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    text: displayText,
    status: 'done',
    time: now(),
    ...(files.length ? { attachments: files } : {}),
  })
  if (!activeConversationId.value) {
    const id = crypto.randomUUID()
    activeConversationId.value = id
    conversations.value = [{
      id,
      title: titleFromMessage(displayText),
      moduleId: chatModule.value,
      messages: cloneMessages(messages.value),
      updatedAt: new Date().toISOString(),
    }, ...conversations.value]
  } else {
    syncActiveConversation()
  }
  draft.value = ''

  const localConversationId = activeConversationId.value
  const conversation = conversations.value.find((item) => item.id === localConversationId)
  const newConversation = !conversation?.serverSynced
  const assistantMessageId = crypto.randomUUID()
  messages.value.push({
    id: assistantMessageId,
    role: 'assistant',
    text: '',
    status: 'streaming',
    time: now(),
  })
  sending.value = true

  try {
    const result = await requestChat(text || '请看一下我发送的附件。', newConversation, localConversationId, files)
    const reply = typeof result === 'string' ? result : result.reply
    // 打字机：占位消息逐段补全为完整回复
    await typeOutMessage(assistantMessageId, reply)
    const synced = conversations.value.find((item) => item.id === localConversationId)
    if (synced) synced.serverSynced = true
    if (typeof result !== 'string' && result.action === 'mood-checkin' && psychConsent.value === 'accepted') {
      moodCheckinOpen.value = true
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : ''
    if (errMsg.includes('登录') || errMsg.includes('重新登录')) {
      handleSessionExpired()
    }
    const text2 = errMsg || '暂时没有连接上云小舒，请稍后重试。'
    const index = messages.value.findIndex((message) => message.id === assistantMessageId)
    if (index >= 0) messages.value[index] = { ...messages.value[index], text: text2, status: 'error' }
  } finally {
    sending.value = false
    syncActiveConversation()
  }
}
</script>

<template>
  <div class="app-shell">
    <!-- 移动端全屏独立遮罩：脱离transform包含块限制，全屏点击即关 -->
    <div
      v-if="activeTab !== 'landing' && activeTab !== 'intro'"
      class="sidebar-backdrop"
      :class="{ open: sidebarOpen }"
      @click="sidebarOpen = false"
    />

    <!-- 首页(landing)全屏：不显示侧栏与顶栏 -->
    <div v-if="activeTab !== 'landing' && activeTab !== 'intro'" class="app-sidebar-wrap" :class="{ open: sidebarOpen }">
      <SideBar
        :conversations="conversations"
        :active-conversation-id="activeConversationId"
        :psych-consent="psychConsent"
        :user-name="userName"
        :auth-ready="authReady"
        :collapsed="isMobile ? false : sidebarCollapsed"
        @home="goHome"
        @new-chat="newChat"
        @open-menu="actionMenuOpen = true; sidebarOpen = false"
        @select-conversation="selectConversation"
        @delete-conversation="deleteConversation"
        @guide="openGuide(); sidebarOpen = false"
        @safety="safetyOpen = true; sidebarOpen = false"
        @account="openNickname(); sidebarOpen = false"
        @logout="logout(); sidebarOpen = false"
        @login="openLogin(); sidebarOpen = false"
        @toggle-collapse="toggleSidebarCollapse"
        @checkin="runToolAction('mood-checkin'); sidebarOpen = false"
      />
    </div>

    <div class="app-main">
      <AppTopbar
        v-if="activeTab !== 'landing'"
        :active-tab="activeTab"
        :minimal="activeTab === 'intro'"
        :user-name="userName"
        :auth-ready="authReady"
        :dock-open="dockOpen"
        @select="selectTab"
        @menu="openSidebar"
        @toggle-dock="toggleDock"
        @home="goHome"
        @login="openLogin"
        @account="openNickname"
        @logout="logout"
      />

      <LandingPage
        v-if="activeTab === 'landing'"
        :user-name="userName || null"
        :auth-ready="authReady"
        @start="newChat"
        @start-with="startWithPrompt"
        @intro="selectTab('intro')"
        @login="openLogin"
        @account="openNickname"
        @logout="logout"
      />

      <IntroPage v-else-if="activeTab === 'intro'" :user-name="userName || null" @start="newChat" @enter="enterModule" />

      <div v-else class="chat-columns" :class="{ 'dock-open': dockOpen }">
        <ChatWorkspace
          v-model="draft"
          :module="activeModule"
          :messages="messages"
          :user-name="userName"
          :sending="sending"
          @send="(atts) => sendMessage(undefined, atts)"
          @starter="sendMessage"
        />
        <CompanionDock
          :module="activeModule"
          :open="dockOpen"
          @close="dockOpen = false"
          @prompt="(p) => { draft = p; if (!messages.length) sendMessage(p) }"
          @action="onMenuPickAction"
        />
      </div>

      <footer v-if="activeTab === 'chat'" class="app-footer">
        <p>可以按自己的节奏慢慢说，一次只梳理当下最在意的一小部分，云小舒永远在这里。</p>
        <span class="app-watermark" aria-hidden="true">云舒少年忧，学伴逐光游</span>
      </footer>
    </div>
  </div>

  <ConsentDialog :open="consentOpen" @choose="chooseConsent" />
  <SafetyDialog :open="safetyOpen" @close="safetyOpen = false" />
  <AuthDialog :open="authDialogOpen" @success="onAuthSuccess" @register="registerDialogOpen = true; authDialogOpen = false" @close="authDialogOpen = false" />
  <RegisterDialog
    :open="registerDialogOpen"
    @success="onRegisterSuccess"
    @back="authDialogOpen = true; registerDialogOpen = false"
    @close="registerDialogOpen = false"
  />
  <NicknameDialog
    :open="nicknameDialogOpen"
    :current="authUser?.displayName || ''"
    @save="saveNickname"
    @close="nicknameDialogOpen = false"
  />
  <MoodCheckinDialog
    :open="moodCheckinOpen"
    @submitted="onMoodCheckinSubmitted"
    @close="moodCheckinOpen = false"
  />
  <ActionMenuDialog
    :open="actionMenuOpen"
    :psych-consent="psychConsent"
    @close="actionMenuOpen = false"
    @pick="onMenuPick"
    @pick-action="onMenuPickAction"
  />
  <OnboardingGuide
    :open="onboardingOpen"
    @close="finishOnboarding"
    @pick="onOnboardingPick"
  />
  <p v-if="loginNotice" class="login-notice" role="alert">{{ loginNotice }}</p>
</template>
