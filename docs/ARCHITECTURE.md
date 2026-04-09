# System Architecture

> Technical architecture, data flow, and system design for SCAI Article Generator

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VERCEL EDGE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────────────────────────────────────────┐  │
│  │              │    │                 NEXT.JS APP                       │  │
│  │   BROWSER    │◄──►│  ┌────────────┐  ┌────────────┐  ┌────────────┐  │  │
│  │              │    │  │   Pages    │  │ Components │  │    API     │  │  │
│  │  - React UI  │    │  │            │  │            │  │   Routes   │  │  │
│  │  - Shadcn    │    │  │ /generate  │  │ ChatUI     │  │            │  │  │
│  │  - Tailwind  │    │  │ /visualize │  │ Preview    │  │ /generate  │──┼──┼──┐
│  │              │    │  │ /matrix    │  │ Matrix     │  │ /image     │──┼──┼──┼──┐
│  └──────────────┘    │  └────────────┘  └────────────┘  └────────────┘  │  │  │  │
│                      │                                                   │  │  │  │
│                      └──────────────────────────────────────────────────┘  │  │  │
│                                                                              │  │  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │  │  │
│  │                        VERCEL SECRETS                                 │  │  │  │
│  │  • SCAI_PASSWORD          • GEMINI_API_KEY                           │  │  │  │
│  │  • IMAGEN_API_KEY         • FLUX_API_KEY                             │  │  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │  │  │
│                                                                              │  │  │
└─────────────────────────────────────────────────────────────────────────────┘  │  │
                                                                                  │  │
┌─────────────────────────────────────────────────────────────────────────────┐  │  │
│                           EXTERNAL SERVICES                                  │  │  │
│                                                                              │  │  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │  │  │
│  │  GOOGLE GEMINI  │◄─┼─────────────────┼──┼─────────────────┼─────────────┼──┘  │
│  │   2.0 Flash     │  │                 │  │                 │             │     │
│  │                 │  │  GOOGLE IMAGEN  │◄─┼─────────────────┼─────────────┼─────┘
│  │  Content Gen    │  │       3         │  │   FLUX API      │             │
│  └─────────────────┘  │                 │  │   (Fallback)    │             │
│                       │  Image Gen      │  │                 │             │
│                       └─────────────────┘  └─────────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Application Routes

### 2.1 Page Routes

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Redirect to dashboard or login | No |
| `/login` | Password entry page | No |
| `/generate` | ChatGPT-style generation interface | Yes |
| `/visualize` | Component variation gallery | Yes |
| `/matrix` | Component requirement matrix | Yes |

### 2.2 API Routes

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|---------------|
| `/api/auth` | POST | Validate password | No |
| `/api/generate` | POST | Stream article content | Yes |
| `/api/image` | POST | Generate single image | Yes |
| `/api/quota` | GET | Check remaining quota | Yes |

---

## 3. Data Flow

### 3.1 Article Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ARTICLE GENERATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

    USER INPUT                PROCESSING                    OUTPUT
    ──────────                ──────────                    ──────
         │                         │                            │
         ▼                         │                            │
┌─────────────────┐               │                            │
│ "Write an       │               │                            │
│  affiliate      │               │                            │
│  article about  │               │                            │
│  wireless       │               │                            │
│  headphones"    │               │                            │
└────────┬────────┘               │                            │
         │                         │                            │
         ▼                         ▼                            │
┌─────────────────┐    ┌─────────────────────┐                 │
│ Parse Intent    │───►│ Build System Prompt │                 │
│ - Article Type  │    │ - Component rules   │                 │
│ - Topic         │    │ - Structure flow    │                 │
│ - Components    │    │ - Constraints       │                 │
└─────────────────┘    └──────────┬──────────┘                 │
                                   │                            │
                                   ▼                            │
                       ┌─────────────────────┐                 │
                       │   Gemini 2.0 Flash  │                 │
                       │   (Streaming)       │                 │
                       └──────────┬──────────┘                 │
                                   │                            │
         ┌─────────────────────────┼─────────────────────────┐ │
         │                         │                          │ │
         ▼                         ▼                          ▼ ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Stream Text     │    │ Identify Image  │    │ Build HTML      │
