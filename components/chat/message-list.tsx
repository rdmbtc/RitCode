"use client"

import { useEffect, useRef, useState } from "react"
import { MessageBubble } from "./message-bubble"
import type { Message } from "./chat-shell"
import { TypingIndicator } from "./typing-indicator"
import { AlertCircle, RefreshCw, Code2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedOrb } from "./animated-orb"

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  error: string | null
  onRetry: () => void
  isLoaded: boolean // Added isLoaded prop to know when localStorage is loaded
}

const LAUNCH_SOUND_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/launch-SUi0itAGHr1wtvdDYYG5bzFLsIYHtP.mp3"

export function MessageList({ messages, isStreaming, error, onRetry, isLoaded }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const rafRef = useRef<number | null>(null)
  const [hasAnimated, setHasAnimated] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastScrollRef = useRef<number>(0)
  const hasPlayedIntroRef = useRef(false) // Track if intro has played

  useEffect(() => {
    if (!isLoaded) return // Wait for localStorage to load

    // Only animate if no messages were loaded (fresh start)
    if (messages.length === 0 && !hasPlayedIntroRef.current) {
      setHasAnimated(true)
      hasPlayedIntroRef.current = true

      audioRef.current = new Audio(LAUNCH_SOUND_URL)
      audioRef.current.volume = 0.5
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors - browser may block without user interaction
      })
    } else if (messages.length > 0) {
      // Skip animation if messages exist
      setHasAnimated(false)
      hasPlayedIntroRef.current = true
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [isLoaded, messages.length])

  useEffect(() => {
    if (!containerRef.current) return
    // Immediate scroll to bottom when messages change
    const container = containerRef.current
    container.scrollTop = container.scrollHeight
    setAutoScroll(true)
  }, [messages.length])

  useEffect(() => {
    if (!isStreaming || !autoScroll || !containerRef.current) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const container = containerRef.current
    lastScrollRef.current = container.scrollTop

    const smoothScroll = () => {
      if (!container) return

      const { scrollHeight, clientHeight } = container
      const targetScroll = scrollHeight - clientHeight
      const currentScroll = lastScrollRef.current
      const diff = targetScroll - currentScroll

      if (diff > 0.5) {
        const newScroll = currentScroll + diff * 0.03
        lastScrollRef.current = newScroll
        container.scrollTop = newScroll
      }

      rafRef.current = requestAnimationFrame(smoothScroll)
    }

    // Start immediately
    rafRef.current = requestAnimationFrame(smoothScroll)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isStreaming, autoScroll])

  // Detect if user scrolls up to disable auto-scroll
  const handleScroll = () => {
    if (!containerRef.current || isStreaming) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150
    setAutoScroll(isAtBottom)
  }

  const lastMessage = messages[messages.length - 1]
  const showTypingIndicator =
    isStreaming &&
    (messages.length === 0 ||
      lastMessage?.role === "user" ||
      (lastMessage?.role === "assistant" && lastMessage?.content === ""))

  // Track streaming content to show "Thinking" / "Coding" status
  const [streamingStatus, setStreamingStatus] = useState<"thinking" | "coding">("thinking")
  const prevContentRef = useRef("")
  useEffect(() => {
    if (!isStreaming || !lastMessage || lastMessage.role !== "assistant") return
    const content = lastMessage.content || ""
    if (content.length < 5) {
      setStreamingStatus("thinking")
    } else if (content.includes("```") || content.includes("<!") || content.includes("<html") || content.includes("<div")) {
      setStreamingStatus("coding")
    }
    prevContentRef.current = content
  }, [isStreaming, lastMessage])

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatedOrb size={64} />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="absolute inset-0 overflow-y-auto pt-14 sm:pt-16 pb-28 sm:pb-32 space-y-3 sm:space-y-4 border-none px-3 sm:px-6"
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      {/* Empty state */}
      {messages.length === 0 && !error && !isStreaming && (
        <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400">
          <div className={`mb-4 ${hasAnimated ? "orb-intro" : ""}`}>
            <AnimatedOrb size={128} />
          </div>
          <p className={`text-base sm:text-lg font-medium text-zinc-300 ${hasAnimated ? "text-blur-intro" : ""}`}>
            Hi, I'm RitCode
          </p>
          <p className={`text-xs sm:text-sm mt-1 text-zinc-500 ${hasAnimated ? "text-blur-intro-delay" : ""}`}>
            Send a message to begin chatting with the AI assistant
          </p>
        </div>
      )}

      {/* Messages */}
      {messages
        .filter((message) => {
          // Hide empty assistant messages during streaming - they'll be shown as typing indicator instead
          if (isStreaming && message.role === "assistant" && message === lastMessage && message.content === "") {
            return false
          }
          // Hide assistant message content during streaming — show status indicator instead
          if (isStreaming && message.role === "assistant" && message === lastMessage) {
            return false
          }
          return true
        })
        .map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={isStreaming && message.role === "assistant" && message === lastMessage}
          />
        ))}

      {showTypingIndicator && <TypingIndicator />}

      {/* Streaming status - Thinking / Coding */}
      {isStreaming && lastMessage?.role === "assistant" && (
        <div className="flex gap-3 max-w-[90%] md:max-w-[80%] mr-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="shrink-0">
            <AnimatedOrb size={32} />
          </div>
          <div
            className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-zinc-900 border border-zinc-800"
            style={{ boxShadow: "rgba(255, 255, 255, 0.04) 0px 0px 0px 1px" }}
          >
            <div className="flex items-center gap-2">
              {streamingStatus === "thinking" ? (
                <>
                  <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                  <span className="text-xs text-zinc-500">
                    Thinking
                    <span className="inline-flex">
                      <span className="animate-[pulse_1.5s_ease-in-out_infinite]">.</span>
                      <span className="animate-[pulse_1.5s_ease-in-out_infinite_0.3s]">.</span>
                      <span className="animate-[pulse_1.5s_ease-in-out_infinite_0.6s]">.</span>
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <Code2 className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span className="text-xs text-zinc-500">
                    Coding
                    <span className="inline-flex">
                      <span className="animate-[pulse_1s_ease-in-out_infinite]">.</span>
                      <span className="animate-[pulse_1s_ease-in-out_infinite_0.25s]">.</span>
                      <span className="animate-[pulse_1s_ease-in-out_infinite_0.5s]">.</span>
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-700 rounded-xl"
          role="alert"
          style={{
            boxShadow:
              "rgba(255, 255, 255, 0.04) 0px 0px 0px 1px",
          }}
        >
          <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-200">Something went wrong</p>
            <p className="text-xs text-zinc-400 mt-0.5">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Retry sending message"
          >
            <RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} aria-hidden="true" className="h-20" />
    </div>
  )
}
