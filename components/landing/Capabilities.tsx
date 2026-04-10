"use client";

import { motion } from "motion/react";
import Image from "next/image";

/* ─── Data ─── */
const capabilities = [
  {
    title: "9 Article Types",
    subtitle: "Affiliate, how-to, review, comparison, listicle, recipe, and more — each with its own layout, components, and validation logic.",
    image: "/capabilities/article-types.png",
  },
  {
    title: "Real-Time Streaming",
    subtitle: "Watch your article build section by section in a live HTML preview. No waiting — review and edit as it writes.",
    image: "/capabilities/streaming.png",
  },
  {
    title: "Bulk Generation",
    subtitle: "Upload a CSV or keyword list and generate up to 100 articles in one batch — with per-article status tracking and retry on failure.",
    image: "/capabilities/bulk.png",
  },
  {
    title: "One-Click CMS Publish",
    subtitle: "Publish directly to WordPress, Medium, Ghost, Webflow, Shopify, Dev.to, or Hashnode — no copy-pasting, no reformatting.",
    image: "/capabilities/cms.png",
  },
  {
    title: "AI-Generated Images",
    subtitle: "Hero images, section visuals, and SEO-optimized alt text — generated automatically for every article you create.",
    image: "/capabilities/images.png",
  },
  {
    title: "310+ Validation Rules",
    subtitle: "Every article is scored against H-structure, keyword density, alt text, word count, banned AI phrases, and content flow before you publish.",
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
            Structured HTML, auto-generated images, SEO validation, and
            one-click publishing — built into every article.
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
              {/* Illustration area — fills full card width */}
              <div className="relative h-40 w-full sm:h-44">
                <Image
                  src={cap.image}
                  alt={cap.title}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* Bottom fade into text strip */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#141414] to-transparent" />
              </div>

              {/* Text strip — flush against image, fills remaining space */}
              <div className="flex-1 bg-[#141414] px-8 py-5">
                <h3 className="text-lg font-semibold text-white">
                  {cap.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#b0b0b0]">
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