│ to Preview      │    │ Placeholders    │    │ Structure       │
└─────────────────┘    └────────┬────────┘    └────────┬────────┘
                                 │                      │
                                 ▼                      │
                       ┌─────────────────┐              │
                       │ Imagen 3 / Flux │              │
                       │ (Async per img) │              │
                       └────────┬────────┘              │
                                 │                      │
                                 ▼                      ▼
                       ┌─────────────────────────────────────┐
                       │        FINAL HTML ARTICLE           │
                       │   - Embedded CSS (scai- prefixed)   │
                       │   - data-component attributes       │
                       │   - Generated images inline         │
                       └─────────────────────────────────────┘
                                         │
                                         ▼
                               ┌─────────────────┐
                               │ Download .html  │
                               └─────────────────┘
```

### 3.1.1 H1→H2 Promise Matching System

The article structure generation uses a sequential H1→H2 pipeline to ensure H2 headings
fulfill the promise made by the H1. This is critical for listicle articles where the H1
promises a specific count (e.g., "5 Best Recipes").

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        H1→H2 PROMISE MATCHING FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

    STEP 1: H1 GENERATION        STEP 2: PROMISE EXTRACTION      STEP 3: H2 GENERATION
    ──────────────────           ───────────────────────         ──────────────────────
         │                              │                               │
         ▼                              ▼                               ▼
┌─────────────────┐          ┌─────────────────────┐         ┌─────────────────────┐
│ generateH1Only()│          │ extractH1Promise()  │         │ generateH2sFromH1() │
│                 │          │                     │         │                     │
│ Input:          │          │ Extracts:           │         │ Input:              │
│ - topic         │ ────────►│ - count (5, 10...)  │────────►│ - normalizedH1      │
│ - articleType   │          │ - promiseType       │         │ - h1Promise         │
│ - variation     │          │ - subject           │         │ - h2Count           │
│ - h2Count       │          │ - isListicle        │         │ - articleType       │
│                 │          │ - isQuestion        │         │ - affiliateProducts │
│ Output:         │          │                     │         │                     │
│ - h1            │          │ Normalizes H1:      │         │ Output:             │
│ - meta          │          │ - Fixes count if    │         │ - h2s[]             │
└─────────────────┘          │   mismatched        │         │ - closingH2         │
                             └─────────────────────┘         └──────────┬──────────┘
                                                                        │
                                                                        ▼
                                                              ┌─────────────────────┐
                                                              │ VALIDATION          │
                                                              │ validatePromise()   │
                                                              │                     │
                                                              │ Checks:             │
                                                              │ - Count match       │
                                                              │ - Duplicate H2s     │
                                                              │ - Relevance         │
                                                              └──────────┬──────────┘
                                                                         │
                                              ┌──────────────────────────┼──────────────┐
                                              │                          │              │
                                              ▼                          ▼              │
                                      ┌──────────────┐          ┌──────────────┐       │
                                      │   PASS       │          │   FAIL       │       │
                                      │   Score ≥70  │          │   Score <70  │       │
                                      └──────┬───────┘          └──────┬───────┘       │
                                             │                         │               │
                                             │                         ▼               │
                                             │              ┌─────────────────────┐    │
                                             │              │ Re-prompt with      │    │
                                             │              │ feedback (max 3x)   │────┘
                                             │              └─────────────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────────────┐
                              │        ARTICLE STRUCTURE            │
                              │                                     │
                              │ dynamicH2s: ["1. Recipe A", ...]   │
                              │ componentH2s: { faq, closing, ... } │
                              │ promiseValidation: { score, ... }   │
                              └─────────────────────────────────────┘
```

**Key Files:**
- `lib/ai/utils/h1-promise-extractor.ts` - Promise extraction and classification
- `lib/ai/utils/promise-fulfillment-rules.ts` - Validation rules and duplicate detection
- `lib/ai/prompts/structure-prompts.ts` - H1-only and H2-from-H1 prompt builders
- `lib/services/unified-orchestrator.ts` - Pipeline orchestration

**Promise Types Supported:**
| Category | Types |
|----------|-------|
| Listicle | recipes, reasons, ways, tips, benefits, features, examples, products, ideas, steps, facts, mistakes |
| Statement | guide, review, analysis, overview, comparison, tutorial |
| Question | how-to, what-is, why-does, when-to, which-is |

