"use client";

/* ─── Data ─── */
const testimonials = [
  {
    name: "Sarah Chen",
    handle: "@sarahchen",
    text: "We went from 2 articles a week to 15. Every one passes our editorial checklist out of the box — H-tags, alt text, keyword placement, all handled.",
    avatar: "https://i.pravatar.cc/150?img=5",
  },
  {
    name: "Marcus Johnson",
    handle: "@marcusj",
    text: "I used to spend 45 minutes reformatting every AI article for WordPress. Now I hit publish and the HTML is clean, every single time.",
    avatar: "https://i.pravatar.cc/150?img=12",
  },
  {
    name: "Emily Rodriguez",
    handle: "@emilyrod",
    text: "The validation caught missing alt text, duplicate H2s, and keyword stuffing we never noticed. Organic traffic up 40% in two months.",
    avatar: "https://i.pravatar.cc/150?img=32",
  },
  {
    name: "David Park",
    handle: "@davidpark",
    text: "Uploaded a 50-keyword CSV at 9 AM. By noon I had 50 publish-ready articles sitting in my WordPress drafts. That used to take our team two weeks.",
    avatar: "https://i.pravatar.cc/150?img=11",
  },
  {
    name: "Aisha Patel",
    handle: "@aishap",
    text: "Other AI tools give you a wall of text. SCAI gives you a structured affiliate article with product cards, comparison tables, and proper CTAs built in.",
    avatar: "https://i.pravatar.cc/150?img=25",
  },
  {
    name: "Tom Eriksson",
    handle: "@tomeriksson",
    text: "The streaming preview lets me catch tone issues mid-generation instead of after 2,000 words. Saves a full round of edits on every article.",
    avatar: "https://i.pravatar.cc/150?img=53",
  },
  {
    name: "Rachel Kim",
    handle: "@rachelkim",
    text: "We cancelled Surfer, Jasper, and our freelance writer. SCAI handles generation, SEO scoring, and publishing in one place for a fraction of the cost.",
    avatar: "https://i.pravatar.cc/150?img=47",
  },
  {
    name: "Jake Morrison",
    handle: "@jakemorrison",
    text: "Every article comes with a hero image and section visuals — all with keyword-targeted alt text. Our design team stopped doing content graphics entirely.",
    avatar: "https://i.pravatar.cc/150?img=68",
  },
];

/* Split into two rows */
const row1 = testimonials.slice(0, 4);
const row2 = testimonials.slice(4, 8);

/* ─── Card ─── */
function TestimonialCard({
  name,
  handle,
  text,
  avatar,
}: {
  name: string;
  handle: string;
  text: string;
  avatar: string;
}) {
  return (
    <div className="testimonial-card shrink-0 w-[340px] sm:w-[380px] rounded-2xl border border-white/[0.06] bg-white/[0.04] px-5 py-5 backdrop-blur-md">
      <p className="text-sm leading-relaxed text-[#b0b0b0]">{text}</p>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar}
            alt={name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-scai-brand1">{handle}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Marquee Row ─── */
function MarqueeRow({
  items,
  direction,
}: {
  items: typeof testimonials;
  direction: "left" | "right";
}) {
  const animClass =
    direction === "left"
      ? "testimonial-scroll-left"
      : "testimonial-scroll-right";

  return (
    <div className="relative overflow-hidden">
      {/* Left fade overlay */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-40 sm:w-72 bg-gradient-to-r from-[#030303] to-transparent" />
      {/* Right fade overlay */}
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-40 sm:w-72 bg-gradient-to-l from-[#030303] to-transparent" />

      <div className={`${animClass} flex w-max gap-6`}>
        {/* Duplicate content for seamless loop */}
        {[...items, ...items].map((t, i) => (
          <TestimonialCard key={`${t.handle}-${i}`} {...t} />
        ))}
      </div>
    </div>
  );
}

/* ─── Section ─── */
export function Testimonials() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="relative mx-auto max-w-[1200px] px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-scai-brand1">
            Testimonials
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-scai-text sm:text-4xl">
            Trusted by content teams{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              who ship daily.
            </span>
          </h2>
        </div>
      </div>

      {/* Marquee rows — full-bleed */}
      <div className="mt-16 flex flex-col gap-6">
        <MarqueeRow items={row1} direction="left" />
        <MarqueeRow items={row2} direction="right" />
      </div>
    </section>
  );
}
