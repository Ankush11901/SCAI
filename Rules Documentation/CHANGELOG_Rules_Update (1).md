# CHANGELOG: Rules Documentation Update

**Date**: January 27, 2026
**Status**: ✅ COMPLETED
**Source**: Meeting Notes (New-Requests.txt) - SCAI / SEO Team (Muneeb & Haider)
**Total Items**: 39 additions
**New Files**: 3 (prompt_rules.md, image_rules.md, RULES_INDEX.md)

---

## Summary of Changes

| Action | File | Items Added |
|--------|------|-------------|
| CREATE | prompt_rules.md | 10 items (#1-10) |
| CREATE | image_rules.md | 7 items (#11-17) |
| CREATE | RULES_INDEX.md | 1 item (#39) |
| UPDATE | content_rules.md | 5 items (#18-21, #37) |
| UPDATE | component_rules.md | 5 items (#22-26) |
| UPDATE | programmatic_rules.md | 6 items (#27-31, #38) |
| UPDATE | general_rules.md | 3 items (#32-34) |
| UPDATE | All 7 files | 2 items (#35-36) |

---

## NEW FILE 1: prompt_rules.md

**Purpose**: AI prompting guidelines, SEO rules, system/scale handling, context preservation, token management.

### Items Added:

| # | Item | Description |
|---|------|-------------|
| 1 | Maintain keyword relevance H1→H2→body | Ensures SEO consistency throughout article hierarchy - keyword must flow naturally from title through sections to content |
| 2 | Ensure sentiment consistency | Prevents mixed positive/negative framing within same article unless explicitly requested by user |
| 3 | Enforce topical relevance and NLP optimization | Keeps AI focused on target topic using natural language patterns without keyword stuffing |
| 4 | Prevent topic drift during expansion | Stops AI from wandering to unrelated subjects when generating longer content sections |
| 5 | Persist critical variables across prompt chains | Maintains seed keyword, user intent, and topic scope when using multiple AI calls for one article |
| 6 | Stateless AI call handling | Documents that each AI API call starts fresh - context must be explicitly re-injected each time |
| 7 | Context retention for large batches (100-500 articles) | Rules for maintaining consistent quality and brand voice when generating content at scale |
| 8 | Token usage control | Defines token budgets per call to prevent context window overflow and content truncation |
| 9 | AI response validation criteria | Defines what makes AI output valid/invalid and triggers for rejection/regeneration |
| 10 | SEO-owned vs Engineering-owned split | Clarifies which prompt rules are managed by SEO team vs development team |

---

## NEW FILE 2: image_rules.md

**Purpose**: Image generation specifications, quality thresholds, regeneration logic, prompt guidelines.

### Items Added:

| # | Item | Description |
|---|------|-------------|
| 11 | Image aspect ratio requirements | Defines exact width:height ratios for Featured Image (16:9), H2 Image (16:9), Product Image (1:1), etc. |
| 12 | Image quality thresholds | Minimum resolution (800px), max file size (500KB), compression quality (80%), format requirements |
| 13 | Image regeneration on failure | Defines when failed image triggers retry - quality below threshold, wrong aspect ratio, watermarks detected |
| 14 | Multi-step image handling | Workflow for layered image generation - initial generation → quality check → enhancement → final output |
| 15 | Prompt-level image rules | Guidelines for constructing effective image generation prompts - style keywords, composition instructions |
| 16 | Image style consistency | Rules ensuring all images in one article match the same visual style (realistic, illustrated, etc.) |
| 17 | Image content restrictions | What images must NOT contain - no faces without consent, no copyrighted material, no offensive content |

---

## NEW FILE 3: RULES_INDEX.md

**Purpose**: Single reference document listing all rule files with their one-line definitions and purposes in one place.

### Items Added:

| # | Item | Description |
|---|------|-------------|
| 39 | Rules Documentation Index | Central document with one-line definitions for all 7 rule files, layer hierarchy diagram, what each file contains/doesn't contain, and cross-reference guide. Per meeting request: "One-line definition for each category" in one place. |

---

## UPDATE: content_rules.md

**Sections Added**: Internal Linking Guidelines (§10), Content Safety Rules (§11)

### Items Added:

| # | Item | Description |
|---|------|-------------|
| 18 | No adult content rule | Content safety - prohibits sexually explicit, violent, or adult-only content in all generated text |
| 19 | No profanity rule | Content safety - prohibits swear words, slurs, and offensive language in all generated text |
| 20 | No negative language rule | Content safety - avoids unnecessarily harsh, harmful, or discouraging phrasing |
| 21 | Narrative consistency rule | Prevents contradicting statements within same article (e.g., "Product is great" then "Product has many flaws") |
| 37 | Internal Linking Guidelines | Content/SEO perspective on internal linking - purpose, when to link, integration rules, what NOT to do. Per meeting note: "Link rules should live under Content Rules" |

---

## UPDATE: component_rules.md

**Sections Added**: Badge Rules, AI Content Permissions, Component Data Source Matrix, Component Validation Rules

### Items Added:

| # | Item | Description |
|---|------|-------------|
| 22 | Badge text constraints | Defines approved badge labels ("Verified", "Best Seller", "Top Pick", "Editor's Choice"), character limits (max 15 chars), and which components can display badges across applicable article types (Affiliate, Commercial, Review, Comparison, Listicle) |
| 23 | AI rewriting ALLOWED list | Explicit documentation: AI CAN generate/rewrite Titles, Descriptions, Alt Text, Meta Content, List Items, Images |
| 24 | AI rewriting NOT ALLOWED list | Explicit documentation: AI CANNOT modify Price, Ratings, Reviews, Affiliate Links, Business Info, Phone Numbers, Addresses |
| 25 | Component data source matrix | Table showing which components use LLM data vs External API data vs User Input data |
| 26 | Component validation rules | What makes a component valid/invalid - required fields, format checks, content checks |

---

## UPDATE: programmatic_rules.md

**Sections Added**: Token Management, Validation Rules, Scale Processing Rules, Conflict Resolution, Character Count Ranges

### Items Added:

| # | Item | Description |
|---|------|-------------|
| 27 | Token in/out limits per AI execution | Hard limits on input/output tokens per API call (e.g., max 4000 tokens in, 2000 tokens out) |
| 28 | Invalid AI response rejection criteria | Specific conditions that trigger rejection: wrong format, missing required fields, exceeded limits, off-topic |
| 29 | Context preservation logic at scale | System rules for maintaining context when generating 100+ articles in batch operations |
| 30 | Rule conflict resolution mechanism | How system handles when two rules contradict - priority order, override rules |
| 31 | Retry and fallback logic | How many retries on failure, what fallback content to use, timeout thresholds |
| 38 | Character count ranges for all components | Added character ranges for all 47 components (headings, paragraphs, lists, boxes, tables) based on formula: 50 words = 275-325 chars (5.5-6.5 chars per word). Ensures consistent output length alongside word counts. Per meeting request: "Per-paragraph / per-response character or token limits" |

---

## UPDATE: general_rules.md

**Section Added**: System Alignment Rules

### Items Added:

| # | Item | Description |
|---|------|-------------|
| 32 | Output must align with rule categories | All generated content must pass validation against all applicable rule categories before acceptance |
| 33 | Rules may overlap but must not conflict | Documents that same content may be governed by multiple rules, but rules cannot contradict each other |
| 34 | Cross-category validation requirement | Before publishing, content must be validated against: Content Rules + Component Rules + SEO Rules |

---

## UPDATE: All 7 Files (Headers)

### Items Added:

| # | Item | Description |
|---|------|-------------|
| 35 | One-line definition for each category | Quick reference definition at top of each file explaining its purpose in 1 sentence |
| 36 | Contradiction test documentation | Process/checklist for using AI to validate that no rules conflict with each other (added to general_rules.md) |

---

## HELD FOR FUTURE DECISION (Not Included)

These items were requested in meeting but conflict with current "Black and White Only" design philosophy:

| # | Item | Conflict |
|---|------|----------|
| H1 | Text color selection (global) | Contradicts "Black only" rule |
| H2 | Text color selection (component-level) | Contradicts "Black only" rule |
| H3 | Component color selection | Contradicts "Grayscale only" rule |
| H4 | Font selection | Contradicts "System-defined fonts only" rule |
| H5 | Font requirements (Google Fonts, web-safe) | No conflict - can add later |
| H6 | Font fallback/degradation rules | No conflict - can add later |

**Decision Required**: Should the "Black and White Only" design philosophy be changed to allow user customization?

---

## Conflict Check Results

**All 39 items checked against existing 5 files:**

| Status | Result |
|--------|--------|
| Conflicts Found | 0 |
| New Additions | 39 |
| Files Created | 3 |
| Files Updated | 5 |

---

## File Renames

| Original Name | New Name | Reason |
|---------------|----------|--------|
| `programmatic_options.md` | `programmatic_rules.md` | "Options" implied user choice; these are system rules |
| `user_impacted_options.md` | `user_options.md` | Simplified naming; removed "impacted" |

**All cross-references updated in all 8 files.**

---

## File Structure After Update

```
/Rules/
├── component_rules.md      (UPDATED - 5 items added)
├── content_rules.md        (UPDATED - 5 items added)
├── general_rules.md        (UPDATED - 3 items added)
├── programmatic_rules.md   (UPDATED - 6 items added, RENAMED)
├── user_options.md         (UPDATED - header only, RENAMED)
├── prompt_rules.md         (NEW - 10 items)
├── image_rules.md          (NEW - 7 items)
└── RULES_INDEX.md          (NEW - Index document with all definitions)
```

---

*This changelog created before any modifications to track all changes.*
