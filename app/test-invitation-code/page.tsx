"use client";

import React, { useState } from "react";
import { InvitationCodeInput } from "@/components/invitation-code-input";
import { JoinWithCodeSection } from "@/components/join-with-code-section";
import { CreateLobbySection } from "@/components/create-lobby-section";

export default function TestInvitationCodePage() {
  const [code, setCode] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [completedCode, setCompletedCode] = useState("");

  // JoinWithCodeSection state
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedCode, setJoinedCode] = useState<string | null>(null);

  // CreateLobbySection state
  const [isCreating, setIsCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const handleChange = (value: string) => {
    setCode(value);
    setHasError(false);
    console.log("Code changed:", value);
  };

  const handleComplete = (value: string) => {
    setCompletedCode(value);
    console.log("Code completed:", value);

    // Simulate validation - codes starting with 'X' are invalid
    if (value.startsWith("X")) {
      setHasError(true);
    }
  };

  const handleReset = () => {
    setCode("");
    setCompletedCode("");
    setHasError(false);
  };

  const handleToggleError = () => {
    setHasError(!hasError);
  };

  const handleToggleDisabled = () => {
    setIsDisabled(!isDisabled);
  };

  // JoinWithCodeSection handlers
  const handleJoinLobby = async (code: string): Promise<void> => {
    setIsJoining(true);
    setJoinError(null);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate different scenarios based on code
    if (code === "ERROR") {
      setJoinError("Lobby not found. Please check your invitation code.");
      throw new Error("Lobby not found");
    } else if (code === "FULL1") {
      setJoinError("This lobby is full. Please try another code.");
      throw new Error("Lobby full");
    } else if (code === "EXPIR") {
      setJoinError("This invitation has expired. Please request a new one.");
      throw new Error("Invitation expired");
    } else {
      // Success case
      setJoinedCode(code);
      setJoinError(null);
    }

    setIsJoining(false);
  };

  const handleResetJoin = () => {
    setJoinError(null);
    setJoinedCode(null);
    setIsJoining(false);
  };

  // CreateLobbySection handlers
  const handleCreateLobby = async (): Promise<string> => {
    setIsCreating(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate a random 5-character code
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 5; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }

    setCreatedCode(result);
    setIsCreating(false);
    return result;
  };

  const handleResetCreate = () => {
    setCreatedCode(null);
    setIsCreating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bangers text-white text-center mb-8">
          InvitationCodeInput Test Page
        </h1>

        <div className="bg-slate-800/50 rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-bangers text-purple-200 mb-6 text-center">
            Test the Component
          </h2>

          <div className="flex justify-center mb-8">
            <InvitationCodeInput
              value={code}
              onChange={handleChange}
              onComplete={handleComplete}
              error={hasError}
              disabled={isDisabled}
            />
          </div>

          <div className="flex flex-wrap gap-4 justify-center mb-6">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bangers transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleToggleError}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bangers transition-colors"
            >
              Toggle Error: {hasError ? "ON" : "OFF"}
            </button>
            <button
              onClick={handleToggleDisabled}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bangers transition-colors"
            >
              Toggle Disabled: {isDisabled ? "ON" : "OFF"}
            </button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-purple-200 font-bangers">
              Current Value:{" "}
              <span className="text-white">{code || "(empty)"}</span>
            </p>
            <p className="text-purple-200 font-bangers">
              Completed Code:{" "}
              <span className="text-white">{completedCode || "(none)"}</span>
            </p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bangers text-purple-200 mb-4">
            Test Instructions:
          </h3>
          <ul className="text-purple-100 space-y-2 font-bangers">
            <li>• Type characters - only alphanumeric are accepted</li>
            <li>• Characters are automatically converted to uppercase</li>
            <li>• Auto-advance to next field after typing</li>
            <li>• Paste a 5-character code to fill all fields</li>
            <li>• onComplete fires when 5 characters are entered</li>
            <li>
              • Try typing codes starting with &apos;X&apos; to test error state
            </li>
            <li>• Use the buttons to test different states</li>
          </ul>
        </div>

        {/* JoinWithCodeSection Test */}
        <div className="bg-slate-800/50 rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-bangers text-purple-200 mb-6 text-center">
            JoinWithCodeSection Test
          </h2>

          <div className="flex justify-center mb-6">
            <JoinWithCodeSection
              onJoinLobby={handleJoinLobby}
              isLoading={isJoining}
              error={joinError}
              className="max-w-md"
            />
          </div>

          <div className="flex flex-wrap gap-4 justify-center mb-6">
            <button
              onClick={handleResetJoin}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bangers transition-colors"
            >
              Reset Join Section
            </button>
          </div>

          {joinedCode && (
            <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 font-bangers text-lg">
                Successfully joined lobby with code: {joinedCode}
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bangers text-purple-200 mb-4">
            JoinWithCodeSection Test Instructions:
          </h3>
          <ul className="text-purple-100 space-y-2 font-bangers">
            <li>• Enter any 5-character code to test successful join</li>
            <li>• Enter &quot;ERROR&quot; to test lobby not found error</li>
            <li>• Enter &quot;FULL1&quot; to test lobby full error</li>
            <li>• Enter &quot;EXPIR&quot; to test expired invitation error</li>
            <li>• Watch the loading states and animations</li>
            <li>• Notice the golden envelope icon with notification badge</li>
            <li>• Romanian text is displayed correctly</li>
          </ul>
        </div>

        {/* CreateLobbySection Test */}
        <div className="bg-slate-800/50 rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-bangers text-purple-200 mb-6 text-center">
            CreateLobbySection Test
          </h2>

          <div className="flex justify-center mb-6">
            <CreateLobbySection
              onCreateLobby={handleCreateLobby}
              isLoading={isCreating}
              createdCode={createdCode}
              className="max-w-md"
            />
          </div>

          <div className="flex flex-wrap gap-4 justify-center mb-6">
            <button
              onClick={handleResetCreate}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bangers transition-colors"
            >
              Reset Create Section
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6">
          <h3 className="text-xl font-bangers text-purple-200 mb-4">
            CreateLobbySection Test Instructions:
          </h3>
          <ul className="text-purple-100 space-y-2 font-bangers">
            <li>
              • Click &quot;CREEAZĂ LOBBY-UL MEU&quot; to create a new lobby
            </li>
            <li>• Watch the loading animation with spinning plus icon</li>
            <li>• Notice the two blue cards with yellow smiley faces</li>
            <li>• See the green speech bubble with plus icon above cards</li>
            <li>• Cards have overlapping layout with rotation effects</li>
            <li>• Romanian text is displayed correctly</li>
            <li>• Generated invitation code appears after creation</li>
            <li>• Hover effects work on cards and speech bubble</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