**Validation Rules:**
- **Listicle**: Strict count match (H2 count must equal H1 number)
- **Statement/Question**: Soft enforcement (comprehensive coverage)
- **Affiliate**: Auto-pass when H2s match product names (≥70% match)

**H2 Categories:**
- `dynamicH2s` - Promise-fulfilling H2s (numbered for listicle)
- `componentH2s` - Structural H2s (features, prosCons, rating, faq, closing)

### 3.2 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  /login  │────►│ POST     │────►│ Validate │────►│ Set      │
│  page    │     │ /api/auth│     │ password │     │ session  │
└──────────┘     └──────────┘     └──────────┘     │ cookie   │
                                        │          └────┬─────┘
                                        │               │
                                 ┌──────┴──────┐        ▼
                                 │   Invalid   │  ┌──────────┐
                                 │   > Error   │  │ Redirect │
                                 └─────────────┘  │ /generate│
                                                  └──────────┘
```

### 3.3 Quota Management Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           QUOTA MANAGEMENT                                │
└──────────────────────────────────────────────────────────────────────────┘

Storage: localStorage (client) + server validation

┌─────────────────┐
│ User requests   │
│ /api/generate   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Check localStorage:                 │
│ {                                   │
│   date: "2024-12-24",              │
│   count: 3                          │
│ }                                   │
└────────────────┬────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
┌─────────────┐   ┌─────────────┐
│ Same day?   │   │ New day?    │
│ count < 10  │   │ Reset to 0  │
└──────┬──────┘   └──────┬──────┘
       │                 │
       ▼                 ▼
┌─────────────────────────────────┐
│ Proceed with generation         │
│ Increment count                 │
└─────────────────────────────────┘
       │
       │ If count >= 10
       ▼
┌─────────────────────────────────┐
│ Return 429: Quota Exceeded      │
└─────────────────────────────────┘
```

---

## 4. Component Architecture

### 4.1 Component Hierarchy

```
app/
├── layout.tsx                    # Root layout (fonts, globals)
├── (protected)/                  # Auth-required group
│   ├── layout.tsx               # Auth check wrapper
│   └── generate/
│       └── page.tsx             # Generation page
│
components/
├── layout/
│   ├── AppShell.tsx             # Sidebar + TopBar + Content area
│   ├── Sidebar.tsx              # Navigation sidebar
│   └── TopBar.tsx               # Top bar with actions
│
├── chat/
│   ├── ChatInterface.tsx        # Main chat container
│   │   ├── MessageList          # Scrollable message area
│   │   ├── InputArea            # Text input + controls
│   │   └── ControlPanel         # Component toggles
│   ├── MessageBubble.tsx        # Individual message
│   ├── TypingIndicator.tsx      # AI "thinking" dots
│   └── InputArea.tsx            # Chat input field
│
├── article/
│   ├── LiveBuilder.tsx          # Real-time article preview
│   │   ├── ComponentRenderer    # Renders each component
│   │   └── ImagePlaceholder     # Loading state for images
│   ├── ArticlePreview.tsx       # Static article display
│   └── ComponentRenderer.tsx    # Single component renderer
│
├── variations/
│   ├── VariationGrid.tsx        # Grid of all components
│   ├── VariationCard.tsx        # Single component card
│   └── VariationModal.tsx       # Full-screen preview
│
└── ui/                          # Shadcn primitives
    ├── button.tsx
    ├── input.tsx
    ├── card.tsx
    ├── dialog.tsx
    └── ...
```

### 4.2 State Management

**Approach:** React hooks + Context (no Redux/Zustand needed for this scope)

```typescript
// Contexts
AuthContext          // User session state
GenerationContext    // Current generation state, article data
```

**Key State:**

```typescript
interface GenerationState {
  articleType: ArticleType | null;
  topic: string;
  isGenerating: boolean;
  streamedContent: string;
  components: ComponentState[];
  images: ImageState[];
  finalHtml: string | null;
}

interface ComponentState {
  id: string;
  type: ComponentType;
  enabled: boolean;
  required: boolean;
  content: string | null;
  status: 'pending' | 'streaming' | 'complete';
}

interface ImageState {
  id: string;
  prompt: string;
  url: string | null;
  status: 'pending' | 'generating' | 'complete' | 'error';
}
```

