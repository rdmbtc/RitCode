"use client"

import { useState } from "react"
import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain } from "wagmi"
import { injected } from "wagmi/connectors"
import { Wallet, LogOut, Copy, ExternalLink, Loader2, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ritualChain } from "@/lib/wagmi"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatBalance(value: string) {
  const num = parseFloat(value)
  if (num === 0) return "0"
  if (num < 0.001) return num.toExponential(2)
  return num.toFixed(4)
}

export function WalletConnector() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, isPending: connecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: switching } = useSwitchChain()
  const { data: balance } = useBalance({ address })
  const [copied, setCopied] = useState(false)

  const isRitualChain = chainId === ritualChain.id

  const handleConnect = () => {
    connect({ connector: injected() })
  }

  const handleSwitchChain = () => {
    switchChain({ chainId: ritualChain.id })
  }

  const handleCopy = async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Not connected
  if (!isConnected) {
    return (
      <Button
        onClick={handleConnect}
        disabled={connecting}
        className="bg-transparent border-zinc-700 text-white hover:bg-zinc-900 hover:text-white rounded-full px-4 gap-2 border"
      >
        {connecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        {connecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    )
  }

  // Connected but wrong chain
  if (!isRitualChain) {
    return (
      <Button
        onClick={handleSwitchChain}
        disabled={switching}
        className="bg-transparent border-amber-700/50 text-amber-400 hover:bg-amber-900/20 rounded-full px-4 gap-2 border"
      >
        {switching ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        {switching ? "Switching..." : "Switch to Ritual"}
      </Button>
    )
  }

  // Connected and correct chain
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 rounded-full px-4 gap-2 border h-9"
        >
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-mono text-sm">{formatAddress(address)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-64 rounded-2xl bg-zinc-900 border-zinc-800 p-4"
      >
        <div className="flex flex-col gap-3">
          {/* Balance */}
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500">Balance</span>
            <span className="text-lg font-semibold text-white">
              {balance ? formatBalance(balance.formatted) : "0"} {balance?.symbol || "RITUAL"}
            </span>
          </div>

          {/* Address */}
          <div className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
            <span className="font-mono text-xs text-zinc-300 truncate">{address}</span>
            <button
              onClick={handleCopy}
              className="ml-2 text-zinc-400 hover:text-zinc-200 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="flex-1 h-8 bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-lg"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Explorer
            </Button>
            <Button
              onClick={() => disconnect()}
              variant="outline"
              size="sm"
              className="flex-1 h-8 bg-zinc-800 border-zinc-700 text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Disconnect
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
