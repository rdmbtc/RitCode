"use client"

import type React from "react"

import { useState, useRef, useCallback, type KeyboardEvent, useEffect } from "react"
import { Square, Mic, MicOff, Brain, Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { AnimatedOrb } from "./animated-orb"
import { AudioWaveform } from "./audio-waveform"

export type AIModel = "google/gemini-2.0-flash-001" | "openai/gpt-4o" | "anthropic/claude-sonnet-4" | string

export const AI_MODELS: { id: AIModel; name: string; icon: string }[] = [
  { id: "anthropic/minimax-m2.5-free", name: "MiniMax", icon: "/images/claude.svg" },
  { id: "google/gemini-2.0-flash-001", name: "Gemini", icon: "/images/google.webp" },
  { id: "openai/gpt-4o", name: "GPT-4o", icon: "/images/gpt.png" },
  { id: "anthropic/claude-sonnet-4", name: "Claude", icon: "/images/claude.svg" },
]

interface ComposerProps {
  onSend: (content: string, imageData?: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
  selectedModel: AIModel
  onModelChange: (model: AIModel) => void
}

export function Composer({ onSend, onStop, isStreaming, disabled, selectedModel, onModelChange }: ComposerProps) {
  const [value, setValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showImageBounce, setShowImageBounce] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const baseTextRef = useRef("")
  const finalTranscriptsRef = useRef("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onresult = (event: any) => {
          let newFinalText = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              const transcript = event.results[i][0].transcript
              newFinalText += transcript + " "
            }
          }

          if (newFinalText) {
            finalTranscriptsRef.current += newFinalText
            setValue(baseTextRef.current + finalTranscriptsRef.current)
            setTimeout(() => handleInput(), 0)
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error("[v0] Speech recognition error:", event.error)
          setIsRecording(false)
        }

        recognitionRef.current.onend = () => {
          setIsRecording(false)
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  useEffect(() => {
    // Trigger intro animation after mount
    setHasAnimated(true)
  }, [])

  const playClickSound = useCallback(() => {
    const audio = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/click-FM4Xaa1FJj237591TiZw4yL1fIxdOw.mp3")
    audio.volume = 0.5
    audio.play().catch(() => {})
  }, [])

  const playRecordSound = useCallback(() => {
    const audio = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/record-CNHOyjcpri6lx5C2sGXncDtFVDwspO.mp3")
    audio.volume = 0.5
    audio.play().catch(() => {})
  }, [])

  const toggleRecording = useCallback(() => {
    playClickSound()

    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser")
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop())
        setMediaStream(null)
      }
    } else {
      playRecordSound()
      baseTextRef.current = value
      finalTranscriptsRef.current = ""
      recognitionRef.current.start()
      setIsRecording(true)

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          setMediaStream(stream)
        })
        .catch((err) => {
          console.error("[v0] Error getting microphone stream:", err)
        })
    }
  }, [isRecording, value, playClickSound, playRecordSound, mediaStream])

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])

  const handleSend = useCallback(() => {
    if ((!value.trim() && !uploadedImage) || isStreaming || disabled) return
    playClickSound()

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
    onSend(value || "Describe this image", uploadedImage || undefined)
    setValue("")
    setUploadedImage(null)
    baseTextRef.current = ""
    finalTranscriptsRef.current = ""
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [value, uploadedImage, isStreaming, disabled, onSend, isRecording, playClickSound])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      playClickSound()

      const file = e.target.files?.[0]
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setUploadedImage(event.target?.result as string)
          setShowImageBounce(true)
          setTimeout(() => setShowImageBounce(false), 400)
        }
        reader.readAsDataURL(file)
      }
      e.target.value = ""
    },
    [playClickSound],
  )

  const removeImage = useCallback(() => {
    setUploadedImage(null)
  }, [])

  const currentModel = AI_MODELS.find((m) => m.id === selectedModel)
  const modelDisplayName = currentModel?.name || selectedModel.split("/").pop() || selectedModel

  return (
    <div className={cn("fixed bottom-2 sm:bottom-4 left-0 right-0 px-2 sm:px-4 pointer-events-none z-10", hasAnimated && "composer-intro")}>
      <div className="relative max-w-2xl mx-auto pointer-events-auto">
        <div
          className={cn(
            "flex flex-col gap-3 p-4 bg-zinc-900 border-zinc-800 transition-all duration-200 border border-zinc-800 overflow-hidden relative rounded-3xl",
            "focus-within:border-zinc-700 focus-within:ring-2 focus-within:ring-zinc-800",
          )}
          style={{
            boxShadow:
              "rgba(255, 255, 255, 0.04) 0px 0px 0px 1px, rgba(255, 255, 255, 0.02) 0px 1px 1px -0.5px",
          }}
        >
          <div className="flex gap-2 items-center">
            {uploadedImage && (
              <div className={cn("relative shrink-0", showImageBounce && "image-bounce")}>
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-700">
                  <Image
                    src={uploadedImage || "/placeholder.svg"}
                    alt="Uploaded image"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-200 hover:bg-white text-zinc-900 rounded-full flex items-center justify-center transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                handleInput()
              }}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening..." : "Type a message... (Shift+Enter for new line)"}
              disabled={isStreaming || disabled}
              rows={1}
              className={cn(
                "flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500",
                "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
                "max-h-[56px] overflow-y-auto",
              )}
              aria-label="Message input"
            />

            {isRecording && (
              <div className="shrink-0 w-24">
                <AudioWaveform isRecording={isRecording} stream={mediaStream} />
              </div>
            )}

            {isStreaming ? (
              <button
                onClick={() => {
                  playClickSound()
                  onStop()
                }}
                className="relative h-9 w-9 shrink-0 transition-all rounded-full flex items-center justify-center cursor-pointer hover:scale-105"
                aria-label="Stop generating"
              >
                <AnimatedOrb size={36} variant="red" />
                <Square
                  className="w-4 h-4 absolute drop-shadow-md text-red-700"
                  fill="currentColor"
                  aria-hidden="true"
                />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={(!value.trim() && !uploadedImage) || disabled}
                className={cn(
                  "relative h-9 w-9 shrink-0 transition-all rounded-full flex items-center justify-center",
                  (!value.trim() && !uploadedImage) || disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:scale-105",
                )}
                aria-label="Send message"
              >
                <AnimatedOrb size={36} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload image"
            />

            <div className="relative">
              <Button
                onClick={toggleRecording}
                disabled={isStreaming || disabled}
                size="icon"
                className={cn(
                  "h-9 w-9 shrink-0 transition-all rounded-full relative z-10",
                  isRecording
                    ? "bg-white hover:bg-zinc-200 text-zinc-900 animate-bounce-subtle"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300",
                )}
                aria-label={isRecording ? "Stop recording" : "Start voice input"}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </div>

            <Button
              onClick={() => {
                playClickSound()
                fileInputRef.current?.click()
              }}
              disabled={isStreaming || disabled}
              size="icon"
              className="h-9 w-9 shrink-0 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full"
              aria-label="Attach image"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger className="bg-zinc-800" asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isStreaming || disabled}
                  className="h-9 w-9 shrink-0 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full"
                  aria-label="Select AI model"
                  onClick={playClickSound}
                >
                  <Brain className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent
                  align="start"
                  side="top"
                  sideOffset={8}
                  className="w-40 px-2 py-2 rounded-2xl z-[9999] bg-zinc-900 border-zinc-800"
                >
                  {AI_MODELS.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => {
                        playClickSound()
                        onModelChange(model.id)
                      }}
                      className={cn(
                        "flex items-center cursor-pointer gap-3 rounded-lg text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100",
                        selectedModel === model.id && "bg-zinc-800",
                      )}
                    >
                      <Image
                        src={model.icon || "/placeholder.svg"}
                        alt={model.name}
                        width={20}
                        height={20}
                        className="rounded-sm object-contain w-4 h-4"
                      />
                      <span className="text-sm">{model.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>

            <span className="text-xs text-zinc-500 hidden sm:inline">{modelDisplayName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
