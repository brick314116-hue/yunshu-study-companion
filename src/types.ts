export type ModuleId = 'study' | 'thought' | 'emotion' | 'records'

/** 顶层视图：首页门户(landing) / 认识云小舒(intro) / 四大专属工作区：会话中枢(chat) / 专注自习室(focus) / 心灵避风港(mind) / 成长足迹(footprint) */
export type AppTab = 'landing' | 'intro' | 'chat' | 'focus' | 'mind' | 'footprint'

export type PsychConsent = 'unknown' | 'accepted' | 'declined'

export interface AuthUser {
  id: string
  displayName: string
}

export type MessageStatus = 'streaming' | 'done' | 'stopped' | 'error'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  status: MessageStatus
  time: string
  attachments?: ChatAttachment[]
}

/** 上传到女娲后的附件引用，随聊天消息发送 */
export interface ChatAttachment {
  fileKey: string
  url?: string
  fileName: string
  mimeType: string
}

export interface Conversation {
  id: string
  title: string
  moduleId: ModuleId
  messages: ChatMessage[]
  updatedAt: string
  /** 已在服务端建立对应的女娲会话（首次发送成功后置 true）。 */
  serverSynced?: boolean
}

export interface ModuleDefinition {
  id: ModuleId
  label: string
  shortLabel: string
  title: string
  description: string
  accent: string
  features: string[]
  exampleInput: string
  starters: string[]
  /** 进入模块时若输入框为空则预填的提示词（用于记录查询等对话式入口）。 */
  prefill?: string
  tools: Array<{
    title: string
    description: string
    prompt: string
    /** 表单类工具：点击后打开本地表单而非发送聊天消息。 */
    action?: 'mood-checkin'
  }>
}
