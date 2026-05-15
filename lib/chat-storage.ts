"use client"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
  imageData?: string
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface AppSettings {
  customApiEndpoint: string
  customApiKey: string
  useCustomApi: boolean
  selectedModel: string
}

const CONVERSATIONS_KEY = "ritual-chat-conversations"
const SETTINGS_KEY = "ritual-chat-settings"
const CURRENT_CONVERSATION_KEY = "ritual-current-conversation"

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function generateTitle(firstMessage: string): string {
  const truncated = firstMessage.slice(0, 50)
  return truncated.length < firstMessage.length ? `${truncated}...` : truncated
}

// Conversations
export function getConversations(): Conversation[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(CONVERSATIONS_KEY)
  if (!data) return []
  try {
    const conversations = JSON.parse(data) as Conversation[]
    return conversations.map((c) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      messages: c.messages.map((m) => ({
        ...m,
        createdAt: new Date(m.createdAt),
      })),
    }))
  } catch {
    return []
  }
}

export function saveConversation(conversation: Conversation): void {
  if (typeof window === "undefined") return
  const conversations = getConversations()
  const existingIndex = conversations.findIndex((c) => c.id === conversation.id)
  
  if (existingIndex >= 0) {
    conversations[existingIndex] = conversation
  } else {
    conversations.unshift(conversation)
  }
  
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations))
}

export function deleteConversation(id: string): void {
  if (typeof window === "undefined") return
  const conversations = getConversations()
  const filtered = conversations.filter((c) => c.id !== id)
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(filtered))
}

export function getCurrentConversationId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(CURRENT_CONVERSATION_KEY)
}

export function setCurrentConversationId(id: string | null): void {
  if (typeof window === "undefined") return
  if (id) {
    localStorage.setItem(CURRENT_CONVERSATION_KEY, id)
  } else {
    localStorage.removeItem(CURRENT_CONVERSATION_KEY)
  }
}

// Settings
export function getSettings(): AppSettings {
  if (typeof window === "undefined") {
    return { customApiEndpoint: "", customApiKey: "", useCustomApi: false, selectedModel: "anthropic/minimax-m2.5-free" }
  }
  const data = localStorage.getItem(SETTINGS_KEY)
  if (!data) {
    return { customApiEndpoint: "", customApiKey: "", useCustomApi: false, selectedModel: "anthropic/minimax-m2.5-free" }
  }
  try {
    return JSON.parse(data) as AppSettings
  } catch {
    return { customApiEndpoint: "", customApiKey: "", useCustomApi: false, selectedModel: "anthropic/minimax-m2.5-free" }
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
