"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Glow */}
      <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-scai-brand1/[0.06] blur-[100px]" />

      <div className="relative mx-auto max-w-[1200px] px-6 text-center">
        <h2 className="text-3xl font-semibold leading-tight text-scai-text sm:text-4xl lg:text-5xl">
          Your first publish-ready article{" "}
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            is five minutes away.
          </span>
        </h2>

        <p className="mx-auto mt-4 max-w-lg text-base text-scai-text-sec">
          100 free credits. No credit card. Pick a keyword, choose your article type, and publish.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-8 py-3.5 text-sm font-semibold text-scai-page shadow-glow transition-opacity hover:opacity-90"
          >
            Generate Your First Article
            <ArrowRight size={16} />
          </Link>
        </div>

        <p className="mt-4 text-xs text-scai-text-muted">
          Average cost per article: $0.54 — less than a cup of coffee
        </p>
      </div>
    </section>
  );
}
