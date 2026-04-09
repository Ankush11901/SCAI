"use client";

import { X } from "lucide-react";
import { useState } from "react";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="relative flex h-10 items-center justify-center bg-scai-card px-6 text-center">
      <p className="text-xs font-medium text-scai-text-sec">
        <span className="text-scai-brand1">New:</span>{" "}
        Cluster Mode is live — generate interlinked article sets from a single keyword.{" "}
        <a href="#features" className="font-semibold text-scai-brand1 underline-offset-2 hover:underline">
          Learn more
        </a>
      </p>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-scai-text-muted transition-colors hover:text-scai-text-sec"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
