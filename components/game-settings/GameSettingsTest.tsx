"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoundsSelector } from "./RoundsSelector";
import { TimeLimitSlider } from "./TimeLimitSlider";
import { CategoriesSelector } from "./CategoriesSelector";
import {
  GameSettingsFormData,
  DEFAULT_GAME_SETTINGS,
  validateGameSettings,
  hasValidationErrors,
} from "./types";

export function GameSettingsTest() {
  const [settings, setSettings] = React.useState<GameSettingsFormData>(
    DEFAULT_GAME_SETTINGS
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSettingsChange = (
    key: keyof GameSettingsFormData,
    value: any
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Validate on change
    const validationErrors = validateGameSettings(newSettings);
    setErrors(validationErrors);
  };

  const handleSave = () => {
    const validationErrors = validateGameSettings(settings);
    setErrors(validationErrors);

    if (!hasValidationErrors(validationErrors)) {
      console.log("Settings saved:", settings);
      alert("Settings saved successfully!");
    } else {
      console.log("Validation errors:", validationErrors);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-2xl tracking-wide">
              Game Settings Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <RoundsSelector
              value={settings.rounds}
              onChange={(rounds) => handleSettingsChange("rounds", rounds)}
              error={errors.rounds}
            />

            <TimeLimitSlider
              value={settings.timeLimit}
              onChange={(timeLimit) =>
                handleSettingsChange("timeLimit", timeLimit)
              }
              error={errors.timeLimit}
            />

            <CategoriesSelector
              value={settings.categories}
              onChange={(categories) =>
                handleSettingsChange("categories", categories)
              }
              error={errors.categories}
            />

            <div className="pt-4 border-t border-slate-700/50">
              <div className="mb-4">
                <h3 className="text-white font-bangers text-lg tracking-wide mb-2">
                  Current Settings:
                </h3>
                <pre className="text-sm text-purple-200/70 bg-slate-900/50 p-3 rounded-lg font-mono">
                  {JSON.stringify(settings, null, 2)}
                </pre>
              </div>

              <Button
                onClick={handleSave}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bangers text-lg tracking-wide"
              >
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
