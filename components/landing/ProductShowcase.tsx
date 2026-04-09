"use client";

import { motion } from "motion/react";

/* ─── Shared: SVG Neon Glow Filter ─── */
function NeonDefs() {
  return (
    <defs>
      <filter id="nGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b2" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b3" />
        <feMerge>
          <feMergeNode in="b3" />
          <feMergeNode in="b2" />
          <feMergeNode in="b1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

/* ─── 1. Streaming Assembly — Wireframe document with lines appearing ─── */
function WireframeStreaming() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <span className="mb-4 self-start text-[10px] font-semibold uppercase tracking-wider text-scai-text-muted">
        Real-Time Streaming
      </span>
      <svg viewBox="0 0 200 240" className="h-auto w-full max-w-[180px]">
        <NeonDefs />
        <g filter="url(#nGlow)">
          {/* Document outline */}
          <rect
            x="20"
            y="10"
            width="160"
            height="220"
            rx="6"
            fill="none"
            stroke="#7fffd4"
            strokeWidth="1.8"
            opacity="0.8"
          />
          {/* Nested contour */}
          <rect
            x="32"
            y="22"
            width="136"
            height="196"
            rx="3"
            fill="none"
            stroke="#66e0c2"
            strokeWidth="0.5"
            opacity="0.25"
          />
          {/* H1 line */}
          <motion.line
            x1="40" y1="45" x2="140" y2="45"
            stroke="#7fffd4" strokeWidth="2.5" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{ duration: 1, delay: 0.2, repeat: Infinity, repeatDelay: 4 }}
          />
          {/* Image placeholder */}
          <motion.rect
            x="40" y="60" width="120" height="50" rx="3"
            fill="none" stroke="#7fffd4" strokeWidth="0.8" strokeDasharray="4 3"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.4, 0] }}
            transition={{ duration: 5, delay: 0.8, repeat: Infinity }}
          />
          {/* Cross inside image placeholder */}
          <motion.line
            x1="40" y1="60" x2="160" y2="110"
            stroke="#66e0c2" strokeWidth="0.4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.2, 0.2, 0] }}
            transition={{ duration: 5, delay: 0.8, repeat: Infinity }}
          />
          <motion.line
            x1="160" y1="60" x2="40" y2="110"
            stroke="#66e0c2" strokeWidth="0.4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.2, 0.2, 0] }}
            transition={{ duration: 5, delay: 0.8, repeat: Infinity }}
          />
          {/* Text lines streaming in */}
          {[125, 140, 155, 172, 187, 202].map((y, i) => (
            <motion.line
              key={y}
              x1="40"
              y1={y}
              x2={40 + 60 + Math.sin(i * 2.1) * 50}
              y2={y}
              stroke="#7fffd4"
              strokeWidth={i === 3 ? 1.8 : 0.8}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: i === 3 ? 0.7 : 0.4 }}
              transition={{
                duration: 0.6,
                delay: 1.5 + i * 0.4,
                repeat: Infinity,
                repeatDelay: 4,
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ─── 2. Article Types — 3x3 Isometric Grid of Shapes ─── */
function WireframeArticleTypes() {
  const types = [
    "Affiliate", "How-To", "Comparison",
    "Review", "Listicle", "Recipe",
    "Local", "Info", "Commercial",
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <span className="mb-4 self-start text-[10px] font-semibold uppercase tracking-wider text-scai-text-muted">
        9 Article Types
      </span>
      <svg viewBox="0 0 200 200" className="h-auto w-full max-w-[180px]">
        <NeonDefs />
        <g filter="url(#nGlow)">
          {types.map((type, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const x = 15 + col * 62;
            const y = 5 + row * 62;
            return (
              <g key={type}>
                {/* Isometric tile */}
                <motion.path
                  d={`M ${x + 28} ${y} L ${x + 56} ${y + 16} L ${x + 28} ${y + 32} L ${x} ${y + 16} Z`}
                  fill="none"
                  stroke="#7fffd4"
                  strokeWidth="1.2"
                  initial={{ opacity: 0.2 }}
                  animate={{ opacity: [0.2, 0.9, 0.2] }}
                  transition={{
                    duration: 2,
                    delay: i * 0.25,
                    repeat: Infinity,
                    repeatDelay: 6,
                  }}
                />
                {/* Inner contour */}
                <path
                  d={`M ${x + 28} ${y + 6} L ${x + 46} ${y + 16} L ${x + 28} ${y + 26} L ${x + 10} ${y + 16} Z`}
                  fill="none"
                  stroke="#66e0c2"
                  strokeWidth="0.4"
                  opacity="0.2"
                />
                {/* Label */}
                <text
                  x={x + 28}
                  y={y + 46}
                  textAnchor="middle"
                  fill="#66e0c2"
                  fontSize="7"
                  fontFamily="Inter, sans-serif"
                  opacity="0.5"
                >
                  {type}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/* ─── 3. Validation — Wireframe Compliance Ring ─── */
function WireframeValidation() {
  const circumference = 2 * Math.PI * 55;
  const target = 94;

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <span className="mb-4 self-start text-[10px] font-semibold uppercase tracking-wider text-scai-text-muted">
        Content Validation
      </span>
      <svg viewBox="0 0 160 160" className="h-auto w-full max-w-[150px]">
        <NeonDefs />
        <g filter="url(#nGlow)">
          {/* Track ring */}
          <circle cx="80" cy="80" r="55" fill="none" stroke="#66e0c2" strokeWidth="1" opacity="0.15" />
          {/* Nested contour rings */}
          <circle cx="80" cy="80" r="48" fill="none" stroke="#66e0c2" strokeWidth="0.4" opacity="0.1" />
          <circle cx="80" cy="80" r="62" fill="none" stroke="#66e0c2" strokeWidth="0.4" opacity="0.1" />
          {/* Progress ring */}
          <motion.circle
            cx="80"
            cy="80"
            r="55"
            fill="none"
            stroke="#7fffd4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            style={{ transform: "rotate(-90deg)", transformOrigin: "80px 80px" }}
            animate={{
              strokeDashoffset: circumference - (target / 100) * circumference,
            }}
            transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
          />
          {/* Score text */}
          <text
            x="80"
            y="76"
            textAnchor="middle"
            fill="#7fffd4"
            fontSize="22"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            94%
          </text>
          <text
            x="80"
            y="94"
            textAnchor="middle"
            fill="#66e0c2"
            fontSize="8"
            fontFamily="Inter, sans-serif"
            opacity="0.6"
          >
            310 rules
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ─── 4. Bulk Generation — Stacked Wireframe Rows ─── */
function WireframeBulkGen() {
  const rows = 6;

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <span className="mb-4 self-start text-[10px] font-semibold uppercase tracking-wider text-scai-text-muted">
        Bulk Generation
      </span>
      <svg viewBox="0 0 200 180" className="h-auto w-full max-w-[180px]">
        <NeonDefs />
        <g filter="url(#nGlow)">
          {Array.from({ length: rows }).map((_, i) => {
            const y = 10 + i * 27;
            const skew = 8 - i * 0.5;
            return (
              <g key={i}>
                {/* Row wireframe */}
                <motion.path
                  d={`M ${10 + skew} ${y} L ${190 + skew} ${y} L ${190} ${y + 18} L ${10} ${y + 18} Z`}
                  fill="none"
                  stroke="#7fffd4"
                  strokeWidth={i === 0 ? 1.8 : 0.8}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, i < 3 ? 0.8 : 0.35, i < 3 ? 0.8 : 0.35, 0] }}
                  transition={{
                    duration: 4,
                    delay: i * 0.3,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                />
                {/* Status dot */}
                <motion.circle
                  cx={178 + skew * 0.5}
                  cy={y + 9}
                  r="3"
                  fill="none"
                  stroke="#7fffd4"
                  strokeWidth="1"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 0.8, 0.8, 0],
                    fill: ["none", i < 3 ? "#7fffd4" : "none"],
                  }}
                  transition={{
                    duration: 4,
                    delay: i * 0.3,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                />
                {/* Inner text line */}
                <motion.line
                  x1={20 + skew}
                  y1={y + 9}
                  x2={80 + skew + Math.sin(i) * 30}
                  y2={y + 9}
                  stroke="#66e0c2"
                  strokeWidth="0.6"
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.3, 0.3, 0] }}
                  transition={{
                    duration: 4,
                    delay: i * 0.3,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/* ─── 5. CMS Publish — Wireframe Connection Flow ─── */
function WireframeCMSPublish() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <span className="mb-4 self-start text-[10px] font-semibold uppercase tracking-wider text-scai-text-muted">
        One-Click Publish
      </span>
      <svg viewBox="0 0 200 150" className="h-auto w-full max-w-[180px]">
        <NeonDefs />
        <g filter="url(#nGlow)">
          {/* Source document (left) */}
          <rect x="10" y="30" width="50" height="65" rx="4" fill="none" stroke="#7fffd4" strokeWidth="1.5" opacity="0.8" />
          <line x1="20" y1="45" x2="50" y2="45" stroke="#66e0c2" strokeWidth="0.6" opacity="0.3" />
          <line x1="20" y1="55" x2="45" y2="55" stroke="#66e0c2" strokeWidth="0.6" opacity="0.3" />
          <line x1="20" y1="65" x2="48" y2="65" stroke="#66e0c2" strokeWidth="0.6" opacity="0.3" />
          <line x1="20" y1="75" x2="40" y2="75" stroke="#66e0c2" strokeWidth="0.6" opacity="0.3" />

          {/* Animated data flow line */}
          <motion.line
            x1="65" y1="62" x2="135" y2="62"
            stroke="#7fffd4"
            strokeWidth="1.2"
            strokeDasharray="6 4"
            initial={{ strokeDashoffset: 40 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />

          {/* Flow arrow */}
          <path d="M 128 56 L 136 62 L 128 68" fill="none" stroke="#7fffd4" strokeWidth="1.2" opacity="0.7" />

          {/* Destination CMS targets (right) - stacked isometric */}
          {[0, 1, 2].map((i) => {
            const y = 25 + i * 25;
            const x = 140;
            const opacity = 1 - i * 0.25;
            return (
              <g key={i}>
                <motion.rect
                  x={x}
                  y={y}
                  width="50"
                  height="20"
                  rx="3"
                  fill="none"
                  stroke="#7fffd4"
                  strokeWidth={i === 0 ? 1.5 : 0.8}
                  opacity={opacity}
                  animate={{ opacity: [opacity * 0.5, opacity, opacity * 0.5] }}
                  transition={{
                    duration: 2,
                    delay: i * 0.3,
                    repeat: Infinity,
                  }}
                />
                {/* Inner wireframe line */}
                <line
                  x1={x + 8}
                  y1={y + 10}
                  x2={x + 35}
                  y2={y + 10}
                  stroke="#66e0c2"
                  strokeWidth="0.5"
                  opacity={opacity * 0.4}
                />
              </g>
            );
          })}

          {/* Labels */}
          <text x="35" y="115" textAnchor="middle" fill="#66e0c2" fontSize="8" fontFamily="Inter, sans-serif" opacity="0.5">
            Article
          </text>
          <text x="165" y="115" textAnchor="middle" fill="#66e0c2" fontSize="8" fontFamily="Inter, sans-serif" opacity="0.5">
            7 CMS
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ─── 6. Product Card — Wireframe Affiliate Card ─── */
function WireframeProductCard() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <span className="mb-4 self-start text-[10px] font-semibold uppercase tracking-wider text-scai-text-muted">
        Affiliate Product Cards
      </span>
      <svg viewBox="0 0 220 140" className="h-auto w-full max-w-[200px]">
        <NeonDefs />
        <g filter="url(#nGlow)">
          {/* Card outline */}
          <rect x="10" y="10" width="200" height="120" rx="8" fill="none" stroke="#7fffd4" strokeWidth="1.8" opacity="0.8" />
          {/* Nested contour */}
          <rect x="18" y="18" width="184" height="104" rx="5" fill="none" stroke="#66e0c2" strokeWidth="0.4" opacity="0.15" />

          {/* Product image area */}
          <rect x="25" y="25" width="60" height="60" rx="4" fill="none" stroke="#7fffd4" strokeWidth="1" opacity="0.5" />
          <line x1="25" y1="25" x2="85" y2="85" stroke="#66e0c2" strokeWidth="0.3" opacity="0.15" />
          <line x1="85" y1="25" x2="25" y2="85" stroke="#66e0c2" strokeWidth="0.3" opacity="0.15" />

          {/* Title lines */}
          <motion.line
            x1="100" y1="30" x2="185" y2="30"
            stroke="#7fffd4" strokeWidth="1.8" strokeLinecap="round"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <line x1="100" y1="42" x2="170" y2="42" stroke="#66e0c2" strokeWidth="0.6" opacity="0.3" />

          {/* Star rating wireframe */}
          {[0, 1, 2, 3, 4].map((s) => (
            <motion.path
              key={s}
              d={`M ${100 + s * 14} 54 l 4 -8 4 8 -6.5 -4.7h13l-6.5 4.7z`}
              fill="none"
              stroke="#7fffd4"
              strokeWidth="0.8"
              animate={{ opacity: [0.3, s < 4 ? 0.8 : 0.3, 0.3] }}
              transition={{ duration: 2, delay: s * 0.1, repeat: Infinity }}
            />
          ))}

          {/* Price */}
          <text x="100" y="80" fill="#7fffd4" fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif" opacity="0.7">
            $129.99
          </text>

          {/* CTA button wireframe */}
          <rect x="25" y="98" width="180" height="24" rx="4" fill="none" stroke="#7fffd4" strokeWidth="1" opacity="0.5" />
          <text x="115" y="114" textAnchor="middle" fill="#66e0c2" fontSize="8" fontFamily="Inter, sans-serif" opacity="0.4">
            View on Amazon
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ─── 7. HTML Output — Wireframe Code Block ─── */
function WireframeCodeOutput() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <span className="mb-4 self-start text-[10px] font-semibold uppercase tracking-wider text-scai-text-muted">
        Clean HTML Output
      </span>
      <svg viewBox="0 0 220 160" className="h-auto w-full max-w-[200px]">
        <NeonDefs />
        <g filter="url(#nGlow)">
          {/* Browser chrome frame */}
          <rect x="5" y="5" width="210" height="150" rx="6" fill="none" stroke="#7fffd4" strokeWidth="1.5" opacity="0.7" />
          {/* Title bar */}
          <line x1="5" y1="25" x2="215" y2="25" stroke="#7fffd4" strokeWidth="0.6" opacity="0.3" />
          {/* Traffic light dots */}
          <circle cx="18" cy="15" r="3" fill="none" stroke="#7fffd4" strokeWidth="0.8" opacity="0.4" />
          <circle cx="28" cy="15" r="3" fill="none" stroke="#66e0c2" strokeWidth="0.8" opacity="0.3" />
          <circle cx="38" cy="15" r="3" fill="none" stroke="#66e0c2" strokeWidth="0.8" opacity="0.2" />

          {/* Code lines with tag bracket highlights */}
          {[
            { x: 15, w: 80, indent: 0, bright: true },
            { x: 15, w: 60, indent: 12, bright: false },
            { x: 15, w: 100, indent: 24, bright: false },
            { x: 15, w: 45, indent: 24, bright: false },
            { x: 15, w: 75, indent: 12, bright: false },
            { x: 15, w: 90, indent: 12, bright: true },
            { x: 15, w: 55, indent: 24, bright: false },
            { x: 15, w: 70, indent: 12, bright: false },
            { x: 15, w: 50, indent: 0, bright: true },
          ].map((line, i) => (
            <motion.line
              key={i}
              x1={line.x + line.indent}
              y1={35 + i * 13}
              x2={line.x + line.indent + line.w}
              y2={35 + i * 13}
              stroke={line.bright ? "#7fffd4" : "#66e0c2"}
              strokeWidth={line.bright ? 1.2 : 0.7}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: line.bright ? 0.8 : 0.3 }}
              transition={{ duration: 0.4, delay: i * 0.15, repeat: Infinity, repeatDelay: 5 }}
            />
          ))}

          {/* Angle brackets */}
          <text x="15" y="39" fill="#7fffd4" fontSize="8" fontFamily="monospace" opacity="0.6">
            {"<"}
          </text>
          <text x="15" y="143" fill="#7fffd4" fontSize="8" fontFamily="monospace" opacity="0.6">
            {"</>"}
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ─── Main Showcase Section ─── */
export function ProductShowcase() {
  return (
    <section id="showcase" className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-scai-brand1">
            Product
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-scai-text sm:text-4xl">
            See the content engine{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              in action.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-scai-text-sec">
            Every capability visualized — from real-time article streaming to
            bulk generation, validation, and one-click CMS publishing.
          </p>
        </div>

        {/* Bento grid with neon wireframe illustrations */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Large: Streaming preview */}
          <motion.div
            className="neon-grain relative row-span-2 overflow-hidden rounded-2xl border border-scai-border/60 bg-[#0b0f14]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4 }}
          >
            <WireframeStreaming />
          </motion.div>

          {/* Article types */}
          <motion.div
            className="neon-grain relative overflow-hidden rounded-2xl border border-scai-border/60 bg-[#0b0f14]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            <WireframeArticleTypes />
          </motion.div>

          {/* Validation ring */}
          <motion.div
            className="neon-grain relative overflow-hidden rounded-2xl border border-scai-border/60 bg-[#0b0f14]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: 0.16 }}
          >
            <WireframeValidation />
          </motion.div>

          {/* Bulk generation */}
          <motion.div
            className="neon-grain relative overflow-hidden rounded-2xl border border-scai-border/60 bg-[#0b0f14]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: 0.24 }}
          >
            <WireframeBulkGen />
          </motion.div>

          {/* CMS Publish */}
          <motion.div
            className="neon-grain relative overflow-hidden rounded-2xl border border-scai-border/60 bg-[#0b0f14]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: 0.32 }}
          >
            <WireframeCMSPublish />
          </motion.div>
        </div>

        {/* Second row: wide cards */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <motion.div
            className="neon-grain relative overflow-hidden rounded-2xl border border-scai-border/60 bg-[#0b0f14]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            <WireframeProductCard />
          </motion.div>

          <motion.div
            className="neon-grain relative overflow-hidden rounded-2xl border border-scai-border/60 bg-[#0b0f14]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: 0.16 }}
          >
            <WireframeCodeOutput />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
