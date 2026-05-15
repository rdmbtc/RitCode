"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  type Conversation,
  getConversations,
  deleteConversation,
} from "@/lib/chat-storage"

interface ChatHistoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentConversationId: string | null
  onSelectConversation: (conversation: Conversation) => void
  onNewChat: () => void
}

export function ChatHistory({
  open,
  onOpenChange,
  currentConversationId,
  onSelectConversation,
  onNewChat,
}: ChatHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    if (open) {
      setConversations(getConversations())
    }
  }, [open])

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteConversation(id)
    setConversations(getConversations())
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 bg-zinc-950 border-zinc-800 p-0">
        <SheetHeader className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-zinc-100">Chat History</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="p-4">
          <Button
            onClick={() => {
              onNewChat()
              onOpenChange(false)
            }}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 gap-2"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="px-4 pb-4 space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    onSelectConversation(conversation)
                    onOpenChange(false)
                  }}
                  className={cn(
                    "group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                    currentConversationId === conversation.id
                      ? "bg-zinc-800"
                      : "hover:bg-zinc-900"
                  )}
                >
                  <MessageSquare className="h-4 w-4 mt-0.5 text-zinc-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-100 truncate">
                      {conversation.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {formatDate(conversation.updatedAt)} · {conversation.messages.length} messages
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(conversation.id, e)}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
