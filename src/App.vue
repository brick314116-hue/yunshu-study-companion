<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { authConfigured, restoreAuth, signOut } from './auth'
import { loadUserProfile, saveDisplayName, sanitizeDisplayName, saveConsent, restoreConsent } from './user-profile'
import { requestChat } from './chat-api'
import AppSidebar from './components/AppSidebar.vue'
import AuthDialog from './components/AuthDialog.vue'
import ChatWorkspace from './components/ChatWorkspace.vue'
import ConsentDialog from './components/ConsentDialog.vue'
import ContextPanel from './components/ContextPanel.vue'
import HomePage from './components/HomePage.vue'
import NicknameDialog from './components/NicknameDialog.vue'
import RegisterDialog from './components/RegisterDialog.vue'
import SafetyDialog from './components/SafetyDialog.vue'
import { clearLegacyConversationHistory, titleFromMessage } from './conversation-store'
import { getModule } from './modules'
import type { AuthUser, ChatMessage, Conversation, ModuleId, PsychConsent } from './types'

const activePage = ref<'home' | 'chat'>('home')
const activeModuleId = ref<ModuleId>('chat')
const pendingModuleId = ref<ModuleId>('chat')
const messages = ref<ChatMessage[]>([])
const draft = ref('')
const consentOpen = ref(false)
const psychConsent = ref<PsychConsent>('unknown')
const safetyOpen = ref(false)
const conversations = ref<Conversation[]>([])
const activeConversationId = ref<string | null>(null)
const authUser = ref<AuthUser | null>(null)
const authReady = ref(false)
const loginRedirecting = ref(false)
const loginNotice = ref('')
const sending = ref(false)
const serverActiveConversationId = ref<string | null>(null)

const activeModule = computed(() => getModule(activeModuleId.value))
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
    moduleId: activeModuleId.value,
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

onMounted(async () => {
  clearLegacyConversationHistory()
  try {
    authUser.value = await restoreAuth()
    if (authUser.value) await refreshProfile(authUser.value.id)
  } catch (error) {
    // 未登录（无会话）是正常状态，静默处理，不打搅首次访客。
    console.warn('恢复登录状态失败：', error)
  } finally {
    authReady.value = true
  }
})

