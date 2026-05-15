import { ChatShell } from "@/components/chat/chat-shell"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Ritual AI Assistant",
  description: "Chat with Ritual AI - @rdmnad special for Ritual Community",
}

export default function ChatPage() {
  return <ChatShell />
}
