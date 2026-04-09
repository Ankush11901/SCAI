"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* ── Hero illustration: blended into the page background ── */}
      {/* Positioned absolutely so it sits behind/beside the text naturally */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute right-[5%] top-1/2 w-[65%] max-w-[780px] -translate-y-1/2 lg:right-[8%]"
          style={{
            mixBlendMode: "lighten",
            maskImage:
              "radial-gradient(ellipse 85% 80% at 50% 50%, black 30%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 85% 80% at 50% 50%, black 30%, transparent 72%)",
          }}
        >
          <Image
            src="/hero-engine.png"
            alt=""
            width={960}
            height={540}
            priority
            quality={95}
            className="h-auto w-full select-none"
            draggable={false}
          />
        </div>
      </div>

      {/* ── Content layer ── */}
      <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col px-6 pb-24 pt-24 lg:pb-36 lg:pt-36">
        <div className="max-w-xl">
          <motion.p
            className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#7fffd4]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            AI Content Engine
          </motion.p>

          <motion.h1
            className="text-4xl font-semibold leading-[1.08] tracking-tight text-scai-text sm:text-5xl lg:text-[3.5rem]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            Publish‑ready SEO articles.{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Not AI drafts.
            </span>
          </motion.h1>

          <motion.p
            className="mt-6 max-w-lg text-base leading-relaxed text-scai-text-sec lg:text-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            Generate structured, validated HTML articles with real-time
            streaming preview — across 9 intent-native formats. One click to
            WordPress.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col items-start gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-3 text-sm font-semibold text-scai-page shadow-glow transition-opacity hover:opacity-90"
            >
              Start Generating Free
              <ArrowRight size={16} />
            </Link>
            <a
              href="#showcase"
              className="inline-flex items-center gap-2 rounded-full border border-scai-border-bright px-7 py-3 text-sm font-medium text-scai-text transition-colors hover:bg-scai-surface"
            >
              See It In Action
            </a>
          </motion.div>

          <motion.p
            className="mt-4 text-xs text-scai-text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            100 free credits/month — no card required
          </motion.p>
        </div>
      </div>
    </section>
  );
}
