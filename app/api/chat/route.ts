import { streamText } from "ai"
import { createOpenAI, OpenAIProviderSettings } from "@ai-sdk/openai"
import { createGoogleGenerativeAI, GoogleGenerativeAIProviderSettings } from "@ai-sdk/google"

const SYSTEM_PROMPT = `You are a helpful, friendly AI assistant and expert web developer. You provide clear, concise, and accurate responses.

When generating HTML/CSS:
- Always produce complete, self-contained HTML documents with <!DOCTYPE html>, <html>, <head>, and <body> tags
- Include <meta name="viewport" content="width=device-width, initial-scale=1.0"> for mobile responsiveness
- Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>) for styling
- Design responsive layouts that look great on mobile, tablet, and desktop using Tailwind responsive utilities (sm:, md:, lg:)
- Use mobile-first design patterns: base classes for mobile, prefixed utilities for larger screens
- Include proper padding, spacing, and readable font sizes on small screens
- Use flexbox and grid layouts that adapt to screen size
- Make buttons and interactive elements large enough for touch targets (min 44px)
- When asked to build UI components, make them production-quality with hover states, transitions, and accessibility

When explaining code or technical concepts, use markdown formatting with code blocks where appropriate.
Be conversational but professional. If you're unsure about something, say so honestly.
When analyzing images, describe them in detail and answer any questions about them.`

function parseModelId(modelId: string): { provider: string; name: string } {
  const slashIndex = modelId.indexOf("/")
  if (slashIndex === -1) return { provider: "openai", name: modelId }
  return { provider: modelId.slice(0, slashIndex), name: modelId.slice(slashIndex + 1) }
}

function buildModel(modelId: string, customEndpoint?: string, customKey?: string) {
  const { provider, name } = parseModelId(modelId)

  const openaiConfig: OpenAIProviderSettings = {
    apiKey: customKey || process.env.OPENAI_API_KEY,
    ...(customEndpoint ? { baseURL: customEndpoint } : {}),
  }
  const openai = createOpenAI(openaiConfig)

  if (provider === "openai" || customEndpoint) {
    return openai(name)
  }

  if (provider === "google" || provider === "gemini") {
    const googleConfig: GoogleGenerativeAIProviderSettings = {
      apiKey: customKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      ...(customEndpoint ? { baseURL: customEndpoint } : {}),
    }
    const google = createGoogleGenerativeAI(googleConfig)
    return google(name)
  }

  // Anthropic, Groq, etc — route through OpenAI-compatible endpoint
  if (provider === "anthropic" || provider === "groq" || provider === "cat" || provider === "xai") {
    return openai(name)
  }

  // Fallback to OpenAI
  return openai(name)
}

export async function POST(req: Request) {
  try {
    const { messages, model, customApiEndpoint, customApiKey } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid request: messages array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const selectedModel = model || "google/gemini-2.0-flash-001"
    const aiModel = buildModel(selectedModel, customApiEndpoint, customApiKey)

    const lastIndex = messages.length - 1
    const transformedMessages = messages.map(
      (m: { role: string; content: string; imageData?: string }, index: number) => {
        const isLastUserMessage = index === lastIndex && m.role === "user"

        if (isLastUserMessage && m.imageData && m.imageData.startsWith("data:image/")) {
          return {
            role: m.role as "user" | "assistant",
            content: [
              { type: "image" as const, image: m.imageData },
              { type: "text" as const, text: m.content || "Describe this image in detail." },
            ],
          }
        }

        let textContent = m.content
        if (m.imageData && !isLastUserMessage) {
          textContent = m.content || "[User shared an image]"
        }

        return {
          role: m.role as "user" | "assistant",
          content: textContent,
        }
      },
    )

    const validMessages = transformedMessages.filter((m: { content: string | object[] }) => {
      if (typeof m.content === "string") {
        return m.content.trim().length > 0
      }
      return true
    })

    if (validMessages.length === 0) {
      return new Response(JSON.stringify({ error: "No valid messages to process" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const result = streamText({
      model: aiModel,
      messages: validMessages,
      system: SYSTEM_PROMPT,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
