"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { useAdLocalization } from "@/lib/use-ad-localization";

// AdBannerProps interface is defined in types/index.d.ts

export default function AdBanner({
  position,
  adId,
  upgradeUrl = "/upgrade",
  removeAdsText,
  locale,
  customLocalizations,
  adNetworks = [],
}: AdBannerProps) {
  const [loadingState, setLoadingState] =
    React.useState<AdLoadingState>("idle");
  const [adSlotData, setAdSlotData] = React.useState<AdSlotData | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const adContainerRef = React.useRef<HTMLDivElement>(null);

  // Use SSR-safe localization hook
  const { localizedRemoveAdsText } = useAdLocalization({
    locale,
    removeAdsText,
    customLocalizations,
  });

  // Initialize ad slot data - only run once on mount
  React.useEffect(() => {
    if (isInitialized) return; // Prevent re-initialization

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const slotId = `ad-slot-${position}-${timestamp}-${random}`;
    const containerId = `${adId}-container`;

    const slotData: AdSlotData = {
      slotId,
      containerId,
    };

    // Add network-specific IDs if configured
    if (adNetworks && adNetworks.length > 0) {
      adNetworks.forEach((network) => {
        if (network.enabled && network.slotId) {
          if (network.network === "google") {
            slotData.googleAdId = network.slotId;
          } else if (network.network === "poki") {
            slotData.pokiAdId = network.slotId;
          }
        }
      });
    }

    setAdSlotData(slotData);
    setIsInitialized(true);
  }, [adId, position, adNetworks, isInitialized]);

  // Initialize ad slots for different networks
  const initializeAdSlots = async () => {
    if (!adSlotData || !adContainerRef.current) return;

    setLoadingState("loading");

    try {
      // Initialize Google Ads if configured
      if (adSlotData.googleAdId) {
        await initializeGoogleAds(adSlotData);
      }

      // Initialize Poki Ads if configured
      if (adSlotData.pokiAdId) {
        await initializePokiAds(adSlotData);
      }

      // If no specific network is configured, use default placeholder
      if (!adSlotData.googleAdId && !adSlotData.pokiAdId) {
        initializeDefaultAd(adSlotData);
      }

      setLoadingState("loaded");
    } catch (error) {
      console.error("Failed to initialize ad slots:", error);
      setLoadingState("error");
    }
  };

  // Initialize Google Ads
  const initializeGoogleAds = async (slotData: AdSlotData) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Check if Google Ads script is loaded
        if (
          typeof window !== "undefined" &&
          (window as GoogleAdsWindow).googletag
        ) {
          const googletag = (window as GoogleAdsWindow).googletag!;

          googletag.cmd.push(() => {
            try {
              const slot = googletag.defineSlot(
                slotData.googleAdId!,
                [160, 600],
                slotData.containerId,
              );

              if (slot) {
                slot.addService(googletag.pubads());
                googletag.pubads().enableSingleRequest();
                googletag.enableServices();
                googletag.display(slotData.containerId);
                resolve();
              } else {
                reject(new Error("Failed to create Google Ad slot"));
              }
            } catch (error) {
              reject(error);
            }
          });
        } else {
          // Load Google Ads script if not present
          loadGoogleAdsScript()
            .then(() => initializeGoogleAds(slotData))
            .then(resolve)
            .catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  // Initialize Poki Ads
  const initializePokiAds = async (slotData: AdSlotData) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Check if Poki SDK is loaded
        if (typeof window !== "undefined" && (window as PokiWindow).PokiSDK) {
          const PokiSDK = (window as PokiWindow).PokiSDK!;

          // Initialize Poki ad slot
          const adContainer = document.getElementById(slotData.containerId);
          if (adContainer) {
            adContainer.setAttribute("data-poki-ad-slot", slotData.pokiAdId!);
            adContainer.setAttribute("data-poki-ad-size", "160x600");

            // Request ad from Poki
            PokiSDK.displayAd(slotData.containerId)
              .then(() => resolve())
              .catch(reject);
          } else {
            reject(new Error("Ad container not found"));
          }
        } else {
          // Load Poki SDK if not present
          loadPokiScript()
            .then(() => initializePokiAds(slotData))
            .then(resolve)
            .catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  // Initialize default ad placeholder
  const initializeDefaultAd = (slotData: AdSlotData) => {
    const adContainer = document.getElementById(slotData.containerId);
    if (adContainer) {
      adContainer.setAttribute("data-ad-slot", slotData.slotId);
      adContainer.setAttribute("data-ad-size", "160x600");
      adContainer.setAttribute("data-ad-position", position);
    }
  };

  // Load Google Ads script
  const loadGoogleAdsScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Window object not available"));
        return;
      }

      const script = document.createElement("script");
      script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
      script.async = true;
      script.onload = () => {
        const googleAdsWindow = window as GoogleAdsWindow;
        if (!googleAdsWindow.googletag) {
          googleAdsWindow.googletag = {
            cmd: [],
            defineSlot: () => null,
            pubads: () => ({ enableSingleRequest: () => {} }),
            enableServices: () => {},
            display: () => {},
          };
        }
        resolve();
      };
      script.onerror = () =>
        reject(new Error("Failed to load Google Ads script"));
      document.head.appendChild(script);
    });
  };

  // Load Poki SDK script
  const loadPokiScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Window object not available"));
        return;
      }

      const script = document.createElement("script");
      script.src = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load Poki SDK script"));
      document.head.appendChild(script);
    });
  };

  // Initialize ads when slot data is ready and state is idle
  React.useEffect(() => {
    if (adSlotData && loadingState === "idle") {
      initializeAdSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adSlotData?.slotId, loadingState]); // Only depend on slotId to avoid infinite loops

  const handleRemoveAdsClick = () => {
    if (upgradeUrl) {
      window.location.href = upgradeUrl;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleRemoveAdsClick();
    }
  };

  // Render loading state
  const renderAdContent = () => {
    switch (loadingState) {
      case "loading":
        return (
          <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
          </div>
        );
      case "error":
        return (
          <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 text-sm p-4 text-center">
            <div className="mb-2">⚠️</div>
            <div>Ad failed to load</div>
          </div>
        );
      case "loaded":
        return (
          <div
            id={adSlotData?.containerId}
            className="w-full h-full"
            ref={adContainerRef}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
            <span>Advertisement</span>
          </div>
        );
    }
  };

  return (
    <div
      className={`
        fixed top-1/2 -translate-y-1/2 z-40
        ${position === "left" ? "left-4" : "right-4"}
        hidden xl:block
      `}
      role="complementary"
      aria-label={`Advertisement banner - ${position}`}
    >
      {/* Ad Container */}
      <div
        id={adId}
        className="
          w-40 h-[600px] 
          bg-gray-100 dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700 
          rounded-lg 
          shadow-lg 
          flex flex-col 
          overflow-hidden
          relative
        "
        role="banner"
        aria-label="Advertisement"
        data-ad-position={position}
        data-ad-id={adId}
        data-ad-slot-id={adSlotData?.slotId}
      >
        {/* Ad Content Area */}
        <div className="flex-1 flex items-center justify-center">
          {renderAdContent()}
        </div>

        {/* Remove Ads Button */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleRemoveAdsClick}
            onKeyDown={handleKeyDown}
            className="
              w-full 
              bg-gradient-to-r from-yellow-400 to-yellow-600 
              hover:from-yellow-500 hover:to-yellow-700 
              text-yellow-900 
              font-semibold 
              text-xs 
              py-2 
              px-3 
              rounded-md 
              shadow-md 
              hover:shadow-lg 
              transition-all 
              duration-200 
              border-0
              focus-visible:ring-yellow-500/50
            "
            size="sm"
            aria-label={`${localizedRemoveAdsText} - Navigate to upgrade page`}
          >
            {localizedRemoveAdsText}
          </Button>
        </div>
      </div>
    </div>
  );
}
