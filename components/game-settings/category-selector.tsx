"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface MemeCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  count: number;
  preview: string[];
}

const MEME_CATEGORIES: MemeCategory[] = [
  {
    id: "classic",
    name: "Classic Memes",
    description: "Timeless internet classics that never get old",
    icon: "🔥",
    count: 120,
    preview: ["Drake Pointing", "Distracted Boyfriend", "Woman Yelling at Cat"],
  },
  {
    id: "reaction",
    name: "Reaction Faces",
    description: "Perfect for expressing emotions and reactions",
    icon: "😂",
    count: 95,
    preview: ["Surprised Pikachu", "This is Fine", "Crying Jordan"],
  },
  {
    id: "animals",
    name: "Animals",
    description: "Cute, funny, and relatable animal memes",
    icon: "🐱",
    count: 80,
    preview: ["Grumpy Cat", "Doge", "Success Kid"],
  },
  {
    id: "pop-culture",
    name: "Pop Culture",
    description: "References to movies, TV shows, and celebrities",
    icon: "🎬",
    count: 75,
    preview: ["Marvel Memes", "Game of Thrones", "Office Memes"],
  },
  {
    id: "gaming",
    name: "Gaming",
    description: "Memes about video games and gaming culture",
    icon: "🎮",
    count: 65,
    preview: ["Minecraft", "Among Us", "Gamer Rage"],
  },
  {
    id: "sports",
    name: "Sports",
    description: "Athletic achievements and sports fails",
    icon: "⚽",
    count: 45,
    preview: ["Victory Dance", "Epic Fail", "Team Spirit"],
  },
  {
    id: "food",
    name: "Food & Drinks",
    description: "Delicious and relatable food content",
    icon: "🍕",
    count: 55,
    preview: ["Pizza Time", "Coffee Addiction", "Cooking Fails"],
  },
  {
    id: "technology",
    name: "Technology",
    description: "Tech humor and programming jokes",
    icon: "💻",
    count: 40,
    preview: ["Coding Bugs", "Tech Support", "AI Humor"],
  },
  {
    id: "movies",
    name: "Movies & TV",
    description: "Scenes and quotes from popular entertainment",
    icon: "🎭",
    count: 70,
    preview: ["Movie Quotes", "TV Show Moments", "Character Reactions"],
  },
  {
    id: "music",
    name: "Music",
    description: "Musical memes and artist references",
    icon: "🎵",
    count: 35,
    preview: ["Song Lyrics", "Music Videos", "Artist Memes"],
  },
];

interface CategorySelectorProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  maxSelections?: number;
  minSelections?: number;
  disabled?: boolean;
}

export function CategorySelector({
  selectedCategories,
  onCategoriesChange,
  maxSelections = 10,
  minSelections = 1,
  disabled = false,
}: CategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showPreview, setShowPreview] = useState<string | null>(null);

  const filteredCategories = MEME_CATEGORIES.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCategoryToggle = (categoryId: string) => {
    if (disabled) return;

    const isSelected = selectedCategories.includes(categoryId);

    if (isSelected) {
      // Don't allow deselecting if we're at minimum
      if (selectedCategories.length <= minSelections) return;
      onCategoriesChange(selectedCategories.filter((id) => id !== categoryId));
    } else {
      // Don't allow selecting if we're at maximum
      if (selectedCategories.length >= maxSelections) return;
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    const allIds = filteredCategories
      .slice(0, maxSelections)
      .map((cat) => cat.id);
    onCategoriesChange(allIds);
  };

  const clearAll = () => {
    if (disabled) return;
    onCategoriesChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            disabled={disabled}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={disabled || filteredCategories.length === 0}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={disabled || selectedCategories.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Selection summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {selectedCategories.length} of {maxSelections} categories selected
        </span>
        {selectedCategories.length < minSelections && (
          <span className="text-destructive">
            Select at least {minSelections} categor
            {minSelections === 1 ? "y" : "ies"}
          </span>
        )}
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence>
          {filteredCategories.map((category) => {
            const isSelected = selectedCategories.includes(category.id);
            const canSelect =
              selectedCategories.length < maxSelections || isSelected;
            const canDeselect =
              selectedCategories.length > minSelections || !isSelected;
            const isInteractive =
              !disabled && (canSelect || (isSelected && canDeselect));

            return (
              <motion.div
                key={category.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  } ${!isInteractive ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() =>
                    isInteractive && handleCategoryToggle(category.id)
                  }
                  onMouseEnter={() => setShowPreview(category.id)}
                  onMouseLeave={() => setShowPreview(null)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <Checkbox
                          checked={isSelected}
                          disabled={!isInteractive}
                          className="mt-1"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{category.icon}</span>
                          <h3 className="font-medium text-sm truncate">
                            {category.name}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="text-xs ml-auto"
                          >
                            {category.count}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {category.description}
                        </p>

                        {/* Preview on hover */}
                        <AnimatePresence>
                          {showPreview === category.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-2 pt-2 border-t"
                            >
                              <div className="text-xs text-muted-foreground mb-1">
                                Examples:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {category.preview.map((example, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {example}
                                  </Badge>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex-shrink-0"
                        >
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* No results message */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No categories found matching &quot;{searchQuery}&quot;</p>
        </div>
      )}
    </div>
  );
}
