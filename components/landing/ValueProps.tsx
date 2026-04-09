"use client";

import { motion } from "motion/react";
import { LayoutGrid, ShieldCheck, Layers, CircleDollarSign } from "lucide-react";

const values = [
  {
    icon: <LayoutGrid className="h-6 w-6 text-[#7fffd4]" />,
    label: "Intent-Native Layouts",
    description:
      "Not one template stretched across every topic. Each article type — affiliate, recipe, comparison, review — gets its own structure, components, and validation rules.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-[#7fffd4]" />,
    label: "310+ Validation Rules",
    description:
      "Every article is checked against 310 rules covering H-structure, keyword density, alt text, word counts, banned AI phrases, grammar, and content sequencing.",
  },
  {
    icon: <Layers className="h-6 w-6 text-[#7fffd4]" />,
    label: "100 Articles Per Batch",
    description:
      "Upload a CSV or enter keywords manually. Bulk mode processes up to 100 articles with per-article status tracking, retry on failure, and batch download.",
  },
  {
    icon: <CircleDollarSign className="h-6 w-6 text-[#7fffd4]" />,
    label: "$0.54 Avg. Per Article",
    description:
      "A 1,000-word article with AI images costs as little as $0.54 in credits. 25-article clusters average $0.39 each. Scale content without scaling spend.",
  },
];

export function ValueProps() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-scai-brand1">
            Why SCAI
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-scai-text sm:text-4xl">
            Built for publishers who need{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              volume and quality.
            </span>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <motion.div
              key={v.label}
              className="group relative rounded-2xl border border-scai-border/60 bg-[#0b0f14] p-6 transition-colors hover:border-[#7fffd4]/30"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#7fffd4]/20 bg-[#7fffd4]/[0.06]">
                {v.icon}
              </div>
              <h3 className="text-base font-semibold text-scai-text">
                {v.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-scai-text-sec">
                {v.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
