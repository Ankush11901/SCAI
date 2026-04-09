<p align="center">
  <img src="public/scai-full-logo.png" alt="SEOContent.AI" height="40" />
</p>

<p align="center">
  AI-powered SEO content generation platform with real-time streaming, multi-provider image generation, bulk cluster mode, and one-click WordPress publishing.
</p>

---

## Quick Start

### Prerequisites
- Node.js 18.17+
- pnpm (recommended)
- API keys (see [Environment Variables](#environment-variables))

### Setup

```bash
pnpm install
cp env.example.txt .env.local   # Edit with your keys
pnpm db:push                    # Initialize database
pnpm dev                        # Starts Next.js + Trigger.dev dev
```

Open [http://localhost:3000](http://localhost:3000)

### Scripts

```bash
pnpm dev              # Next.js dev + Trigger.dev dev (concurrent)
pnpm build            # Production build
pnpm start            # Production server
pnpm trigger:dev      # Trigger.dev dev only
pnpm trigger:deploy   # Deploy Trigger.dev tasks
pnpm type-check       # TypeScript compiler check
pnpm test             # Run tests (watch mode)
pnpm test:run         # Run tests once
pnpm test:coverage    # Tests with coverage report
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 16 (App Router) | Full-stack React |
| UI | Radix UI + Tailwind CSS | Component system |
| AI (Text) | Vercel AI SDK (Gemini, OpenAI, Claude) | Multi-provider text generation with fallback |
| AI (Images) | Gemini 3 Pro Image + Flux 2 via fal.ai | Dual-provider image generation |
| Background Jobs | Trigger.dev v4 | Long-running generation tasks |
| Database | Turso (LibSQL) + Drizzle ORM | Auth, quotas, history, cost tracking |
| Auth | Better Auth | Session-based authentication |
| Realtime | Pusher | Live progress updates |
| Storage | Cloudflare R2 (S3-compatible) | Generated image storage |
| Products | Amazon Product API (RapidAPI) | Affiliate product data |
| Animation | Motion (Framer Motion) | UI transitions |
| Testing | Vitest | Unit and integration tests |
| Hosting | Vercel | Deployment |

---

## Article Types

9 article types, each with 3 title variations (question, statement, listicle):

| Type | Description |
|------|-------------|
| **Affiliate** | Product-focused with Amazon affiliate links and product cards |
| **Commercial** | Business/service content with CTAs and feature lists |
| **Comparison** | Head-to-head comparisons with tables and verdicts |
| **How-To** | Step-by-step instructional guides |
| **Informational** | Explanatory/educational content |
| **Listicle** | List-based articles with ranked items |
| **Local** | Local business/service articles with geographic context |
| **Recipe** | Food/cooking articles with ingredients and instructions |
| **Review** | In-depth product reviews with ratings |

---

## Architecture

### Generation Pipeline

```
User Input
  -> Trigger.dev Task (background)
    -> Structure Generation (H1, H2s, FAQ)
    -> Pre-generation Context (comparison/commercial/affiliate extraction)
    -> Content Generation (overview, sections, closing - streamed via Pusher)
    -> Unique Component Generation (product cards, tables, verdicts, etc.)
    -> Image Generation (parallel, uploaded to R2)
    -> Article Assembly (template hydration + HTML output)
    -> Validation & Correction
  -> Real-time progress via Pusher
```

### AI Providers (Multi-Provider with Fallback)

**Text Generation** uses the Vercel AI SDK with automatic fallback:
- Primary: Google Gemini (2.0 Flash / 2.5 Flash)
- Fallback: OpenAI (GPT-4o-mini) or Anthropic (Claude Sonnet)

**Image Generation** supports two providers:
- **Gemini** (`gemini-3-pro-image-preview`) - 2K resolution, native image editing, multi-step prompt orchestration with fact-checking
- **Flux 2** (`fal-ai/flux-2-flex` / `fal-ai/flux-2/edit`) via fal.ai - ~1MP, faster, lower cost

Both providers share the same orchestration pipeline:
1. Prompt expansion (simple prompt -> detailed JSON structure)
2. Fact-checking with Google Search grounding
3. Product detection & verified reference image fetching
4. Narrative prompt building with article-type-specific styles
5. Photorealistic imperfection injection (anti-AI-glow)

### Background Jobs (Trigger.dev)

| Task | File | Purpose |
|------|------|---------|
| `orchestrate-generation` | `lib/jobs/orchestrate-generation.ts` | Single article generation |
| `bulk-generate` | `lib/jobs/bulk-generate.ts` | Bulk article processing |
| `generate-image` | `lib/jobs/generate-images.ts` | Individual image generation + R2 upload |

---

## Project Structure

```
scai-article-generator/
├── app/
│   ├── (protected)/              # Authenticated routes
│   │   ├── generate/             # Single article generation
│   │   ├── bulk/                 # Bulk generation (CSV upload, cluster mode)
│   │   ├── history/              # Generation history + bulk job details
│   │   ├── costs/                # AI usage cost tracking
│   │   ├── settings/             # User preferences, WordPress, affiliate
│   │   ├── prompts/              # Custom prompt management
│   │   ├── guidelines/           # Writing guidelines viewer
│   │   ├── matrix/               # Component matrix view
│   │   ├── mockups/              # Visual mockups
│   │   └── visualize/            # Article type visualization
│   ├── api/
│   │   ├── generate/             # Generation trigger + status
│   │   ├── bulk/                 # Bulk start, cancel, retry, queue, cluster
│   │   ├── history/              # Generation history
│   │   ├── costs/                # Cost tracking
│   │   ├── quota/                # Quota management
│   │   ├── wordpress/            # WordPress export
│   │   ├── pusher/               # Pusher auth
│   │   └── auth/                 # Better Auth endpoints
│   ├── login/                    # Authentication
│   └── globals.css               # Global styles + SCAI component styles
├── components/
│   ├── article/                  # Article preview, LiveBuilder
│   ├── bulk/                     # Bulk generator forms, progress panel
│   ├── generate/                 # Generator form, progress, validation
│   ├── history/                  # History tabs
│   ├── costs/                    # Cost display components
│   ├── wordpress/                # WordPress settings & export
│   ├── layout/                   # AppShell, Sidebar, TopBar
│   ├── matrix/                   # Matrix table
│   ├── variations/               # Variation viewers
│   └── ui/                       # Radix UI primitives
├── lib/
│   ├── ai/                       # AI module
│   │   ├── providers.ts          # Multi-provider setup with fallback
│   │   ├── models.ts             # Model definitions + cost rates
│   │   ├── generate.ts           # Structure generation (H1, H2, sections)
│   │   ├── generate-content.ts   # Component generation (cards, tables)
│   │   ├── stream-content.ts     # Streaming content (overview, sections)
│   │   ├── generate-keywords.ts  # Keyword expansion
│   │   ├── grammar-checker.ts    # Grammar correction
│   │   ├── schemas/              # Zod schemas (structure, content, components)
│   │   ├── prompts/              # Prompt templates per component
│   │   └── rules/                # Content validation rules
│   ├── services/                 # Business logic
│   │   ├── unified-orchestrator.ts   # Main orchestration engine
│   │   ├── content-generators.ts     # Content generation functions
│   │   ├── template-hydrator.ts      # HTML template injection
│   │   ├── article-assembler.ts      # Final HTML assembly
│   │   ├── article-validator.ts      # Article structure validation
│   │   ├── content-corrector.ts      # Post-generation corrections
│   │   ├── imagen.ts                 # Gemini image generation pipeline
│   │   ├── flux-image-generator.ts   # Flux 2 via fal.ai
│   │   ├── product-image-generator.ts # Product card image transforms
│   │   ├── google-image-search.ts    # Reference image search + verification
│   │   ├── r2-storage.ts             # Cloudflare R2 upload/storage
│   │   ├── pusher-server.ts          # Real-time event broadcasting
│   │   ├── cost-tracking-service.ts  # AI usage cost logging
│   │   ├── quota-service.ts          # Daily quota enforcement
│   │   ├── amazon-product-api.ts     # Amazon product data
│   │   ├── ai-interlink-selector.ts  # AI-powered internal link selection
│   │   └── keyword-expansion-service.ts # Keyword clustering & expansion
│   ├── jobs/                     # Trigger.dev tasks
│   │   ├── orchestrate-generation.ts
│   │   ├── bulk-generate.ts
│   │   └── generate-images.ts
│   ├── hooks/                    # React hooks
│   │   ├── useArticleGeneration.ts
│   │   ├── useBulkGeneration.ts
│   │   └── useArticleStream.ts
│   ├── db/                       # Database (Drizzle ORM)
│   │   ├── index.ts              # Connection setup
│   │   └── schema.ts             # Table definitions
│   └── utils/                    # Utilities
├── data/                         # Static definitions
│   ├── article-types.ts          # 9 article type configs
│   ├── components.ts             # Component definitions
│   ├── variations.ts             # 3 HTML variations per component
│   ├── structure-flows.ts        # Component order per article type
│   └── guidelines.ts             # Content guidelines
├── drizzle/                      # Database migrations
├── trigger.config.ts             # Trigger.dev configuration
└── package.json
```

---

## Key Features

### Single Article Generation
- Topic input with article type selection, title variation, and word count control
- Real-time streaming with live HTML preview via Pusher
- Parallel image generation (featured + section images)
- AI-powered alt text generation
- Post-generation validation with SEO compliance checking
- HTML download and WordPress export

### Bulk Generation
- CSV upload or manual keyword entry
- Cluster mode for topically related articles
- Priority ordering (parent topic, sub topics)
- Per-article progress tracking with timer
- Retry failed articles
- Download all as HTML

### Image Generation
- Multi-step prompt orchestration (simple -> detailed JSON -> narrative)
- Fact-checking with Google Search grounding
- Real product detection with verified reference images
- Article-type-specific styles (9 types x 12 image types)
- Photorealistic imperfection system (anti-AI-glow)
- Product card image transformation from Amazon source images
- NSFW content detection

### Content Quality
- Word budget calculator per article type and component
- Forbidden content detection (AI phrases, filler words)
- Grammar and spelling correction
- Alt text validation (SEO length compliance)
- Header structure validation
- Keyword density tracking

### Affiliate Features
- Amazon product data via RapidAPI
- Product card generation with prices, features, badges
- AI-cleaned product names (removes verbose Amazon titles)
- AI-generated product descriptions from feature bullets
- Affiliate link integration

### WordPress Integration
- Direct export to WordPress via REST API
- Featured image upload
- Category and tag assignment
- Draft/publish status control

---

## Environment Variables

```env
# AI Services
GOOGLE_GENERATIVE_AI_API_KEY=    # Gemini API key (text + image generation)
FAL_KEY=                         # fal.ai key (Flux 2 image generation)
OPENAI_API_KEY=                  # OpenAI key (fallback text generation)
ANTHROPIC_API_KEY=               # Anthropic key (fallback text generation)

# Database (Turso)
DATABASE_URL=                    # Turso database URL
DATABASE_AUTH_TOKEN=             # Turso auth token

# Authentication
BETTER_AUTH_SECRET=              # Auth secret (32+ chars)
SCAI_PASSWORD=                   # Session password

# Real-time (Pusher)
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=

# Storage (Cloudflare R2)
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Amazon Affiliate
RAPIDAPI_KEY=                    # Real-Time Amazon Data API
AMAZON_AFFILIATE_TAG=            # e.g., yourtag-20

# Google Custom Search (product reference images)
GOOGLE_CSE_API_KEY=
GOOGLE_CSE_ID=

# Trigger.dev
TRIGGER_SECRET_KEY=

# App Settings
DAILY_QUOTA=10                   # Daily generations per user
```

---

## Deployment

### Vercel (Frontend + API)

```bash
npm i -g vercel
vercel --prod
```

Set all environment variables in Vercel dashboard.

### Trigger.dev (Background Jobs)

```bash
pnpm trigger:deploy
```

Requires `TRIGGER_SECRET_KEY` in environment.

---

## License

Internal use only - SEO Content AI