---

## 5. API Design

### 5.1 POST /api/auth

**Request:**
```json
{
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true
}
```
Sets HTTP-only session cookie.

**Response (401):**
```json
{
  "error": "Invalid password"
}
```

---

### 5.2 POST /api/generate

**Request:**
```json
{
  "articleType": "affiliate",
  "topic": "best wireless headphones for 2024",
  "enabledComponents": ["featured-image", "product-card", "faq"],
  "variation": "question"
}
```

**Response:** Server-Sent Events (SSE) stream

```
event: component
data: {"id": "h1", "status": "streaming", "content": "What Are the Best..."}

event: component
data: {"id": "h1", "status": "complete", "content": "What Are the Best Wireless Headphones in 2024?"}

event: image
data: {"id": "featured-image", "status": "generating", "prompt": "..."}

event: image
data: {"id": "featured-image", "status": "complete", "url": "data:image/..."}

event: complete
data: {"html": "<!DOCTYPE html>..."}
```

---

### 5.3 POST /api/image

**Request:**
```json
{
  "prompt": "Professional photo of wireless headphones on white background",
  "aspectRatio": "16:9"
}
```

**Response (200):**
```json
{
  "url": "data:image/png;base64,..."
}
```

---

## 6. File Organization

### 6.1 Data Files (`/data`)

```typescript
// article-types.ts
export const ARTICLE_TYPES: ArticleType[] = [
  {
    id: 'affiliate',
    name: 'Affiliate',
    description: 'Product-focused articles with purchase CTAs',
    icon: 'shopping-cart',
    uniqueComponents: ['product-card', 'cta-button', 'price-comparison'],
    variations: ['question', 'statement', 'listicle']
  },
  // ... 8 more
];

// components.ts
export const COMPONENTS: ComponentDefinition[] = [
  // Universal
  { id: 'h1', type: 'universal', required: true, ... },
  { id: 'featured-image', type: 'universal', required: true, ... },
  // ... more universal
  
  // Unique
  { id: 'product-card', type: 'unique', articleTypes: ['affiliate'], ... },
  // ... more unique
];

// variations.ts
export const VARIATIONS: ComponentVariation[] = [
  {
    componentId: 'product-card',
    variations: [
      { id: 'horizontal', name: 'Horizontal Card', html: '...' },
      { id: 'vertical', name: 'Vertical Card', html: '...' },
      { id: 'compact', name: 'Compact Row', html: '...' },
    ]
  },
  // ... all component variations
];

// structure-flows.ts
export const STRUCTURE_FLOWS: Record<ArticleType, string[]> = {
  affiliate: ['h1', 'featured-image', 'intro', 'product-card', 'h2', ...],
  // ... all article types
};
```

### 6.2 Service Files (`/lib/services`)

```typescript
// gemini.ts
export async function* streamArticleContent(
  articleType: string,
  topic: string,
  components: string[]
): AsyncGenerator<ContentChunk>

// imagen.ts
export async function generateImage(
  prompt: string,
  options?: ImageOptions
): Promise<string>

// flux.ts (fallback)
export async function generateImageFallback(
  prompt: string
): Promise<string>

// article-builder.ts
export function buildHtml(
  components: ComponentContent[],
  images: ImageContent[],
  variation: string
): string
```

---

## 7. Security Considerations

| Concern | Mitigation |
|---------|------------|
| API key exposure | All keys in Vercel secrets, server-side only |
| Password brute force | Rate limiting on /api/auth (5 attempts/minute) |
| Quota bypass | Server-side validation, not just client |
| Prompt injection | Sanitize user input, structured prompts |
| XSS in generated HTML | CSP headers, sanitized output |

---

## 8. Performance Considerations

| Concern | Strategy |
|---------|----------|
| Large bundle | Dynamic imports for variation preview |
| Slow image generation | Parallel image requests, eager loading |
| Streaming latency | SSE for immediate feedback |
| Memory (large articles) | Stream HTML construction, don't buffer |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-24 | SCAI Team | Initial architecture |

