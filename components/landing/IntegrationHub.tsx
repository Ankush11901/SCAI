"use client";

import { motion } from "motion/react";
import { useState, type ReactNode } from "react";

/* ── Data ────────────────────────────────────────────────────────────────── */

interface FlowNode {
  id: string;
  label: string;
}

const aiModels: FlowNode[] = [
  { id: "claude", label: "Claude" },
  { id: "gpt4", label: "GPT-4" },
  { id: "gemini", label: "Gemini" },
];

const dataSources: FlowNode[] = [{ id: "amazon", label: "Amazon Data" }];

const platformNodes: FlowNode[] = [
  { id: "wordpress", label: "WordPress" },
  { id: "webflow", label: "Webflow" },
  { id: "shopify", label: "Shopify" },
  { id: "medium", label: "Medium" },
];

const formatNodes: FlowNode[] = [
  { id: "html", label: "HTML" },
  { id: "csv", label: "CSV" },
  { id: "api", label: "REST API" },
];

const allInputIds = [...aiModels, ...dataSources].map((n) => n.id);
const allOutputIds = [...platformNodes, ...formatNodes].map((n) => n.id);

/* ── Sub-components ──────────────────────────────────────────────────────── */

function Pill({
  node,
  side,
  index,
  dimmed,
  onEnter,
  onLeave,
}: {
  node: FlowNode;
  side: "left" | "right";
  index: number;
  dimmed: boolean | null;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const isDimmed = dimmed === true;
  return (
    <motion.div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`relative flex cursor-default select-none items-center gap-2.5 rounded-lg border px-3.5 py-2 text-[11px] font-medium transition-all duration-300 ${
        isDimmed
          ? "border-white/[0.03] bg-white/[0.01] text-white/15"
          : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-[#40EDC3]/25 hover:bg-white/[0.05] hover:text-white/90"
      }`}
      initial={{ opacity: 0, x: side === "left" ? -16 : 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: 0.15 + index * 0.05 }}
    >
      <span
        className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors duration-300 ${
          isDimmed ? "bg-white/5" : "bg-[#40EDC3]/50"
        }`}
      />
      {node.label}
    </motion.div>
  );
}

function SectionLabel({
  children,
  delay,
}: {
  children: ReactNode;
  delay: number;
}) {
  return (
    <motion.span
      className="mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.span>
  );
}

function FlowLine({ dimmed, delay }: { dimmed: boolean; delay: number }) {
  return (
    <div className="relative h-px w-full overflow-hidden">
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          dimmed ? "opacity-20" : "opacity-100"
        }`}
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(64,237,195,0.15) 30%, rgba(64,237,195,0.15) 70%, transparent)",
        }}
      />
      {!dimmed && (
        <motion.div
          className="absolute top-0 h-full w-8"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(64,237,195,0.5), transparent)",
          }}
          animate={{ left: ["-2rem", "calc(100% + 2rem)"] }}
          transition={{
            duration: 2.5,
            delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}
    </div>
  );
}

function FlowConnector({ dimmed }: { dimmed: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 self-stretch py-8">
      <FlowLine dimmed={dimmed} delay={0} />
      <FlowLine dimmed={dimmed} delay={1.2} />
    </div>
  );
}

/* ── Integration Flow Diagram ────────────────────────────────────────────── */

