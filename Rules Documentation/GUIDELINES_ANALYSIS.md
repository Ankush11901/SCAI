# Guidelines Page Analysis

## Comparison: Rules Documentation vs Current Guidelines Page

**Analysis Date**: February 2026
**Analyzed Files**:
- Rules Documentation: 7 rule files + index
- Current Guidelines: `data/guidelines.ts` (6 categories, ~200 items)

---

## Executive Summary

The current Guidelines page covers **approximately 60-65%** of the comprehensive Rules Documentation. There are significant gaps in:
- Badge rules and AI content permissions
- Token management and scale processing
- Image generation specifications
- Validation pipelines and retry logic
- Interlinking enhancements (anchor text variance, silo enforcement)

### Current Guidelines Stats
| Category | Items |
|----------|-------|
| Golden Rules | 5 |
| Model Layer | ~50 |
| Controller Layer | ~40 |
| View Layer | ~30 |
| Configuration | ~30 |
| Quality Standards | ~30 |
| **Total** | **~185 items** |

### Rules Documentation Coverage
| Document | Sections | In Guidelines? |
|----------|----------|----------------|
| component_rules.md | 14 sections | ~70% covered |
| programmatic_rules.md | 20 sections | ~50% covered |
| content_rules.md | 8 sections | ~80% covered |
| user_options.md | 10 sections | ~90% covered |
| prompt_rules.md | 5 sections | ~60% covered |
| image_rules.md | 8 sections | ~30% covered |
| general_rules.md | 5 sections | ~70% covered |

---

## MISSING Content (Not in Guidelines)

### 1. Badge Rules (component_rules.md Section 11)

**Status**: NOT IN GUIDELINES

