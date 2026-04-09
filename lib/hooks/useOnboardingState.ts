import { useState, useEffect, useCallback } from "react";

interface OnboardingState {
  generateTourCompleted: boolean;
  bulkTourCompleted: boolean;
  isLoaded: boolean;
  markCompleted: (tourId: "generate" | "bulk") => Promise<void>;
}

/**
 * Hook to read/write onboarding flags from the user settings JSON.
 * Uses read-merge-write to avoid clobbering other generation preferences.
 */
export function useOnboardingState(): OnboardingState {
  const [generateTourCompleted, setGenerateTourCompleted] = useState(false);
  const [bulkTourCompleted, setBulkTourCompleted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch onboarding state on mount
  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.generationPreferences?.onboarding) {
          const ob = data.generationPreferences.onboarding;
          setGenerateTourCompleted(!!ob.generateTourCompleted);
          setBulkTourCompleted(!!ob.bulkTourCompleted);
        }
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, []);

  const markCompleted = useCallback(
    async (tourId: "generate" | "bulk") => {
      const key =
        tourId === "generate"
          ? "generateTourCompleted"
          : "bulkTourCompleted";

      // Optimistic update
      if (tourId === "generate") setGenerateTourCompleted(true);
      else setBulkTourCompleted(true);

      // Read-merge-write to avoid clobbering other preferences
      try {
        const res = await fetch("/api/user/settings");
        const data = res.ok ? await res.json() : {};
        const prefs = data.generationPreferences || {};
        const onboarding = prefs.onboarding || {};
        onboarding[key] = true;

        await fetch("/api/user/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generationPreferences: { ...prefs, onboarding },
          }),
        });
      } catch {
        // Non-critical — flag is already set in local state
      }
    },
    []
  );

  return { generateTourCompleted, bulkTourCompleted, isLoaded, markCompleted };
}
