"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi"
import { X, Code, Eye, Copy, Check, Maximize2, Minimize2, RefreshCw, Monitor, Tablet, Smartphone, Lock, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const CODE_MINT_ADDRESS = "0x5b69332815068e23433d1d2daa80cdd24e5a0d7f"
const MINT_PRICE_WEI = 1000000000000000n // 0.001 RITUAL

const CODE_MINT_ABI = [
  {
    inputs: [{ name: "_code", type: "string" }],
    name: "mintCode",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const

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

  // Check if user already unlocked this code
  const { address, isConnected } = useAccount()
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [showMint, setShowMint] = useState(false)

  useEffect(() => {
    if (!address) return
    const key = `unlocked-code-${code.substring(0, 50)}-${address}`
    if (localStorage.getItem(key)) setIsUnlocked(true)
  }, [address, code])

  const { data: hash, error: writeError, isPending: writing, writeContract } = useWriteContract()
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (confirmed && hash) {
      setIsUnlocked(true)
      if (address) {
        const key = `unlocked-code-${code.substring(0, 50)}-${address}`
        localStorage.setItem(key, hash)
      }
    }
  }, [confirmed, hash, address, code])

  const handleMint = async () => {
    try {
      await writeContract({
        address: CODE_MINT_ADDRESS,
        abi: CODE_MINT_ABI,
        functionName: "mintCode",
        args: [code.substring(0, 200)], // Store first 200 chars as code reference
        value: MINT_PRICE_WEI,
      })
    } catch (err) {
      console.error("Mint error:", err)
    }
  }

  const generateHtml = useCallback((sourceCode: string, lang?: string) => {
    if (lang === "html" || sourceCode.trim().startsWith("<!DOCTYPE") || sourceCode.trim().startsWith("<html")) {
      return sourceCode
    }
    if (lang === "jsx" || lang === "tsx" || lang === "javascript" || lang === "typescript") {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>body{margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;background:#fafafa}</style>
</head>
<body>
  <div id="root">
    <pre style="background:#1a1a1a;color:#e5e5e5;padding:16px;border-radius:8px;overflow:auto">
      <code>${escapeHtml(sourceCode)}</code>
    </pre>
  </div>
</body>
</html>`
    }
    if (lang === "css") {
      return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>CSS Preview</title>
<style>${sourceCode}</style>
<style>body{margin:0;padding:16px;font-family:system-ui,sans-serif}.preview-box{padding:20px;border:1px solid #ddd;border-radius:8px}</style>
</head>
<body><div class="preview-box"><h1>Heading 1</h1><h2>Heading 2</h2><p>Styled paragraph</p><button>Button</button><a href="#">Link</a></div></body>
</html>`
    }
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Preview</title>
<script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body>${sourceCode}</body>
</html>`
  }, [])

  const escapeHtml = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")

  const refreshPreview = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = generateHtml(code, language)
    }
  }, [code, language, generateHtml])

  useEffect(() => { refreshPreview() }, [refreshPreview])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      "flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden",
      isFullscreen ? "fixed inset-4 z-50" : "h-[500px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("preview")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                activeTab === "preview" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              <Eye className="h-4 w-4" /> Preview
            </button>
            <button
              onClick={() => {
                if (!isUnlocked) {
                  setShowMint(true)
                  setActiveTab("code")
                } else {
                  setActiveTab("code")
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                activeTab === "code" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100",
                !isUnlocked && "opacity-80"
              )}
            >
              {isUnlocked ? <Code className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {isUnlocked ? "Code" : "Unlock"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Device mode toggle */}
          <div className="flex items-center gap-1 mr-2 border-r border-zinc-700 pr-2">
            {[
              { mode: "desktop" as const, icon: Monitor },
              { mode: "tablet" as const, icon: Tablet },
              { mode: "mobile" as const, icon: Smartphone },
            ].map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setDeviceMode(mode)}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  deviceMode === mode ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <Button variant="ghost" size="icon" onClick={refreshPreview} className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={handleCopy}
            disabled={!isUnlocked}
            className={cn(
              "h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
              !isUnlocked && "opacity-30 cursor-not-allowed"
            )}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "preview" ? (
          <div className="flex-1 flex items-start justify-center bg-zinc-900 p-4 h-full">
            <div className={cn(
              "h-full bg-white rounded-lg overflow-hidden transition-all duration-300",
              deviceMode === "mobile" && "w-[375px] border-4 border-zinc-700",
              deviceMode === "tablet" && "w-[768px] border-4 border-zinc-700",
              deviceMode === "desktop" && "w-full border-0"
            )}>
              <iframe ref={iframeRef} className="w-full h-full" sandbox="allow-scripts allow-same-origin" title="Preview" />
            </div>
          </div>
        ) : showMint && !isUnlocked ? (
          <MintToUnlock
            code={code}
            onMint={handleMint}
            writing={writing}
            confirming={confirming}
            confirmed={confirmed}
            writeError={writeError}
            onUnlock={() => { setShowMint(false); setIsUnlocked(true) }}
            isConnected={isConnected}
          />
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

function MintToUnlock({
  code, onMint, writing, confirming, confirmed, writeError, onUnlock, isConnected
}: {
  code: string
  onMint: () => void
  writing: boolean
  confirming: boolean
  confirmed: boolean
  writeError: Error | null
  onUnlock: () => void
  isConnected: boolean
}) {
  if (confirmed) {
    onUnlock()
    return null
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-zinc-900 px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-900/20 border border-amber-800/30 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Unlock Source Code</h3>
          <p className="text-sm text-zinc-400">
            Mint this code to the Ritual blockchain for <span className="text-white font-semibold">0.001 RITUAL</span>.
            The code will be stored on-chain as your NFT.
          </p>
        </div>

        {/* Code preview (blurred) */}
        <div className="relative rounded-lg overflow-hidden border border-zinc-800">
          <div className="filter blur-sm select-none opacity-40 max-h-24 overflow-hidden p-3">
            <pre className="text-xs text-zinc-500 font-mono whitespace-pre-wrap break-all">{code}</pre>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-zinc-900/90 px-4 py-2 rounded-lg flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-400">Mint to unlock</span>
            </div>
          </div>
        </div>

        {!isConnected ? (
          <div className="bg-zinc-800 rounded-lg px-4 py-3 border border-zinc-700">
            <p className="text-sm text-zinc-400">Connect your wallet to mint</p>
          </div>
        ) : (
          <Button
            onClick={onMint}
            disabled={writing || confirming}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
          >
            {writing || confirming ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                {confirming ? "Confirming..." : "Minting..."}
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Mint & Unlock — 0.001 RITUAL
              </>
            )}
          </Button>
        )}

        {writeError && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/50 rounded-lg">
            <X className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs text-red-300">{writeError.message}</span>
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

  const isHTML =
    language === "html" ||
    language === "htm" ||
    code.trim().startsWith("<!DOCTYPE") ||
    code.trim().startsWith("<html")

  const isPreviewable =
    isHTML ||
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

  if (isHTML) {
    return <HtmlPreview code={code} language={language} onClose={() => {}} />
  }

  if (showPreview && isPreviewable) {
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
          className="absolute top-2 right-2 h-7 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 gap-1.5 opacity-100 transition-opacity"
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </Button>
      )}
    </div>
  )
}
