"use client";

import { useState, useCallback, useEffect } from "react";

interface UseMemeCardSelectionOptions {
  cards: MemeCard[];
  onSelectionChange?: (selectedCard: MemeCard | null) => void;
  disabled?: boolean;
}

interface UseMemeCardSelectionReturn {
  selectedCard: MemeCard | null;
  selectCard: (card: MemeCard) => void;
  clearSelection: () => void;
  isCardSelected: (card: MemeCard) => boolean;
  hasSelection: boolean;
}

/**
 * Hook for managing meme card selection state
 * Provides functionality for selecting/deselecting cards with validation
 */
export function useMemeCardSelection({
  cards,
  onSelectionChange,
  disabled = false,
}: UseMemeCardSelectionOptions): UseMemeCardSelectionReturn {
  const [selectedCard, setSelectedCard] = useState<MemeCard | null>(null);

  const selectCard = useCallback(
    (card: MemeCard) => {
      if (disabled) return;

      // Validate that the card exists in the current hand
      const cardExists = cards.some((c) => c.id === card.id);
      if (!cardExists) {
        console.warn(
          "Attempted to select a card that is not in the current hand:",
          card.id,
        );
        return;
      }

      // Toggle selection - if same card is clicked, deselect it
      const newSelection = selectedCard?.id === card.id ? null : card;
      setSelectedCard(newSelection);
      onSelectionChange?.(newSelection);
    },
    [cards, disabled, selectedCard, onSelectionChange],
  );

  const clearSelection = useCallback(() => {
    setSelectedCard(null);
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  const isCardSelected = useCallback(
    (card: MemeCard) => {
      return selectedCard?.id === card.id;
    },
    [selectedCard],
  );

  // Clear selection if the selected card is no longer in the hand
  useEffect(() => {
    if (selectedCard) {
      const cardStillExists = cards.some((c) => c.id === selectedCard.id);
      if (!cardStillExists) {
        setSelectedCard(null);
        onSelectionChange?.(null);
      }
    }
  }, [cards, selectedCard, onSelectionChange]);

  // Clear selection when disabled
  useEffect(() => {
    if (disabled && selectedCard) {
      setSelectedCard(null);
      onSelectionChange?.(null);
    }
  }, [disabled, selectedCard, onSelectionChange]);

  return {
    selectedCard,
    selectCard,
    clearSelection,
    isCardSelected,
    hasSelection: selectedCard !== null,
  };
}
