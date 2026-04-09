import { useState, useEffect, useCallback, useRef } from "react";
import type { TourStep } from "@/components/onboarding/tour-steps";

interface UseSpotlightTourOptions {
  steps: TourStep[];
  tourId: string;
  isCompleted: boolean;
  isLoaded: boolean;
  autoStartDelay?: number;
  onComplete: () => void;
}

interface UseSpotlightTourReturn {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  next: () => void;
  back: () => void;
  skip: () => void;
  restart: () => void;
}

/**
 * Manages the spotlight tour lifecycle: auto-start, navigation, completion.
 */
export function useSpotlightTour({
  steps,
  tourId,
  isCompleted,
  isLoaded,
  autoStartDelay = 800,
  onComplete,
}: UseSpotlightTourOptions): UseSpotlightTourReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const hasAutoStarted = useRef(false);

  // Auto-start on first visit after delay
  useEffect(() => {
    if (!isLoaded || isCompleted || hasAutoStarted.current || steps.length === 0)
      return;

    hasAutoStarted.current = true;

    const timer = setTimeout(() => {
      setIsActive(true);
      setCurrentStep(0);
    }, autoStartDelay);

    return () => clearTimeout(timer);
  }, [isLoaded, isCompleted, autoStartDelay, steps.length]);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Last step — finish tour
      setIsActive(false);
      onComplete();
    }
  }, [currentStep, steps.length, onComplete]);

  const back = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skip = useCallback(() => {
    setIsActive(false);
    onComplete();
  }, [onComplete]);

  const restart = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  return { isActive, currentStep, steps, next, back, skip, restart };
}
