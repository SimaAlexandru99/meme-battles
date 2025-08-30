"use client";

import { motion } from "framer-motion";
import { Crown, Gamepad2, Medal, Settings, Trophy, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBattleRoyaleStats } from "@/hooks/use-battle-royale-stats";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useCurrentUser();

  // Battle Royale Statistics
  const {
    stats,
    rank,
    percentile,
    nextRankProgress,
    recentPerformance,
    isLoading: statsLoading,
  } = useBattleRoyaleStats();

  const handleBackToMain = () => {
    router.push("/");
  };

  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleBackToMain}
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              ← Back to Home
            </Button>
            <h1 className="text-2xl font-bangers text-white tracking-wide">
              Player Profile
            </h1>
            <div className="w-24" /> {/* Spacer */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="w-24 h-24 border-4 border-purple-500/50">
                  <AvatarImage src={user.avatarId} alt={user.name} />
                  <AvatarFallback className="text-2xl font-bangers bg-purple-600">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-3xl font-bangers text-white tracking-wide mb-2">
                    {user.name}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mb-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-white border-current",
                        rank === "Bronze" &&
                          "text-orange-400 border-orange-400",
                        rank === "Silver" && "text-slate-400 border-slate-400",
                        rank === "Gold" && "text-yellow-400 border-yellow-400",
                        rank === "Platinum" &&
                          "text-slate-300 border-slate-300",
                        rank === "Diamond" && "text-blue-400 border-blue-400",
                        rank === "Master" && "text-red-400 border-red-400",
                      )}
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      {rank}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-purple-300 border-purple-300"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Level {user.xp || 1}
                    </Badge>
                  </div>

                  {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bangers text-purple-300">
                          {stats.skillRating}
                        </div>
                        <div className="text-xs text-slate-400">
                          Skill Rating
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bangers text-green-400">
                          {stats.gamesPlayed}
                        </div>
                        <div className="text-xs text-slate-400">
                          Games Played
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bangers text-orange-400">
                          {stats.winRate
                            ? `${(stats.winRate * 100).toFixed(1)}%`
                            : "0%"}
                        </div>
                        <div className="text-xs text-slate-400">Win Rate</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bangers text-blue-400">
                          #{percentile}
                        </div>
                        <div className="text-xs text-slate-400">Percentile</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Tabs */}
        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700/50">
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Statistics
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Medal className="w-4 h-4 mr-2" />
              Achievements
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6">
            {statsLoading ? (
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-8 text-center">
                  <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Loading statistics...</p>
                </CardContent>
              </Card>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Battle Royale Stats */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Gamepad2 className="w-5 h-5 text-purple-400" />
                      Battle Royale
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                        <div className="text-xl font-bangers text-green-400">
                          {stats.wins}
                        </div>
                        <div className="text-xs text-slate-400">Wins</div>
                      </div>
                      <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                        <div className="text-xl font-bangers text-red-400">
                          {stats.losses}
                        </div>
                        <div className="text-xs text-slate-400">Losses</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">Current Streak</span>
                        <span
                          className={cn(
                            "font-medium",
                            stats.currentStreak > 0
                              ? "text-green-400"
                              : "text-red-400",
                          )}
                        >
                          {stats.currentStreak > 0
                            ? `+${stats.currentStreak}`
                            : stats.currentStreak}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">Best Streak</span>
                        <span className="text-purple-300 font-medium">
                          {stats.longestWinStreak}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">Avg Position</span>
                        <span className="text-blue-300 font-medium">
                          {stats.averagePosition?.toFixed(1) || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">Total XP Earned</span>
                        <span className="text-yellow-400 font-medium">
                          {stats.totalXpEarned || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Rank Progress */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      Rank Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bangers text-white mb-2">
                        {rank}
                      </div>
                      <div className="text-sm text-slate-400 mb-4">
                        {percentile}th percentile
                      </div>
                    </div>

                    {rank !== "Master" && nextRankProgress > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-300">
                          <span>Progress to Next Rank</span>
                          <span>{nextRankProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={nextRankProgress} className="h-2" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">Performance</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            recentPerformance === "improving" &&
                              "text-green-400 border-green-400",
                            recentPerformance === "declining" &&
                              "text-red-400 border-red-400",
                            recentPerformance === "stable" &&
                              "text-blue-400 border-blue-400",
                          )}
                        >
                          {recentPerformance === "improving" && "↑ Improving"}
                          {recentPerformance === "declining" && "↓ Declining"}
                          {recentPerformance === "stable" && "→ Stable"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-8 text-center">
                  <Trophy className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bangers text-white mb-2">
                    No Statistics Yet
                  </h3>
                  <p className="text-slate-400 mb-4">
                    Complete your first Battle Royale match to see your
                    statistics!
                  </p>
                  <Button
                    onClick={() => router.push("/battle-royale")}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    Enter Battle Royale
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Medal className="w-5 h-5 text-yellow-400" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Medal className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bangers text-white mb-2">
                    Coming Soon
                  </h3>
                  <p className="text-slate-400">
                    Achievement system is under development!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="w-5 h-5 text-purple-400" />
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Settings className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bangers text-white mb-2">
                    Settings Panel
                  </h3>
                  <p className="text-slate-400">
                    Account settings will be available soon!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
