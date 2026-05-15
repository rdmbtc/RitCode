import { streamText, type LanguageModel } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

const SYSTEM_PROMPT = `You are a Ritual ecosystem specialist — an AI assistant focused on Ritual blockchain, dApps, web development on Ritual chain, and the Ritual community. You are NOT a general-purpose assistant.

RULES:
- ONLY answer questions related to Ritual: Ritual blockchain, Ritual dApps, Ritual web development, RitualChain (chain ID 1979), smart contracts on Ritual, tokens on Ritual, Ritual community, or web development for Ritual projects.
- If asked about anything unrelated to Ritual, respond: "Sorry, I can only answer questions related to Ritual. I'm a Ritual specialist AI and don't have knowledge about other topics."
- When building web apps, always produce Ritual-themed designs with Ritual branding
- Use Ritual chain details (ID: 1979, RPC: https://rpc.ritualfoundation.org) when relevant

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

function buildModel(modelId: string): LanguageModel {
  const { provider, name } = parseModelId(modelId)
  console.log(`[chat] Building model: provider=${provider}, name=${name}`)

  // Google / Gemini
  if (provider === "google" || provider === "gemini") {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set. Configure a custom API endpoint in Settings or set the env var.")
    console.log(`[chat] Using Google provider, key length=${apiKey.length}`)
    const google = createGoogleGenerativeAI({ apiKey })
    return google(name)
  }

  // OpenAI
  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set. Configure a custom API endpoint in Settings or set the env var.")
    console.log(`[chat] Using OpenAI provider, key length=${apiKey.length}`)
    const openai = createOpenAI({ apiKey })
    return openai(name)
  }

  // Anthropic, Groq, xAI — try their own key first, fall back to OpenAI key
  if (provider === "anthropic" || provider === "groq" || provider === "xai") {
    const key = process.env[`${provider.toUpperCase()}_API_KEY`] || process.env.OPENAI_API_KEY
    const baseURL = process.env[`${provider.toUpperCase()}_BASE_URL`]
    console.log(`[chat] Using ${provider} provider, key=${key ? 'set' : 'unset'}, baseURL=${baseURL || 'default'}`)
    if (!key) throw new Error(`${provider.toUpperCase()}_API_KEY is not set. Configure a custom API endpoint in Settings or set the env var.`)
    const openai = createOpenAI({ apiKey: key, ...(baseURL ? { baseURL } : {}) })
    // SDK v3 routes unknown model IDs to responses() API — force chat() for /v1/chat/completions
    return openai.chat(name as any)
  }

  // Fallback: OpenAI SDK
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set. Configure a custom API endpoint in Settings or set the env var.")
  console.log(`[chat] Using OpenAI fallback, key length=${apiKey.length}`)
  const openai = createOpenAI({ apiKey })
  return openai(name)
}

/**
 * When a custom API endpoint is set, proxy directly to that endpoint.
 * This handles OpenAI-compatible APIs without AI SDK wrapping.
 */
async function proxyCustomApi(
  messages: any[],
  model: string,
  endpoint: string,
  apiKey?: string,
): Promise<Response> {
  const url = endpoint.endsWith("/v1/chat/completions")
    ? endpoint
    : endpoint.replace(/\/+$/, "") + "/v1/chat/completions"

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`
  }

  const externalResponse = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      system: SYSTEM_PROMPT,
    }),
  })

  if (!externalResponse.ok) {
    const errorBody = await externalResponse.text().catch(() => "")
    throw new Error(`Custom API error ${externalResponse.status}: ${errorBody}`)
  }

  // Forward the SSE stream directly
  const body = externalResponse.body
  if (!body) {
    throw new Error("No response body from custom API")
  }

  // Return the raw SSE stream to the client
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
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

    const selectedModel = model || process.env.AI_MODEL || "anthropic/minimax-m2.5-free"

    // Custom API endpoint — proxy directly
    if (customApiEndpoint) {
      return proxyCustomApi(messages, selectedModel, customApiEndpoint, customApiKey)
    }

    // Use AI SDK providers
    const aiModel = buildModel(selectedModel)

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
    const message = error instanceof Error ? error.message : "An unexpected error occurred"

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
