"use client";

import { SWRConfig } from "swr";

// Import types from global definitions

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Global SWR configuration
        errorRetryCount: 3,
        errorRetryInterval: 1000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 5 * 60 * 1000, // 5 minutes
        keepPreviousData: true,
        shouldRetryOnError: (error) => {
          // Don't retry on authentication errors
          return (
            !error?.message?.includes("authentication") &&
            !error?.message?.includes("unauthorized")
          );
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
