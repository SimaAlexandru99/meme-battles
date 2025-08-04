import { render, screen, fireEvent } from "@testing-library/react";
import { MemeCard } from "@/components/meme-card";
import { MemeCardHand } from "@/components/meme-card-hand";
import { useMemeCardSelection } from "@/hooks/useMemeCardSelection";
import {
  getAllMemeCards,
  getRandomMemeCards,
  MemeCardPool,
  validateMemeCard,
  getMemeCardById,
} from "@/lib/utils/meme-card-pool";

// Mock Next.js Image component
jest.mock("next/image", () => {
  return function MockImage({
    src,
    alt,
    onLoad,
    onError,
    ...props
  }: {
    src: string;
    alt: string;
    onLoad?: () => void;
    onError?: () => void;
    [key: string]: unknown;
  }) {
    return (
      <img src={src} alt={alt} onLoad={onLoad} onError={onError} {...props} />
    );
  };
});

// Test component for useMemeCardSelection hook
function TestMemeCardSelection({
  cards,
  onSelectionChange,
  disabled,
}: {
  cards: MemeCard[];
  onSelectionChange?: (card: MemeCard | null) => void;
  disabled?: boolean;
}) {
  const { selectedCard, selectCard, clearSelection, hasSelection } =
    useMemeCardSelection({
      cards,
      onSelectionChange,
      disabled,
    });

  return (
    <div>
      <div data-testid="selected-card">
        {selectedCard ? selectedCard.id : "none"}
      </div>
      <div data-testid="has-selection">{hasSelection ? "true" : "false"}</div>
      <button onClick={() => selectCard(cards[0])} data-testid="select-first">
        Select First
      </button>
      <button onClick={clearSelection} data-testid="clear-selection">
        Clear
      </button>
    </div>
  );
}