function IntegrationFlowDiagram() {
  const [hovered, setHovered] = useState<string | null>(null);

  const dim = (id: string): boolean | null => {
    if (!hovered) return null;
    return id !== hovered;
  };

  const leftDimmed = hovered ? !allInputIds.includes(hovered) : false;
  const rightDimmed = hovered ? !allOutputIds.includes(hovered) : false;

  return (
    <div className="relative flex w-full items-center justify-center">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 50% 50%, rgba(64,237,195,0.04) 0%, transparent 70%)",
        }}
      />

      {/* 5-column grid: inputs | connector | engine | connector | outputs */}
      <div className="relative z-10 grid w-full max-w-[540px] grid-cols-[minmax(0,1fr)_24px_auto_24px_minmax(0,1fr)] items-center sm:grid-cols-[minmax(0,1fr)_36px_auto_36px_minmax(0,1fr)] lg:max-w-[580px] lg:grid-cols-[minmax(0,1fr)_48px_auto_48px_minmax(0,1fr)]">
        {/* ── Col 1: Inputs ──────────────────────── */}
        <div className="flex flex-col gap-4">
          <div>
            <SectionLabel delay={0.1}>AI Models</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {aiModels.map((n, i) => (
                <Pill
                  key={n.id}
                  node={n}
                  side="left"
                  index={i}
                  dimmed={dim(n.id)}
                  onEnter={() => setHovered(n.id)}
                  onLeave={() => setHovered(null)}
                />
              ))}
            </div>
          </div>
          <div>
            <SectionLabel delay={0.25}>Data Source</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {dataSources.map((n, i) => (
                <Pill
                  key={n.id}
                  node={n}
                  side="left"
                  index={i + 3}
                  dimmed={dim(n.id)}
                  onEnter={() => setHovered(n.id)}
                  onLeave={() => setHovered(null)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Col 2: Left connector ──────────────── */}
        <FlowConnector dimmed={leftDimmed} />

        {/* ── Col 3: SCAI Engine ─────────────────── */}
        <motion.div
          className="relative flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Glow behind card */}
          <div
            className="absolute -inset-5 rounded-3xl"
            style={{
              background:
                "conic-gradient(from 180deg, rgba(64,237,195,0.10), rgba(127,251,169,0.06), rgba(211,248,154,0.04), rgba(127,251,169,0.06), rgba(64,237,195,0.10))",
              filter: "blur(18px)",
              animation: "neon-pulse 5s ease-in-out infinite",
            }}
          />

          <div
            className="neon-float relative flex h-[100px] w-[100px] flex-col items-center justify-center rounded-2xl border border-[#40EDC3]/20 sm:h-[116px] sm:w-[116px]"
            style={{
              background:
                "linear-gradient(145deg, rgba(8,8,8,0.97) 0%, rgba(12,18,15,0.97) 100%)",
              boxShadow:
                "0 0 50px -12px rgba(64,237,195,0.12), inset 0 1px 0 rgba(64,237,195,0.07), inset 0 -1px 0 rgba(0,0,0,0.3)",
            }}
          >
            <div className="absolute inset-px rounded-[15px] border border-white/[0.03]" />
            {/* SCAI logo icon */}
            <svg width="40" height="40" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:h-[46px] sm:w-[46px]">
              <defs>
                <linearGradient id="intLogoGrad" x1="0.83" y1="3.57" x2="32.65" y2="36.63" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#40EDC3"/>
                  <stop offset="1" stopColor="#B8F6A1"/>
                </linearGradient>
              </defs>
              <path d="M29.3539 29.3539H3.86648V3.86648H26.5255V0H0V33.2203H33.2203V6.69943H29.3539V29.3539Z" fill="url(#intLogoGrad)"/>
              <path d="M29.2656 0.000244141V3.86672H29.3532V3.959H33.2198V0.000244141H29.2656Z" fill="url(#intLogoGrad)"/>
              <path d="M16.1357 7.53491H7.52148V11.4014H16.1357V7.53491Z" fill="url(#intLogoGrad)"/>
              <path d="M25.7021 21.8196H17.0879V25.686H25.7021V21.8196Z" fill="url(#intLogoGrad)"/>
              <path d="M25.705 14.6768H7.52148V18.5432H25.705V14.6768Z" fill="url(#intLogoGrad)"/>
            </svg>
            <span className="mt-1.5 text-[8px] font-medium uppercase tracking-[0.14em] text-white/30 sm:text-[9px]">
              Content Engine
            </span>
          </div>
        </motion.div>

        {/* ── Col 4: Right connector ─────────────── */}
        <FlowConnector dimmed={rightDimmed} />

        {/* ── Col 5: Outputs ─────────────────────── */}
        <div className="flex flex-col gap-4">
          <div>
            <SectionLabel delay={0.1}>Platforms</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {platformNodes.map((n, i) => (
                <Pill
                  key={n.id}
                  node={n}
                  side="right"
                  index={i}
                  dimmed={dim(n.id)}
                  onEnter={() => setHovered(n.id)}
                  onLeave={() => setHovered(null)}
                />
              ))}
            </div>
          </div>
          <div>
            <SectionLabel delay={0.25}>Export</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {formatNodes.map((n, i) => (
                <Pill
                  key={n.id}
                  node={n}
                  side="right"
                  index={i + 4}
                  dimmed={dim(n.id)}
                  onEnter={() => setHovered(n.id)}
                  onLeave={() => setHovered(null)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Section ────────────────────────────────────────────────────────── */

export function IntegrationHub() {
  return (
    <section id="integrations" className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Text */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-scai-brand1">
              Integrations
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-scai-text sm:text-4xl">
              Your content engine connects to{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                everything.
              </span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-scai-text-sec">
              SCAI sits at the center of your publishing workflow. Generate with
              Claude, GPT, or Gemini. Enrich with Amazon product data. Publish
              to any CMS in one click.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                {
                  label: "7 CMS Platforms",
                  desc: "WordPress, Medium, Ghost, Webflow, Shopify, Dev.to, Hashnode",
                },
                {
                  label: "3 AI Providers",
                  desc: "Claude, GPT-4, Gemini with automatic fallback chain",
                },
                {
                  label: "Amazon Associates",
                  desc: "Real product data, pricing, ratings, and affiliate links",
                },
                {
                  label: "WordPress Plugin",
                  desc: "18 design variations, in-article editing, Gutenberg block",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-scai-border/60 bg-[#0b0f14] p-4"
                >
                  <div className="text-sm font-semibold text-scai-text">
                    {item.label}
                  </div>
                  <div className="mt-1 text-xs text-scai-text-sec">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flow diagram */}
          <IntegrationFlowDiagram />
        </div>
      </div>
    </section>
  );
}
