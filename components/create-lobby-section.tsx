"use client";

import * as React from "react";
import { RiAddLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreateLobbySectionProps {
  onCreateLobby: () => Promise<string>;
  isLoading: boolean;
  createdCode?: string | null;
  className?: string;
}

export function CreateLobbySection({
  onCreateLobby,
  isLoading,
  createdCode,
  className,
}: CreateLobbySectionProps) {
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreateClick = React.useCallback(async () => {
    if (!isLoading && !isCreating) {
      setIsCreating(true);
      try {
        await onCreateLobby();
      } catch (err) {
        // Error handling is managed by parent component
        console.error("Failed to create lobby:", err);
      } finally {
        setIsCreating(false);
      }
    }
  }, [onCreateLobby, isLoading, isCreating]);

  const isOperationInProgress = isLoading || isCreating;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-6 p-6 sm:p-8",
        "bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50",
        "shadow-2xl shadow-purple-500/10",
        className
      )}
    >
      {/* Two Blue Cards with Smiley Faces */}
      <div className="relative w-full max-w-sm h-32 sm:h-36">
        {/* First Card (Back) */}
        <div
          className={cn(
            "absolute top-2 left-4 w-24 h-24 sm:w-28 sm:h-28",
            "bg-gradient-to-br from-blue-400 to-blue-600",
            "rounded-2xl shadow-lg shadow-blue-500/30",
            "flex items-center justify-center",
            "transform rotate-[-8deg]",
            "transition-all duration-300",
            isOperationInProgress
              ? "animate-pulse"
              : "hover:scale-105 hover:rotate-[-12deg]"
          )}
        >
          {/* Yellow Smiley Face */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
            <div className="flex flex-col items-center gap-1">
              {/* Eyes */}
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
              </div>
              {/* Smile */}
              <div className="w-4 h-2 border-b-2 border-slate-800 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Second Card (Front) */}
        <div
          className={cn(
            "absolute top-0 right-4 w-24 h-24 sm:w-28 sm:h-28",
            "bg-gradient-to-br from-blue-500 to-blue-700",
            "rounded-2xl shadow-lg shadow-blue-500/40",
            "flex items-center justify-center",
            "transform rotate-[8deg]",
            "transition-all duration-300",
            isOperationInProgress
              ? "animate-pulse"
              : "hover:scale-105 hover:rotate-[12deg]"
          )}
        >
          {/* Yellow Smiley Face */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
            <div className="flex flex-col items-center gap-1">
              {/* Eyes */}
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
              </div>
              {/* Smile */}
              <div className="w-4 h-2 border-b-2 border-slate-800 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Green Speech Bubble with Plus Icon */}
        <div
          className={cn(
            "absolute top-[-20px] left-1/2 transform -translate-x-1/2",
            "w-12 h-12 sm:w-14 sm:h-14",
            "bg-gradient-to-br from-green-400 to-green-600",
            "rounded-full shadow-lg shadow-green-500/30",
            "flex items-center justify-center",
            "transition-all duration-300",
            isOperationInProgress
              ? "animate-bounce scale-105"
              : "hover:scale-110 hover:shadow-green-500/50"
          )}
        >
          <RiAddLine
            className={cn(
              "w-6 h-6 sm:w-7 sm:h-7 text-white",
              isOperationInProgress && "animate-spin"
            )}
          />

          {/* Speech Bubble Tail */}
          <div
            className={cn(
              "absolute top-full left-1/2 transform -translate-x-1/2",
              "w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px]",
              "border-l-transparent border-r-transparent border-t-green-500"
            )}
          />
        </div>
      </div>

      {/* Romanian Description Text */}
      <div className="text-center">
        <h3 className="text-xl sm:text-2xl font-bangers text-white tracking-wide mb-2">
          Creează un lobby privat
        </h3>
        <p className="text-purple-200/70 text-sm sm:text-base font-bangers tracking-wide">
          Creează un lobby și invită-ți prietenii
        </p>
      </div>

      {/* Created Code Display */}
      {createdCode && (
        <div
          className={cn(
            "w-full max-w-md p-4 rounded-lg",
            "bg-green-500/10 border border-green-500/30",
            "text-center animate-in slide-in-from-bottom-2 duration-500"
          )}
        >
          <p className="text-green-400 text-sm font-bangers tracking-wide mb-2">
            Codul tău de invitație:
          </p>
          <div
            className={cn(
              "text-2xl sm:text-3xl font-bangers text-white tracking-widest",
              "bg-slate-800/50 rounded-lg py-2 px-4",
              "border border-green-500/30 shadow-lg"
            )}
          >
            {createdCode}
          </div>
          <p className="text-green-400/70 text-xs sm:text-sm font-bangers tracking-wide mt-2">
            Trimite acest cod prietenilor tăi!
          </p>
        </div>
      )}

      {/* Create Lobby Button */}
      <Button
        onClick={handleCreateClick}
        disabled={isOperationInProgress}
        className={cn(
          "w-full max-w-md h-12 sm:h-14",
          "bg-gradient-to-r from-green-600 to-green-700",
          "hover:from-green-500 hover:to-green-600",
          "disabled:from-slate-600 disabled:to-slate-700",
          "text-white font-bangers text-lg sm:text-xl tracking-wide",
          "shadow-lg shadow-green-500/30",
          "transition-all duration-300",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          !isOperationInProgress && "hover:scale-105"
        )}
      >
        {isOperationInProgress ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Se creează...</span>
          </div>
        ) : (
          "CREEAZĂ LOBBY-UL MEU"
        )}
      </Button>

      {/* Helper Text */}
      <p className="text-purple-200/50 text-xs sm:text-sm text-center font-bangers tracking-wide max-w-md">
        Vei primi un cod de invitație pe care îl poți trimite prietenilor
      </p>
    </div>
  );
}