onBeforeUnmount(() => {
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

// 打开应用内登录弹窗（注册 / 登录 / 其他 CloudBase 方式）。
const authDialogOpen = ref(false)
const nicknameDialogOpen = ref(false)
const registerDialogOpen = ref(false)

const openLogin = () => {
  if (!authConfigured) {
    showLoginNotice('CloudBase 认证尚未配置，请检查部署环境变量。')
    return
  }
  authDialogOpen.value = true
}

const onAuthSuccess = async () => {
  try {
    // 登录/注册成功后 SDK 已自动设置 credentials，但可能需要短暂时间持久化。
    // restoreAuth 内部已包含重试逻辑（最多 2 次，每次间隔 400ms）。
    const user = await restoreAuth()
    if (user) {
      authUser.value = user
      await refreshProfile(user.id)
    } else {
      console.warn('[auth] 登录成功但 restoreAuth 未返回用户，可能 credentials 尚未就绪')
    }
  } catch (error) {
    console.warn('恢复登录状态失败：', error)
  }
}

const onRegisterSuccess = async () => {
  // 注册成功后 CloudBase 已自动登录，直接恢复会话
  await onAuthSuccess()
}

// 登录后从 user_profiles 读取用户主动设置的昵称和使用边界确认状态，覆盖默认值。
const refreshProfile = async (uid: string) => {
  try {
    const profile = await loadUserProfile(uid)
    if (profile?.displayName && authUser.value) {
      authUser.value = { ...authUser.value, displayName: profile.displayName }
    }
    // 恢复使用边界状态：已确认过就不再重复弹窗
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

// Token 失效：本地清除登录态并重新要求登录。
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

const enterNewConversation = () => {
  resetConversation()
  pendingModuleId.value = psychConsent.value === 'declined' ? 'study' : 'chat'
  if (psychConsent.value === 'unknown') {
    consentOpen.value = true
    return
  }
  activeModuleId.value = pendingModuleId.value
  activePage.value = 'chat'
}

const startConversation = () => {
  if (!authUser.value) {
    void openLogin()
    return
  }
  enterNewConversation()
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
    serverActiveConversationId.value = null
    messages.value = []
    draft.value = ''
    activeModuleId.value = 'chat'
    pendingModuleId.value = 'chat'
    activePage.value = 'home'
  }
}

const chooseConsent = async (consent: Exclude<PsychConsent, 'unknown'>) => {
  psychConsent.value = consent
  consentOpen.value = false
  // 持久化到 user_profiles（让刷新后不再重复弹窗）
  if (authUser.value) {
    try {
      await saveConsent(authUser.value.id, consent)
    } catch (error) {
      console.warn('保存使用边界确认失败（不影响使用）：', error)
    }
  }
  const requested = pendingModuleId.value
  activeModuleId.value = consent === 'declined' && (requested === 'thought' || requested === 'emotion')
    ? 'study'
    : requested
  activePage.value = 'chat'
}

const selectModule = (id: ModuleId) => {
  if (!authUser.value) {
    void openLogin()
    return
  }
  if (psychConsent.value === 'unknown') {
    pendingModuleId.value = id
    consentOpen.value = true
    return
  }
  if (psychConsent.value === 'declined' && (id === 'thought' || id === 'emotion')) return

  activePage.value = 'chat'
  activeModuleId.value = id
  syncActiveConversation()
}

const newChat = () => {
  if (!authUser.value) {
    void openLogin()
    return
  }
  enterNewConversation()
}

const selectConversation = (id: string) => {
  syncActiveConversation()
  const conversation = conversations.value.find((item) => item.id === id)
  if (!conversation) return

  activeConversationId.value = conversation.id
  messages.value = cloneMessages(conversation.messages)
  draft.value = ''
  activeModuleId.value = conversation.moduleId
  pendingModuleId.value = conversation.moduleId
  activePage.value = 'chat'
}

const deleteConversation = (id: string) => {
  const deletingActive = activeConversationId.value === id
  conversations.value = conversations.value.filter((item) => item.id !== id)
  if (deletingActive) newChat()
}

const sendMessage = async (preset?: string) => {
  if (!authUser.value) {
    void openLogin()
    return
  }
  if (sending.value) return
  const text = (preset ?? draft.value).trim()
  if (!text) return

  const newConversation = !activeConversationId.value

  messages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    text,
    status: 'done',
    time: now(),
  })
  if (!activeConversationId.value) {
    const id = crypto.randomUUID()
    activeConversationId.value = id
    conversations.value = [{
      id,
      title: titleFromMessage(text),
      moduleId: activeModuleId.value,
      messages: cloneMessages(messages.value),
      updatedAt: new Date().toISOString(),
    }, ...conversations.value]
  } else {
    syncActiveConversation()
  }
  draft.value = ''

  const localConversationId = activeConversationId.value
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
    const reply = await requestChat(
      text,
      newConversation || serverActiveConversationId.value !== localConversationId,
    )
    const index = messages.value.findIndex((message) => message.id === assistantMessageId)
    if (index >= 0) messages.value[index] = { ...messages.value[index], text: reply, status: 'done' }
    serverActiveConversationId.value = localConversationId
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : ''
    if (errMsg.includes('登录') || errMsg.includes('重新登录')) {
      handleSessionExpired()
    }
    const text = errMsg || '暂时没有连接上云小舒，请稍后重试。'
    const index = messages.value.findIndex((message) => message.id === assistantMessageId)
    if (index >= 0) messages.value[index] = { ...messages.value[index], text, status: 'error' }
  } finally {
    sending.value = false
    syncActiveConversation()
  }
}
</script>

<template>
  <div class="app-shell" :class="{ 'home-mode': activePage === 'home' }">
    <AppSidebar
      v-if="activePage === 'chat' && authUser"
      :active-module="activeModuleId"
      :conversations="conversations"
      :active-conversation-id="activeConversationId"
      :psych-consent="psychConsent"
      :user-name="userName"
      @home="activePage = 'home'"
      @select="selectModule"
      @new-chat="newChat"
      @select-conversation="selectConversation"
      @delete-conversation="deleteConversation"
      @safety="safetyOpen = true"
      @logout="logout"
    />

    <HomePage
      v-if="activePage === 'home'"
      :user-name="userName || null"
      :auth-ready="authReady"
      :login-redirecting="loginRedirecting"
      @start="startConversation"
      @login="openLogin"
      @account="openNickname"
      @logout="logout"
      @safety="safetyOpen = true"
    />

    <template v-else-if="authUser">
      <ChatWorkspace
        v-model="draft"
        :module="activeModule"
        :messages="messages"
        :user-name="userName"
        :sending="sending"
        @send="sendMessage()"
        @starter="sendMessage"
        @new-chat="newChat"
        @logout="logout"
        @safety="safetyOpen = true"
      />

      <ContextPanel :module="activeModule" @prompt="sendMessage" />
    </template>
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
  <p v-if="loginNotice" class="login-notice" role="alert">{{ loginNotice }}</p>
</template>
