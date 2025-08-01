"use client";

import { useState, useEffect, useCallback } from "react";
import { MemeCardHand } from "@/components/meme-card-hand";
import { useMemeCardSelection } from "@/hooks/useMemeCardSelection";
import { getRandomMemeCards } from "@/lib/utils/meme-card-pool";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Demo component to showcase the meme card system
 * This demonstrates all the functionality implemented in task 2
 */
export function MemeCardDemo() {
  const [cards, setCards] = useState<MemeCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectionChange = useCallback((card: MemeCard | null) => {
    console.log("Selected card:", card);
  }, []);

  const { selectedCard, selectCard, clearSelection, hasSelection } =
    useMemeCardSelection({
      cards,
      onSelectionChange: handleSelectionChange,
    });

  const dealNewHand = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newCards = getRandomMemeCards(7);
      setCards(newCards);
      clearSelection();
    } catch (error) {
      console.error("Failed to deal new hand:", error);
    } finally {
      setIsLoading(false);
    }
  }, [clearSelection]);

  // Deal initial hand
  useEffect(() => {
    dealNewHand();
  }, [dealNewHand]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meme Card System Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex items-center gap-4">
            <Button
              onClick={dealNewHand}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? "Dealing..." : "Deal New Hand"}
            </Button>

            {hasSelection && (
              <Button onClick={clearSelection} variant="outline">
                Clear Selection
              </Button>
            )}
          </div>

          {/* Selection Status */}
          {selectedCard && (
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">
                Selected:{" "}
                <span className="text-primary">{selectedCard.alt}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Filename: {selectedCard.filename}
              </p>
            </div>
          )}

          {/* Meme Card Hand */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Your Hand</h3>
            <MemeCardHand
              cards={cards}
              selectedCard={selectedCard}
              onCardSelect={selectCard}
              disabled={isLoading}
            />
          </div>

          {/* Features Demonstrated */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">✅ Features Implemented:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• MemeCard component with lazy loading</li>
                <li>• Error handling and retry mechanism</li>
                <li>• Responsive grid/horizontal scroll layout</li>
                <li>• Card selection with visual feedback</li>
                <li>• Keyboard navigation support</li>
                <li>• Accessibility (ARIA labels, screen reader)</li>
                <li>• Duplicate prevention in card pool</li>
                <li>• Comprehensive test coverage</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">🎮 How to Use:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Click any card to select it</li>
                <li>• Use Tab to navigate with keyboard</li>
                <li>• Press Enter/Space to select</li>
                <li>• Click &quot;Deal New Hand&quot; for new cards</li>
                <li>• Responsive design works on mobile</li>
                <li>• Images load lazily for performance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
