"use client";

import { motion } from "motion/react";
import { LayoutGrid, ShieldCheck, Layers, CircleDollarSign } from "lucide-react";

const values = [
  {
    icon: <LayoutGrid className="h-6 w-6 text-[#7fffd4]" />,
    label: "Purpose-Built Layouts",
    description:
      "Affiliate, recipe, comparison, review — each article type gets its own structure, components, and validation rules. Not one template for everything.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-[#7fffd4]" />,
    label: "310+ Quality Checks",
    description:
      "H-structure, keyword density, alt text, banned phrases, and content flow — all checked automatically before anything reaches your CMS.",
  },
  {
    icon: <Layers className="h-6 w-6 text-[#7fffd4]" />,
    label: "100 Articles Per Batch",
    description:
      "Upload a CSV or paste keywords. Generate up to 100 articles at once with live tracking, retries, and batch download.",
  },
  {
    icon: <CircleDollarSign className="h-6 w-6 text-[#7fffd4]" />,
    label: "$0.54 Per Article",
    description:
      "A full article with AI images costs $0.54. Clusters drop to $0.39 each. Publish more without spending more.",
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
