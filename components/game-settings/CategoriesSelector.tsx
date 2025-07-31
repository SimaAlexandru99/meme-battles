"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FieldError } from "./FormErrorDisplay";

interface CategoryOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

interface CategoriesSelectorProps {
  value: string[];
  onChange: (categories: string[]) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: "funny",
    label: "Funny",
    description: "Classic humor and jokes",
    icon: "😂",
  },
  {
    id: "wholesome",
    label: "Wholesome",
    description: "Positive and heartwarming content",
    icon: "🥰",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Edgy and dark humor",
    icon: "🌚",
  },
  {
    id: "random",
    label: "Random",
    description: "Mixed content from all categories",
    icon: "🎲",
  },
  {
    id: "trending",
    label: "Trending",
    description: "Popular and viral memes",
    icon: "🔥",
  },
];

export function CategoriesSelector({
  value,
  onChange,
  disabled = false,
  error,
  className,
}: CategoriesSelectorProps) {
  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    if (checked) {
      // Add category if not already present
      if (!value.includes(categoryId)) {
        onChange([...value, categoryId]);
      }
    } else {
      // Remove category, but ensure at least one remains
      const newCategories = value.filter((id) => id !== categoryId);
      if (newCategories.length > 0) {
        onChange(newCategories);
      }
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Label className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
        Meme Categories
      </Label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CATEGORY_OPTIONS.map((category) => {
          const isSelected = value.includes(category.id);
          const isOnlySelected = isSelected && value.length === 1;

          return (
            <div
              key={category.id}
              className={cn(
                "relative flex items-start space-x-3 p-4 rounded-lg border transition-all duration-200",
                "hover:shadow-md cursor-pointer",
                isSelected
                  ? "bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-500/20"
                  : "bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50",
                disabled && "opacity-50 cursor-not-allowed",
                error && "border-red-500/50"
              )}
              onClick={() => {
                if (!disabled && !isOnlySelected) {
                  handleCategoryToggle(category.id, !isSelected);
                }
              }}
            >
              <Checkbox
                id={category.id}
                checked={isSelected}
                onCheckedChange={(checked) => {
                  if (!disabled && !isOnlySelected) {
                    handleCategoryToggle(category.id, checked as boolean);
                  }
                }}
                disabled={disabled || isOnlySelected}
                className={cn(
                  "mt-0.5 border-slate-500/50 data-[state=checked]:bg-purple-600",
                  "data-[state=checked]:border-purple-600 focus-visible:ring-purple-500/50"
                )}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-lg"
                    role="img"
                    aria-label={category.label}
                  >
                    {category.icon}
                  </span>
                  <Label
                    htmlFor={category.id}
                    className={cn(
                      "font-bangers tracking-wide cursor-pointer",
                      isSelected ? "text-white" : "text-purple-200/90",
                      disabled && "cursor-not-allowed"
                    )}
                  >
                    {category.label}
                  </Label>
                </div>
                <p
                  className={cn(
                    "text-sm font-bangers tracking-wide",
                    isSelected ? "text-purple-200/80" : "text-slate-400"
                  )}
                >
                  {category.description}
                </p>
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-slate-400 font-bangers tracking-wide">
        Select at least one category. You have {value.length} selected.
      </div>

      <FieldError error={error} />
    </div>
  );
}
