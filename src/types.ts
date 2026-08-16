export type ModuleId = 'study' | 'thought' | 'emotion'

export type AppTab = 'home' | ModuleId

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
  tools: Array<{
    title: string
    description: string
    prompt: string
  }>
}
