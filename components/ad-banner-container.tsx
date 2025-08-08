import * as React from "react";
import AdBanner from "./ad-banner";
import type { AdBannerContainerProps } from "../types/index.d.ts";

// Import types from global definitions

// AdBannerContainerProps interface is defined in types/index.d.ts

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
