"use client";

import { motion } from "motion/react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/* ── Data ────────────────────────────────────────────────────────────────── */

interface FlowNode {
  id: string;
  label: string;
  logo: string;
}

const inputNodes: { group: string; items: FlowNode[] }[] = [
  {
    group: "CMS Sources",
    items: [
      { id: "strapi", label: "Strapi", logo: "https://i.ibb.co/q830LVh/Strapi-Logo.png" },
      { id: "contentful", label: "Contentful", logo: "https://i.ibb.co/LDQGH3h7/Contentful-logo.png" },
      { id: "drupal", label: "Drupal", logo: "https://i.ibb.co/MyB51J4B/Durpal-Logo.png" },
    ],
  },
  {
    group: "Builders",
    items: [
      { id: "webflow-in", label: "Webflow", logo: "https://i.ibb.co/8nqJb23D/Webflow-logo.png" },
    ],
  },
];

const outputNodes: { group: string; items: FlowNode[] }[] = [
  {
    group: "Platforms",
    items: [
      { id: "wordpress", label: "WordPress", logo: "https://i.ibb.co/j9rdD5gW/Wordpress-logo.png" },
      { id: "shopify", label: "Shopify", logo: "https://i.ibb.co/fGVXWv1S/Shopify-Logo.png" },
      { id: "webflow-out", label: "Webflow", logo: "https://i.ibb.co/8nqJb23D/Webflow-logo.png" },
      { id: "medium", label: "Medium", logo: "https://i.ibb.co/RTBBXpVm/Medium-Logo.png" },
    ],
  },
  {
    group: "Publishing",
    items: [
      { id: "devto", label: "Dev.to", logo: "https://i.ibb.co/gZyHZRmp/Devto-Logo.png" },
      { id: "ghost", label: "Ghost", logo: "https://i.ibb.co/d4wGWwVv/Ghost-logo.png" },
      { id: "hashnode", label: "Hashnode", logo: "https://i.ibb.co/W4H4pxP2/hashnode-logo.png" },
    ],
  },
];

const allInputItems = inputNodes.flatMap((g) => g.items);
const allOutputItems = outputNodes.flatMap((g) => g.items);
const totalLines = allInputItems.length + allOutputItems.length;

/* ── Sub-components ──────────────────────────────────────────────────────── */

function LogoCard({
  node,
  side,
  index,
}: {
  node: FlowNode;
  side: "left" | "right";
  index: number;
}) {
  return (
    <motion.div
      className="integration-node relative flex cursor-default select-none items-center justify-center rounded-lg border border-white/[0.03] bg-white/[0.015] p-2.5 transition-all duration-300 hover:border-[#40EDC3]/15 hover:bg-white/[0.03]"
      initial={{ opacity: 0, x: side === "left" ? -16 : 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: 0.15 + index * 0.05 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={node.logo}
        alt={node.label}
        className="h-5 max-w-[90px] object-contain opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{ filter: "brightness(0.9)" }}
        draggable={false}
      />
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
      className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.span>
  );
}

/* ── Animated SVG connection lines ──────────────────────────────────────── */

function AnimatedLines() {
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const container = svg.parentElement;
    if (!container) return;

    function getRect(el: Element) {
      const r = el.getBoundingClientRect();
      const cr = container!.getBoundingClientRect();
      return {
        cx: r.left - cr.left + r.width / 2,
        cy: r.top - cr.top + r.height / 2,
        right: r.left - cr.left + r.width,
        left: r.left - cr.left,
      };
    }

    function buildPaths() {
      const hub = container!.querySelector(".integration-hub");
      const nodes = container!.querySelectorAll(".integration-node");
      if (!hub || nodes.length === 0) return;

      const hubRect = getRect(hub);
      const hubCx = hubRect.cx;
      const hubCy = hubRect.cy;

      // Clear previous
      while (svg!.firstChild) svg!.removeChild(svg!.firstChild);

      // Defs for laser gradient
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svg!.appendChild(defs);

      // Collect path data for canvas animation
      const pathData: { path: SVGPathElement; len: number; speed: number; offset: number }[] = [];

      nodes.forEach((node, i) => {
        const nr = getRect(node);
        const isLeft = nr.cx < hubCx;

        // Start/end points
        const sx = isLeft ? nr.right : nr.left;
        const sy = nr.cy;
        const ex = isLeft ? hubRect.left : hubRect.right;
        const ey = hubCy;

        // Curved path via cubic bezier
        const cpOffset = Math.abs(ex - sx) * 0.45;
        const cp1x = isLeft ? sx + cpOffset : sx - cpOffset;
        const cp2x = isLeft ? ex - cpOffset : ex + cpOffset;
        const d = `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ey}, ${ex} ${ey}`;

        // Static dim line (the track)
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "rgba(64,237,195,0.08)");
        path.setAttribute("stroke-width", "1");
        svg!.appendChild(path);

        // Store for animation
        pathData.push({
          path,
          len: path.getTotalLength(),
          speed: 0.003 + (i % 5) * 0.0008,
          offset: (i * 0.12) % 1,
        });
      });

      // Laser animation via canvas overlay
      const cvs = document.createElement("canvas");
      cvs.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;";
      container!.appendChild(cvs);

      const dpr = window.devicePixelRatio || 1;
      const rect = container!.getBoundingClientRect();
      cvs.width = rect.width * dpr;
      cvs.height = rect.height * dpr;
      const c = cvs.getContext("2d")!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      let raf: number;
      const laserLen = 40; // px length of the laser streak

      function animate() {
        c.clearRect(0, 0, rect.width, rect.height);

        for (const pd of pathData) {
          pd.offset += pd.speed;
          if (pd.offset > 1) pd.offset -= 1;

          const headDist = pd.offset * pd.len;
          const tailDist = Math.max(0, headDist - laserLen);

          // Draw laser streak as a series of points with fading opacity
          const steps = 14;
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const dist = tailDist + (headDist - tailDist) * t;
            if (dist < 0 || dist > pd.len) continue;

            const pt = pd.path.getPointAtLength(dist);
            const alpha = t * t; // quadratic ramp — sharp bright head, fading tail

            c.beginPath();
            c.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2);
            c.fillStyle = `rgba(64,237,195,${alpha * 0.9})`;
            c.fill();
          }

          // Bright hard leading edge point
          if (headDist <= pd.len) {
            const head = pd.path.getPointAtLength(headDist);
            c.beginPath();
            c.arc(head.x, head.y, 1.5, 0, Math.PI * 2);
            c.fillStyle = "rgba(64,237,195,1)";
            c.fill();

            // Tight glow right at the head — not soft/fairy, just a thin halo
            c.beginPath();
            c.arc(head.x, head.y, 3, 0, Math.PI * 2);
            c.fillStyle = "rgba(64,237,195,0.2)";
            c.fill();
          }
        }

        raf = requestAnimationFrame(animate);
      }

      raf = requestAnimationFrame(animate);

      // Store cleanup ref
      (svg as any).__laserCleanup = () => {
        cancelAnimationFrame(raf);
        cvs.remove();
      };
    }

    // Build after a short delay to let layout settle
    const timer = setTimeout(buildPaths, 200);

    const resizeObserver = new ResizeObserver(() => {
      buildPaths();
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if ((svg as any).__laserCleanup) (svg as any).__laserCleanup();
    };
  }, [uid]);

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 1 }}
    />
  );
}