**Content to Add**:
- Approved badge labels (Best Seller, Top Pick, Editor's Choice, etc.)
- Badge character limits (3-15 characters)
- Badge usage by article type (which types can use badges)
- One badge per component rule
- Badge display conditions

```
| Badge | Max Chars | Article Types |
|-------|-----------|---------------|
| Best Seller | 11 | Affiliate |
| Top Pick | 8 | All applicable |
| Editor's Choice | 15 | All applicable |
| Best Value | 10 | Affiliate, Comparison |
| Budget Pick | 11 | Affiliate |
```

---

### 2. AI Content Permissions (component_rules.md Section 12)

**Status**: NOT IN GUIDELINES

**Content to Add**:
- AI Rewriting ALLOWED list (H1, H2, paragraphs, meta, alt text, etc.)
- AI Rewriting NOT ALLOWED list (prices, ratings, affiliate links, business info)
- AI Permission Matrix by component

**Critical Rules Missing**:
| NOT Allowed for AI | Source |
|-------------------|--------|
| Price | External API / User |
| Star Ratings | External API |
| Product Reviews | External API |
| Affiliate Links | External API |
| Business Name/Address/Phone | User Input |
| License Numbers | User Input |
| Exact Quotes | Must preserve |
| Legal Disclaimers | Exact text |

---

### 3. Component Data Source Matrix (component_rules.md Section 13)

**Status**: NOT IN GUIDELINES

**Content to Add**:
- Data source for each component (LLM, API, USER, AUTO)
- Clear mapping showing Product Card = API, Service Info Box = USER, etc.

---

### 4. Component Validation Rules (component_rules.md Section 14)

**Status**: NOT IN GUIDELINES

**Content to Add**:
- Required fields per component
- Format validation rules
- Validation status codes (VALID, INVALID_FORMAT, INVALID_LENGTH, etc.)
- Validation workflow diagram
- Error handling strategies

---

### 5. Token Management (programmatic_rules.md Section 16)

**Status**: PARTIALLY COVERED (very minimal)

**Content to Add**:
| Generation Type | Max Input | Max Output | Total Budget |
|-----------------|-----------|------------|--------------|
| H1 Generation | 500 | 100 | 600 |
| H2 Generation | 800 | 200 | 1000 |
| Single Paragraph | 1000 | 500 | 1500 |
| Full Section | 2000 | 1000 | 3000 |
| Meta Content | 500 | 200 | 700 |
| FAQ Section (All 5) | 1500 | 800 | 2300 |
| Full Article | 4000 | 4000 | 8000 |

**Context Window Allocation** (8000 tokens):
- System Prompt: 500 (6%)
- Article Context: 1000 (12.5%)
- Section Instructions: 500 (6%)
- Previous Content Summary: 500 (6%)
- Output Buffer: 2000 (25%)
- Safety Margin: 500 (6%)
- Available for Generation: 3000 (37.5%)

---

### 6. AI Response Validation (programmatic_rules.md Section 17)

**Status**: NOT IN GUIDELINES

**Content to Add**:
- Rejection criteria (wrong format, missing fields, exceeded limits, etc.)
- Validation thresholds table
- Validation pipeline (Format → Length → Content → Quality → Decision)
- Reason codes (FORMAT_ERROR, LENGTH_SHORT, OFF_TOPIC, etc.)

---

### 7. Scale Processing Rules (programmatic_rules.md Section 18)

**Status**: NOT IN GUIDELINES

**Content to Add**:
- Batch processing limits (max 10 concurrent, 500 per batch, 100ms delay)
- Context preservation requirements
- Quality assurance at scale (sample review, automated validation)
- Performance monitoring metrics

---

### 8. Rule Conflict Resolution (programmatic_rules.md Section 19)

**Status**: NOT IN GUIDELINES

**Content to Add**:
- Priority hierarchy (Safety > Legal > Programmatic > Content > Style > Preferences)
- Conflict resolution matrix
- Conflict examples and resolutions

---

### 9. Retry and Fallback Logic (programmatic_rules.md Section 20)

**Status**: PARTIALLY COVERED (only max retries mentioned)

**Content to Add**:
| Generation Type | Max Retries | Delay | Timeout |
|-----------------|-------------|-------|---------|
| H1/H2 Generation | 3 | 1s | 30s |
| Paragraph | 3 | 2s | 60s |
| Full Section | 3 | 5s | 120s |
| Image Generation | 5 | 5s | 180s |
| Full Article | 2 | 30s | 600s |

**Fallback content strategies**:
- H1 → Use keyword as title + flag
- Meta Title → Use H1 as meta title
- Meta Description → Use first 160 chars of overview
- Image → Use placeholder + flag

---

### 10. Interlinking Enhancements (programmatic_rules.md Section 10)

**Status**: PARTIALLY COVERED (basic strategy, missing enhancements)

**Content to Add**:
- **Anchor Text Variance** (Anti-Spam):
  - Exact Match: 20%
  - Semantic/Partial Match: 50%
  - Generic/Navigational: 30%
- **Hard Silo Enforcement**: Links restricted to same Parent Category
- **Link Position Priority**: Primary Service Link in first 200 words
- **Link Density Limiter**: Max 1 internal link per 150 words
- **Orphan Page Protection**: "Related Reading" section with 3 recent articles

---

### 11. Image Generation Rules (image_rules.md)

**Status**: ~30% COVERED - Major gaps

**Content to Add**:

#### Aspect Ratio Requirements
| Image Type | Ratio | Dimensions |
|------------|-------|------------|
| Featured Image | 16:9 | 1200×675 px |
| H2 Image | 16:9 | 800×450 px |
| Product Card | 1:1 | 400×400 px |
| Why Choose Local | 4:3 | 400×300 px |
| Thumbnail | 1:1 | 150×150 px |
| Social Share | 1.91:1 | 1200×628 px |

#### Quality Thresholds
- Min resolution: 1200×675 (Featured), 800×450 (H2)
- Max file size: 500 KB
- Compression quality: Min 80%
- No watermarks, no unintended text

#### Regeneration Logic
| Trigger | Action |
|---------|--------|
| Quality < 60% | Regenerate same prompt |
| Wrong aspect ratio | Regenerate with explicit dimensions |
| Watermark detected | Regenerate with "no watermark" |
| Text in image | Regenerate with "no text" |

#### Multi-Step Pipeline
1. Initial Generation → 2. Quality Assessment → 3. Enhancement (if needed) → 4. Format Optimization → 5. Final Validation

#### Style Consistency
- Per-article style lock (once first image style determined, all must match)
- Style categories: Photographic, Illustrated, Minimalist, Editorial, Flat Design

#### Prompt Templates
Featured Image:
```
"High-quality professional [style] of [subject], [setting],
[lighting], [composition], suitable for article header,
no text, no watermarks, 16:9 aspect ratio"
```

---

### 12. SEO-Driven Prompt Rules (prompt_rules.md)

**Status**: ~60% COVERED - Missing detail

**Content to Add**:
- Keyword Relevance Flow diagram (H1 → H2 → Body)
- Sentiment Consistency rules (Positive/Neutral/Negative)
- Topic Drift Prevention strategies
- NLP Best Practices (Flesch-Kincaid target: 60-70)

---

### 13. Component Sequence Tables (component_rules.md Section 10)

**Status**: PARTIALLY COVERED

**Missing Article Sequences**:
- Informational Article Sequence (11 components)
- Listicle Article Sequence (11 components)
- Local Article Sequence (12 components)
- Review Article Sequence (15 components)
- Recipe Article Sequence (16 components)

Each needs the full table with: Component, Constraint, Type (Universal/Unique), Required status.

---

## OUTDATED or INCORRECT Items

### 1. H2 Image Aspect Ratio
**Current Guidelines**: `800x400 (2:1)`
**Rules Documentation**: `800x450 (16:9)`
**Action**: Update to 16:9 (800×450)

### 2. Featured Image Dimensions
**Current Guidelines**: `800x450`
**Rules Documentation**: `1200x675` (minimum recommended)
**Action**: Update to 1200×675

### 3. Image Retry Logic
**Current Guidelines**: `2 retries max`
**Rules Documentation**: `5 retries max` (for images specifically)
**Action**: Update to 5 retries for images

### 4. H2 Keyword Density
**Current Guidelines**: `60-70%`
**Rules Documentation**: Not specified as a percentage - says "Primary keyword or semantic variation MUST appear"
**Action**: Review and clarify - this rule may be overly specific

---

## INCOMPLETE Items (Need More Detail)

### 1. Character Limits Table
**Current**: Basic limits scattered across items
**Needed**: Consolidated table matching programmatic_rules.md Section 1

Missing character ranges:
| Component | Character Range |
|-----------|-----------------|
| Overview Paragraph | 550-650 characters |
| Standard Paragraph | 825-975 characters |
| Closing Paragraph | 275-325 characters |
| FAQ Answer | 150-185 characters |

### 2. Article Type Sequence Rules
**Current**: Basic sequence mentioned
**Needed**: Full sequence tables for each article type

### 3. Accessibility Requirements
**Current**: Basic alt text, contrast mentioned
**Needed**: Full accessibility section from programmatic_rules.md Section 12:
- Screen reader support
- ARIA labels
- Keyboard navigation
- Skip-to-content links
- Focus indicators
- Logical tab order

---

## Structural Recommendations

### Current Structure (MVC-based)
```
1. Golden Rules
2. Model Layer (Components)
3. Controller Layer (Logic)
4. View Layer (Presentation)
5. Configuration (Settings)
6. Quality Standards
```

### Rules Documentation Structure (7 Layers)
```
1. USER CHOICES - user_options.md
2. SYSTEM CONSTRAINTS - programmatic_rules.md
3. STRUCTURE - component_rules.md
4. LOGIC - content_rules.md
5. PRESENTATION - general_rules.md
6. AI BEHAVIOR - prompt_rules.md
7. VISUAL GENERATION - image_rules.md
```

### Recommended Restructure
Keep current structure but add new categories:

```
1. Golden Rules (keep)
2. Model Layer (keep - component definitions)
3. Controller Layer (keep - add validation/retry logic)
4. View Layer (keep - add full image specs)
5. Configuration (keep)
6. Quality Standards (keep)
7. NEW: AI Behavior (token management, response validation)
8. NEW: Image Generation (full specs from image_rules.md)
9. NEW: Scale & Processing (batch rules, retry logic)
```

---

## Priority Action Items

### HIGH Priority (Critical Missing Rules)
1. Add Badge Rules section
2. Add AI Content Permissions (what AI can/cannot modify)
3. Add Token Management section
4. Add Component Validation Rules
5. Update image specifications (ratios, dimensions)

### MEDIUM Priority (Important Gaps)
6. Add full Retry and Fallback Logic
7. Add Interlinking Enhancements (anchor variance, silo rules)
8. Add Scale Processing Rules
9. Add AI Response Validation
10. Add Component Sequence Tables

### LOW Priority (Nice to Have)
11. Rule Conflict Resolution
12. Enhanced accessibility requirements
13. Character range tables (consolidated)
14. Image prompt templates

---

## Item Counts Summary

| Category | Current Items | Should Have | Gap |
|----------|---------------|-------------|-----|
| Component Definitions | ~50 | ~60 | +10 |
| Logic/Validation | ~40 | ~70 | +30 |
| Presentation/View | ~30 | ~45 | +15 |
| Configuration | ~30 | ~35 | +5 |
| AI/Prompts | ~10 | ~30 | +20 |
| Image Rules | ~10 | ~40 | +30 |
| Quality | ~30 | ~35 | +5 |
| **TOTAL** | **~185** | **~315** | **+130** |

The guidelines page needs approximately **130 new items** to fully cover the Rules Documentation.

---

## Next Steps

1. **Review this analysis** with team
2. **Prioritize** which gaps to fill first (recommend HIGH priority items)
3. **Update `data/guidelines.ts`** with new sections and items
4. **Consider** restructuring categories if needed
5. **Add cross-references** between related rules
6. **Test** search functionality with new items

---

*Generated by Claude Code - February 2026*
