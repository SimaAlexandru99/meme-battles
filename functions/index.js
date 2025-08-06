/**
 * Firebase Cloud Functions Entry Point
 *
 * This file exports all Firebase Cloud Functions for the Meme Battles
 * lobby management system.
 */

// Import and export lobby cleanup functions
import {
  cleanupLobbies,
  cleanupPlayerSessions,
  onLobbyDeleted,
  manualCleanup,
  getCleanupStats,
  monitorLobbyCreation,
} from "./lobby-cleanup.js";

// Export all functions
export {
  cleanupLobbies,
  cleanupPlayerSessions,
  onLobbyDeleted,
  manualCleanup,
  getCleanupStats,
  monitorLobbyCreation,
};
