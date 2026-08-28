export type ModuleId = 'study' | 'thought' | 'emotion' | 'records'

/** 顶层视图：首页(landing,点品牌回) / 认识云小舒(intro) / 对话(chat,合并学业·认知·情绪·记录) */
export type AppTab = 'landing' | 'intro' | 'chat'

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
