import { ChatShell } from "@/components/chat/chat-shell"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "RitCode — Ritual AI Assistant",
  description: "Builded by @rdmnad special for Ritual Community <3",
}

export default function ChatPage() {
  return <ChatShell />
}
