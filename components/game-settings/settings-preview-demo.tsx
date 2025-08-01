"use client";

import * as React from "react";
import { SettingsPreview } from "./settings-preview";
import { Button } from "@/components/ui/button";

// Demo component to test SettingsPreview
export function SettingsPreviewDemo() {
  const [settings, setSettings] = React.useState<LobbySettings>({
    rounds: 3,
    timeLimit: 60,
    categories: ["funny", "random"],
  });

  const originalSettings: LobbySettings = {
    rounds: 3,
    timeLimit: 60,
    categories: ["funny", "random"],
  };

  const handleModifySettings = () => {
    setSettings({
      rounds: 5,
      timeLimit: 120,
      categories: ["funny", "dark", "trending"],
    });
  };

  const handleResetSettings = () => {
    setSettings(originalSettings);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bangers text-white tracking-wide mb-4">
            Settings Preview Demo
          </h1>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleModifySettings}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bangers tracking-wide"
            >
              Modify Settings
            </Button>
            <Button
              onClick={handleResetSettings}
              variant="outline"
              className="border-slate-600/50 text-white hover:bg-slate-700/50 font-bangers tracking-wide"
            >
              Reset Settings
            </Button>
          </div>
        </div>

        <SettingsPreview
          settings={settings}
          originalSettings={originalSettings}
        />
      </div>
    </div>
  );
}
