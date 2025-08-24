'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  lobbyEnterVariants,
  lobbySectionVariants,
  staggerContainerVariants,
} from '@/lib/animations/private-lobby-variants';
import { QueueStatus } from '@/components/queue-status';
import { MatchmakingProgress } from '@/components/matchmaking-progress';
import { QueuePreferences } from '@/components/queue-preferences';
import { useMatchmakingQueue } from '@/hooks/use-matchmaking-queue';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import * as Sentry from '@sentry/nextjs';

interface BattleRoyaleInterfaceProps {
  onBackToMain: () => void;
  className?: string;
}

export function BattleRoyaleInterface({
  onBackToMain,
  className,
}: BattleRoyaleInterfaceProps) {
  const { user } = useCurrentUser();
  const {
    isInQueue,
    queuePosition,
    estimatedWaitTime,
    queueSize,
    isLoading,
    error,
    matchFound,
    lobbyCode,
    joinQueue,
    leaveQueue,
    updatePreferences,
    canJoinQueue,
    timeInQueue,
    clearError,
    retry,
  } = useMatchmakingQueue();

  // Focus management refs - reusing existing patterns
  const backButtonRef = React.useRef<HTMLButtonElement>(null);
  const queueStatusRef = React.useRef<HTMLDivElement>(null);
  const preferencesRef = React.useRef<HTMLDivElement>(null);

  // Handle back navigation with keyboard support and focus management
  const handleBackToMain = React.useCallback(
    (event?: React.KeyboardEvent) => {
      if (!event || event.key === 'Enter' || event.key === ' ') {
        event?.preventDefault();

        // Leave queue if currently in queue
        if (isInQueue) {
          leaveQueue().catch((error) => {
            console.error('Failed to leave queue on back navigation:', error);
          });
        }

        onBackToMain();
      }
    },
    [onBackToMain, isInQueue, leaveQueue]
  );

  // Handle joining the Battle Royale queue
  const handleJoinQueue = React.useCallback(async () => {
    if (!canJoinQueue) {
      return;
    }

    try {
      await joinQueue();

      Sentry.addBreadcrumb({
        message: 'Player joined Battle Royale queue',
        data: {
          playerUid: user?.id,
          queueSize,
        },
        level: 'info',
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          operation: 'join_battle_royale_queue',
          userId: user?.id || 'anonymous',
        },
      });
    }
  }, [canJoinQueue, joinQueue, user?.id, queueSize]);

  // Handle leaving the queue
  const handleLeaveQueue = React.useCallback(async () => {
    try {
      await leaveQueue();

      Sentry.addBreadcrumb({
        message: 'Player left Battle Royale queue',
        data: {
          playerUid: user?.id,
          timeInQueue,
        },
        level: 'info',
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          operation: 'leave_battle_royale_queue',
          userId: user?.id || 'anonymous',
        },
      });
    }
  }, [leaveQueue, user?.id, timeInQueue]);

  // Handle preference updates
  const handleUpdatePreferences = React.useCallback(
    async (preferences: Partial<QueuePreferences>) => {
      try {
        await updatePreferences(preferences);

        Sentry.addBreadcrumb({
          message: 'Updated Battle Royale queue preferences',
          data: {
            playerUid: user?.id,
            preferences,
          },
          level: 'info',
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            operation: 'update_queue_preferences',
            userId: user?.id || 'anonymous',
          },
        });
      }
    },
    [updatePreferences, user?.id]
  );

  // Redirect to lobby when match is found
  React.useEffect(() => {
    if (matchFound && lobbyCode) {
      // Redirect to the Battle Royale lobby
      window.location.href = `/game/${lobbyCode}`;
    }
  }, [matchFound, lobbyCode]);

  // Focus management for screen readers - reusing existing patterns
  React.useEffect(() => {
    // Announce view change to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent =
      'Battle Royale interface loaded. Join the queue to find competitive matches.';
    document.body.appendChild(announcement);

    // Focus the back button for logical tab order
    if (backButtonRef.current) {
      backButtonRef.current.focus();
    }

    return () => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    };
  }, []);

  // Announce dynamic content changes - reusing existing patterns
  React.useEffect(() => {
    if (error) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'assertive');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = `Error: ${error}`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 100);
    }
  }, [error]);

  React.useEffect(() => {
    if (isInQueue) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = `Joined Battle Royale queue. Position: ${queuePosition}, Estimated wait: ${estimatedWaitTime} seconds.`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 100);
    }
  }, [isInQueue, queuePosition, estimatedWaitTime]);

  return (
    <ErrorBoundary>
      <motion.div
        variants={lobbyEnterVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn(
          'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
          'flex flex-col items-center gap-8 sm:gap-12',
          'min-h-full py-8 sm:py-12',
          'relative',
          className
        )}
        role="main"
        aria-label="Battle Royale matchmaking interface"
      >
        {/* Back Navigation Button - reusing existing patterns */}
        <motion.div
          variants={lobbySectionVariants}
          className="w-full flex justify-start sticky top-0 z-20"
        >
          <Button
            ref={backButtonRef}
            onClick={() => handleBackToMain()}
            onKeyDown={handleBackToMain}
            disabled={isLoading}
            className={cn(
              'group flex items-center gap-3 px-6 py-3',
              'bg-slate-800/50 hover:bg-slate-700/50',
              'border border-slate-600/50 hover:border-slate-500/50',
              'text-white font-bangers text-lg tracking-wide',
              'shadow-lg shadow-slate-900/20',
              'transition-all duration-300',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:ring-2 focus-visible:ring-purple-500/50',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
              'z-10 relative',
              'min-h-[48px] min-w-[160px]',
              'cursor-pointer'
            )}
            aria-label="Navigate back to main menu"
            aria-describedby="back-button-description"
          >
            <ArrowLeft
              className={cn(
                'w-5 h-5 transition-transform duration-300',
                'group-hover:-translate-x-1'
              )}
              aria-hidden="true"
            />
            <span>BACK TO START</span>
          </Button>
          <div id="back-button-description" className="sr-only">
            Return to the main game selection screen
          </div>
        </motion.div>

        {/* Main Content Container - reusing existing grid patterns */}
        <motion.div
          variants={staggerContainerVariants}
          className={cn(
            'w-full grid gap-8 sm:gap-12',
            // Mobile: Stack vertically
            'grid-cols-1',
            // Desktop: Two columns with queue status taking more space
            'lg:grid-cols-3 lg:gap-16',
            // Ensure equal height on desktop
            'lg:items-start'
          )}
          role="region"
          aria-label="Battle Royale matchmaking options"
        >
          {/* Queue Status Section - spans 2 columns on desktop */}
          <motion.div
            ref={queueStatusRef}
            variants={lobbySectionVariants}
            className="lg:col-span-2 w-full flex justify-center"
            role="region"
            aria-label="Queue status and matchmaking progress"
          >
            <div className="w-full max-w-2xl space-y-6">
              <QueueStatus
                isInQueue={isInQueue}
                queuePosition={queuePosition}
                estimatedWaitTime={estimatedWaitTime}
                queueSize={queueSize}
                isLoading={isLoading}
                error={error}
                onJoinQueue={handleJoinQueue}
                onLeaveQueue={handleLeaveQueue}
                onClearError={clearError}
                onRetry={retry}
                canJoinQueue={canJoinQueue}
                timeInQueue={timeInQueue}
                className="w-full"
              />

              <AnimatePresence>
                {isInQueue && (
                  <MatchmakingProgress
                    queuePosition={queuePosition}
                    estimatedWaitTime={estimatedWaitTime}
                    timeInQueue={timeInQueue}
                    queueSize={queueSize}
                    className="w-full"
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Queue Preferences Section */}
          <motion.div
            ref={preferencesRef}
            variants={lobbySectionVariants}
            className="w-full flex justify-center"
            role="region"
            aria-label="Matchmaking preferences"
          >
            <QueuePreferences
              onUpdatePreferences={handleUpdatePreferences}
              isInQueue={isInQueue}
              isLoading={isLoading}
              className="w-full max-w-md"
            />
          </motion.div>
        </motion.div>

        {/* Helper Text - reusing existing patterns */}
        <motion.div
          variants={lobbySectionVariants}
          className="text-center max-w-2xl"
          role="complementary"
          aria-label="Instructions"
        >
          <p className="text-purple-200/60 text-sm sm:text-base font-bangers tracking-wide">
            {isInQueue
              ? "You're in the Battle Royale queue! We'll find you a competitive match soon."
              : 'Join the Battle Royale queue to compete against players of similar skill level.'}
          </p>
        </motion.div>

        {/* Loading Overlay for Global Operations - reusing existing patterns */}
        {isLoading && !isInQueue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'fixed inset-0 z-50 flex items-center justify-center',
              'bg-slate-900/80 backdrop-blur-sm'
            )}
            role="dialog"
            aria-modal="true"
            aria-live="polite"
            aria-label="Loading"
            aria-describedby="loading-description"
          >
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"
                aria-hidden="true"
              />
              <p
                id="loading-description"
                className="text-white font-bangers text-lg tracking-wide"
              >
                Joining Battle Royale...
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </ErrorBoundary>
  );
}
