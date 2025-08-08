"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Settings, Clock, Users, Tag, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CategorySelector,
  TimeLimitSelector,
  RoundsSelector,
  AdvancedSettings,
} from "@/components/game-settings";
import type { LobbyData, GameSettings } from "@/types/index";

// Form validation schema - only include properties that are part of GameSettings
const gameSettingsSchema = z.object({
  rounds: z
    .number()
    .min(3, "Minimum 3 rounds required")
    .max(15, "Maximum 15 rounds allowed"),
  timeLimit: z
    .number()
    .min(30, "Minimum 30 seconds required")
    .max(120, "Maximum 120 seconds allowed"),
  categories: z
    .array(z.string())
    .min(1, "At least one category must be selected")
    .max(10, "Maximum 10 categories allowed"),
});

type GameSettingsForm = z.infer<typeof gameSettingsSchema>;

interface GameSettingsProps {
  lobbyData: LobbyData;
  isHost: boolean;
  canModifySettings: boolean;
  disabled?: boolean;
  onSettingsUpdate?: (settings: GameSettings) => Promise<void>;
  isUpdating?: boolean;
}

export function GameSettings({
  lobbyData,
  isHost,
  onSettingsUpdate,
  isUpdating = false,
}: GameSettingsProps) {
  const [activeTab, setActiveTab] = useState("basic");

  const form = useForm<GameSettingsForm>({
    resolver: zodResolver(gameSettingsSchema),
    defaultValues: {
      rounds: lobbyData.settings.rounds || 5,
      timeLimit: lobbyData.settings.timeLimit || 60,
      categories: lobbyData.settings.categories || ["classic", "reaction"],
    },
  });

  const { handleSubmit, watch, formState, setValue } = form;
  const { isDirty, isValid } = formState;

  // Watch form values for real-time updates
  const watchedValues = watch();

  const onSubmit = async (data: GameSettingsForm) => {
    if (!isHost) return;

    const settings: GameSettings = {
      rounds: data.rounds,
      timeLimit: data.timeLimit,
      categories: data.categories,
    };

    await onSettingsUpdate?.(settings);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  };

  const formatRounds = (rounds: number) => {
    return `${rounds} round${rounds !== 1 ? "s" : ""}`;
  };

  // Handle advanced settings changes - these are UI-only settings not part of GameSettings
  const handleAdvancedSettingChange = (settingId: string, enabled: boolean) => {
    // These settings are UI-only and don't affect the actual game settings
    // They could be stored in local state or a separate context if needed
    console.log(`Advanced setting ${settingId} changed to ${enabled}`);
  };

  // Calculate estimated game time
  const estimatedGameTime = () => {
    const baseTimePerRound = watchedValues.timeLimit + 45; // submission + voting + results
    const totalMinutes = Math.ceil(
      (watchedValues.rounds * baseTimePerRound) / 60,
    );
    return totalMinutes;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          Game Settings
          {!isHost && (
            <Badge variant="secondary" className="ml-auto text-xs">
              Host Only
            </Badge>
          )}
        </CardTitle>

        {/* Quick summary */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />~{estimatedGameTime()} min
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {formatRounds(watchedValues.rounds)}
          </span>
          <span className="flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {watchedValues.categories?.length || 0} categories
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="categories" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  Categories
                </TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Advanced
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Preview
                </TabsTrigger>
              </TabsList>

              {/* Basic Settings Tab */}
              <TabsContent value="basic" className="space-y-6 mt-6">
                <div className="space-y-6">
                  <RoundsSelector
                    value={watchedValues.rounds}
                    onChange={(value) =>
                      setValue("rounds", value, { shouldDirty: true })
                    }
                    disabled={!isHost}
                    timeLimit={watchedValues.timeLimit}
                    playerCount={Object.keys(lobbyData.players).length}
                  />

                  <Separator />

                  <TimeLimitSelector
                    value={watchedValues.timeLimit}
                    onChange={(value) =>
                      setValue("timeLimit", value, { shouldDirty: true })
                    }
                    disabled={!isHost}
                  />
                </div>
              </TabsContent>

              {/* Categories Tab */}
              <TabsContent value="categories" className="space-y-6 mt-6">
                <CategorySelector
                  selectedCategories={watchedValues.categories || []}
                  onCategoriesChange={(categories) =>
                    setValue("categories", categories, { shouldDirty: true })
                  }
                  disabled={!isHost}
                  maxSelections={10}
                  minSelections={1}
                />
              </TabsContent>

              {/* Advanced Settings Tab */}
              <TabsContent value="advanced" className="space-y-6 mt-6">
                <AdvancedSettings
                  settings={{
                    enableAI: false,
                    allowSpectators: true,
                    enableChat: true,
                    soundEffects: true,
                    contentFilter: true,
                  }}
                  onSettingChange={handleAdvancedSettingChange}
                  disabled={!isHost}
                />
              </TabsContent>

              {/* Preview Tab */}
              <TabsContent value="preview" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Game Configuration Summary
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="h-4 w-4" />
                          Game Duration
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Rounds:
                            </span>
                            <span className="font-medium">
                              {formatRounds(watchedValues.rounds)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Time per round:
                            </span>
                            <span className="font-medium">
                              {formatTime(watchedValues.timeLimit)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Estimated total:
                            </span>
                            <span className="font-medium">
                              ~{estimatedGameTime()} minutes
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Tag className="h-4 w-4" />
                          Content
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Categories:
                            </span>
                            <span className="font-medium">
                              {watchedValues.categories?.length || 0}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {watchedValues.categories
                              ?.slice(0, 3)
                              .map((cat) => (
                                <Badge
                                  key={cat}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {cat}
                                </Badge>
                              ))}
                            {(watchedValues.categories?.length || 0) > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{(watchedValues.categories?.length || 0) - 3}{" "}
                                more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Settings that will be active */}
                  <Card className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Zap className="h-4 w-4" />
                        Active Features
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Chat Enabled
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Spectators (Coming Soon)
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Content Filter (Coming Soon)
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Sound Effects (Coming Soon)
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            {isHost && (
              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="submit"
                  disabled={!isDirty || !isValid || isUpdating}
                  className="min-w-[120px]"
                >
                  {isUpdating ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                    />
                  ) : (
                    "Update Settings"
                  )}
                </Button>
              </div>
            )}
          </form>
        </Form>

        {/* Read-only view for non-hosts */}
        {!isHost && (
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground text-center">
              Only the host can modify game settings
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
