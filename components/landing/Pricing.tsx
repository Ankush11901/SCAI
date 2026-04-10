"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check } from "lucide-react";

interface Plan {
  name: string;
  price: string;
  priceUnit?: string;
  priceYearly?: string;
  period: string;
  credits: string;
  articles?: string;
  featured: boolean;
  badge?: string;
  cta: string;
  ctaStyle: "primary" | "outline";
  features: string[];
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    credits: "100 credits/month",
    articles: "~7 articles/month",
    featured: false,
    badge: "",
    cta: "Generate Free Articles",
    ctaStyle: "outline",
    features: [
      "All 9 article types",
      "Real-time streaming preview",
      "Standard AI images (Flux)",
      "Up to 1,000 words/article",
      "Export to all CMS platforms",
      "Bulk & cluster generation",
      "310+ validation rules",
      "Generation history & cost tracking",
    ],
  },
  {
    name: "Pro",
    price: "$99",
    priceYearly: "$79",
    period: "/month",
    credits: "2,000 credits/month",
    articles: "~125 articles/month",
    featured: true,
    badge: "MOST POPULAR",
    cta: "Start Pro Trial",
    ctaStyle: "primary",
    features: [
      "Everything in Free, plus:",
      "Premium AI images (Gemini + Imagen)",
      "Up to 5,000 words/article",
      "Up to 10 images/article",
      "Overage billing (capped)",
      "Priority support",
      "Weekly community calls",
    ],
  },
  {
    name: "Pay As You Go",
    price: "$0.05",
    priceUnit: "/ credit",
    period: "",
    credits: "Buy once, use anytime",
    featured: false,
    badge: "FLEXIBLE",
    cta: "Buy Credits Now",
    ctaStyle: "outline",
    features: [
      "Everything in Pro — no subscription",
      "Credits never expire",
      "100 credits for $5",
      "500 credits for $25",
      "1,000 credits for $50",
      "5,000 credits for $250",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-scai-brand1">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-scai-text sm:text-4xl">
            Start free.{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Scale when ready.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-scai-text-sec">
            Every plan includes all 9 article types, bulk generation, and 310+ validation rules. Pick the commitment level that fits your workflow.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-[1100px] gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`relative rounded-2xl border p-8 ${
                plan.featured
                  ? "border-scai-brand1/40 bg-scai-card shadow-glow"
                  : "border-scai-border/60 bg-scai-card"
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              {plan.badge && (
                <div
                  className={`absolute -top-3 left-8 rounded-full px-3 py-1 text-[10px] font-bold ${
                    plan.featured
                      ? "bg-gradient-primary text-scai-page"
                      : "border border-scai-border-bright bg-scai-card text-scai-text-sec"
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-scai-text">
                  {plan.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-scai-text">
                    {plan.price}
                  </span>
                  {plan.priceUnit && (
                    <span className="text-sm text-scai-text-sec">
                      {plan.priceUnit}
                    </span>
                  )}
                  {plan.period && (
                    <span className="text-sm text-scai-text-sec">
                      {plan.period}
                    </span>
                  )}
                </div>
                {plan.priceYearly && (
                  <p className="mt-1 text-xs text-scai-brand1">
                    or {plan.priceYearly}/mo billed yearly (save 20%)
                  </p>
                )}
                <div className="mt-3 flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-scai-text-sec">
                    {plan.credits}
                  </span>
                  {plan.articles && (
                    <span className="text-xs text-scai-text-muted">
                      {plan.articles}
                    </span>
                  )}
                </div>
              </div>

              <Link
                href="/login"
                className={`mb-6 flex w-full items-center justify-center rounded-full py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${
                  plan.ctaStyle === "primary"
                    ? "bg-gradient-primary text-scai-page shadow-glow"
                    : "border border-scai-border-bright bg-transparent text-scai-text hover:bg-scai-surface"
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="flex flex-col gap-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-scai-text-sec"
                  >
                    <Check
                      size={14}
                      className="mt-0.5 shrink-0 text-scai-brand1"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
