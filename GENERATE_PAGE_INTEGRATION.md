# Integration Plan: Connect Reference Rules to Generate Page

## Current Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────┐
│  Generate Page  │───▶│  /api/generate   │───▶│  unified-orchestrator   │
│  (page.tsx)     │    │  (route.ts)      │    │  (generates article)    │
└─────────────────┘    └──────────────────┘    └─────────────────────────┘
                                                          │
                                                          ▼
                                               ┌─────────────────────────┐
                                               │  AI Generation Flow:    │
                                               │  • generate-content.ts  │
                                               │  • stream-content.ts    │
                                               │  • template-hydrator.ts │
                                               └─────────────────────────┘
```

## New Components to Integrate

### Phase 1-5 Systems:
1. **Rules Module** (`lib/ai/rules/forbidden-content.ts`) - Character limits, forbidden phrases
2. **Content Validator** (`lib/services/content-validator.ts`) - Post-generation validation
3. **Enhanced Prompts** - Already injected into component/content/structure prompts
4. **Keyword Expansion** (`lib/services/keyword-expansion-service.ts`) - Optional SEO enhancement

---

## Integration Steps

### Step 1: Add Validation to Unified Orchestrator ✅ PRIORITY

**File:** `lib/services/unified-orchestrator.ts`

Add validation after content generation but before final assembly:

```typescript
import { validateGeneratedContent, getValidationReport, type ArticleContent } from './content-validator'

// After generating all content, before assembly:
const validationContent: ArticleContent = {
  h1: structure.h1,
  h2s: structure.h2s,
  closingH2: structure.closingH2,
  overviewParagraph: generatedContent.overview,
  closingParagraph: generatedContent.closing,
  faqH2: structure.faqH2,
  faqQuestions: structure.faqQuestions,
  faqAnswers: generatedContent.faqAnswers,
  metaTitle: structure.metaTitle,
  metaDescription: structure.metaDescription,
  variation: variation,
  articleType: articleType,
}

const validationResult = validateGeneratedContent(validationContent)

// Emit validation event to frontend
yield { 
  type: 'validation_result', 
  isValid: validationResult.isValid,
  score: validationResult.score,
  errors: validationResult.errors,
  warnings: validationResult.warnings,
}
```

### Step 2: Add Validation Display to Frontend

**File:** `app/(protected)/generate/page.tsx`

Add validation state and UI:

```typescript
// Add to GenerationState interface
validationResult?: {
  isValid: boolean
  score: number
  errors: Array<{ component: string; message: string }>
  warnings: Array<{ component: string; message: string }>
}

// Handle validation event in handleSSEEvent
if (data.type === 'validation_result') {
  setState((prev) => ({
    ...prev,
    validationResult: {
      isValid: data.isValid,
      score: data.score,
      errors: data.errors || [],
      warnings: data.warnings || [],
    },
  }))
}

// Add validation badge in ArticlePreview component
```

### Step 3: Optional - Add Keyword Expansion Toggle

**File:** `app/(protected)/generate/page.tsx`

Add toggle for SEO keyword expansion:

```typescript
const [enableKeywordExpansion, setEnableKeywordExpansion] = useState(false)

// Pass to API
body: JSON.stringify({
  ...existingFields,
  enableKeywordExpansion,
})
```

**File:** `app/api/generate/route.ts`

```typescript
const { enableKeywordExpansion = false } = await req.json()

// Before generation, expand keywords if enabled
let expandedKeywords = null
if (enableKeywordExpansion) {
  expandedKeywords = await expandKeywordsForArticle({
    seedKeyword: topic,
    articleType,
  })
}

// Pass to orchestrator
```

---

## Implementation Order

### Phase A: Core Validation (Do First) 
1. Add validation to unified-orchestrator.ts
2. Add validation_result event handling to generate page
3. Create validation display component

### Phase B: UI Enhancement (Optional)
4. Add keyword expansion toggle
5. Add validation score badge
6. Add detailed error/warning expandable panel

### Phase C: Advanced Features (Future)
7. Auto-regenerate on validation failure
8. Keyword density visualization
9. Real-time character count feedback

---

## Quick Start Commands

```bash
# Run integration tests to verify systems work
npx tsx scripts/test-integration.ts

# Check TypeScript compilation
npx tsc --noEmit

# Start dev server to test generation
pnpm dev
```

---

## File Modifications Summary

| File | Change | Priority |
|------|--------|----------|
| `lib/services/unified-orchestrator.ts` | Add validation after generation | HIGH |
| `app/(protected)/generate/page.tsx` | Handle validation_result event | HIGH |
| `components/generate/ArticlePreview.tsx` | Show validation score badge | MEDIUM |
| `app/api/generate/route.ts` | Pass keyword expansion flag | LOW |