/* ── Integration Flow Diagram ────────────────────────────────────────────── */

function IntegrationFlowDiagram() {
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

      {/* SVG lines layer */}
      <AnimatedLines />

      {/* 5-column grid: inputs | gap | engine | gap | outputs */}
      <div className="relative z-10 grid w-full max-w-[540px] grid-cols-[minmax(0,1fr)_32px_auto_32px_minmax(0,1fr)] items-center sm:grid-cols-[minmax(0,1fr)_40px_auto_40px_minmax(0,1fr)] lg:max-w-[580px] lg:grid-cols-[minmax(0,1fr)_52px_auto_52px_minmax(0,1fr)]">
        {/* ── Col 1: Inputs ──────────────────────── */}
        <div className="flex flex-col gap-4">
          {inputNodes.map((group, gi) => (
            <div key={group.group}>
              <SectionLabel delay={0.1 + gi * 0.15}>{group.group}</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {group.items.map((n, i) => (
                  <LogoCard
                    key={n.id}
                    node={n}
                    side="left"
                    index={gi * 3 + i}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Col 2: spacer (lines drawn by SVG) ── */}
        <div />

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
            className="integration-hub neon-float relative flex h-[100px] w-[100px] items-center justify-center rounded-2xl border border-[#40EDC3]/20 sm:h-[116px] sm:w-[116px]"
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
          </div>
        </motion.div>

        {/* ── Col 4: spacer ─────────────────────── */}
        <div />

        {/* ── Col 5: Outputs ─────────────────────── */}
        <div className="flex flex-col gap-4">
          {outputNodes.map((group, gi) => (
            <div key={group.group}>
              <SectionLabel delay={0.1 + gi * 0.15}>{group.group}</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {group.items.map((n, i) => (
                  <LogoCard
                    key={n.id}
                    node={n}
                    side="right"
                    index={gi * 4 + i}
                  />
                ))}
              </div>
            </div>
          ))}
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
              Generate articles with Claude, GPT-4, or Gemini. Pull real
              product data from Amazon. Publish to any of 7 CMS platforms
              without leaving SCAI.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                {
                  label: "7 CMS Platforms",
                  desc: "WordPress, Medium, Ghost, Webflow, Shopify, Dev.to, Hashnode",
                },
                {
                  label: "3 AI Providers",
                  desc: "Claude, GPT-4, and Gemini with automatic fallback if one provider is down",
                },
                {
                  label: "Amazon Associates",
                  desc: "Live pricing, star ratings, and affiliate links pulled directly into your articles",
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
