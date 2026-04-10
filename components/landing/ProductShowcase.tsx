"use client";

import { motion } from "motion/react";
import {
  MousePointerClick,
  LayoutGrid,
  Sparkles,
  ShieldCheck,
  Image as ImageIcon,
  Send,
  Code2,
} from "lucide-react";
import { type ReactNode } from "react";

/* ── Data — ordered as a user journey ────────────────────────────────────── */

interface ShowcaseStep {
  step: number;
  icon: ReactNode;
  title: string;
  description: string;
}

const steps: ShowcaseStep[] = [
  {
    step: 1,
    icon: <MousePointerClick className="h-6 w-6 text-[#7fffd4]" />,
    title: "Pick Your Keyword & Article Type",
    description:
      "Enter a keyword, pick from 9 article types. Each type ships with its own layout, components, and validation logic.",
  },
  {
    step: 2,
    icon: <Sparkles className="h-6 w-6 text-[#7fffd4]" />,
    title: "AI Generates Your Article in Real Time",
    description:
      "Watch your article build live — headings, body copy, product cards, and tables appear section by section, not as a text dump.",
  },
  {
    step: 3,
    icon: <ImageIcon className="h-6 w-6 text-[#7fffd4]" />,
    title: "Images & Alt Text Created Automatically",
    description:
      "Hero images, section visuals, and keyword-targeted alt text — generated automatically. No stock photos, no manual tagging.",
  },
  {
    step: 4,
    icon: <ShieldCheck className="h-6 w-6 text-[#7fffd4]" />,
    title: "310+ Rules Validate Before You Publish",
    description:
      "H-structure, keyword density, alt text, word count, and banned AI phrases — scored and flagged before you hit publish.",
  },
  {
    step: 5,
    icon: <Code2 className="h-6 w-6 text-[#7fffd4]" />,
    title: "Clean HTML, Ready for Any CMS",
    description:
      "Structured, semantic HTML with scoped CSS. Renders correctly in every CMS — zero reformatting, zero cleanup.",
  },
  {
    step: 6,
    icon: <Send className="h-6 w-6 text-[#7fffd4]" />,
    title: "One Click to WordPress, Webflow & More",
    description:
      "Publish to WordPress, Medium, Ghost, Webflow, Shopify, Dev.to, or Hashnode. One click — your article is live.",
  },
];

/* ── Scale card — shown at the bottom ────────────────────────────────────── */

interface ScaleCard {
  icon: ReactNode;
  title: string;
  description: string;
  stat: { value: string; unit: string };
}

const scaleCards: ScaleCard[] = [
  {
    icon: <LayoutGrid className="h-6 w-6 text-[#7fffd4]" />,
    title: "Bulk Generation",
    description:
      "Upload a CSV, generate up to 100 articles in one batch — with status tracking, retries, and batch download.",
    stat: { value: "100", unit: "articles per batch" },
  },
];

/* ── Main Section ────────────────────────────────────────────────────────── */

export function ProductShowcase() {
  return (
    <section id="showcase" className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-scai-brand1">
            How It Works
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-scai-text sm:text-4xl">
            From keyword to published article{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              in six steps.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-scai-text-sec">
            Every article follows the same path — structured generation,
            automated validation, and one-click publishing to your CMS.
          </p>
        </div>

        {/* Steps grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              className="group relative rounded-2xl border border-scai-border/60 bg-[#0b0f14] p-6 transition-colors duration-300 hover:border-[#7fffd4]/30"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              {/* Step number */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#7fffd4]/20 bg-[#7fffd4]/[0.06]">
                  {step.icon}
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-scai-text-muted">
                  Step {step.step}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-scai-text">
                {step.title}
              </h3>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-scai-text-sec">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Scale card — full width */}
        <div className="mt-6">
          {scaleCards.map((card, i) => (
            <motion.div
              key={card.title}
              className="group relative flex flex-col gap-4 rounded-2xl border border-scai-border/60 bg-[#0b0f14] p-6 transition-colors duration-300 hover:border-[#7fffd4]/30 sm:flex-row sm:items-center sm:justify-between"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7fffd4]/20 bg-[#7fffd4]/[0.06]">
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-scai-text">
                    {card.title}
                  </h3>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-scai-text-sec">
                    {card.description}
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 sm:shrink-0">
                <span className="text-3xl font-bold tracking-tight text-[#7fffd4]">
                  {card.stat.value}
                </span>
                <span className="text-sm font-medium text-scai-text-muted">
                  {card.stat.unit}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
