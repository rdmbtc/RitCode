"use client"

import { useState, useEffect } from "react"
import { Settings, CheckCircle2, XCircle, Loader2 } from "lucide-react"
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

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSettingsChange?: (settings: AppSettings) => void
}

export function SettingsDialog({ open, onOpenChange, onSettingsChange }: SettingsDialogProps) {
  const [settings, setSettings] = useState<AppSettings>({
    customApiEndpoint: "",
    customApiKey: "",
    useCustomApi: false,
  })
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [testMessage, setTestMessage] = useState("")

  useEffect(() => {
    if (open) {
      setSettings(getSettings())
      setTestStatus("idle")
      setTestMessage("")
    }
  }, [open])

  const handleSave = () => {
    saveSettings(settings)
    onSettingsChange?.(settings)
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
        // 400 might mean bad request format but endpoint is reachable
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
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[500px]">
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
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger
              value="general"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="api"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
            >
              API Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-4">
            <div className="text-sm text-zinc-400">
              General settings coming soon. Configure your chat experience here.
            </div>
          </TabsContent>

          <TabsContent value="api" className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-custom-api" className="text-zinc-100">
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
                className="data-[state=checked]:bg-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-endpoint" className="text-zinc-100">
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
                className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 disabled:opacity-50"
              />
              <p className="text-xs text-zinc-500">
                OpenAI-compatible endpoint (e.g., /v1/chat/completions)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-zinc-100">
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
                className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 disabled:opacity-50"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={!settings.useCustomApi || testStatus === "testing"}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
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
            className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