describe("Meme Card Pool Management", () => {
  test("getAllMemeCards returns all available cards", () => {
    const cards = getAllMemeCards();
    expect(cards.length).toBeGreaterThan(100); // Should have 119 cards in our test set
    expect(cards[0]).toHaveProperty("id");
    expect(cards[0]).toHaveProperty("filename");
    expect(cards[0]).toHaveProperty("url");
    expect(cards[0]).toHaveProperty("alt");
  });

  test("getRandomMemeCards returns unique cards", () => {
    const cards = getRandomMemeCards(7);
    expect(cards).toHaveLength(7);

    // Check uniqueness
    const ids = cards.map((card) => card.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(7);
  });

  test("getRandomMemeCards excludes specified cards", () => {
    const allCards = getAllMemeCards();
    const excludeIds = [allCards[0].id, allCards[1].id];
    const cards = getRandomMemeCards(5, excludeIds);

    expect(cards).toHaveLength(5);
    cards.forEach((card) => {
      expect(excludeIds).not.toContain(card.id);
    });
  });

  test("validateMemeCard works correctly", () => {
    expect(validateMemeCard("Abraham.jpg")).toBe(true);
    expect(validateMemeCard("nonexistent.jpg")).toBe(false);
  });

  test("getMemeCardById returns correct card", () => {
    const allCards = getAllMemeCards();
    const firstCard = allCards[0];
    const foundCard = getMemeCardById(firstCard.id);

    expect(foundCard).toEqual(firstCard);
    expect(getMemeCardById("nonexistent")).toBeNull();
  });
});

describe("MemeCardPool class", () => {
  let pool: MemeCardPool;

  beforeEach(() => {
    pool = new MemeCardPool();
  });

  test("distributeCards works for multiple players", () => {
    const distribution = pool.distributeCards(3, 7);

    expect(distribution.size).toBe(3);
    expect(pool.getUsedCardCount()).toBe(21);

    // Check each player has 7 unique cards
    for (let i = 0; i < 3; i++) {
      const playerCards = distribution.get(i);
      expect(playerCards).toHaveLength(7);

      // Check uniqueness within player hand
      const ids = playerCards!.map((card) => card.id);
      expect(new Set(ids).size).toBe(7);
    }

    // Check no duplicates across all players
    const allDistributedIds = new Set<string>();
    distribution.forEach((cards) => {
      cards.forEach((card) => {
        expect(allDistributedIds.has(card.id)).toBe(false);
        allDistributedIds.add(card.id);
      });
    });
  });

  test("getPlayerCards respects used cards", () => {
    const firstPlayerCards = pool.getPlayerCards(7);
    const secondPlayerCards = pool.getPlayerCards(7);

    // Should have different cards
    const firstIds = new Set(firstPlayerCards.map((c) => c.id));
    const secondIds = new Set(secondPlayerCards.map((c) => c.id));

    // Check no overlap
    const intersection = new Set(
      [...firstIds].filter((id) => secondIds.has(id)),
    );
    expect(intersection.size).toBe(0);
  });

  test("reset clears used cards", () => {
    pool.getPlayerCards(7);
    expect(pool.getUsedCardCount()).toBe(7);

    pool.reset();
    expect(pool.getUsedCardCount()).toBe(0);
  });
});

describe("MemeCard Component", () => {
  const mockCard: MemeCard = {
    id: "test-card",
    filename: "test.jpg",
    url: "/test.jpg",
    alt: "Test meme",
  };

  test("renders card correctly", () => {
    render(<MemeCard card={mockCard} />);

    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("alt", "Test meme");
  });

  test("handles selection", () => {
    const onSelect = jest.fn();
    render(<MemeCard card={mockCard} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(mockCard);
  });

  test("shows selected state", () => {
    render(<MemeCard card={mockCard} isSelected={true} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveClass("border-primary");
  });

  test("handles disabled state", () => {
    const onSelect = jest.fn();
    render(<MemeCard card={mockCard} onSelect={onSelect} disabled={true} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("tabIndex", "-1");

    fireEvent.click(button);
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("handles keyboard navigation", () => {
    const onSelect = jest.fn();
    render(<MemeCard card={mockCard} onSelect={onSelect} />);

    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(mockCard);

    fireEvent.keyDown(button, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});

describe("MemeCardHand Component", () => {
  const mockCards: MemeCard[] = [
    { id: "card1", filename: "card1.jpg", url: "/card1.jpg", alt: "Card 1" },
    { id: "card2", filename: "card2.jpg", url: "/card2.jpg", alt: "Card 2" },
    { id: "card3", filename: "card3.jpg", url: "/card3.jpg", alt: "Card 3" },
  ];

  test("renders all cards", () => {
    render(
      <MemeCardHand
        cards={mockCards}
        selectedCard={null}
        onCardSelect={jest.fn()}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(6); // 3 cards x 2 layouts (desktop + mobile)
    expect(screen.getByText("Cards in hand:")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  test("shows selected card", () => {
    render(
      <MemeCardHand
        cards={mockCards}
        selectedCard={mockCards[0]}
        onCardSelect={jest.fn()}
      />,
    );

    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  test("handles card selection", () => {
    const onCardSelect = jest.fn();
    render(
      <MemeCardHand
        cards={mockCards}
        selectedCard={null}
        onCardSelect={onCardSelect}
      />,
    );

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onCardSelect).toHaveBeenCalledWith(mockCards[0]);
  });

  test("shows empty state", () => {
    render(
      <MemeCardHand cards={[]} selectedCard={null} onCardSelect={jest.fn()} />,
    );

    expect(screen.getByText("No cards available")).toBeInTheDocument();
    expect(
      screen.getByText("Waiting for cards to be dealt..."),
    ).toBeInTheDocument();
  });
});

describe("useMemeCardSelection Hook", () => {
  const mockCards: MemeCard[] = [
    { id: "card1", filename: "card1.jpg", url: "/card1.jpg", alt: "Card 1" },
    { id: "card2", filename: "card2.jpg", url: "/card2.jpg", alt: "Card 2" },
  ];

  test("handles card selection", () => {
    const onSelectionChange = jest.fn();
    render(
      <TestMemeCardSelection
        cards={mockCards}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(screen.getByTestId("selected-card")).toHaveTextContent("none");
    expect(screen.getByTestId("has-selection")).toHaveTextContent("false");

    fireEvent.click(screen.getByTestId("select-first"));

    expect(screen.getByTestId("selected-card")).toHaveTextContent("card1");
    expect(screen.getByTestId("has-selection")).toHaveTextContent("true");
    expect(onSelectionChange).toHaveBeenCalledWith(mockCards[0]);
  });

  test("handles clear selection", () => {
    const onSelectionChange = jest.fn();
    render(
      <TestMemeCardSelection
        cards={mockCards}
        onSelectionChange={onSelectionChange}
      />,
    );

    // Select first
    fireEvent.click(screen.getByTestId("select-first"));
    expect(screen.getByTestId("selected-card")).toHaveTextContent("card1");

    // Clear selection
    fireEvent.click(screen.getByTestId("clear-selection"));
    expect(screen.getByTestId("selected-card")).toHaveTextContent("none");
    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });

  test("handles disabled state", () => {
    const onSelectionChange = jest.fn();
    render(
      <TestMemeCardSelection
        cards={mockCards}
        onSelectionChange={onSelectionChange}
        disabled={true}
      />,
    );

    fireEvent.click(screen.getByTestId("select-first"));

    expect(screen.getByTestId("selected-card")).toHaveTextContent("none");
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
