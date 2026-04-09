# SCAI Reference System Integration Plan

## Overview

This document compares your current SCAI Article Generator implementation with the production AWS reference system and provides a detailed integration plan.

---

## 📊 PART 1: GAP ANALYSIS

### 1.1 What You Already Have (✅ Implemented)

| Feature | Current Implementation | Status |
|---------|----------------------|--------|
| **9 Article Types** | `data/article-types.ts` | ✅ Complete |
| **9 Tones** | `data/tone-style.ts` | ✅ Complete |
| **3 Styles** | `data/tone-style.ts` | ✅ Complete |
| **H1 Variant Types** | Question/Statement/Listicle | ✅ Complete |
| **Universal Components** | H1, H2, Overview, Standard Para, FAQ | ✅ Complete |
| **Unique Components** | All 9 article types have unique components | ✅ Complete |
| **Word Count Standards** | `lib/ai/word-counts.ts` | ✅ Complete |
| **Sub-paragraph Structure** | 2×50 Overview, 3×50 Standard | ✅ Complete |
| **Forbidden Phrases** | `data/guidelines.ts`, validation | ✅ Complete |
| **Symbol/Emoji Rules** | Documented in guidelines | ✅ Partial |
| **Character Limits** | H1=60, H2=60, etc. | ✅ Complete |
| **Template Hydration** | `lib/services/template-hydrator.ts` | ✅ Complete |
| **AI Content Generation** | Vercel AI SDK + generateObject() | ✅ Complete |
| **Streaming Support** | `lib/ai/stream-content.ts` | ✅ Complete |
| **Article Type Defaults** | Tone/Style per type | ✅ Complete |

---

### 1.2 Missing Features (❌ Gaps)

#### 🔴 HIGH PRIORITY GAPS

| Gap | Description | Reference Location | Impact |
|-----|-------------|-------------------|--------|
| **Keyword Expansion Engine** | Article-type-specific keyword expansion prompts | `reference/Prompt_Templates/keyword_expansion/` | HIGH - Better SEO |
| **Content Generation Rules Integration** | Full forbidden phrase list not in prompts | `reference/docs/content-rules/` | MEDIUM - Quality |
| **H2 Numbering for Listicles** | Component H2s shouldn't be numbered | Reference shows exceptions | MEDIUM - Format |
| **Prompt Versioning System** | `latest.md` versioning pattern | `reference/Prompt_Templates/` | LOW - Maintainability |

#### 🟡 MEDIUM PRIORITY GAPS

| Gap | Description | Current State | Reference State |
|-----|-------------|--------------|-----------------|
| **Word Count Tolerance** | Strict ±5 word enforcement | ~10-15% tolerance | ±5 words EXACTLY |
| **Rating H2 Character Limit** | Standard 60 char limit | 30 chars max | Shorter for impact |
| **Local Keyword Structure** | Basic local support | `{{service}} + {{location}}` format | More structured |
| **Listicle Count Rule** | Any number of items | ODD numbers only (5,7,9,11...) | Specific constraint |
| **Prompt Variable System** | Hardcoded values | `{{variable}}` template system | More flexible |

#### 🟢 LOW PRIORITY GAPS

| Gap | Description | Notes |
|-----|-------------|-------|
| **FAQ H2 Character Limit** | Using 60 chars | Should be 30 chars |
| **Honorable Mentions H2 Limit** | Using 60 chars | Should be 40-50 chars |
| **Why Choose Local H2 Limit** | Using 60 chars | Should be 40-50 chars |
| **Quick Facts H2 Limit** | Using 60 chars | Should be 40-50 chars |

---

### 1.3 Detailed Comparison by Article Type

#### Affiliate Article
| Component | Your Implementation | Reference Spec | Match |
|-----------|-------------------|----------------|-------|
| Product Card | ✅ Implemented | Product Table format | ✅ |
| Amazon API Integration | ✅ fetchProductsFromCategories | Product data source | ✅ |
| H2 per product | ✅ Loop structure | Loop for each product | ✅ |

#### Review Article
| Component | Your Implementation | Reference Spec | Match |
|-----------|-------------------|----------------|-------|
| Features List | ✅ 150 words, 7-10 bullets | 150 words, 7-10 bullets | ✅ |
| Pros & Cons | ✅ 150 words (75+75) | 150 words (75+75), +/– symbols | ✅ |
| Rating | ✅ 100 words + score | 30-char H2, 100 words | ⚠️ H2 limit |

