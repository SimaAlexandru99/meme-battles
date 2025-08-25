"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Eye,
  Info,
  MessageCircle,
  Palette,
  Shield,
  Trophy,
  Volume2,
  Zap,
} from "lucide-react";
import type React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface AdvancedSetting {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  comingSoon?: boolean;
  category: "gameplay" | "social" | "accessibility" | "moderation";
}

interface AdvancedSettingsProps {
  settings: Record<string, boolean>;
  onSettingChange: (settingId: string, enabled: boolean) => void;
  disabled?: boolean;
}

const ADVANCED_SETTINGS: AdvancedSetting[] = [
  // Gameplay Settings
  {
    id: "enableAI",
    title: "AI Players",
    description: "Add AI players to fill empty slots and keep games active",
    icon: <Bot className="h-4 w-4" />,
    enabled: false,
    comingSoon: true,
    category: "gameplay",
  },
  {
    id: "powerUps",
    title: "Power-ups",
    description:
      "Special abilities like extra time, card swaps, or double points",
    icon: <Zap className="h-4 w-4" />,
    enabled: false,
    comingSoon: true,
    category: "gameplay",
  },
  {
    id: "customPrompts",
    title: "Custom Prompts",
    description: "Allow players to submit their own situation prompts",
    icon: <Palette className="h-4 w-4" />,
    enabled: false,
    comingSoon: true,
    category: "gameplay",
  },

  // Social Settings
  {
    id: "allowSpectators",
    title: "Spectator Mode",
    description: "Let others watch the game without participating",
    icon: <Eye className="h-4 w-4" />,
    enabled: true,
    comingSoon: true,
    category: "social",
  },
  {
    id: "enableChat",
    title: "In-Game Chat",
    description: "Allow players to chat during gameplay phases",
    icon: <MessageCircle className="h-4 w-4" />,
    enabled: true,
    category: "social",
  },
  {
    id: "shareResults",
    title: "Share Results",
    description: "Allow sharing winning meme combinations on social media",
    icon: <Trophy className="h-4 w-4" />,
    enabled: true,
    comingSoon: true,
    category: "social",
  },

  // Accessibility Settings
  {
    id: "soundEffects",
    title: "Sound Effects",
    description: "Play audio cues for game events and notifications",
    icon: <Volume2 className="h-4 w-4" />,
    enabled: true,
    comingSoon: true,
    category: "accessibility",
  },

  // Moderation Settings
  {
    id: "contentFilter",
    title: "Content Filtering",
    description: "Automatically filter inappropriate meme submissions",
    icon: <Shield className="h-4 w-4" />,
    enabled: true,
    comingSoon: true,
    category: "moderation",
  },
];

export function AdvancedSettings({
  settings,
  onSettingChange,
  disabled = false,
}: AdvancedSettingsProps) {
  const groupedSettings = ADVANCED_SETTINGS.reduce(
    (acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    },
    {} as Record<string, AdvancedSetting[]>,
  );

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case "gameplay":
        return {
          title: "Gameplay Features",
          description: "Enhance the core game experience",
          icon: <Zap className="h-4 w-4" />,
        };
      case "social":
        return {
          title: "Social Features",
          description: "Connect and interact with other players",
          icon: <MessageCircle className="h-4 w-4" />,
        };
      case "accessibility":
        return {
          title: "Accessibility",
          description: "Make the game more accessible to everyone",
          icon: <Volume2 className="h-4 w-4" />,
        };
      case "moderation":
        return {
          title: "Moderation & Safety",
          description: "Keep the game environment safe and fun",
          icon: <Shield className="h-4 w-4" />,
        };
      default:
        return {
          title: "Other Settings",
          description: "Additional configuration options",
          icon: <Info className="h-4 w-4" />,
        };
    }
  };

  const comingSoonCount = ADVANCED_SETTINGS.filter((s) => s.comingSoon).length;

  return (
    <div className="space-y-6">
      {/* Coming Soon Notice */}
      {comingSoonCount > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {comingSoonCount} feature{comingSoonCount !== 1 ? "s" : ""} marked
            as &ldquo;Coming Soon&rdquo; will be available in future updates.
            Settings can be configured now but won&apos;t affect gameplay yet.
          </AlertDescription>
        </Alert>
      )}

      {/* Settings by Category */}
      {Object.entries(groupedSettings).map(([category, categorySettings]) => {
        const categoryInfo = getCategoryInfo(category);

        return (
          <Card key={category}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                {categoryInfo.icon}
                {categoryInfo.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {categoryInfo.description}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {categorySettings.map((setting, index) => {
                const isEnabled = settings[setting.id] ?? setting.enabled;
                const isDisabled = disabled || setting.comingSoon;

                return (
                  <div key={setting.id}>
                    <motion.div
                      whileHover={{ scale: isDisabled ? 1 : 1.01 }}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isDisabled
                          ? "opacity-60 bg-muted/30"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
                          {setting.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">
                              {setting.title}
                            </h4>
                            {setting.comingSoon && (
                              <Badge variant="outline" className="text-xs">
                                Coming Soon
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {setting.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0 ml-4">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            !isDisabled && onSettingChange(setting.id, checked)
                          }
                          disabled={isDisabled}
                        />
                      </div>
                    </motion.div>

                    {index < categorySettings.length - 1 && (
                      <Separator className="my-3" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Settings Summary */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Settings Summary</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Active Features:</span>{" "}
              <span className="font-medium">
                {Object.values(settings).filter(Boolean).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Coming Soon:</span>{" "}
              <span className="font-medium">{comingSoonCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
