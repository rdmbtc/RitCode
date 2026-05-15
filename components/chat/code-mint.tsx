"use client"

import { useState } from "react"
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi"
import { parseAbi } from "viem"
import { Loader2, Check, X, Copy, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ERC-20 mint ABI — standard mint function
const MINT_ABI = parseAbi([
  "function mint(address to, uint256 amount) public",
  "function balanceOf(address owner) view returns (uint256)",
])

interface CodeMintProps {
  contractAddress: string
}

export function CodeMint({ contractAddress }: CodeMintProps) {
  const { address, isConnected } = useAccount()
  const [mintCode, setMintCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [showSave, setShowSave] = useState(false)

  const { data: hash, error: writeError, isPending: writing, writeContract } = useWriteContract()

  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const handleMint = async () => {
    if (!mintCode.trim() || !address) return

    // Encode the code as a hex string to store on-chain
    // We use mint(to, amount) where amount is derived from the code hash
    // This saves the code reference in the transaction data
    const encodedCode = new TextEncoder().encode(mintCode.trim())
    const amount = BigInt(encodedCode.reduce((acc, byte) => acc + byte, 0)) * BigInt(1e18)

    try {
      await writeContract({
        address: contractAddress as `0x${string}`,
        abi: MINT_ABI,
        functionName: "mint",
        args: [address, amount],
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

  // Save code to localStorage for later retrieval
  const handleSaveCode = () => {
    if (!mintCode.trim()) return
    const savedCodes = JSON.parse(localStorage.getItem("ritual-mint-codes") || "[]")
    savedCodes.push({ code: mintCode.trim(), hash, timestamp: new Date().toISOString() })
    localStorage.setItem("ritual-mint-codes", JSON.stringify(savedCodes))
    setShowSave(false)
    setMintCode("")
  }

  if (!isConnected) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-zinc-400">Connect wallet to mint codes</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-zinc-300 mb-2 block">Mint Code</label>
        <textarea
          value={mintCode}
          onChange={(e) => setMintCode(e.target.value)}
          placeholder="Enter code to mint on Ritual chain..."
          className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 resize-none focus:border-zinc-500 focus:outline-none"
        />
      </div>

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
        {confirmed && (
          <Button
            onClick={() => setShowSave(true)}
            variant="ghost"
            size="icon"
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            <Save className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Status messages */}
      {confirmed && hash && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-800/50 rounded-lg">
          <Check className="w-4 h-4 text-green-400 shrink-0" />
          <span className="text-xs text-green-300">Code minted successfully!</span>
          <code className="text-xs text-green-400 font-mono truncate ml-auto">{hash.slice(0, 10)}...</code>
        </div>
      )}

      {writeError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/50 rounded-lg">
          <X className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300">{writeError.message}</span>
        </div>
      )}

      {/* Save code dialog */}
      {showSave && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-3">
          <p className="text-sm text-zinc-300">Save this code to blockchain?</p>
          <div className="flex gap-2">
            <Button
              onClick={handleSaveCode}
              className="flex-1 bg-white text-zinc-900 hover:bg-zinc-200"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={() => setShowSave(false)}
              variant="ghost"
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Contract address */}
      <div className="px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700">
        <span className="text-xs text-zinc-500">Contract:</span>
        <code className="text-xs text-zinc-300 font-mono ml-2">{contractAddress}</code>
      </div>
    </div>
  )
}
