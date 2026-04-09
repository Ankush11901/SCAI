"use client";

import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { parseGbpUrl } from "@/lib/utils/parse-gbp-url";
import type { LocalBusinessInfo } from "@/lib/services/content-generators";

export function GbpUrlField({
  localBusinessInfo,
  onLocalBusinessInfoChange,
  disabled,
}: {
  localBusinessInfo: LocalBusinessInfo;
  onLocalBusinessInfoChange: (info: LocalBusinessInfo) => void;
  disabled?: boolean;
}) {
  const [feedback, setFeedback] = useState<{
    type: "success" | "loading" | "none";
    text: string;
  } | null>(null);

  // Track which fields were auto-filled (so new URL can overwrite them, but not user-typed fields)
  const autoFilledRef = useRef<Set<keyof LocalBusinessInfo>>(new Set());

  // Track latest info so async geocode callback reads fresh state
  const infoRef = useRef(localBusinessInfo);
  infoRef.current = localBusinessInfo;

  const processUrl = (newUrl: string) => {
    const info = infoRef.current;
    const parsed = newUrl.trim() ? parseGbpUrl(newUrl) : null;

    if (parsed) {
      const fieldsExtracted: string[] = [];
      const merged: LocalBusinessInfo = { ...info, gbpUrl: newUrl };
      const af = autoFilledRef.current;

      // Fill empty fields OR overwrite previously auto-filled fields
      if (parsed.businessName && (!info.businessName || af.has("businessName"))) {
        merged.businessName = parsed.businessName;
        af.add("businessName");
        fieldsExtracted.push(parsed.businessName);
      }
      if (parsed.city && (!info.city || af.has("city"))) {
        merged.city = parsed.city;
        af.add("city");
        fieldsExtracted.push(parsed.city);
      }
      if (parsed.stateRegion && (!info.stateRegion || af.has("stateRegion"))) {
        merged.stateRegion = parsed.stateRegion;
        af.add("stateRegion");
        fieldsExtracted.push(parsed.stateRegion);
      }
      if (parsed.postalCode && (!info.postalCode || af.has("postalCode"))) {
        merged.postalCode = parsed.postalCode;
        af.add("postalCode");
      }

      onLocalBusinessInfoChange(merged);

      if (fieldsExtracted.length > 0) {
        setFeedback({
          type: "success",
          text: `Extracted: ${fieldsExtracted.join(", ")}`,
        });
      }

      // If coordinates found and location is missing or was auto-filled (refreshable), reverse geocode
      const needsGeocode =
        parsed.lat != null &&
        parsed.lng != null &&
        (!merged.city || !merged.stateRegion || af.has("city") || af.has("stateRegion"));

      if (needsGeocode) {
        setFeedback({ type: "loading", text: "Looking up location..." });

        fetch(`/api/gbp/reverse-geocode?lat=${parsed.lat}&lng=${parsed.lng}`)
          .then((res) => {
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            return res.json();
          })
          .then((json) => {
            if (!json?.data) {
              setFeedback({ type: "none", text: "No location data found" });
              return;
            }
            const latest = infoRef.current;
            const geoMerged: LocalBusinessInfo = { ...latest };
            const geoExtracted: string[] = [];

            if (json.data.city && (!latest.city || af.has("city"))) {
              geoMerged.city = json.data.city;
              af.add("city");
              geoExtracted.push(json.data.city);
            }
            if (json.data.stateRegion && (!latest.stateRegion || af.has("stateRegion"))) {
              geoMerged.stateRegion = json.data.stateRegion;
              af.add("stateRegion");
              geoExtracted.push(json.data.stateRegion);
            }
            if (json.data.postalCode && (!latest.postalCode || af.has("postalCode"))) {
              geoMerged.postalCode = json.data.postalCode;
              af.add("postalCode");
            }

            if (geoExtracted.length > 0) {
              onLocalBusinessInfoChange(geoMerged);
              const allExtracted = [
                af.has("businessName") ? latest.businessName : undefined,
                ...geoExtracted,
              ].filter(Boolean);
              setFeedback({
                type: "success",
                text: `Extracted: ${allExtracted.join(", ")}`,
              });
            } else {
              // Geocode returned data but fields were already filled
              setFeedback({
                type: "success",
                text: `Extracted: ${fieldsExtracted.join(", ")}`,
              });
            }
          })
          .catch((err) => {
            console.error("[GBP auto-fill] Geocode failed:", err);
            // Keep the name extraction feedback
            if (fieldsExtracted.length > 0) {
              setFeedback({
                type: "success",
                text: `Extracted: ${fieldsExtracted.join(", ")}`,
              });
            }
          });
      }
    } else {
      onLocalBusinessInfoChange({ ...info, gbpUrl: newUrl });

      if (newUrl.trim() && newUrl.includes("google")) {
        setFeedback({
          type: "none",
          text: "Couldn't extract details from this URL",
        });
      } else {
        setFeedback(null);
      }
    }
  };

  const helperText = feedback
    ? undefined
    : "Paste your Google Business Profile link";

  return (
    <div>
      <Input
        type="url"
        label="Google Business Profile URL"
        helperText={helperText}
        value={localBusinessInfo.gbpUrl || ""}
        onChange={(e) => {
          // Update the URL value on every keystroke
          onLocalBusinessInfoChange({ ...infoRef.current, gbpUrl: e.target.value });
        }}
        onPaste={(e) => {
          // On paste, grab clipboard text and run extraction
          const pasted = e.clipboardData.getData("text");
          if (pasted) {
            e.preventDefault();
            processUrl(pasted.trim());
          }
        }}
        placeholder="https://google.com/maps/place/..."
        disabled={disabled}
      />
      {feedback && (
        <p
          className={cn(
            "mt-1.5 text-xs",
            feedback.type === "success"
              ? "text-success"
              : feedback.type === "loading"
                ? "text-scai-brand1"
                : "text-scai-text-muted"
          )}
        >
          {feedback.type === "loading" && (
            <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
          )}
          {feedback.text}
        </p>
      )}
    </div>
  );
}
