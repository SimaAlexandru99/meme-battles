/**
 * Advertisement localization utilities
 * Provides default text fallbacks and multi-language support for advertisement components
 */

// Import types from global definitions

// Default localization configurations for supported languages
export const defaultAdLocalizations: AdLocalizationConfig = {
  en: {
    removeAdsText: "Remove Ads",
    locale: "en",
  },
  ro: {
    removeAdsText: "Elimină Reclamele",
    locale: "ro",
  },
  es: {
    removeAdsText: "Eliminar Anuncios",
    locale: "es",
  },
  fr: {
    removeAdsText: "Supprimer les Publicités",
    locale: "fr",
  },
  de: {
    removeAdsText: "Werbung Entfernen",
    locale: "de",
  },
  it: {
    removeAdsText: "Rimuovi Annunci",
    locale: "it",
  },
  pt: {
    removeAdsText: "Remover Anúncios",
    locale: "pt",
  },
};

/**
 * Get localized text for advertisement components
 * @param locale - The locale to get text for (e.g., 'en', 'ro')
 * @param customLocalizations - Optional custom localization overrides
 * @returns AdLocalization object with localized text
 */
export function getAdLocalization(
  locale: string = "en",
  customLocalizations?: AdLocalizationConfig
): AdLocalization {
  // Check custom localizations first
  if (customLocalizations && customLocalizations[locale]) {
    return customLocalizations[locale];
  }

  // Fall back to default localizations
  if (defaultAdLocalizations[locale]) {
    return defaultAdLocalizations[locale];
  }

  // Ultimate fallback to English
  return defaultAdLocalizations.en;
}

/**
 * Get localized remove ads text with fallback
 * @param locale - The locale to get text for
 * @param customText - Optional custom text override
 * @param customLocalizations - Optional custom localization config
 * @returns Localized remove ads text
 */
export function getRemoveAdsText(
  locale?: string,
  customText?: string,
  customLocalizations?: AdLocalizationConfig
): string {
  // If custom text is provided, use it directly
  if (customText) {
    return customText;
  }

  // If no locale is provided, use English default
  if (!locale) {
    return defaultAdLocalizations.en.removeAdsText;
  }

  // Get localized text
  const localization = getAdLocalization(locale, customLocalizations);
  return localization.removeAdsText;
}

/**
 * Detect browser locale for advertisement localization
 * @returns Detected locale string (e.g., 'en', 'ro')
 */
export function detectBrowserLocale(): string {
  // Always return English for SSR to prevent hydration mismatches
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    // Get browser language
    const browserLang = navigator.language || navigator.languages?.[0] || "en";

    // Extract language code (e.g., 'en-US' -> 'en')
    const langCode = browserLang.split("-")[0].toLowerCase();

    // Return if we support this language, otherwise default to English
    return defaultAdLocalizations[langCode] ? langCode : "en";
  } catch (error) {
    // Fallback to English if any error occurs
    console.warn("Failed to detect browser locale:", error);
    return "en";
  }
}

/**
 * Get supported locales
 * @returns Array of supported locale codes
 */
export function getSupportedLocales(): string[] {
  return Object.keys(defaultAdLocalizations);
}
