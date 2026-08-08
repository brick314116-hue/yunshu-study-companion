<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { authConfigured, restoreAuth, signIn, signOut, signUp } from './auth'
import { requestChat } from './chat-api'
import AppSidebar from './components/AppSidebar.vue'
import AuthDialog from './components/AuthDialog.vue'
import ChatWorkspace from './components/ChatWorkspace.vue'
import ConsentDialog from './components/ConsentDialog.vue'
import ContextPanel from './components/ContextPanel.vue'
import HomePage from './components/HomePage.vue'
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
const authOpen = ref(false)
const authLoading = ref(false)
const authError = ref('')
const continueAfterLogin = ref(false)
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
  } catch (error) {
    authError.value = error instanceof Error ? error.message : '无法恢复登录状态，请稍后重试。'
  } finally {
    authReady.value = true
  }
})

onBeforeUnmount(() => {
  clearTimeout(conversationSyncTimer)
  syncActiveConversation()
})

const resetConversation = () => {
  syncActiveConversation()
  activeConversationId.value = null
  messages.value = []
  draft.value = ''
}

const openLogin = (thenStart = false) => {
  continueAfterLogin.value = thenStart
  authError.value = ''
  authOpen.value = true
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
    openLogin(true)
    return
  }
  enterNewConversation()
}

const login = async (username: string, password: string) => {
  authLoading.value = true
  authError.value = ''
  try {
    authUser.value = await signIn(username, password)
    authOpen.value = false
    if (continueAfterLogin.value) enterNewConversation()
  } catch (error) {
    authError.value = error instanceof Error ? error.message : '登录失败，请稍后重试。'
  } finally {
    authLoading.value = false
    continueAfterLogin.value = false
  }
}

const register = async (username: string, password: string) => {
  authLoading.value = true
  authError.value = ''
  try {
    authUser.value = await signUp(username, password)
    authOpen.value = false
    if (continueAfterLogin.value) enterNewConversation()
  } catch (error) {
    authError.value = error instanceof Error ? error.message : '注册失败，请稍后重试。'
  } finally {
    authLoading.value = false
    continueAfterLogin.value = false
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
    authOpen.value = false
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

const chooseConsent = (consent: Exclude<PsychConsent, 'unknown'>) => {
  psychConsent.value = consent
  consentOpen.value = false
  const requested = pendingModuleId.value
  activeModuleId.value = consent === 'declined' && (requested === 'thought' || requested === 'emotion')
    ? 'study'
    : requested
  activePage.value = 'chat'
}

const selectModule = (id: ModuleId) => {
  if (!authUser.value) {
    openLogin(true)
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
    openLogin(true)
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
    openLogin(true)
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
    const text = error instanceof Error
      ? error.message
      : '暂时没有连接上云小舒，请稍后重试。'
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
      @start="startConversation"
      @login="openLogin(false)"
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

  <AuthDialog
    :open="authOpen"
    :configured="authConfigured"
    :loading="authLoading"
    :error="authError"
    @close="authOpen = false"
    @login="login"
    @register="register"
  />
  <ConsentDialog :open="consentOpen" @choose="chooseConsent" />
  <SafetyDialog :open="safetyOpen" @close="safetyOpen = false" />
</template>
