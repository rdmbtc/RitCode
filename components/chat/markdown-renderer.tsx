"use client"

import { cn } from "@/lib/utils"
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { AnalysisWordSpan } from "./analysis-word-span"
import { CodeBlockWithPreview } from "./html-preview"

interface MarkdownRendererProps {
  content: string
  className?: string
  isStreaming?: boolean
}

export function MarkdownRenderer({ content, className, isStreaming = false }: MarkdownRendererProps) {
  const renderedContentRef = useRef("")
  const [staticContent, setStaticContent] = useState("")
  const [animatingContent, setAnimatingContent] = useState("")

  useEffect(() => {
    if (isStreaming) {
      // New content is everything after what we've already rendered as static
      const newContent = content.slice(staticContent.length)
      setAnimatingContent(newContent)
    } else {
      // Streaming ended - move all content to static
      setStaticContent(content)
      setAnimatingContent("")
    }
  }, [content, isStreaming, staticContent.length])

  // When animating content gets long enough, move older parts to static
  useEffect(() => {
    if (animatingContent.length > 200) {
      // Move first 150 chars to static (finding a word boundary)
      const cutPoint = animatingContent.lastIndexOf(" ", 150)
      if (cutPoint > 50) {
        setStaticContent((prev) => prev + animatingContent.slice(0, cutPoint + 1))
        setAnimatingContent(animatingContent.slice(cutPoint + 1))
      }
    }
  }, [animatingContent])

  const renderPlainInlineMarkdown = (text: string) => {
    const elements: (string | React.ReactNode)[] = []
    let remaining = text
    let keyIndex = 0

    while (remaining.length > 0) {
      // Check for inline code
      const codeMatch = remaining.match(/^`([^`]+)`/)
      if (codeMatch) {
        elements.push(
          <code key={keyIndex++} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded text-sm font-mono">
            {codeMatch[1]}
          </code>,
        )
        remaining = remaining.slice(codeMatch[0].length)
        continue
      }

      // Check for bold
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
      if (boldMatch) {
        elements.push(<strong key={keyIndex++}>{boldMatch[1]}</strong>)
        remaining = remaining.slice(boldMatch[0].length)
        continue
      }

      // Check for italic
      const italicMatch = remaining.match(/^\*([^*]+)\*/)
      if (italicMatch) {
        elements.push(<em key={keyIndex++}>{italicMatch[1]}</em>)
        remaining = remaining.slice(italicMatch[0].length)
        continue
      }

      // Check for links
      const linkMatch = remaining.match(/^\[([^\]]+)\]$$([^)]+)$$/)
      if (linkMatch) {
        elements.push(
          <a
            key={keyIndex++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 hover:text-white underline underline-offset-2 transition-colors"
          >
            {linkMatch[1]}
          </a>,
        )
        remaining = remaining.slice(linkMatch[0].length)
        continue
      }

      // Find next special character or add remaining text
      const nextSpecial = remaining.search(/[`*[\]()]/)
      if (nextSpecial === -1) {
        elements.push(remaining)
        break
      } else if (nextSpecial === 0) {
        elements.push(remaining[0])
        remaining = remaining.slice(1)
      } else {
        elements.push(remaining.slice(0, nextSpecial))
        remaining = remaining.slice(nextSpecial)
      }
    }

    return elements
  }

  const renderAnimatedInlineMarkdown = (text: string) => {
    const elements: (string | React.ReactNode)[] = []
    let remaining = text
    let keyIndex = 0

    while (remaining.length > 0) {
      // Check for inline code
      const codeMatch = remaining.match(/^`([^`]+)`/)
      if (codeMatch) {
        elements.push(
          <code key={keyIndex++} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded text-sm font-mono">
            {codeMatch[1]}
          </code>,
        )
        remaining = remaining.slice(codeMatch[0].length)
        continue
      }

      // Check for bold
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
      if (boldMatch) {
        const words = boldMatch[1].split(/(\s+)/)
        elements.push(
          <strong key={keyIndex++}>
            {words.map((word, i) => {
              if (word.match(/\s+/)) return word
              if (!word) return null
              return <AnalysisWordSpan key={`b-${keyIndex}-${i}`} word={word} />
            })}
          </strong>,
        )
        remaining = remaining.slice(boldMatch[0].length)
        continue
      }

      // Check for italic
      const italicMatch = remaining.match(/^\*([^*]+)\*/)
      if (italicMatch) {
        const words = italicMatch[1].split(/(\s+)/)
        elements.push(
          <em key={keyIndex++}>
            {words.map((word, i) => {
              if (word.match(/\s+/)) return word
              if (!word) return null
              return <AnalysisWordSpan key={`i-${keyIndex}-${i}`} word={word} />
            })}
          </em>,
        )
        remaining = remaining.slice(italicMatch[0].length)
        continue
      }

      // Check for links
      const linkMatch = remaining.match(/^\[([^\]]+)\]$$([^)]+)$$/)
      if (linkMatch) {
        elements.push(
          <a
            key={keyIndex++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 hover:text-white underline underline-offset-2 transition-colors"
          >
            {linkMatch[1]}
          </a>,
        )
        remaining = remaining.slice(linkMatch[0].length)
        continue
      }

      // Find next special character or add remaining text
      const nextSpecial = remaining.search(/[`*[\]()]/)
      if (nextSpecial === -1) {
        const words = remaining.split(/(\s+)/)
        elements.push(
          ...words.map((word, i) => {
            if (word.match(/\s+/)) return word
            if (!word) return null
            return <AnalysisWordSpan key={`w-${keyIndex++}-${i}`} word={word} />
          }),
        )
        break
      } else if (nextSpecial === 0) {
        elements.push(remaining[0])
        remaining = remaining.slice(1)
      } else {
        const textPart = remaining.slice(0, nextSpecial)
        const words = textPart.split(/(\s+)/)
        elements.push(
          ...words.map((word, i) => {
            if (word.match(/\s+/)) return word
            if (!word) return null
            return <AnalysisWordSpan key={`t-${keyIndex++}-${i}`} word={word} />
          }),
        )
        remaining = remaining.slice(nextSpecial)
      }
    }

    return elements
  }

  const renderCodeBlock = (part: string, partIndex: number) => {
    const codeContent = part.slice(3, -3).trim()
    // Extract language: "html\n..." or "html..." (no newline)
    const langMatch = codeContent.match(/^([a-zA-Z0-9_+-]+)(\s+|\n|)(.*)/s)
    const language = langMatch ? langMatch[1].toLowerCase() : ""
    const code = langMatch ? langMatch[3] : codeContent

    // Use CodeBlockWithPreview for HTML-like content
    return <CodeBlockWithPreview key={partIndex} code={code} language={language} />
  }

  const renderContent = (text: string, animated: boolean) => {
    if (!text) return null

    // Split by code blocks first
    const parts = text.split(/(```[\s\S]*?```)/g)

    return parts.map((part, partIndex) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        return renderCodeBlock(part, partIndex)
      }

      if (animated) {
        return <span key={partIndex}>{renderAnimatedInlineMarkdown(part)}</span>
      }

      return <span key={partIndex}>{renderPlainInlineMarkdown(part)}</span>
    })
  }

  return (
    <div className={cn("text-sm whitespace-pre-wrap break-words overflow-x-hidden", className)}>
      {renderContent(staticContent, false)}
      {renderContent(animatingContent, true)}
    </div>
  )
}
