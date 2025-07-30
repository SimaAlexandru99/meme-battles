/**
 * React hook for SSR-safe advertisement localization
 */
import { useState, useEffect, useMemo } from "react";
import { getRemoveAdsText, detectBrowserLocale } from "./ad-localization";

/**
 * Hook for SSR-safe advertisement localization
 * Prevents hydration mismatches by using consistent server/client rendering
 */
export function useAdLocalization({
  locale,
  removeAdsText,
  customLocalizations,
}: UseAdLocalizationOptions = {}) {
  const [isHydrated, setIsHydrated] = useState(false);

  // Set hydration state on client
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Determine the effective locale
  const effectiveLocale = useMemo(() => {
    // If locale is explicitly provided, use it
    if (locale) {
      return locale;
    }

    // For SSR compatibility, default to English until hydrated
    if (!isHydrated) {
      return "en";
    }

    // After hydration, detect browser locale
    return detectBrowserLocale();
  }, [locale, isHydrated]);

  // Get localized text
  const localizedRemoveAdsText = useMemo(() => {
    // If removeAdsText prop is provided, use it directly
    if (removeAdsText) {
      return removeAdsText;
    }

    // Get localized text using the effective locale
    return getRemoveAdsText(effectiveLocale, undefined, customLocalizations);
  }, [removeAdsText, effectiveLocale, customLocalizations]);

  return {
    localizedRemoveAdsText,
    effectiveLocale,
    isHydrated,
  };
}