#### Recipe Article
| Component | Your Implementation | Reference Spec | Match |
|-----------|-------------------|----------------|-------|
| Ingredients | ✅ 150 words, bullets | 150 words, `<ul>` | ✅ |
| Instructions | ✅ 150-400 words, numbered | 150-400 words, `<ol>` only | ✅ |
| Tips | ✅ 150 words | 150 words (3×50) | ✅ |
| Nutrition | ✅ 100 words table | 100 words + disclaimer | ⚠️ Missing disclaimer |

#### Listicle Article
| Component | Your Implementation | Reference Spec | Match |
|-----------|-------------------|----------------|-------|
| Item Count | Any number | ODD only (5,7,9...) | ❌ |
| Honorable Mentions | ✅ H2 + H3s | H2 (40-50 chars) + 3-4 H3s | ⚠️ H2 limit |

#### Local Article
| Component | Your Implementation | Reference Spec | Match |
|-----------|-------------------|----------------|-------|
| Service + Location | Basic keyword | Structured `{{service}}` + `{{location}}` | ⚠️ |
| Service Info Box | ✅ User settings | Pre-filled, not AI-generated | ✅ |
| Why Choose Local | ✅ 40-60 words | Image + list side-by-side | ✅ |

#### Comparison Article
| Component | Your Implementation | Reference Spec | Match |
|-----------|-------------------|----------------|-------|
| Topic Overview | ✅ 80 words (2×40) | 80 words (What+Who / Feature+Benefit) | ✅ |
| Comparison Table | ✅ 120-150 words | 120-150 words | ✅ |

---

## 📋 PART 2: INTEGRATION PLAN

### Phase 1: Quick Wins (1-2 Days)

#### 1.1 Update Character Limits
**Files to modify:** `lib/ai/schemas/structure.ts`, `data/components.ts`

```typescript
// Current
const RatingH2Schema = z.string().max(60)

// Updated
const RatingH2Schema = z.string().max(30)
const FaqH2Schema = z.string().max(30)
const HonorableMentionsH2Schema = z.string().max(50)
const WhyChooseLocalH2Schema = z.string().max(50)
const QuickFactsH2Schema = z.string().max(50)
```

#### 1.2 Add Nutrition Table Disclaimer
**File:** `lib/ai/prompts/component-prompts.ts`

```typescript
// Add to nutrition prompt
MUST include disclaimer: "Approximate nutritional values. Actual nutrition may vary."
```

#### 1.3 Enforce Listicle ODD Count Rule
**File:** `lib/services/structure-generator.ts`

```typescript
function getListicleItemCount(wordCount: number): number {
  // Calculate base count from word count
  const baseCount = Math.round((wordCount - 200) / 150)
  // Ensure ODD number (5, 7, 9, 11, 13, 15, 17, 19, 21, 23)
  return baseCount % 2 === 0 ? baseCount + 1 : baseCount
}
```

---

### Phase 2: Keyword Expansion System (3-5 Days)

#### 2.1 Create Article-Type-Specific Keyword Prompts

**New file:** `lib/ai/prompts/keyword-prompts.ts`

```typescript
export const KEYWORD_EXPANSION_PROMPTS = {
  affiliate: `Generate 15-25 related keywords for affiliate marketing content.
    
    Seed Keyword: "{{seedKeyword}}"
    
    Categories:
    1. HIGH-INTENT PURCHASE (5-7): "Best {{keyword}} to buy", "Top {{keyword}} deals"
    2. COMPARISON/REVIEW (4-5): "{{keyword}} reviews", "{{keyword}} vs [competitor]"
    3. DISCOUNT/SAVINGS (3-4): "{{keyword}} coupon", "cheap {{keyword}}"
    4. WHERE TO BUY (3-4): "buy {{keyword}} online", "{{keyword}} on Amazon"
    5. RECOMMENDATION (2-3): "best {{keyword}} for [use case]"`,

  review: `Generate 15-25 related keywords for review content.
    
    Seed Keyword: "{{seedKeyword}}"
    
    Categories:
    1. DIRECT REVIEW (5-7): "{{keyword}} review", "honest {{keyword}} review"
    2. RATING/EVALUATION (4-5): "is {{keyword}} worth it", "{{keyword}} rating"
    3. PROS & CONS (3-4): "{{keyword}} pros and cons", "{{keyword}} problems"
    4. COMPARISON (3-4): "{{keyword}} vs [alternative]"`,

  // ... other article types
}
```

