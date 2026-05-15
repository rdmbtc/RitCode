"use client"

import { useState } from "react"
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from "wagmi"
import { Loader2, Check, X, Copy, Save, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ritualChain } from "@/lib/wagmi"

const CODE_MINT_ADDRESS = "0x0000000000000000000000000000000000000000" // TODO: update after deploy

const CODE_MINT_ABI = [
  {
    inputs: [{ name: "_code", type: "string" }],
    name: "mintCode",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "getCode",
    outputs: [
      {
        components: [
          { name: "code", type: "string" },
          { name: "minter", type: "address" },
          { name: "timestamp", type: "uint256" },
          { name: "tokenId", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserCodes",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalCodes",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

export function CodeMint() {
  const { address, isConnected } = useAccount()
  const [mintCode, setMintCode] = useState("")
  const [copied, setCopied] = useState(false)

  const { data: hash, error: writeError, isPending: writing, writeContract } = useWriteContract()

  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash })

  // Fetch user's minted codes
  const { data: userCodeIds } = useReadContract({
    address: CODE_MINT_ADDRESS,
    abi: CODE_MINT_ABI,
    functionName: "getUserCodes",
    args: [address!],
    query: { enabled: !!isConnected },
  })

  // Fetch total codes count
  const { data: totalCodes } = useReadContract({
    address: CODE_MINT_ADDRESS,
    abi: CODE_MINT_ABI,
    functionName: "totalCodes",
  })

  const handleMint = async () => {
    if (!mintCode.trim() || !address) return

    try {
      await writeContract({
        address: CODE_MINT_ADDRESS,
        abi: CODE_MINT_ABI,
        functionName: "mintCode",
        args: [mintCode.trim()],
      })
    } catch (err) {
      console.error("Mint error:", err)
    }
  }

  const handleCopy = async () => {
    if (!mintCode) return
    await navigator.clipboard.writeText(mintCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-zinc-400">Connect wallet to mint codes</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">
          <span className="text-xs text-zinc-500">Your Codes</span>
          <p className="text-lg font-semibold text-white">{userCodeIds?.length || 0}</p>
        </div>
        <div className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">
          <span className="text-xs text-zinc-500">Total Minted</span>
          <p className="text-lg font-semibold text-white">{totalCodes?.toString() || 0}</p>
        </div>
      </div>

      {/* Input */}
      <div>
        <label className="text-sm text-zinc-300 mb-2 block">Code to Mint</label>
        <textarea
          value={mintCode}
          onChange={(e) => setMintCode(e.target.value)}
          placeholder="Paste your code here..."
          className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 resize-none focus:border-zinc-500 focus:outline-none font-mono"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleMint}
          disabled={!mintCode.trim() || writing || confirming}
          className="flex-1 bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {(writing || confirming) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {confirming ? "Confirming..." : writing ? "Minting..." : "Mint Code"}
        </Button>
        {mintCode && (
          <Button
            onClick={handleCopy}
            variant="ghost"
            size="icon"
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Status */}
      {confirmed && hash && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-800/50 rounded-lg">
          <Check className="w-4 h-4 text-green-400 shrink-0" />
          <span className="text-xs text-green-300">Code minted!</span>
          <a
            href={`https://explorer.ritualfoundation.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {writeError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/50 rounded-lg">
          <X className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300">{writeError.message}</span>
        </div>
      )}

      {/* User's minted codes */}
      {userCodeIds && userCodeIds.length > 0 && (
        <div>
          <h4 className="text-sm text-zinc-300 mb-2">Your Minted Codes</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {userCodeIds.map((id) => (
              <MintedCode key={id.toString()} tokenId={id} />
            ))}
          </div>
        </div>
      )}

      {/* Contract info */}
      <div className="px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700">
        <span className="text-xs text-zinc-500">Contract:</span>
        <code className="text-xs text-zinc-300 font-mono ml-2">{CODE_MINT_ADDRESS}</code>
      </div>
    </div>
  )
}

function MintedCode({ tokenId }: { tokenId: bigint }) {
  const { data: codeEntry } = useReadContract({
    address: CODE_MINT_ADDRESS,
    abi: CODE_MINT_ABI,
    functionName: "getCode",
    args: [tokenId],
  })

  if (!codeEntry) return null

  const timestamp = new Date(Number(codeEntry.timestamp) * 1000).toLocaleString()

  return (
    <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-500">Token #{tokenId.toString()}</span>
        <span className="text-xs text-zinc-500">{timestamp}</span>
      </div>
      <pre className="text-xs text-zinc-300 font-mono bg-zinc-900 rounded p-2 max-h-20 overflow-auto whitespace-pre-wrap break-all">
        {codeEntry.code}
      </pre>
    </div>
  )
}
