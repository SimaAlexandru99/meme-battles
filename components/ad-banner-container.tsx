import * as React from "react";
import AdBanner from "./ad-banner";

// Import types
declare global {
  interface AdNetworkConfig {
    network: "google" | "poki";
    slotId?: string;
    publisherId?: string;
    enabled: boolean;
  }

  interface AdLocalizationConfig {
    [locale: string]: AdLocalization;
  }

  interface AdLocalization {
    removeAdsText: string;
    locale: string;
  }
}

interface AdBannerContainerProps {
  upgradeUrl?: string;
  removeAdsText?: string;
  locale?: string;
  customLocalizations?: AdLocalizationConfig;
  adNetworks?: AdNetworkConfig[];
}

export default function AdBannerContainer({
  upgradeUrl = "/upgrade",
  removeAdsText,
  locale,
  customLocalizations,
  adNetworks = [],
}: AdBannerContainerProps) {
  return (
    <>
      {/* Left Advertisement Banner */}
      <AdBanner
        position="left"
        adId="ad-banner-left"
        upgradeUrl={upgradeUrl}
        removeAdsText={removeAdsText}
        locale={locale}
        customLocalizations={customLocalizations}
        adNetworks={adNetworks}
      />

      {/* Right Advertisement Banner */}
      <AdBanner
        position="right"
        adId="ad-banner-right"
        upgradeUrl={upgradeUrl}
        removeAdsText={removeAdsText}
        locale={locale}
        customLocalizations={customLocalizations}
        adNetworks={adNetworks}
      />
    </>
  );
}