#### 2.2 Create Keyword Generation Function

**New file:** `lib/ai/generate-keywords.ts`

```typescript
import { generateObject } from 'ai'
import { z } from 'zod'
import { KEYWORD_EXPANSION_PROMPTS } from './prompts/keyword-prompts'

export async function generateKeywordCluster(
  seedKeyword: string,
  articleType: string
): Promise<string[]> {
  const prompt = KEYWORD_EXPANSION_PROMPTS[articleType]
    .replace(/\{\{seedKeyword\}\}/g, seedKeyword)
    .replace(/\{\{keyword\}\}/g, seedKeyword)

  const result = await generateObject({
    model,
    schema: z.object({ keywords: z.array(z.string()) }),
    prompt,
  })

  return result.object.keywords
}
```

---

### Phase 3: Prompt Versioning System (2-3 Days)

#### 3.1 Create Prompt Template Structure

```
lib/ai/prompts/templates/
├── content_generation/
│   ├── affiliate/
│   │   └── latest.ts
│   ├── review/
│   │   └── latest.ts
│   └── [other types]/
├── heading_generation/
│   └── generic/
│       └── latest.ts
└── keyword_expansion/
    └── [per type]/
```

#### 3.2 Prompt Template Loader

**New file:** `lib/ai/prompts/prompt-loader.ts`

```typescript
import type { ArticleType } from '@/data/article-types'

interface PromptTemplate {
  version: string
  content: string
  variables: string[]
}

export async function loadPromptTemplate(
  category: 'content_generation' | 'heading_generation' | 'keyword_expansion',
  articleType: string,
  version: string = 'latest'
): Promise<PromptTemplate> {
  const templates = await import(`./templates/${category}/${articleType}/${version}`)
  return templates.default
}

export function hydratePrompt(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '')
}
```

---

### Phase 4: Enhanced Content Rules (2-3 Days)

#### 4.1 Centralize Forbidden Content Rules

**New file:** `lib/ai/rules/forbidden-content.ts`

```typescript
export const FORBIDDEN_PHRASES = {
  // Never use in Closing H2
  closingH2: [
    'Closing', 'Conclusion', 'Final Thoughts', 'Summary',
    'In Summary', 'To Wrap Up', 'Wrapping Up', 'In Conclusion',
    'To Conclude', 'In Closing', 'To Sum Up'
  ],

  // Never start closing paragraphs with
  closingParagraphStart: [
    'In conclusion', 'To summarize', 'In summary',
    'To wrap up', 'Finally', 'As we\'ve discussed', 'As we\'ve seen'
  ],

  // Never use in H2s
  h2General: ['and', 'or', ':'],

  // Never combine in FAQ H3s
  faqH3: ['Multiple questions in single H3']
}

export const APPROVED_SYMBOLS = {
  checkmark: '✓', // Feature lists
  bullet: '•',    // Unordered lists
  starFilled: '★', // Ratings ONLY
  starEmpty: '☆',  // Ratings ONLY
  plus: '+',       // Pros ONLY
  minus: '–',      // Cons ONLY
}

export const SYMBOL_USAGE_RULES = {
  '✓': ['feature-list', 'key-takeaways'],
  '•': ['any-unordered-list'],
  '★': ['rating'],
  '☆': ['rating'],
  '+': ['pros-cons-pros'],
  '–': ['pros-cons-cons'],
}
```

#### 4.2 Inject Rules into All Prompts

**Update:** `lib/ai/prompts/component-prompts.ts`

```typescript
import { FORBIDDEN_PHRASES, APPROVED_SYMBOLS } from '../rules/forbidden-content'

export function buildEnhancedPrompt(basePrompt: string, includeRules: boolean = true): string {
  if (!includeRules) return basePrompt

  const rulesSection = `
================================================================================
                       FORBIDDEN PHRASES (CRITICAL)
================================================================================
CLOSING H2 - NEVER use: ${FORBIDDEN_PHRASES.closingH2.join(', ')}
CLOSING PARAGRAPH - NEVER start with: ${FORBIDDEN_PHRASES.closingParagraphStart.join(', ')}
H2 HEADINGS - NEVER include: ${FORBIDDEN_PHRASES.h2General.join(', ')}

