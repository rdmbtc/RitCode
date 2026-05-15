"use client"

import { useState, useEffect, useCallback } from "react"
import { MessageSquareDashed, History, Settings } from "lucide-react"
import { MessageList } from "./message-list"
import { Composer, type AIModel } from "./composer"
import { ChatHistory } from "./chat-history"
import { SettingsDialog } from "./settings-dialog"
import { WalletConnector } from "./wallet-connector"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import {
  type Conversation,
  type ChatMessage,
  type AppSettings,
  generateId,
  generateTitle,
  getConversations,
  saveConversation,
  getCurrentConversationId,
  setCurrentConversationId,
  getSettings,
} from "@/lib/chat-storage"

// Data model for messages (extended from storage)
export interface Message extends ChatMessage {}

// localStorage key for persisting messages
const MODEL_STORAGE_KEY = "chat-selected-model"

export function ChatShell() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [selectedModel, setSelectedModel] = useState<AIModel>("anthropic/minimax-m2.5-free")
  const [isLoaded, setIsLoaded] = useState(false)

  // New state for features
  const [currentConversationId, setCurrentConversationIdState] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appSettings, setAppSettings] = useState<AppSettings>({
    customApiEndpoint: "",
    customApiKey: "",
    useCustomApi: false,
    selectedModel: "google/gemini-2.0-flash-001",
  })

  // Load messages and settings on mount
  useEffect(() => {
    try {
      const savedModel = localStorage.getItem(MODEL_STORAGE_KEY) as AIModel | null
      if (savedModel) {
        setSelectedModel(savedModel)
      }
      
      // Load settings
      const loadedSettings = getSettings()
      setAppSettings(loadedSettings)
      if (loadedSettings.selectedModel) {
        setSelectedModel(loadedSettings.selectedModel as AIModel)
      }
      
      // Load current conversation
      const currentId = getCurrentConversationId()
      if (currentId) {
        const conversations = getConversations()
        const current = conversations.find(c => c.id === currentId)
        if (current) {
          setCurrentConversationIdState(currentId)
          setMessages(current.messages)
        }
      }
    } catch (e) {
      console.error("Failed to load from localStorage:", e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save conversation whenever messages change
  useEffect(() => {
    if (!isLoaded || messages.length === 0) return
    
    const conversationId = currentConversationId || generateId()
    if (!currentConversationId) {
      setCurrentConversationIdState(conversationId)
      setCurrentConversationId(conversationId)
    }
    
    const title = generateTitle(messages[0]?.content || "New Chat")
    const conversation: Conversation = {
      id: conversationId,
      title,
      messages,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    saveConversation(conversation)
  }, [messages, currentConversationId, isLoaded])

  const handleModelChange = useCallback((model: AIModel) => {
    setSelectedModel(model)
    localStorage.setItem(MODEL_STORAGE_KEY, model)
  }, [])

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setCurrentConversationIdState(conversation.id)
    setCurrentConversationId(conversation.id)
    setMessages(conversation.messages)
    setError(null)
  }, [])

  const handleNewChat = useCallback(() => {
    setCurrentConversationIdState(null)
    setCurrentConversationId(null)
    setMessages([])
    setError(null)
  }, [])

  const handleSettingsChange = useCallback((settings: AppSettings) => {
    setAppSettings(settings)
    if (settings.selectedModel && settings.selectedModel !== selectedModel) {
      setSelectedModel(settings.selectedModel as AIModel)
    }
  }, [selectedModel])

  // Send a message to the AI
  const sendMessage = useCallback(
    async (content: string, imageData?: string) => {
      if ((!content.trim() && !imageData) || isStreaming) return

      setError(null)

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: content.trim() || "Describe this image",
        createdAt: new Date(),
        imageData,
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      }

      const newMessages = [...messages, userMessage, assistantMessage]
      setMessages(newMessages)
      setIsStreaming(true)

      const controller = new AbortController()
      setAbortController(controller)

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
              imageData: m.imageData,
            })),
            model: selectedModel,
            customApiEndpoint: appSettings.useCustomApi ? appSettings.customApiEndpoint : undefined,
            customApiKey: appSettings.useCustomApi ? appSettings.customApiKey : undefined,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("No response body")
        }

        let accumulatedContent = ""
        let buffer = ""
        let isSSE = false
        let hasCheckedFormat = false

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })

          if (!hasCheckedFormat) {
            // Detect format: SSE (data:) or AI SDK text stream (raw JSON)
            isSSE = buffer.includes("data: ")
            hasCheckedFormat = true
          }

          if (isSSE) {
            // Process complete SSE events (separated by \n\n)
            const parts = buffer.split("\n\n")
            buffer = parts.pop() || ""

            for (const part of parts) {
              const lines = part.split("\n")
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const jsonStr = line.slice(6).trim()
                  if (!jsonStr || jsonStr === "[DONE]") continue

                  try {
                    const data = JSON.parse(jsonStr)
                    let text = ""

                    // AI SDK text-delta format: { type: "text-delta", textDelta: "..." }
                    if (data.type === "text-delta" && typeof data.textDelta === "string") {
                      text = data.textDelta
                    }
                    // OpenAI-compatible SSE: { choices: [{ delta: { content: "..." } }] }
                    else if (data.choices?.[0]?.delta?.content) {
                      text = data.choices[0].delta.content
                    }
                    // Fallback: raw string
                    else if (typeof data === "string") {
                      text = data
                    }

                    if (text) {
                      accumulatedContent += text
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === assistantMessage.id ? { ...msg, content: accumulatedContent } : msg,
                        ),
                      )
                    }
                  } catch {
                    // Not valid JSON yet
                  }
                }
              }
            }
          } else {
            // AI SDK text stream: raw JSON lines or plain text
            // Try to split by newlines, but also handle non-JSON content
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              if (!line.trim()) continue
              try {
                const data = JSON.parse(line)

                if (data.type === "text-delta" && typeof data.textDelta === "string") {
                  accumulatedContent += data.textDelta
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id ? { ...msg, content: accumulatedContent } : msg,
                    ),
                  )
                } else if (data.type === "text" && typeof data.text === "string") {
                  accumulatedContent = data.text
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id ? { ...msg, content: accumulatedContent } : msg,
                    ),
                  )
                }
              } catch {
                // Not JSON — treat as raw text
                accumulatedContent += line
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id ? { ...msg, content: accumulatedContent } : msg,
                  ),
                )
              }
            }
          }
        }

        // Process remaining buffer (might be a single chunk with no trailing newline)
        if (buffer.trim() && !isSSE) {
          try {
            const data = JSON.parse(buffer)
            if (data.type === "text-delta" && typeof data.textDelta === "string") {
              accumulatedContent += data.textDelta
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessage.id ? { ...msg, content: accumulatedContent } : msg,
                ),
              )
            } else if (data.type === "text" && typeof data.text === "string") {
              accumulatedContent = data.text
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessage.id ? { ...msg, content: accumulatedContent } : msg,
                ),
              )
            }
          } catch {
            accumulatedContent += buffer
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id ? { ...msg, content: accumulatedContent } : msg,
              ),
            )
          }
        }


      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id ? { ...msg, content: msg.content || "[Cancelled]" } : msg,
            ),
          )
        } else {
          console.error("Error sending message:", e)
          setError(e instanceof Error ? e.message : "An error occurred")
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessage.id))
        }
      } finally {
        setIsStreaming(false)
        setAbortController(null)
      }
    },
    [messages, isStreaming, selectedModel, appSettings],
  )

  const retry = useCallback(() => {
    if (messages.length === 0) return
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
    if (lastUserMessage) {
      const index = messages.findIndex((m) => m.id === lastUserMessage.id)
      setMessages(messages.slice(0, index))
      setError(null)
      setTimeout(() => sendMessage(lastUserMessage.content, lastUserMessage.imageData), 100)
    }
  }, [messages, sendMessage])

  const stopStreaming = useCallback(() => {
    if (abortController) {
      abortController.abort()
    }
  }, [abortController])

  const clearChat = useCallback(() => {
    handleNewChat()
  }, [handleNewChat])

  return (
    <div
      className="relative h-dvh bg-black"
      style={{
        boxShadow:
          "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px",
      }}
    >
      {/* Header with Logo, Actions, and Connect Wallet */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Image
            src="/images/ritual-logo.webp"
            alt="Ritual Logo"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="text-white font-medium text-base sm:text-lg tracking-wide">RITUAL</span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* History Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHistoryOpen(true)}
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
            aria-label="Chat history"
          >
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          {/* Settings Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          {/* Wallet Connector */}
          <div className="hidden sm:block">
            <WalletConnector />
          </div>
          <div className="sm:hidden">
            <WalletConnector />
          </div>
        </div>
      </div>

      <Button
        onClick={clearChat}
        variant="ghost"
        size="icon"
        className="absolute top-14 sm:top-16 left-3 sm:left-4 z-20 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
        aria-label="New chat"
      >
        <MessageSquareDashed className="w-4 h-4 sm:w-5 sm:h-5" />
      </Button>

      <MessageList messages={messages} isStreaming={isStreaming} error={error} onRetry={retry} isLoaded={isLoaded} />

      <Composer
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={!!error}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />

      {/* Credits Footer */}
      <div className="absolute bottom-24 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-zinc-600">
          @rdmnad special for Ritual Community
        </p>
      </div>

      {/* Chat History Sidebar */}
      <ChatHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  )
}
