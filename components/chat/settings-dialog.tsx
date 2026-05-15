"use client"

import { useState, useEffect } from "react"
import { Settings, CheckCircle2, XCircle, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type AppSettings, getSettings, saveSettings } from "@/lib/chat-storage"
import { AI_MODELS, type AIModel } from "./composer"
import { CodeMint } from "./code-mint"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSettingsChange?: (settings: AppSettings) => void
}

const PRESET_MODELS = [
  ...AI_MODELS.map((m) => ({ id: m.id, name: m.name })),
]

export function SettingsDialog({ open, onOpenChange, onSettingsChange }: SettingsDialogProps) {
  const [settings, setSettings] = useState<AppSettings>({
    customApiEndpoint: "",
    customApiKey: "",
    useCustomApi: false,
    selectedModel: "anthropic/minimax-m2.5-free",
  })
  const [customModelValue, setCustomModelValue] = useState("")
  const [useCustomModel, setUseCustomModel] = useState(false)
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [testMessage, setTestMessage] = useState("")

  useEffect(() => {
    if (open) {
      const loaded = getSettings()
      setSettings(loaded)
      setTestStatus("idle")
      setTestMessage("")

      const isPreset = PRESET_MODELS.some((m) => m.id === loaded.selectedModel)
      if (isPreset) {
        setUseCustomModel(false)
        setCustomModelValue("")
      } else {
        setUseCustomModel(true)
        setCustomModelValue(loaded.selectedModel || "")
      }
    }
  }, [open])

  const handleModelSelect = (modelId: string) => {
    setUseCustomModel(false)
    setSettings({ ...settings, selectedModel: modelId })
  }

  const handleCustomModelChange = (value: string) => {
    setCustomModelValue(value)
    setUseCustomModel(true)
    if (value.trim()) {
      setSettings({ ...settings, selectedModel: value.trim() })
    }
  }

  const handleSave = () => {
    const finalModel = useCustomModel && customModelValue.trim()
      ? customModelValue.trim()
      : settings.selectedModel
    const finalSettings = { ...settings, selectedModel: finalModel }
    saveSettings(finalSettings)
    onSettingsChange?.(finalSettings)
    onOpenChange(false)
  }

  const handleTestConnection = async () => {
    if (!settings.customApiEndpoint) {
      setTestStatus("error")
      setTestMessage("Please enter an API endpoint")
      return
    }

    setTestStatus("testing")
    setTestMessage("")

    try {
      const response = await fetch(settings.customApiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(settings.customApiKey && { Authorization: `Bearer ${settings.customApiKey}` }),
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          model: "test",
        }),
      })

      if (response.ok || response.status === 400) {
        setTestStatus("success")
        setTestMessage("Connection successful")
      } else {
        setTestStatus("error")
        setTestMessage(`Error: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      setTestStatus("error")
      setTestMessage(error instanceof Error ? error.message : "Connection failed")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Configure your chat preferences and API settings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="bg-zinc-800 border-0">
            <TabsTrigger
              value="general"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="api"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400"
            >
              API
            </TabsTrigger>
            <TabsTrigger
              value="mint"
              className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400"
            >
              Mint
            </TabsTrigger>
          </TabsList>

          {/* General tab — Model Selection */}
          <TabsContent value="general" className="mt-4 space-y-5">
            <div>
              <Label className="text-zinc-200 mb-2 block">AI Model</Label>
              <div className="space-y-2">
                {PRESET_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors text-left ${
                      !useCustomModel && settings.selectedModel === model.id
                        ? "bg-zinc-800 border-zinc-600 text-zinc-100"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-sm">{model.name}</span>
                    <span className="text-xs text-zinc-500 font-mono">{model.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-model" className="text-zinc-200">
                Custom Model
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="custom-model"
                  placeholder="e.g. openai/gpt-4o-mini"
                  value={customModelValue}
                  onChange={(e) => handleCustomModelChange(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500"
                />
                <Switch
                  checked={useCustomModel}
                  onCheckedChange={(checked) => {
                    setUseCustomModel(checked)
                    if (checked && customModelValue.trim()) {
                      setSettings({ ...settings, selectedModel: customModelValue.trim() })
                    } else {
                      setSettings({ ...settings, selectedModel: PRESET_MODELS[0].id })
                    }
                  }}
                  className="data-[state=checked]:bg-zinc-300"
                />
              </div>
              <p className="text-xs text-zinc-500">
                Type any model ID. Toggle switch to use custom model instead of presets.
              </p>
            </div>

            {settings.selectedModel && (
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 rounded-lg border border-zinc-800">
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                <span className="text-xs text-zinc-400">Active model:</span>
                <code className="text-xs text-zinc-200 font-mono">{settings.selectedModel}</code>
              </div>
            )}
          </TabsContent>

          {/* API tab */}
          <TabsContent value="api" className="mt-4 space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-custom-api" className="text-zinc-200">
                  Use Custom API
                </Label>
                <p className="text-xs text-zinc-500">
                  Connect your own API router endpoint
                </p>
              </div>
              <Switch
                id="use-custom-api"
                checked={settings.useCustomApi}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, useCustomApi: checked })
                }
                className="data-[state=checked]:bg-zinc-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-endpoint" className="text-zinc-200">
                API Endpoint URL
              </Label>
              <Input
                id="api-endpoint"
                placeholder="https://your-api.com/v1/chat/completions"
                value={settings.customApiEndpoint}
                onChange={(e) =>
                  setSettings({ ...settings, customApiEndpoint: e.target.value })
                }
                disabled={!settings.useCustomApi}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 disabled:opacity-50 focus:border-zinc-500"
              />
              <p className="text-xs text-zinc-500">
                OpenAI-compatible endpoint (e.g. /v1/chat/completions)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-zinc-200">
                API Key (Optional)
              </Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={settings.customApiKey}
                onChange={(e) =>
                  setSettings({ ...settings, customApiKey: e.target.value })
                }
                disabled={!settings.useCustomApi}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 disabled:opacity-50 focus:border-zinc-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={!settings.useCustomApi || testStatus === "testing"}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
              >
                {testStatus === "testing" && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Test Connection
              </Button>

              {testStatus === "success" && (
                <span className="flex items-center text-sm text-green-400 gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {testMessage}
                </span>
              )}
              {testStatus === "error" && (
                <span className="flex items-center text-sm text-red-400 gap-1">
                  <XCircle className="h-4 w-4" />
                  {testMessage}
                </span>
              )}
            </div>
          </TabsContent>

          {/* Mint tab — Code minting on Ritual chain */}
          <TabsContent value="mint" className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-zinc-400 mb-4">
                Save code to Ritual blockchain via MetaMask. Code stored as transaction data with mint call.
              </p>
              <CodeMint contractAddress="0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-white text-zinc-950 hover:bg-zinc-200"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