================================================================================
                        SYMBOL RULES (STRICT)
================================================================================
NO EMOJIS allowed anywhere.
APPROVED SYMBOLS ONLY:
- ${APPROVED_SYMBOLS.checkmark} → Feature lists, completion indicators
- ${APPROVED_SYMBOLS.bullet} → Unordered lists
- ${APPROVED_SYMBOLS.starFilled}/${APPROVED_SYMBOLS.starEmpty} → Ratings ONLY
- ${APPROVED_SYMBOLS.plus} → Pros lists ONLY
- ${APPROVED_SYMBOLS.minus} → Cons lists ONLY
`

  return `${basePrompt}\n${rulesSection}`
}
```

---

### Phase 5: Validation Enhancement (2-3 Days)

#### 5.1 Create Post-Generation Validator

**New file:** `lib/services/content-validator.ts`

```typescript
interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

interface ValidationError {
  component: string
  rule: string
  message: string
  severity: 'error' | 'warning'
}

export function validateGeneratedContent(
  content: GeneratedContent,
  articleType: string
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // 1. Check forbidden phrases
  validateForbiddenPhrases(content, errors)

  // 2. Check symbol usage
  validateSymbolUsage(content, errors)

  // 3. Check word counts (±5 tolerance)
  validateWordCounts(content, articleType, errors, warnings)

  // 4. Check character limits
  validateCharacterLimits(content, articleType, errors)

  // 5. Check H1/H2 format consistency
  validateFormatConsistency(content, errors)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
```

---

## 📈 PART 3: IMPLEMENTATION PRIORITY

### Immediate (This Week)
1. ✅ Update character limits for special H2s (Rating, FAQ, etc.)
2. ✅ Add nutrition disclaimer requirement
3. ✅ Enforce listicle ODD count rule

### Short-Term (Next 2 Weeks)
4. 🔄 Create keyword expansion system
5. 🔄 Centralize forbidden content rules
6. 🔄 Inject rules into all prompts

### Medium-Term (Month 1)
7. 📋 Implement prompt versioning system
8. 📋 Add post-generation validator
9. 📋 Tighten word count tolerance to ±5

### Long-Term (Month 2+)
10. 📋 Build prompt management UI
11. 📋 Add A/B testing for prompts
12. 📋 Implement keyword clustering analytics

---

## 📁 PART 4: FILES TO CREATE/MODIFY

### New Files
```
lib/ai/prompts/keyword-prompts.ts          # Keyword expansion per article type
lib/ai/generate-keywords.ts                 # Keyword generation function
lib/ai/rules/forbidden-content.ts           # Centralized content rules
lib/services/content-validator.ts           # Post-generation validation
lib/ai/prompts/templates/                   # Versioned prompt templates
```

### Files to Modify
```
lib/ai/schemas/structure.ts                 # Update character limits
data/components.ts                          # Update constraint definitions
lib/ai/prompts/component-prompts.ts         # Add rules injection
lib/ai/prompts/content-prompts.ts           # Add rules injection
lib/services/structure-generator.ts         # Listicle ODD count rule
lib/services/unified-orchestrator.ts        # Integrate keyword expansion
```

---

## ✅ PART 5: VERIFICATION CHECKLIST

After implementation, verify:

- [ ] Rating H2 limited to 30 characters
- [ ] FAQ H2 limited to 30 characters
- [ ] Special section H2s (Honorable Mentions, Why Local, Quick Facts) limited to 40-50 chars
- [ ] Listicle articles always have ODD item count
- [ ] Nutrition tables include disclaimer
- [ ] All prompts include forbidden phrases section
- [ ] All prompts include symbol rules section
- [ ] Keyword expansion generates article-type-specific keywords
- [ ] Word counts validated within ±5 words of target
- [ ] No emojis in generated content
- [ ] Approved symbols used only in correct contexts

---

## 🎯 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| H2 character limit compliance | ~90% | 100% |
| Word count accuracy | ±15% | ±5 words |
| Forbidden phrase detection | Post-gen | Pre+Post |
| Keyword relevance | Generic | Article-type specific |
| Prompt maintainability | Hardcoded | Versioned templates |

---

*Document created: January 19, 2026*
*Reference system analyzed: AWS Lambda SCAI Production*
