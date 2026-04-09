# Programmatic Rules - SYSTEM CONSTRAINTS Layer

**One-Line Definition**: System-enforced constraints including fixed values, limits, validation rules, token management, and retry logic that users cannot change.

**Purpose**: Defines WHAT the system enforces - all fixed values, limits, validation rules, and constraints that users cannot change.

**This file contains ONLY**:
- All character and word limits
- Color palette (fixed hex codes)
- Typography rules (fixed values)
- Approved symbols and emoji restrictions
- Forbidden phrases and content rules
- SEO validation rules
- Global constraints and minimums/maximums
- Required components per article type
- Interlinking strategy availability
- Workflow pipeline steps
- Accessibility requirements
- CSS usage constraints
- Header consistency enforcement

**This file does NOT contain**: Component definitions (structure), generation logic (flow), visual layouts (where), user toggles (choices).

**Cross-References**:
- For component definitions → See `component_rules.md`
- For generation logic → See `content_rules.md`
- For visual layout → See `general_rules.md`
- For user settings → See `user_options.md`

---

## Table of Contents
1. [Character Limits](#1-character-limits)
2. [Word Limits](#2-word-limits)
3. [Color Palette](#3-color-palette)
4. [Typography Rules](#4-typography-rules)
5. [Approved Symbols](#5-approved-symbols)
6. [Forbidden Content Rules](#6-forbidden-content-rules)
7. [SEO Validation Rules](#7-seo-validation-rules)
8. [Global Constraints](#8-global-constraints)
9. [Required Components by Article Type](#9-required-components-by-article-type)
10. [Interlinking Strategy Availability](#10-interlinking-strategy-availability)
11. [Workflow Pipeline](#11-workflow-pipeline)
12. [Accessibility Requirements](#12-accessibility-requirements)
13. [CSS Usage Constraints](#13-css-usage-constraints)
14. [Header Consistency Enforcement](#14-header-consistency-enforcement)
15. [Quick Reference](#15-quick-reference)

---

## 1. Character Limits

### Universal Component Character Limits

#### Headings

| Component | Character Range | Notes |
|-----------|-----------------|-------|
| **H1** | 50-60 characters | Exactly 1 per article |
| **H2** | 50-60 characters | Standard section headings |
| **Closing H2** | 50-60 characters | Final section heading |
| **FAQ H2** | 25-30 characters | Parent heading only |
| **FAQ H3** | 30-60 characters | Variable, exactly 5 questions |

#### Meta Content

| Component | Character Range | Notes |
|-----------|-----------------|-------|
| **Meta Title** | 50-60 characters | Strict SEO limit |
| **Meta Description** | 140-160 characters | Strict SEO limit |
| **Featured Image Alt Text** | 100-125 characters | Accessibility requirement |
| **H2 Image Alt Text** | 80-100 characters | Accessibility requirement |

#### Paragraphs

| Component | Word Limit | Character Range | Breakdown |
|-----------|------------|-----------------|-----------|
| **Overview Paragraph** | 100 words | 550-650 characters | 2 sub-paras × 275-325 chars |
| **Standard Paragraph** | 150 words | 825-975 characters | 3 sub-paras × 275-325 chars |
| **Closing Paragraph** | 50 words | 275-325 characters | Single paragraph |
| **FAQ Answer** | 28 words | 150-185 characters | Single answer |

### Unique Component Character Limits

#### Headings by Article Type

| Component | Character Range | Article Type |
|-----------|-----------------|--------------|
| **Feature H2** | 50-60 characters | Commercial |
| **Topic H2** | 50-60 characters | Comparison |
| **Materials/Requirements H2** | 50-60 characters | How-To |
| **Pro Tips H2** | 50-60 characters | How-To |
| **Quick Facts H2** | 35-50 characters | Informational |
| **Honorable Mentions H2** | 35-50 characters | Listicle |
| **Honorable Mentions H3** | 25-40 characters | Listicle |
| **Why Choose Local H2** | 35-50 characters | Local |
| **Ingredients H2** | 50-60 characters | Recipe |
| **Instructions H2** | 50-60 characters | Recipe |
| **Tips H2** | 50-60 characters | Recipe |
| **Nutrition Facts H2** | 50-60 characters | Recipe |
| **Features H2** | 50-60 characters | Review |
| **Pros & Cons H2** | 50-60 characters | Review |
| **Rating H2** | 25-30 characters | Review |

#### Paragraphs & Content by Article Type

| Component | Word Limit | Character Range | Article Type |
|-----------|------------|-----------------|--------------|
| **Feature List** | 100-120 words | 550-780 characters | Commercial |
| **CTA Box** | 20-30 words | 110-195 characters | Commercial |
| **Topic Overview** | 80 words | 440-520 characters | Comparison |
| **Comparison Table** | 120-150 words | 660-975 characters | Comparison |
| **Quick Verdict Box** | 50 words | 275-325 characters | Comparison |
| **Materials/Requirements Box** | 20-120 words | 110-780 characters | How-To |
| **Pro Tips List** | 80-120 words | 440-780 characters | How-To |
| **Key Takeaways Box** | 50-75 words | 275-490 characters | Informational |
| **Quick Facts List** | 80-100 words | 440-650 characters | Informational |
| **Honorable Mentions Paragraph** | 40-50 words | 220-325 characters | Listicle |
| **Why Choose Local List** | 40-60 words | 220-390 characters | Local |
| **Service Info Box** | 40-60 words | 220-390 characters | Local |
| **Ingredients List** | 150 words | 825-975 characters | Recipe |
| **Instructions List** | 150-400 words | 825-2600 characters | Recipe |
| **Tips Paragraph** | 150 words | 825-975 characters | Recipe |
| **Nutrition Table** | 100 words | 550-650 characters | Recipe |
| **Features List** | 150 words | 825-975 characters | Review |
| **Pros List** | 75 words | 410-490 characters | Review |
| **Cons List** | 75 words | 410-490 characters | Review |
| **Rating Paragraph** | 100 words | 550-650 characters | Review |

### Character Range Summary

| Component Type | Standard Range | Shorter Range |
|----------------|----------------|---------------|
| Standard H2 | 50-60 characters | - |
| Shorter H2 (Facts, Mentions, Local) | 35-50 characters | 17-25% shorter |
| Short H2 (FAQ, Rating) | 25-30 characters | 50% shorter |
| H3 | 25-40 characters | - |
| Sub-paragraph (50 words) | 275-325 characters | Base unit |

### General Rule of Thumb

| Rule | Value |
|------|-------|
| **Characters per word** | 5.5-6.5 (including space) |
| **50 words** | 275-325 characters |
| **Sub-paragraph** | 275-325 characters |

---

## 2. Word Limits

### Universal Component Word Limits

| Component | Word Limit | Breakdown |
|-----------|------------|-----------|
| **Overview Paragraph** | 100 words | 2 sub-paragraphs × 50 words |
| **Standard Paragraph** | 150 words | 3 sub-paragraphs × 50 words |
| **Closing Paragraph** | 50 words | Single paragraph |
| **FAQ Answer** | 28 words each | 5 answers = 140 words total |

### Unique Component Word Limits

#### Commercial
| Component | Word Limit | Breakdown |
|-----------|------------|-----------|
| Feature List | 100-120 words | 5-7 bullets × 15-20 words |
| CTA Box | 20-30 words | Single call-to-action |

#### Comparison
| Component | Word Limit | Breakdown |
|-----------|------------|-----------|
| Topic Overview | 80 words | 2 paragraphs × 40 words |
| Comparison Table | 120-150 words | Variable rows/columns |
| Quick Verdict Box | 50 words | Conditional recommendations |

#### How-To
| Component | Word Limit | Breakdown |
|-----------|------------|-----------|
| Materials/Requirements Box | 20-120 words | 5-15 bullets × 2-12 words |
| Pro Tips List | 80-120 words | 5-7 bullets × 12-18 words |

#### Informational
| Component | Word Limit | Breakdown |
|-----------|------------|-----------|
| Key Takeaways Box | 50-75 words | 5-6 bullets × 10-12 words |
| Quick Facts List | 80-100 words | 5-7 bullets × 12-15 words |

#### Listicle
| Component | Word Limit | Breakdown |
|-----------|------------|-----------|
| Honorable Mentions Paragraph | 40-50 words per H3 | 3-4 H3s = 120-200 words total |

#### Local
| Component | Word Limit | Breakdown |
|-----------|------------|-----------|
| Why Choose Local List | 40-60 words | 4-5 bullets × 8-12 words |
| Service Info Box | 40-60 words | 5-6 rows |

#### Recipe
| Component | Word Limit | Breakdown |
|-----------|------------|-----------|
| Ingredients List | 150 words | Bulleted list |
| Instructions List | 150-400 words | Numbered list |
| Tips Paragraph | 150 words | 3 paragraphs × 50 words |
| Nutrition Table | 100 words | Tabular data |

#### Review
| Component | Word Limit | Breakdown |
|-----------|------------|-----------|
| Features List | 150 words | 7-10 bullets × 15-20 words each |
| Pros & Cons Lists | 150 words total | 75 pros + 75 cons, 5-7 bullets each × 10-15 words per bullet |
| Rating Paragraph | 100 words | Score + justification |

---

## 3. Color Palette

### CRITICAL: Black and White Only

The system uses ONLY black, white, and grayscale colors.

### Primary Colors (FIXED)

| Color | Hex Code | Usage |
|-------|----------|-------|
| **Black** | #000000 | Primary text, headings, borders |
| **White** | #FFFFFF | Backgrounds, contrast |

### Grayscale Palette (FIXED)

| Category | Hex Codes | Usage |
|----------|-----------|-------|
| **Light Grays** | #F5F5F5, #F9F9F9, #FAFAFA | Backgrounds, cards |
| **Medium Grays** | #E5E5E5, #F0F0F0 | Borders, dividers |
| **Dark Grays** | #333333, #555555, #666666, #999999 | Secondary text, captions |

### Forbidden Colors (ENFORCED)

**NO chromatic colors allowed**:
- NO accent colors
- NO brand colors
- NO theme colors
- NO red, green, blue, yellow
- NO any other chromatic colors

---

## 4. Typography Rules

### Text Color Assignment (FIXED)

| Text Type | Color |
|-----------|-------|
| Primary text | Black (#000000) |
| Secondary text | Dark grays (#333333, #555555, #666666) |
| Captions/metadata | Medium gray (#999999) |

### Font Rules (FIXED)

- Use system-defined font families only
- Use predefined font sizes and weights
- Follow established line-height rules
- Maintain consistent typography across all article types

### Heading Visual Hierarchy (FIXED)

| Level | Visual Treatment |
|-------|------------------|
| H1 | Largest, primary heading |
| H2 | Section heading |
| H3 | Sub-section (FAQ and Honorable Mentions only) |

---

## 5. Approved Symbols

### Emoji Restriction (ENFORCED)

**NO EMOJIS ALLOWED** - Do not use any emojis anywhere in articles.

### Approved Symbols (FIXED)

| Symbol | Character | Usage |
|--------|-----------|-------|
| Checkmark | ✓ | Checkmark lists, completion indicators |
| Bullet | • | Unordered lists |
| Star (filled) | ★ | Ratings only |
| Star (empty) | ☆ | Ratings only |
| Plus | + | Pros lists only |
| Minus | – | Cons lists only |

### Symbol Usage Rules (ENFORCED)

- Use checkmarks for feature lists and completion items
- Use bullets for standard unordered lists
- Use stars ONLY for rating displays
- Use plus/minus ONLY for pros and cons sections
- NO other symbols allowed

---

## 6. Forbidden Content Rules

### Closing H2 Forbidden Phrases (ENFORCED)

Closing H2 **MUST NEVER literally contain**:
- "Closing"
- "Conclusion"
- "Final Thoughts"
- "Summary"
- "In Summary"
- "To Wrap Up"
- Any similar concluding terms

**Must be**: Descriptive and elaborative like any other H2.

### Closing Paragraph Forbidden Phrases (ENFORCED)

Closing Paragraph **MUST NEVER start with**:
- "In conclusion"
- "To summarize"
- "In summary"
- "To wrap up"
- "Finally"
- "As we've discussed"
- Any similar announcement phrases

**Must**: End naturally with value reinforcement.

### H2 Heading Forbidden Content (ENFORCED)

- NO conjunctions "and" or "or" - each H2 must be single-focused
- NO colons (:) in heading text
- NO multiple questions combined - one question/statement per H2

### FAQ Question Forbidden Content (ENFORCED)

- NEVER combine multiple questions in a single FAQ H3
- Each FAQ must be a single, focused question

---

## 7. SEO Validation Rules

### H1 Keyword Rules (ENFORCED)

- Primary keyword MUST APPEAR in H1 title
- All headings must maintain keyword SENTIMENT
- All headings must be UNDER 60 CHARACTERS
- Headings should be SIMILAR IN NATURE to provided keyword

### H2 Keyword Rules (ENFORCED)

- Must be UNDER 60 CHARACTERS
- Must INCLUDE MAIN TOPIC KEYWORD
- Must explore DIFFERENT ASPECTS of topic
- Must be phrased differently from each other
- NEVER include words that CONTRADICT keyword
- NEVER CONTRADICT SENTIMENT of original keyword
- Maintain CONSISTENCY IN SENTIMENT throughout

### Meta Title Rules (ENFORCED)

- 50-60 characters (strict)
- Maintain exact keyword sentiment
- Must NOT contain semi-colons (:)
- Must NOT have poor wording readability
- Must be eye-catching and encourage clicks
- Concise - use shorter words/phrases

### Meta Description Rules (ENFORCED)

- 140-160 characters (strict)
- NEVER put heading identically into description
- Elaborate keyword naturally - avoid adding heading
- Keyword sentiment persisted throughout
- Must flow naturally, not forced
- Summarizes purpose and content of article

### Alt Text Rules (ENFORCED)

**Featured Image Alt Text**:
- Describe visual scene accurately
- Include primary keyword naturally
- NO "Image of" or "Picture of" phrases

**H2 Image Alt Text**:
- Contextual match to H2 topic
- Use LSI/related keywords
- Maintain brevity and factual descriptions

### Local Article Keyword Rules (ENFORCED)

- Keyword structure: Service + Location (e.g., "Plumber + Atlanta GA")
- Both service and location must be incorporated into headings

### Semantic Keyword Rules (ENFORCED)

- Use semantic variations naturally throughout content
- Avoid repetitive use of exact keyword phrase
- Include related terms, synonyms, and LSI keywords
- Maintain natural language flow

### Table of Contents SEO Rules (ENFORCED)

**SEO Benefits:**
- Can appear in search results as featured snippet
- Improves user experience for longer articles
- Provides jump links for improved navigation
- Signals article structure to search engines

**Position Rule:**
- Must appear after Overview Paragraph
- Must appear before first H2
- Auto-generated from all H2 headings

---

## 8. Global Constraints

### Word Count Constraints (ENFORCED)

| Constraint | Value |
|------------|-------|
| **Global Minimum** | 800 words |
| **Global Maximum** | 4000 words |
| **Listicle Minimum** | 850 words (5 items minimum) |

### Listicle Count Rule (ENFORCED)

Listicle items must be **ODD NUMBERS ONLY**:
- Valid: 5, 7, 9, 11, 13, 15, 17, 19, 21, 23
- Invalid: 4, 6, 8, 10, 12, etc.

### FAQ Count Rule (ENFORCED)

- Exactly **5 FAQ H3s** per FAQ section
- Exactly **5 FAQ Answer Paragraphs**

### Honorable Mentions Count Rule (ENFORCED)

- **3-4 H3s** per Honorable Mentions section (fixed)

### Comparison Topics Rule (ENFORCED)

- Minimum **2 topics** required
- Each topic requires Topic H2 + Topic Overview

### How-To Steps Rule (ENFORCED)

- Recommended **5-10 steps** per How-To article

### H2 Section Minimum Recommendations (ENFORCED)

| Article Type | Minimum H2 Sections | Notes |
|--------------|---------------------|-------|
| **Informational** | 4 H2 sections | Minimum for comprehensive coverage |
| **Review** | 3-5 H2 sections in loop | Between Pros & Cons and Rating for detailed analysis |

---

## 9. Required Components by Article Type

Components users CANNOT toggle off (always included):

### Affiliate
- Product Card (from external API)

### Commercial
- Feature H2
- Feature List
- CTA Box

### Comparison
- Topic H2 (for each topic, minimum 2)
- Topic Overview
- Comparison Table
- Closing H2 + Closing Paragraph

### How-To
- Materials/Requirements H2
- Materials/Requirements Box
- Closing H2 + Closing Paragraph

### Informational
- Key Takeaways Box
- Closing H2 + Closing Paragraph

### Listicle
- Listicle items (odd number)

### Local
- (No unique required components - uses universal H2 + Paragraph loop)

### Recipe
- Ingredients H2 + Ingredients List
- Instructions H2 + Instructions List
- Tips H2 + Tips Paragraph

### Review
- Features H2 + Features List
- Pros & Cons H2 + Pros & Cons Lists
- Rating H2 + Rating Paragraph
- Closing H2 + Closing Paragraph

---

## 10. Interlinking Strategy Availability

### Strategy Availability Matrix (FIXED)

Users can only toggle strategies available for their selected article type:

| Article Type | Topic Linking | Service Linking | Location Linking |
|--------------|---------------|-----------------|------------------|
| Informational | Available | Not Available | Not Available |
| Commercial | Available | Available | Not Available |
| Local | Available | Available | Available |
| How-To | Available | Not Available | Not Available |
| Comparison | Available | Not Available | Not Available |
| Review | Available | Not Available | Not Available |
| Listicle | Available | Not Available | Not Available |
| Affiliate | Available | Not Available | Not Available |
| Recipe | Available | Not Available | Not Available |

### Strategy Logic (FIXED)

#### Topic Linking
| Attribute | Value |
|-----------|-------|
| **Available To** | All 9 Article Types |
| **Purpose** | Builds topical authority and semantic clusters |
| **Link Targets** | Related informational articles, guides, how-to content |
| **SEO Value** | Signals depth of expertise, keeps users engaged |

#### Service Linking
| Attribute | Value |
|-----------|-------|
| **Available To** | Commercial, Local ONLY |
| **Purpose** | Funnels traffic to "Money Pages" (Services & Products) |
| **Link Targets** | Service pages, product landing pages |
| **SEO Value** | Passes link equity to conversion pages |

#### Location Linking
| Attribute | Value |
|-----------|-------|
| **Available To** | Local ONLY |
| **Purpose** | Establishes geographical hierarchy for Local SEO |
| **Link Targets** | City pages, state pages, nearby locations |
| **SEO Value** | Reinforces local relevance, "Near Me" queries |

### Interlinking Enhancements (FIXED LOGIC)

#### Anchor Text Variance (Anti-Spam)
| Type | Percentage |
|------|------------|
| Exact Match | 20% |
| Semantic/Partial Match | 50% |
| Generic/Navigational | 30% |

#### Hard Silo Enforcement
- Links restricted to same Parent Category or Service Vertical
- No cross-linking unrelated topics

#### Link Position Priority
- Primary Service Link placed within **first 200 words**

#### Link Density Limiter
- Maximum **1 internal link per 150 words**

#### Orphan Page Protection
- If no relevant links found, append "Related Reading" section
- Links to 3 most recent articles in same category

---

## 11. Workflow Pipeline

### Standard Pipeline (All Article Types)

| Step | Order | Description |
|------|-------|-------------|
| **Keyword Filtering** | 1 | Validates and processes input keyword/topic |
| **Heading Generation** | 2 | Generates H1 and all H2 headings |
| **Answer Generation** | 3 | Generates paragraph content for each heading |
| **Duplication Check** | 4 | Verifies content isn't duplicate |
| **Interlinking** | 5 | Adds internal links within article |

### Affiliate Pipeline (Extended)

| Step | Order | Description |
|------|-------|-------------|
| **Keyword Filtering** | 1 | Validates and processes input keyword/topic |
| **Amazon API Request** | 2 | Fetches product data from Amazon/external API |
| **Heading Generation** | 3 | Generates H1 and H2 headings (H2 includes product name) |
| **Product Card Generation** | 4 | Creates Product Card component from API data |
| **Answer Generation** | 5 | Generates paragraph content describing features |
| **Duplication Check** | 6 | Verifies content isn't duplicate |
| **Interlinking** | 7 | Adds internal links within article |

### Pipeline Flow Diagram

```
STANDARD PIPELINE:
Keyword Filtering → Heading Generation → Answer Generation → Duplication Check → Interlinking → Complete

AFFILIATE PIPELINE:
Keyword Filtering → Amazon API Request → Heading Generation → Product Card Generation → Answer Generation → Duplication Check → Interlinking → Complete
```

---

## 12. Accessibility Requirements

### Screen Reader Support (REQUIRED)

- All images MUST have descriptive alt text
- Proper heading hierarchy (H1 → H2 → H3)
- ARIA labels where necessary
- Keyboard navigation support
- Consider skip-to-content links

### Focus States (REQUIRED)

- Visible focus indicators on interactive elements
- Consistent focus styling
- Logical tab order

### Color Contrast (REQUIRED)

- Black text on white/light gray backgrounds
- Sufficient contrast ratios
- Dark gray text must have adequate contrast
- White text on black backgrounds where used

### Navigation Accessibility (REQUIRED)

| Feature | Purpose |
|---------|---------|
| Table of Contents | Jump links for easy navigation |
| Heading Hierarchy | Screen reader navigation |
| Keyboard Access | All interactive elements accessible |
| Focus Indicators | Visible focus states |

---

## 13. CSS Usage Constraints

### CSS Rules (ENFORCED)

| Rule | Requirement |
|------|-------------|
| Classes | Use existing classes only |
| Naming | Follow established class names |
| Inline styles | NOT allowed |
| Custom CSS | NOT allowed |
| Style modifications | NOT allowed |

### Design Constraints (FIXED)

| Element | Constraint |
|---------|------------|
| Typography | System-defined fonts and sizes |
| Spacing | Predefined padding and margin values |
| Borders | Grayscale colors only |
| Shadows | Grayscale box shadows only |
| Icons/Symbols | Approved symbols only |

---

## 14. Header Consistency Enforcement

### CRITICAL RULE (ENFORCED)

```
If H1 = Question  → ALL H2s MUST be Questions
If H1 = Statement → ALL H2s MUST be Statements
If H1 = Listicle  → ALL H2s MUST be Listicle format
```

**NO EXCEPTIONS** - Applies to ALL H2s including unique component H2s (FAQ H2, Rating H2, Features H2, etc.)

**H2 Type is NOT a user setting** - It is automatically determined by H1 selection.

---

## 15. Quick Reference

### Character Limits Summary

| Component Type | Limit |
|----------------|-------|
| H1 | 60 chars |
| Standard H2 | 60 chars |
| Short H2 (FAQ, Rating) | 30 chars |
| Medium H2 (Facts, Mentions, Local) | 40-50 chars |
| FAQ H3 | 30-60 chars |
| Honorable Mentions H3 | 30-40 chars |
| Meta Title | 50-60 chars |
| Meta Description | 140-160 chars |
| Featured Image Alt | 100-125 chars |
| H2 Image Alt | 80-100 chars |

### Word Limits Summary

| Component Type | Limit |
|----------------|-------|
| Overview Paragraph | 100 words |
| Standard Paragraph | 150 words |
| Closing Paragraph | 50 words |
| FAQ Answer | 28 words |
| Topic Overview | 80 words |
| Rating Paragraph | 100 words |
| Key Takeaways Box | 50-75 words |
| Quick Facts List | 80-100 words |
| Feature List | 100-120 words |
| CTA Box | 20-30 words |
| Quick Verdict Box | 50 words |
| Materials Box | 20-120 words |
| Pro Tips List | 80-120 words |
| Features List (Review) | 150 words |
| Pros & Cons Lists | 150 words total |

### Global Constraints Summary

| Constraint | Value |
|------------|-------|
| Word Count Minimum | 800 words |
| Word Count Maximum | 4000 words |
| Listicle Items | Odd numbers only (5, 7, 9...) |
| FAQ Questions | Exactly 5 |
| Honorable Mentions | 3-4 |
| Comparison Topics | Minimum 2 |
| How-To Steps | 5-10 recommended |
| Informational H2 Sections | Minimum 4 |
| Review H2 Loop Sections | 3-5 recommended |
| Link Density | Max 1 per 150 words |

### Forbidden Content Summary

| Location | Forbidden |
|----------|-----------|
| Closing H2 | "Conclusion", "Summary", "Final Thoughts", etc. |
| Closing Paragraph Start | "In conclusion", "To summarize", etc. |
| H2 Headings | "and", "or", colons, multiple questions |
| FAQ H3 | Multiple questions combined |
| Anywhere | Emojis, chromatic colors |

---

## 16. Token Management

### Overview

Defines token limits and budgets for AI API calls to prevent context overflow and ensure complete generation.

### 16.1 Token Limits per AI Execution

| Generation Type | Max Input Tokens | Max Output Tokens | Total Budget |
|-----------------|------------------|-------------------|--------------|
| **H1 Generation** | 500 | 100 | 600 |
| **H2 Generation** | 800 | 200 | 1000 |
| **Single Paragraph** | 1000 | 500 | 1500 |
| **Full Section (H2 + Para)** | 2000 | 1000 | 3000 |
| **Meta Content** | 500 | 200 | 700 |
| **List Generation** | 800 | 400 | 1200 |
| **FAQ Section (All 5)** | 1500 | 800 | 2300 |
| **Full Article** | 4000 | 4000 | 8000 |

### 16.2 Context Window Allocation

**Standard Context Window: 8000 tokens**

| Allocation | Tokens | Percentage |
|------------|--------|------------|
| System Prompt | 500 | 6% |
| Article Context | 1000 | 12.5% |
| Section Instructions | 500 | 6% |
| Previous Content Summary | 500 | 6% |
| Output Buffer | 2000 | 25% |
| Safety Margin | 500 | 6% |
| **Available for Generation** | 3000 | 37.5% |

### 16.3 Token Overflow Handling

| Situation | Action |
|-----------|--------|
| Input exceeds limit | Summarize context, reduce examples |
| Output truncated | Reduce target length, split generation |
| Near limit | Warn and prioritize essential content |
| Exceeded limit | Reject and retry with reduced scope |

---

## 17. AI Response Validation Rules

### Overview

Specific conditions that determine whether AI output is accepted or rejected.

### 17.1 Rejection Criteria

| Criteria | Condition | Action |
|----------|-----------|--------|
| **Wrong Format** | Output doesn't match expected structure | Regenerate |
| **Missing Required Fields** | Required component fields empty | Regenerate |
| **Exceeded Character Limit** | Heading/meta over character limit | Truncate or regenerate |
| **Below Word Minimum** | Paragraph under word count | Regenerate |
| **Exceeded Word Maximum** | Paragraph over word count | Regenerate |
| **Off-Topic** | Content doesn't match keyword/H2 | Regenerate with constraints |
| **Forbidden Content** | Contains prohibited phrases/content | Regenerate with filter |
| **Incomplete Output** | Truncated mid-sentence | Regenerate |
| **Malformed Structure** | Invalid HTML/formatting | Regenerate |
| **Duplicate Content** | Repeats previous sections | Regenerate |

### 17.2 Validation Thresholds

| Metric | Acceptable | Marginal | Reject |
|--------|------------|----------|--------|
| **Format Match** | 100% | N/A | <100% |
| **Word Count** | ±10% of target | ±20% of target | >20% deviation |
| **Keyword Presence** | Present | N/A | Absent (if required) |
| **Readability Score** | 60-70 | 50-59 | <50 |
| **Quality Score** | ≥75% | 60-74% | <60% |

### 17.3 Validation Pipeline

```
AI Response Received
        ↓
[1] Format Validation
        ↓ (Pass/Fail)
[2] Length Validation
        ↓ (Pass/Fail)
[3] Content Validation
        ↓ (Pass/Fail)
[4] Quality Scoring
        ↓ (Pass/Fail)
[5] Final Decision
        ↓
Accept / Reject + Reason Code
```

### 17.4 Reason Codes

| Code | Description |
|------|-------------|
| `FORMAT_ERROR` | Structure doesn't match template |
| `LENGTH_SHORT` | Below minimum word/character count |
| `LENGTH_LONG` | Exceeds maximum word/character count |
| `MISSING_KEYWORD` | Required keyword not present |
| `FORBIDDEN_CONTENT` | Contains prohibited content |
| `OFF_TOPIC` | Doesn't match section topic |
| `TRUNCATED` | Output cut off incomplete |
| `DUPLICATE` | Repeats existing content |
| `LOW_QUALITY` | Quality score below threshold |

---

## 18. Scale Processing Rules

### Overview

System rules for maintaining context and quality when generating content at scale (100+ articles).

### 18.1 Batch Processing Limits

| Limit | Value | Reason |
|-------|-------|--------|
| **Max Concurrent Articles** | 10 | Prevent resource exhaustion |
| **Max Articles per Batch** | 500 | Manageable quality control |
| **Min Delay Between Articles** | 100ms | Rate limiting |
| **Max Retries per Article** | 5 | Prevent infinite loops |
| **Batch Timeout** | 4 hours | Prevent stuck batches |

### 18.2 Context Preservation at Scale

| Requirement | Implementation |
|-------------|----------------|
| **Variable Isolation** | Each article has separate context |
| **No Cross-Contamination** | Article A context never affects Article B |
| **Template Consistency** | Same prompt templates for all articles |
| **State Management** | Track progress per article independently |
| **Error Isolation** | One article failure doesn't affect batch |

### 18.3 Quality Assurance at Scale

| Check | Frequency | Action on Failure |
|-------|-----------|-------------------|
| **Sample Review** | Every 50 articles | Pause batch, investigate |
| **Automated Validation** | Every article | Flag failures |
| **Consistency Audit** | Every 100 articles | Compare voice/quality |
| **Duplication Check** | Every article | Reject duplicates |

### 18.4 Scale Performance Monitoring

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Success Rate** | ≥95% | <90% |
| **Average Generation Time** | <30s per article | >60s |
| **Retry Rate** | <10% | >20% |
| **Quality Score Average** | ≥80% | <70% |

---

## 19. Rule Conflict Resolution

### Overview

Defines how the system handles when two or more rules contradict each other.

### 19.1 Rule Priority Hierarchy

When rules conflict, higher priority wins:

| Priority | Rule Category | Example |
|----------|---------------|---------|
| **1 (Highest)** | Safety Rules | No profanity overrides creative freedom |
| **2** | Legal/Compliance | Copyright rules override content rules |
| **3** | Programmatic Constraints | Character limits override content expansion |
| **4** | Content Rules | Quality standards |
| **5** | Style Guidelines | Tone and voice |
| **6 (Lowest)** | Preferences | Nice-to-have formatting |

### 19.2 Conflict Resolution Matrix

| Conflict Type | Resolution |
|---------------|------------|
| Safety vs Content | Safety wins |
| Length vs Quality | Quality wins (regenerate to fit) |
| Format vs Content | Format wins (content must fit structure) |
| Keyword vs Natural Language | Natural language wins (avoid stuffing) |
| User Setting vs System Constraint | System constraint wins |

### 19.3 Conflict Detection

**Automated Detection**:
- Pre-generation: Check rules for conflicts before applying
- Post-generation: Validate output against all applicable rules
- Alert: Flag when multiple rules violated

**Manual Resolution**:
- Document conflicts in changelog
- Escalate to rule owners (SEO/Engineering)
- Update rules to eliminate conflict

### 19.4 Conflict Examples and Resolutions

| Conflict | Resolution |
|----------|------------|
| "Word count minimum" vs "Paragraph already complete" | Quality wins - don't pad |
| "Keyword must appear" vs "Natural language" | Use semantic variation |
| "H2 must be question" vs "Content is instructional" | Phrase instruction as question |
| "No negative language" vs "Cons section required" | Factual, balanced cons allowed |

---

## 20. Retry and Fallback Logic

### Overview

Defines how many retries on failure, fallback content strategies, and timeout thresholds.

### 20.1 Retry Configuration

| Generation Type | Max Retries | Delay Between | Timeout |
|-----------------|-------------|---------------|---------|
| **H1 Generation** | 3 | 1 second | 30 seconds |
| **H2 Generation** | 3 | 1 second | 30 seconds |
| **Paragraph** | 3 | 2 seconds | 60 seconds |
| **Full Section** | 3 | 5 seconds | 120 seconds |
| **Image Generation** | 5 | 5 seconds | 180 seconds |
| **Meta Content** | 3 | 1 second | 30 seconds |
| **Full Article** | 2 | 30 seconds | 600 seconds |

### 20.2 Retry Strategy per Attempt

| Attempt | Strategy |
|---------|----------|
| **1st** | Original prompt, standard parameters |
| **2nd** | Refined prompt, explicit constraints |
| **3rd** | Simplified prompt, reduced scope |
| **4th** | Alternative approach, different phrasing |
| **5th** | Minimal prompt, basic output |

### 20.3 Fallback Content

When all retries exhausted:

| Component | Fallback Action |
|-----------|-----------------|
| **H1** | Use keyword as title + flag for review |
| **H2** | Use generic section header + flag |
| **Paragraph** | Skip section + flag for manual completion |
| **Meta Title** | Use H1 as meta title |
| **Meta Description** | Use first 160 chars of overview |
| **Image** | Use placeholder image + flag |
| **Full Article** | Mark as failed, queue for retry |

### 20.4 Timeout Handling

| Situation | Action |
|-----------|--------|
| API timeout | Retry with same request |
| Generation timeout | Retry with reduced scope |
| Batch timeout | Pause, save progress, alert |
| System timeout | Graceful shutdown, save state |

### 20.5 Error Logging

| Field | Description |
|-------|-------------|
| **Timestamp** | When error occurred |
| **Component** | What was being generated |
| **Error Code** | Standardized error code |
| **Attempt Number** | Which retry attempt |
| **Input Summary** | Abbreviated prompt |
| **Output** | Partial output if any |
| **Resolution** | How it was resolved |

---

*Document Type: SYSTEM CONSTRAINTS Layer - All Fixed Values and Enforced Rules*
*Last Updated: January 2026*
*Version: 3.2 (Updated with Character Count Ranges for All Components)*
