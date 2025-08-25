import AdBanner from "./ad-banner";

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
