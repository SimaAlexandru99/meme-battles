"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  ExternalLink,
  Flame,
  Gamepad2,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Sample news data
const newsItems = [
  {
    id: 1,
    title: "Battle Royale Mode is Live!",
    excerpt:
      "Experience the ultimate meme competition with our new skill-based matchmaking system. Compete against players of similar skill levels for epic victories!",
    content:
      "The highly anticipated Battle Royale mode has arrived! Players can now join matchmaking queues with customizable preferences, compete in skill-balanced matches, and climb the competitive ladder with our comprehensive ranking system.",
    date: "2024-01-15",
    category: "Feature",
    icon: Trophy,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    featured: true,
  },
  {
    id: 2,
    title: "New Meme Categories Added",
    excerpt:
      "We've expanded our meme library with 200+ new templates across gaming, pop culture, and wholesome categories.",
    content:
      "Fresh content is always crucial for meme battles! We've added new categories including gaming memes, pop culture references, and wholesome content to keep the competition fresh and exciting.",
    date: "2024-01-10",
    category: "Content",
    icon: Gamepad2,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    featured: false,
  },
  {
    id: 3,
    title: "Player Statistics & Rankings",
    excerpt:
      "Track your performance with detailed statistics, win rates, and competitive rankings in the new profile system.",
    content:
      "Players can now view comprehensive statistics including win rates, skill ratings, average positions, and competitive rankings. The new profile page provides insights into your gaming performance and progress.",
    date: "2024-01-08",
    category: "Feature",
    icon: Users,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    featured: false,
  },
  {
    id: 4,
    title: "Performance Improvements",
    excerpt:
      "Faster matchmaking, reduced latency, and improved real-time synchronization for better gameplay experience.",
    content:
      "We've optimized our matchmaking algorithms and improved Firebase performance to reduce queue times and provide smoother real-time updates during games.",
    date: "2024-01-05",
    category: "Technical",
    icon: Zap,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    featured: false,
  },
  {
    id: 5,
    title: "Community Tournament Season",
    excerpt:
      "Join our first community tournament with prizes and special rewards for top performers.",
    content:
      "We're excited to announce our first community tournament! Compete in special events, climb the tournament leaderboard, and earn exclusive rewards and recognition.",
    date: "2024-01-01",
    category: "Event",
    icon: Flame,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    featured: false,
  },
];

export default function NewsPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  const handleBackToMain = () => {
    router.push("/");
  };

  const featuredNews = newsItems.filter((item) => item.featured);
  const regularNews = newsItems.filter((item) => !item.featured);

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
            <h1 className="text-3xl font-bangers text-white tracking-wider">
              Latest News
            </h1>
            <div className="w-24" /> {/* Spacer */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          {["all", "feature", "content", "technical", "event"].map(
            (category) => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category)}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                className={cn(
                  "capitalize",
                  selectedCategory === category
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "border-slate-600 text-slate-300 hover:bg-slate-700/50",
                )}
              >
                {category === "all" ? "All News" : `${category} Updates`}
              </Button>
            ),
          )}
        </motion.div>

        {/* Featured News */}
        {featuredNews.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bangers text-white tracking-wide mb-6 flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-400" />
              Featured Updates
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {featuredNews.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "bg-gradient-to-br from-slate-800/90 to-slate-700/90",
                    "border-slate-600/50 shadow-xl hover:shadow-2xl",
                    "transition-all duration-300 hover:scale-[1.02]",
                    item.borderColor,
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <Badge
                        className={cn(
                          "text-white border-current",
                          item.bgColor,
                          item.borderColor,
                        )}
                      >
                        <item.icon className="w-3 h-3 mr-1" />
                        {item.category}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>

                    <CardTitle className="text-xl font-bangers text-white tracking-wide leading-tight">
                      {item.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                      {item.excerpt}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                      >
                        Read More
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>
        )}

        {/* Regular News */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bangers text-white tracking-wide mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-400" />
            Recent Updates
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularNews.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card
                  className={cn(
                    "bg-gradient-to-br from-slate-800/70 to-slate-700/70",
                    "border-slate-600/40 shadow-lg hover:shadow-xl",
                    "transition-all duration-300 hover:scale-[1.01] h-full",
                    item.borderColor,
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          item.color,
                          `border-current ${item.bgColor}`,
                        )}
                      >
                        <item.icon className="w-3 h-3 mr-1" />
                        {item.category}
                      </Badge>
                      <div className="text-xs text-slate-500">
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>

                    <CardTitle className="text-lg font-bangers text-white tracking-wide leading-tight">
                      {item.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <p className="text-slate-400 text-sm mb-4 leading-relaxed line-clamp-3">
                      {item.excerpt}
                    </p>

                    <Separator className="my-3 bg-slate-600/50" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 p-0 h-auto"
                      >
                        Read More →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Newsletter Signup */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bangers text-white tracking-wide mb-4">
                Stay Updated!
              </h3>
              <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
                Be the first to know about new features, tournaments, and
                updates. Join our community to stay connected with the latest
                Meme Battles developments.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => router.push("/")}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Start Playing Now
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                  onClick={() =>
                    window.open("https://discord.gg/t3GZmuQndv", "_blank")
                  }
                >
                  Join Discord Community
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
}
