"use client";

import { useState, useEffect, useCallback } from "react";
import { MemeCardHand, HandLayout } from "@/components/meme-card-hand";
import { CardTheme } from "@/components/meme-card";
import { useMemeCardSelection } from "@/hooks/useMemeCardSelection";
import { getRandomMemeCards } from "@/lib/utils/meme-card-pool";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

/**
 * Demo component to showcase the meme card system
 * This demonstrates all the functionality implemented in task 2
 */
export function MemeCardDemo() {
  const [cards, setCards] = useState<MemeCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<CardTheme>("hearthstone");
  const [currentLayout, setCurrentLayout] =
    useState<HandLayout>("professional");
  const [showRarity, setShowRarity] = useState(true);
  const [cardCount, setCardCount] = useState(7);

  const handleSelectionChange = useCallback((card: MemeCard | null) => {
    console.log("Selected card:", card);
  }, []);

  const { selectedCard, selectCard, clearSelection, hasSelection } =
    useMemeCardSelection({
      cards,
      onSelectionChange: handleSelectionChange,
    });

  const dealNewHand = useCallback(
    async (count: number = cardCount) => {
      setIsLoading(true);
      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        const newCards = getRandomMemeCards(count);
        setCards(newCards);
        clearSelection();
      } catch (error) {
        console.error("Failed to deal new hand:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [clearSelection, cardCount]
  );

  // Deal initial hand
  useEffect(() => {
    dealNewHand();
  }, [dealNewHand]);

  // Update cards when count changes
  useEffect(() => {
    if (cards.length > 0 && cards.length !== cardCount) {
      dealNewHand(cardCount);
    }
  }, [cardCount, dealNewHand, cards.length]);

  // Theme configurations for the demo
  const themeDescriptions = {
    classic: "Clean and modern design with subtle gradients",
    hearthstone: "Warm, medieval-style cards with ornate borders",
    magic: "Mystical purple and blue tones with arcane aesthetics",
    pokemon: "Bright, colorful cards with playful design elements",
    yugioh: "Sleek, monochromatic design with dramatic effects",
    poker: "Traditional playing card style with clean lines",
  };

  const layoutDescriptions = {
    professional: "MTG Arena inspired - clean, organized, highly visible cards",
    classic: "Traditional card game layout with elegant green felt styling",
    spread: "Dramatic fan arrangement with perfect arc geometry",
    grid: "Organized grid layout for easy browsing and selection",
    vertical: "Mobile-optimized vertical stack layout",
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎴 Professional Meme Card System
            <Badge variant="secondary">v3.0</Badge>
          </CardTitle>
          <p className="text-muted-foreground">
            Professional card game interface inspired by MTG Arena and
            Hearthstone with crystal-clear visibility and smooth interactions
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Theme and Layout Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Theme Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">🎨 Card Theme</Label>
              <Select
                value={currentTheme}
                onValueChange={(value: CardTheme) => setCurrentTheme(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(themeDescriptions).map(
                    ([theme, description]) => (
                      <SelectItem key={theme} value={theme}>
                        <div className="flex flex-col items-start">
                          <span className="capitalize font-medium">
                            {theme}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {description}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Layout Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">📐 Hand Layout</Label>
              <Select
                value={currentLayout}
                onValueChange={(value: HandLayout) => setCurrentLayout(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(layoutDescriptions).map(
                    ([layout, description]) => (
                      <SelectItem key={layout} value={layout}>
                        <div className="flex flex-col items-start">
                          <span className="capitalize font-medium">
                            {layout}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {description}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Additional Controls */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">⚙️ Options</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rarity-toggle" className="text-sm">
                    Show Rarity
                  </Label>
                  <Switch
                    id="rarity-toggle"
                    checked={showRarity}
                    onCheckedChange={setShowRarity}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Card Count: {cardCount}</Label>
                  <Select
                    value={cardCount.toString()}
                    onValueChange={(value) => setCardCount(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 cards</SelectItem>
                      <SelectItem value="7">7 cards</SelectItem>
                      <SelectItem value="10">10 cards</SelectItem>
                      <SelectItem value="12">12 cards</SelectItem>
                      <SelectItem value="15">15 cards</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={() => dealNewHand()}
              disabled={isLoading}
              variant="default"
              size="lg"
            >
              {isLoading ? "🎯 Dealing..." : "🎯 Deal New Hand"}
            </Button>

            {hasSelection && (
              <Button onClick={clearSelection} variant="outline" size="lg">
                ✨ Clear Selection
              </Button>
            )}

            <Badge variant="outline" className="px-3 py-1">
              {currentTheme} theme • {currentLayout} layout
            </Badge>
          </div>

          {/* Selection Status */}
          {selectedCard && (
            <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🃏</span>
                <span className="font-semibold">Selected Card</span>
              </div>
              <p className="text-sm">
                <span className="font-medium text-primary">
                  {selectedCard.alt}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Filename: {selectedCard.filename}
              </p>
            </div>
          )}

          {/* Meme Card Hand Display */}
          <div className="border rounded-xl p-6 bg-gradient-to-br from-background to-muted/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                🎴 Your Hand
                <Badge variant="secondary">{cards.length} cards</Badge>
              </h3>
              <Badge variant="outline" className="capitalize">
                {currentLayout} layout
              </Badge>
            </div>
            <MemeCardHand
              cards={cards}
              selectedCard={selectedCard}
              onCardSelect={selectCard}
              onCardClear={clearSelection}
              disabled={isLoading}
              layout={currentLayout}
              theme={currentTheme}
              showRarity={showRarity}
            />
          </div>

          {/* Enhanced Features Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
            <div className="space-y-3">
              <h4 className="font-semibold text-base flex items-center gap-2">
                🚀 Enhanced Features
              </h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span>🚀</span> Professional card game interface
                </li>
                <li className="flex items-start gap-2">
                  <span>🎯</span> 5 distinct hand layouts
                </li>
                <li className="flex items-start gap-2">
                  <span>💎</span> Dynamic rarity system with effects
                </li>
                <li className="flex items-start gap-2">
                  <span>🎮</span> Inspired by MTG Arena & Hearthstone
                </li>
                <li className="flex items-start gap-2">
                  <span>📱</span> Mobile-first responsive design
                </li>
                <li className="flex items-start gap-2">
                  <span>⚡</span> GPU-accelerated animations
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-base flex items-center gap-2">
                🎨 Available Themes
              </h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span>🏛️</span> Classic - Clean & modern
                </li>
                <li className="flex items-start gap-2">
                  <span>🔥</span> Hearthstone - Medieval warmth
                </li>
                <li className="flex items-start gap-2">
                  <span>🌟</span> Magic - Mystical arcane
                </li>
                <li className="flex items-start gap-2">
                  <span>⚡</span> Pokémon - Bright & playful
                </li>
                <li className="flex items-start gap-2">
                  <span>⚔️</span> Yu-Gi-Oh - Dramatic effects
                </li>
                <li className="flex items-start gap-2">
                  <span>🃏</span> Poker - Traditional style
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-base flex items-center gap-2">
                📐 Layout Options
              </h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span>💼</span> Professional - MTG Arena style
                </li>
                <li className="flex items-start gap-2">
                  <span>🎲</span> Classic - Traditional card table
                </li>
                <li className="flex items-start gap-2">
                  <span>🌪️</span> Spread - Dramatic fan display
                </li>
                <li className="flex items-start gap-2">
                  <span>📱</span> Grid - Organized browsing
                </li>
                <li className="flex items-start gap-2">
                  <span>📱</span> Vertical - Mobile optimized
                </li>
              </ul>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-6">
            <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
              🎮 How to Interact
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• Click any card to select it</li>
                <li>• Use Tab key for keyboard navigation</li>
                <li>• Press Enter or Space to select</li>
                <li>• Try different themes and layouts</li>
              </ul>
              <ul className="space-y-1">
                <li>• Adjust card count for different experiences</li>
                <li>• Toggle rarity system on/off</li>
                <li>• Mobile-friendly touch interactions</li>
                <li>• Smooth animations and hover effects</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
