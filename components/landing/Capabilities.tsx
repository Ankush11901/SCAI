"use client";

import { motion } from "motion/react";
import Image from "next/image";

/* ─── Data ─── */
const capabilities = [
  {
    title: "9 Article Types",
    subtitle: "Affiliate, review, recipe, and six more — each with its own layout and components.",
    image: "/capabilities/article-types.png",
  },
  {
    title: "Real-Time Streaming",
    subtitle: "Watch your article build section by section with a live HTML preview as it generates.",
    image: "/capabilities/streaming.png",
  },
  {
    title: "Bulk Generation",
    subtitle: "Generate up to 100 articles from a CSV or keyword list with per-article tracking.",
    image: "/capabilities/bulk.png",
  },
  {
    title: "One-Click CMS Publish",
    subtitle: "Export directly to WordPress, Medium, Ghost, Webflow, Shopify, Dev.to, or Hashnode.",
    image: "/capabilities/cms.png",
  },
  {
    title: "AI-Generated Images",
    subtitle: "Featured hero and section images with SEO-targeted alt text, created automatically.",
    image: "/capabilities/images.png",
  },
  {
    title: "310+ Validation Rules",
    subtitle: "Every article checked for H-structure, keyword density, alt text, and word counts.",
    image: "/capabilities/validation.png",
  },
];

export function Capabilities() {
  return (
    <section
      id="features"
      className="relative overflow-hidden py-24 sm:py-32"
    >
      {/* Green gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-scai-brand1/[0.06] via-scai-brand2/[0.04] to-transparent" />
      <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-scai-brand1/[0.07] blur-[120px]" />

      <div className="relative mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-scai-brand1">
            Capabilities
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-scai-text sm:text-4xl">
            A complete content engine,{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              not a chat wrapper.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-scai-text-sec">
            Every article ships with structured HTML, scoped CSS, SEO
            validation, and CMS-ready formatting.
          </p>
        </div>

        {/* Cards grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              className="group relative flex flex-col overflow-hidden rounded-3xl"
              style={{
                background: "linear-gradient(135deg, #1a1a1a, #2a2a2a)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              {/* Illustration area — fixed height, constrained width, centered */}
              <div className="flex h-48 items-center justify-center px-6 pt-6">
                <div className="relative h-[140px] w-[200px]">
                  <Image
                    src={cap.image}
                    alt={cap.title}
                    fill
                    className="object-contain"
                    sizes="200px"
                  />
                </div>
              </div>

              {/* Text strip — slightly darker bg for separation */}
              <div className="mt-auto bg-[#141414] px-8 py-5">
                <h3 className="text-lg font-semibold text-white">
                  {cap.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#a0a0a0]">
                  {cap.subtitle}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
