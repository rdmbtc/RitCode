"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Code, Eye, Copy, Check, Maximize2, Minimize2, RefreshCw, Monitor, Tablet, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HtmlPreviewProps {
  code: string
  language?: string
  onClose: () => void
}

export function HtmlPreview({ code, language, onClose }: HtmlPreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview")
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const generateHtml = useCallback((sourceCode: string, lang?: string) => {
    // If it's already HTML or contains HTML tags, use it directly
    if (lang === "html" || sourceCode.trim().startsWith("<!DOCTYPE") || sourceCode.trim().startsWith("<html")) {
      return sourceCode
    }

    // If it contains JSX/React-like syntax, wrap it in a basic HTML template
    if (lang === "jsx" || lang === "tsx" || lang === "javascript" || lang === "typescript") {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { 
      margin: 0; 
      padding: 16px; 
      font-family: system-ui, -apple-system, sans-serif;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="root">
    <pre style="background: #1a1a1a; color: #e5e5e5; padding: 16px; border-radius: 8px; overflow: auto;">
      <code>${escapeHtml(sourceCode)}</code>
    </pre>
  </div>
</body>
</html>`
    }

    // For CSS, show it in a styled preview
    if (lang === "css") {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Preview</title>
  <style>${sourceCode}</style>
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
    .preview-box { padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="preview-box">
    <h1>Heading 1</h1>
    <h2>Heading 2</h2>
    <p>This is a paragraph with the applied CSS styles.</p>
    <button>Button</button>
    <a href="#">Link</a>
  </div>
</body>
</html>`
    }

    // Default: wrap code in HTML with Tailwind
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${sourceCode}
</body>
</html>`
  }, [])

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  const refreshPreview = useCallback(() => {
    if (iframeRef.current) {
      const html = generateHtml(code, language)
      iframeRef.current.srcdoc = html
    }
  }, [code, language, generateHtml])

  useEffect(() => {
    refreshPreview()
  }, [refreshPreview])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden",
        isFullscreen ? "fixed inset-4 z-50" : "h-[500px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("preview")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                activeTab === "preview"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                activeTab === "code"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              <Code className="h-4 w-4" />
              Code
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Device mode toggle */}
          <div className="flex items-center gap-1 mr-2 border-r border-zinc-700 pr-2">
            <button
              onClick={() => setDeviceMode("desktop")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                deviceMode === "desktop"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
              title="Desktop view"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeviceMode("tablet")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                deviceMode === "tablet"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
              title="Tablet view"
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeviceMode("mobile")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                deviceMode === "mobile"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
              title="Mobile view"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={refreshPreview}
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex items-start justify-center bg-zinc-900 p-4">
        {activeTab === "preview" ? (
          <div
            className={cn(
              "h-full bg-white rounded-lg overflow-hidden transition-all duration-300",
              deviceMode === "mobile" && "w-[375px] border-4 border-zinc-700",
              deviceMode === "tablet" && "w-[768px] border-4 border-zinc-700",
              deviceMode === "desktop" && "w-full border-0"
            )}
          >
            <iframe
              ref={iframeRef}
              className="w-full h-full"
              sandbox="allow-scripts allow-same-origin"
              title="Preview"
            />
          </div>
        ) : (
          <div className="h-full w-full overflow-auto p-4 bg-zinc-900">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

// Component to detect and render preview button for code blocks
interface CodeBlockWithPreviewProps {
  code: string
  language?: string
}

export function CodeBlockWithPreview({ code, language }: CodeBlockWithPreviewProps) {
  const [showPreview, setShowPreview] = useState(false)

  const isPreviewable = 
    language === "html" ||
    language === "css" ||
    code.includes("<div") ||
    code.includes("<section") ||
    code.includes("<button") ||
    code.includes("<form") ||
    code.includes("<nav") ||
    code.includes("<header") ||
    code.includes("<footer") ||
    code.includes("<main") ||
    code.includes("<article")

  if (showPreview) {
    return <HtmlPreview code={code} language={language} onClose={() => setShowPreview(false)} />
  }

  return (
    <div className="relative group">
      <pre className="my-2 p-3 bg-zinc-800 text-zinc-100 rounded-lg overflow-x-auto text-sm font-mono">
        {language && <span className="text-xs text-zinc-400 block mb-2">{language}</span>}
        <code>{code}</code>
      </pre>
      {isPreviewable && (
        <Button
          onClick={() => setShowPreview(true)}
          size="sm"
          className="absolute top-2 right-2 h-7 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Button>
      )}
    </div>
  )
}
