# Component Rules - STRUCTURE Layer

**One-Line Definition**: Component taxonomy defining what components exist, their classifications, relationships, data types, and AI content permissions.

**Purpose**: Defines WHAT exists - component taxonomy, classifications, relationships, data types, and structural patterns.

**This file contains ONLY**:
- Component names and classifications
- Component data types
- Parent-child relationships
- Heading hierarchy rules
- Looping vs non-looping patterns
- Paragraph sub-structures
- List and table format types
- Component groupings per article type

**This file does NOT contain**: Character/word limits, colors, generation logic, user toggles, validation rules.

**Cross-References**:
- For character/word limits → See `programmatic_rules.md`
- For generation logic → See `content_rules.md`
- For visual layout → See `general_rules.md`
- For toggle settings → See `user_options.md`

---

## Table of Contents
1. [Universal Components](#1-universal-components)
2. [Unique Components by Article Type](#2-unique-components-by-article-type)
3. [Component Relationships](#3-component-relationships)
4. [Heading Hierarchy Rules](#4-heading-hierarchy-rules)
5. [Looping and Non-Looping Patterns](#5-looping-and-non-looping-patterns)
6. [Paragraph Sub-Structures](#6-paragraph-sub-structures)
7. [List Format Types](#7-list-format-types)
8. [Table Format Types](#8-table-format-types)
9. [Component Summary](#9-component-summary)

---

## 1. Universal Components

### Overview

Universal components are shared across ALL 9 article types. They form the foundation of every article.

**Total Universal Components: 16**

### Core Components (5)

These 5 components appear in EVERY article.

| # | Component | Data Type | Description |
|---|-----------|-----------|-------------|
| 1 | **H1** | Text heading | Article title; exactly 1 per article; FIRST heading only; 3 types: Statement, Listicle, Question |
| 2 | **Featured Image** | Image | Main article image; generated from H1 content |
| 3 | **Overview Paragraph** | Text paragraph | Introduces article topic; elaborates on H1 |
| 4 | **H2** | Text heading | Section headings; follows H1 type; used for ALL content sections |
| 5 | **Standard Paragraph** | Text paragraph | Section content; elaborates on its H2 |

### Optional Components (11)

These components can be toggled ON/OFF by users.

| # | Component | Data Type | Description |
|---|-----------|-----------|-------------|
| 6 | **H2 Image** | Image | Section image; generated from H2 content |
| 7 | **Closing H2** | Text heading | Final section heading |
| 8 | **Closing Paragraph** | Text paragraph | Final section content; paired with Closing H2 |
| 9 | **FAQ H2** | Text heading | Parent heading for FAQ section |
| 10 | **FAQ H3** | Text heading | Question headings; exactly 5 per FAQ section |
| 11 | **FAQ Answer Paragraph** | Text paragraph | Answer content; paired with each FAQ H3 |
| 12 | **Meta Title** | SEO text | Search engine title |
| 13 | **Meta Description** | SEO text | Search engine description |
| 14 | **Table of Contents** | Navigation list | Auto-generated from H2 headings |
| 15 | **Featured Image Alt Text** | Accessibility text | Describes featured image |
| 16 | **H2 Image Alt Text** | Accessibility text | Describes H2 image |

---

## 2. Unique Components by Article Type

### Overview

Unique components are specific to their article type. Each article type has its own set of specialized components.

**Total Unique Components: 26**

### Affiliate Article Type (1 component)

| Component | Data Type | Format | Description |
|-----------|-----------|--------|-------------|
| **Product Card** | Composite | Contains: Product Image, Product Name, Star Rating, Price, CTA Button | External API data display |

**Product Card Contents (5 elements):**
1. **Product Image** - Visual of the product
2. **Product Name** - Name/title of the product
3. **Star Rating** - Rating display (e.g., ★★★★☆)
4. **Price** - Current product price
5. **CTA Button** - Call-to-action button (e.g., "Buy Now", "Check Price")

### Commercial Article Type (3 components)

| Component | Data Type | Format | Description |
|-----------|-----------|--------|-------------|
| **Feature H2** | Text heading | Adapts to H1 type | Introduces feature section |
| **Feature List** | Bulleted list | 5-7 bullets | Lists product/service features |
| **CTA Box** | Highlighted box | Call-to-action element | Action prompt for users |

### Comparison Article Type (4 components)

| Component | Data Type | Format | Description |
|-----------|-----------|--------|-------------|
| **Topic H2** | Text heading | Repeats for each topic (2+) | Introduces each comparison topic |
| **Topic Overview** | Text paragraph | 2 sub-paragraphs | Describes each topic |
| **Comparison Table** | Table | Rows: features; Columns: topics | Side-by-side comparison |
| **Quick Verdict Box** | Highlighted box | Conditional recommendations | Summary recommendation |

### How-To Article Type (4 components)

| Component | Data Type | Format | Description |
|-----------|-----------|--------|-------------|
| **Materials/Requirements H2** | Text heading | Adapts to H1 type | Introduces materials section |
| **Materials/Requirements Box** | Box/card | 5-15 bullets | Lists required materials |
| **Pro Tips H2** | Text heading | Adapts to H1 type | Introduces tips section |
| **Pro Tips List** | Bulleted list | 5-7 bullets | Expert recommendations |

### Informational Article Type (3 components)

| Component | Data Type | Format | Description |
|-----------|-----------|--------|-------------|
| **Key Takeaways Box** | Highlighted box | 5-6 bullets | Summary of main points |
| **Quick Facts H2** | Text heading | Shorter than standard H2 | Introduces facts section |
| **Quick Facts List** | Bulleted list | 5-7 bullets | Interesting facts |

### Listicle Article Type (4 components)

| Component | Data Type | Format | Description |
|-----------|-----------|--------|-------------|
| **Listicle Count** | Count rule | Odd numbers only | Determines number of items |
| **Honorable Mentions H2** | Text heading | Shorter than standard H2 | Introduces additional items |
| **Honorable Mentions H3** | Text heading | 3-4 fixed | Individual mention headings |
| **Honorable Mentions Paragraph** | Text paragraph | One per H3 | Describes each mention |

### Local Article Type (4 components)

| Component | Data Type | Format | Description |
|-----------|-----------|--------|-------------|
| **Why Choose Local H2** | Text heading | Shorter than standard H2 | Introduces benefits section |
| **Why Choose Local Image** | Image | Left-aligned, beside list | Accompanies benefits list |
| **Why Choose Local List** | Bulleted list | 4-5 bullets | Local provider benefits |
| **Service Info Box** | Table | 5-6 rows, Label + Info columns | Business information display |

### Recipe Article Type (8 components)

| Component | Data Type | Format | Description |
|-----------|-----------|--------|-------------|
| **Ingredients H2** | Text heading | Adapts to H1 type | Introduces ingredients |
| **Ingredients List** | Bulleted list | `<ul>` format | Recipe ingredients |
| **Instructions H2** | Text heading | Adapts to H1 type | Introduces steps |
| **Instructions List** | Numbered list | `<ol>` format, one step per item | Recipe steps |
| **Tips H2** | Text heading | Adapts to H1 type | Introduces cooking tips |
| **Tips Paragraph** | Text paragraph | Standard paragraph format | Cooking advice |
| **Nutrition Facts H2** | Text heading | Adapts to H1 type | Introduces nutrition |
| **Nutrition Table** | Table | Nutritional values | Nutrition information |

### Review Article Type (6 components)

| Component | Data Type | Format | Description |
|-----------|-----------|--------|-------------|
| **Features H2** | Text heading | Adapts to H1 type | Introduces features |
| **Features List** | Bulleted list | 7-10 bullets | Product/service features |
| **Pros & Cons H2** | Text heading | Adapts to H1 type | Introduces analysis |
| **Pros & Cons Lists** | Dual bulleted lists | 5-7 bullets each | Advantages and disadvantages |
| **Rating H2** | Text heading | Shorter than standard H2 | Introduces rating |
| **Rating Paragraph** | Text paragraph | Score + justification | Final verdict |

---

## 3. Component Relationships

### Parent-Child Dependencies

Components have hierarchical relationships where child components depend on their parent.

| Parent | Child | Relationship |
|--------|-------|--------------|
| H1 | Overview Paragraph | Overview elaborates on H1 |
| H1 | Featured Image | Image generated from H1 content |
| H2 | Standard Paragraph | Paragraph elaborates on H2 |
| H2 | H2 Image | Image generated from H2 (optional) |
| H2 Image | H2 Image Alt Text | Alt text requires image enabled |
| Featured Image | Featured Image Alt Text | Alt text requires image |
| FAQ H2 | FAQ H3 (x5) | H3s nested under H2 |
| FAQ H3 | FAQ Answer Paragraph | Answer paired with H3 |
| Closing H2 | Closing Paragraph | Paragraph paired with H2 |
| Honorable Mentions H2 | Honorable Mentions H3 (x3-4) | H3s nested under H2 |
| Honorable Mentions H3 | Honorable Mentions Paragraph | Paragraph paired with H3 |
| Why Choose Local H2 | Why Choose Local Image | Image paired with H2 |
| Why Choose Local H2 | Why Choose Local List | List paired with H2 |

### Image Generation Sources

| Image Type | Generated From |
|------------|----------------|
| Featured Image | H1 content |
| H2 Image | H2 content |
| Why Choose Local Image | Why Choose Local H2 content |

---

## 4. Heading Hierarchy Rules

### Heading Level Usage

| Level | Usage | Count per Article |
|-------|-------|-------------------|
| **H1** | Article title ONLY | Exactly 1 (FIRST heading) |
| **H2** | ALL content sections | Multiple |
| **H3** | FAQ and Honorable Mentions ONLY | Limited |

### H1 Rules

- H1 is the FIRST heading of the article
- No other heading can be H1
- Exactly ONE H1 per article
- H1 has 3 types: Statement, Listicle, Question
- H1 type determines ALL H2 types (see `content_rules.md` for adaptation logic)

### H2 Rules

- ALL sections after H1 use H2
- Never use H1 for section headings
- H2 type must match H1 type (Question/Statement/Listicle)
- Includes unique component H2s (FAQ H2, Features H2, etc.)

### H3 Restrictions

H3 tags exist ONLY in these components:
- FAQ section (exactly 5 H3s)
- Honorable Mentions section (3-4 H3s)

**No other components use H3 tags.**

---

## 5. Looping and Non-Looping Patterns

### Looping Components

These component patterns repeat multiple times based on content requirements.

| Component Pattern | Article Types | Behavior |
|-------------------|---------------|----------|
| H2 + Standard Paragraph | All types | Loops until word count met |
| Product Card → H2 → Standard Paragraph | Affiliate | Loops for each product |
| Step H2 + Standard Paragraph | How-To | 5-10 iterations recommended |
| Listicle Item H2 + Standard Paragraph | Listicle | Odd number of iterations |
| Topic H2 + Topic Overview | Comparison | Repeats for each topic (minimum 2) |

### Non-Looping Components

These components appear exactly ONCE per article (when enabled).

- H1 + Overview Paragraph
- Featured Image
- FAQ section (fixed 5 H3s)
- Closing H2 + Closing Paragraph
- Pros & Cons Lists
- Comparison Table
- Key Takeaways Box
- Rating H2 + Rating Paragraph
- Materials/Requirements Box
- CTA Box
- Quick Verdict Box
- Service Info Box
- Nutrition Table
- All "Box" type components

---

## 6. Paragraph Sub-Structures

Different paragraph types have different internal structures.

| Paragraph Type | Sub-paragraphs | Description |
|----------------|----------------|-------------|
| Overview Paragraph | 2 | Introduces topic in two parts |
| Standard Paragraph | 3 | Main content paragraph |
| Closing Paragraph | 1 | Single concluding paragraph |
| FAQ Answer | 1 | Single answer per question |
| Topic Overview | 2 | Para 1: What + feature; Para 2: Who + benefit |
| Rating Paragraph | 1 | Score and justification |
| Tips Paragraph | 3 | Cooking advice in three parts |
| Honorable Mentions Paragraph | 1 | Single description per mention |

### Topic Overview Detailed Structure (Comparison)

Topic Overview uses a specific 2-paragraph structure:

| Paragraph | Words | Lines | Content Structure |
|-----------|-------|-------|-------------------|
| Paragraph 1 | 40 words | 3-4 lines | **What it is** + Main feature/characteristic |
| Paragraph 2 | 40 words | 3-4 lines | **Who it's for** + Key benefit/use case |

**Total: 80 words (2 × 40 words)**

This structure ensures consistent, scannable topic introductions in comparison articles.

### Naming Convention Note

**Overview Paragraph** (not "Introduction Paragraph") was chosen as the standard name for the first paragraph after H1. This naming convention is used consistently throughout the system.

---

## 7. List Format Types

### CRITICAL: Bullet Format vs Paragraph Prose

**All list components use BULLET FORMAT for scannability, NOT paragraph prose.**

This applies to:
- Feature List (Commercial)
- Key Takeaways Box (Informational)
- Quick Facts List (Informational)
- Materials/Requirements Box (How-To)
- Pro Tips List (How-To)
- Why Choose Local List (Local)
- Ingredients List (Recipe)
- Features List (Review)
- Pros & Cons Lists (Review)

**Why bullets?** Lists are designed for quick scanning and easy comprehension. Paragraph prose would defeat the purpose of these components.

### Bulleted Lists (`<ul>`)

These components use unordered/bulleted list format:

| Component | Article Type | Bullets | Words per Bullet |
|-----------|--------------|---------|------------------|
| Feature List | Commercial | 5-7 | 15-20 words |
| Key Takeaways Box | Informational | 5-6 | 10-12 words |
| Quick Facts List | Informational | 5-7 | 12-15 words |
| Materials/Requirements Box | How-To | 5-15 | 2-12 words |
| Pro Tips List | How-To | 5-7 | 12-18 words |
| Why Choose Local List | Local | 4-5 | 8-12 words |
| Ingredients List | Recipe | Variable | Variable |
| Features List | Review | 7-10 | 15-20 words |
| Pros List | Review | 5-7 | 10-15 words |
| Cons List | Review | 5-7 | 10-15 words |

### Numbered Lists (`<ol>`)

Only ONE component uses numbered/ordered list format:

| Component | Article Type | Format |
|-----------|--------------|--------|
| Instructions List | Recipe | One step per list item; clear sequential flow |

**Instructions List Special Rules:**
- Each list item = ONE step
- Steps must be in logical, sequential order
- Clear, actionable language
- Word count is flexible (150-400 words) based on recipe complexity

---

## 8. Table Format Types

### Table Structures

| Table Type | Structure | Article Type |
|------------|-----------|--------------|
| Comparison Table | Rows: features; Columns: topics | Comparison |
| Service Info Box | 2 columns: Label, Information | Local |
| Nutrition Table | Nutritional values with amounts | Recipe |

---

## 9. Component Summary

### Total Component Count

| Category | Count |
|----------|-------|
| Universal Components | 16 |
| Unique Components | 26 |
| **Total** | **42** |

### Unique Components per Article Type

| Article Type | Unique Component Count |
|--------------|------------------------|
| Affiliate | 1 |
| Commercial | 3 |
| Comparison | 4 |
| How-To | 4 |
| Informational | 3 |
| Listicle | 4 |
| Local | 4 |
| Recipe | 8 |
| Review | 6 |

### Component Classification by Data Type

| Data Type | Components |
|-----------|------------|
| Text heading | H1, H2, Closing H2, FAQ H2, FAQ H3, all unique H2s and H3s |
| Text paragraph | Overview, Standard, Closing, FAQ Answer, Topic Overview, Rating, Tips, Honorable Mentions |
| Image | Featured Image, H2 Image, Why Choose Local Image |
| Bulleted list | Feature List, Key Takeaways, Quick Facts, Materials, Pro Tips, Why Choose Local, Ingredients, Features, Pros & Cons |
| Numbered list | Instructions List |
| Table | Comparison Table, Service Info Box, Nutrition Table |
| Highlighted box | CTA Box, Quick Verdict Box, Key Takeaways Box, Materials Box |
| Composite | Product Card |
| SEO text | Meta Title, Meta Description |
| Accessibility text | Featured Image Alt Text, H2 Image Alt Text |
| Navigation | Table of Contents |

---

## 10. Component Sequence Tables

### Informational Article Sequence

| # | Component | Constraint | Type | Required |
|---|-----------|------------|------|----------|
| 1 | H1 | 60 chars | Universal | Yes |
| 2 | Featured Image | Generated from H1 | Universal | Yes |
| 3 | Overview Paragraph | 100 words (2×50) | Universal | Yes |
| 4 | Key Takeaways Box | 50-75 words (5-6 bullets × 10-12 words) | **Unique** | **Yes** |
| 5 | H2 | 60 chars (loops) | Universal | Yes |
| 6 | H2 Image | Generated from H2 | Universal | Optional |
| 7 | Standard Paragraph | 150 words (3×50, loops) | Universal | Yes |
| 8 | Quick Facts H2 | 40-50 chars | **Unique** | Optional |
| 9 | Quick Facts List | 80-100 words (5-7 bullets × 12-15 words) | **Unique** | Optional |
| 10 | Closing H2 | 60 chars | Universal | Yes |
| 11 | Closing Paragraph | 50 words | Universal | Yes |

### Listicle Article Sequence

| # | Component | Constraint | Type | Required |
|---|-----------|------------|------|----------|
| 1 | H1 | 60 chars | Universal | Yes |
| 2 | Featured Image | Generated from H1 | Universal | Yes |
| 3 | Overview Paragraph | 100 words (2×50) | Universal | Yes |
| 4 | H2 - Item 1, 2, 3... | 60 chars (loops, odd numbers) | Universal | Yes |
| 5 | H2 Image | Generated from H2 | Universal | Optional |
| 6 | Standard Paragraph | 150 words (3×50, loops) | Universal | Yes |
| 7 | Honorable Mentions H2 | 40-50 chars | **Unique** | Optional |
| 8 | Honorable Mentions H3 | 30-40 chars (3-4 fixed) | **Unique** | Optional |
| 9 | Honorable Mentions Paragraph | 40-50 words per H3 | **Unique** | Optional |
| 10 | Closing H2 | 60 chars | Universal | Optional |
| 11 | Closing Paragraph | 50 words | Universal | Optional |

### Local Article Sequence

| # | Component | Constraint | Type | Required |
|---|-----------|------------|------|----------|
| 1 | H1 | 60 chars | Universal | Yes |
| 2 | Featured Image | Generated from H1 | Universal | Yes |
| 3 | Overview Paragraph | 100 words (2×50) | Universal | Yes |
| 4 | H2 | 60 chars (loops) | Universal | Yes |
| 5 | H2 Image | Generated from H2 | Universal | Optional |
| 6 | Standard Paragraph | 150 words (3×50, loops) | Universal | Yes |
| 7 | Why Choose Local H2 | 40-50 chars | **Unique** | Optional |
| 8 | Why Choose Local Image | Left-aligned, beside list | **Unique** | Optional |
| 9 | Why Choose Local List | 40-60 words (4-5 bullets × 8-12 words) | **Unique** | Optional |
| 10 | Service Info Box | 40-60 words (5-6 rows, Label + Info, from settings) | **Unique** | Optional |
| 11 | Closing H2 | 60 chars | Universal | Optional |
| 12 | Closing Paragraph | 50 words | Universal | Optional |

### Review Article Sequence

| # | Component | Constraint | Type | Required |
|---|-----------|------------|------|----------|
| 1 | H1 | 60 chars | Universal | Yes |
| 2 | Featured Image | Generated from H1 | Universal | Yes |
| 3 | Overview Paragraph | 100 words (2×50) | Universal | Yes |
| 4 | Features H2 | 60 chars | **Unique** | Yes |
| 5 | H2 Image | Generated from H2 | Universal | Optional |
| 6 | Features List | 150 words (7-10 bullets × 15-20 words) | **Unique** | Yes |
| 7 | Pros & Cons H2 | 60 chars | **Unique** | Yes |
| 8 | Pros & Cons Lists | 150 words (75 + 75, 5-7 bullets each × 10-15 words) | **Unique** | Yes |
| 9 | H2 | 60 chars (loops) | Universal | Yes |
| 10 | H2 Image | Generated from H2 | Universal | Optional |
| 11 | Standard Paragraph | 150 words (3×50, loops) | Universal | Yes |
| 12 | Rating H2 | 30 chars | **Unique** | Yes |
| 13 | Rating Paragraph | 100 words | **Unique** | Yes |
| 14 | Closing H2 | 60 chars | Universal | Yes |
| 15 | Closing Paragraph | 50 words | Universal | Yes |

### Recipe Article Sequence

| # | Component | Constraint | Type | Required |
|---|-----------|------------|------|----------|
| 1 | H1 | 60 chars | Universal | Yes |
| 2 | Featured Image | Generated from H1 | Universal | Yes |
| 3 | Overview Paragraph | 100 words (2×50) | Universal | Yes |
| 4 | Ingredients H2 | 60 chars | **Unique** | Yes |
| 5 | Ingredients List | 150 words (bulleted) | **Unique** | Yes |
| 6 | Instructions H2 | 60 chars | **Unique** | Yes |
| 7 | Instructions List | 150-400 words (numbered) | **Unique** | Yes |
| 8 | Tips H2 | 60 chars | **Unique** | Yes |
| 9 | Tips Paragraph | 150 words (3×50) | **Unique** | Yes |
| 10 | Nutrition Facts H2 | 60 chars | **Unique** | Optional |
| 11 | Nutrition Table | 100 words | **Unique** | Optional |
| 12 | H2 | 60 chars (loops) | Universal | Optional |
| 13 | Standard Paragraph | 150 words (loops) | Universal | Optional |
| 14 | FAQ H2 | 30 chars | Universal | Optional |
| 15 | FAQ H3 | 30-60 chars (5 fixed) | Universal | Optional |
| 16 | FAQ Answer Paragraph | 28 words each (140 total) | Universal | Optional |

---

## 11. Badge Rules

### Overview

Badges are small UI labels that provide quick visual indicators on components. This section defines approved badge text, constraints, and usage rules.

### 11.1 Approved Badge Labels

| Badge Text | Max Characters | Usage |
|------------|----------------|-------|
| **Best Seller** | 11 | Top-selling products (Affiliate) |
| **Top Pick** | 8 | Editor's recommendation |
| **Editor's Choice** | 15 | Curated selection |
| **Verified** | 8 | Verified product/service |
| **Recommended** | 11 | General recommendation |
| **Best Value** | 10 | Price-to-quality ratio |
| **Premium** | 7 | High-end option |
| **Budget Pick** | 11 | Affordable option |
| **Most Popular** | 12 | Popularity-based |
| **New** | 3 | Recently added |

### 11.2 Badge Character Limits

| Constraint | Value |
|------------|-------|
| **Maximum Characters** | 15 characters |
| **Minimum Characters** | 3 characters |
| **Case** | Title Case |

### 11.3 Badge Usage by Article Type

| Article Type | Can Use Badges | Applicable Components |
|--------------|----------------|----------------------|
| **Affiliate** | Yes | Product Card |
| **Commercial** | Yes | CTA Box, Feature sections |
| **Review** | Yes | Rating section |
| **Comparison** | Yes | Quick Verdict Box, Topic sections |
| **Listicle** | Yes | List item headings |
| **Informational** | Limited | Key Takeaways (rare) |
| **How-To** | No | N/A |
| **Local** | Limited | Service Info Box |
| **Recipe** | No | N/A |

### 11.4 Badge Rules

| Rule | Description |
|------|-------------|
| **One Badge Per Component** | Maximum one badge per component instance |
| **Truthfulness** | Badge must accurately represent content |
| **No Custom Text** | Only approved badge labels allowed |
| **Conditional Display** | Badge appears only when criteria met |
| **No Stacking** | Cannot combine multiple badges |

### 11.5 Badge Display Conditions

| Badge | Display Condition |
|-------|-------------------|
| Best Seller | Product has high sales ranking |
| Top Pick | Manually designated by editor |
| Verified | Product/service verified by system |
| Best Value | Price-to-feature ratio above threshold |
| Budget Pick | Price below category average |
| Premium | Price above category average |

---

## 12. AI Content Permissions

### Overview

Explicit documentation of what content AI can and cannot generate or modify.

### 12.1 AI Rewriting ALLOWED List

**AI CAN generate, create, or rewrite the following**:

| Content Type | AI Permission | Notes |
|--------------|---------------|-------|
| **H1 Titles** | ✓ ALLOWED | Must follow H1 rules |
| **H2 Headings** | ✓ ALLOWED | Must match H1 type |
| **H3 Headings** | ✓ ALLOWED | FAQ and Honorable Mentions only |
| **Paragraphs** | ✓ ALLOWED | All paragraph types |
| **List Items** | ✓ ALLOWED | Bullets and numbered lists |
| **Meta Title** | ✓ ALLOWED | Within character limits |
| **Meta Description** | ✓ ALLOWED | Within character limits |
| **Alt Text** | ✓ ALLOWED | For all image types |
| **CTA Text** | ✓ ALLOWED | Call-to-action copy |
| **Badge Selection** | ✓ ALLOWED | From approved list only |
| **Table Content** | ✓ ALLOWED | Comparison tables, nutrition tables |
| **FAQ Questions** | ✓ ALLOWED | Question generation |
| **FAQ Answers** | ✓ ALLOWED | Answer generation |
| **Images** | ✓ ALLOWED | Via image generation prompts |

### 12.2 AI Rewriting NOT ALLOWED List

**AI CANNOT modify, fabricate, or change the following**:

| Content Type | AI Permission | Source |
|--------------|---------------|--------|
| **Price** | ✗ NOT ALLOWED | External API / User Input |
| **Ratings** | ✗ NOT ALLOWED | External API |
| **Reviews** | ✗ NOT ALLOWED | External API |
| **Affiliate Links** | ✗ NOT ALLOWED | External API |
| **Product Specifications** | ✗ NOT ALLOWED | External API |
| **Business Name** | ✗ NOT ALLOWED | User Input |
| **Business Address** | ✗ NOT ALLOWED | User Input |
| **Business Phone** | ✗ NOT ALLOWED | User Input |
| **Service Hours** | ✗ NOT ALLOWED | User Input |
| **License Numbers** | ✗ NOT ALLOWED | User Input |
| **Years in Business** | ✗ NOT ALLOWED | User Input |
| **Exact Quotes** | ✗ NOT ALLOWED | Must preserve if provided |
| **Legal Disclaimers** | ✗ NOT ALLOWED | Must use exact text |
| **Trademark Names** | ✗ NOT ALLOWED | Must preserve exact spelling |

### 12.3 AI Permission Matrix by Component

| Component | AI Generated | External API | User Input |
|-----------|--------------|--------------|------------|
| H1 | ✓ | - | - |
| H2 | ✓ | - | - |
| Overview Paragraph | ✓ | - | - |
| Standard Paragraph | ✓ | - | - |
| Meta Title | ✓ | - | - |
| Meta Description | ✓ | - | - |
| Alt Text | ✓ | - | - |
| Product Card | Partial | ✓ (Price, Rating, Link) | - |
| Service Info Box | - | - | ✓ |
| Feature List | ✓ | - | - |
| Pros & Cons Lists | ✓ | - | - |
| Rating Paragraph | ✓ | - | - |
| Comparison Table | ✓ | - | - |

---

## 13. Component Data Source Matrix

### Overview

Defines the data source for each component type across all article types.

### 13.1 Data Source Legend

| Source | Description |
|--------|-------------|
| **LLM** | AI/Language Model generated content |
| **API** | External API data (Amazon, etc.) |
| **USER** | User-provided input fields |
| **AUTO** | System auto-generated |

### 13.2 Universal Components Data Sources

| Component | Data Source | Notes |
|-----------|-------------|-------|
| H1 | LLM | Generated from keyword |
| Featured Image | LLM | Generated from H1 |
| Overview Paragraph | LLM | Generated from H1 |
| H2 | LLM | Generated per section |
| Standard Paragraph | LLM | Generated per H2 |
| H2 Image | LLM | Generated from H2 |
| Closing H2 | LLM | Generated for closure |
| Closing Paragraph | LLM | Generated for closure |
| FAQ H2 | LLM | Generated |
| FAQ H3 | LLM | Questions generated |
| FAQ Answer | LLM | Answers generated |
| Meta Title | LLM | SEO optimized |
| Meta Description | LLM | SEO optimized |
| Table of Contents | AUTO | Generated from H2s |
| Alt Text | LLM | Generated from image context |

### 13.3 Unique Components Data Sources

| Component | Article Type | Data Source | Notes |
|-----------|--------------|-------------|-------|
| Product Card | Affiliate | **API** | Amazon/External API |
| Product Image | Affiliate | **API** | From product data |
| Product Name | Affiliate | **API** | From product data |
| Star Rating | Affiliate | **API** | From product data |
| Price | Affiliate | **API** | From product data |
| CTA Button | Affiliate | **API** | Affiliate link |
| Feature List | Commercial | LLM | AI generated |
| CTA Box | Commercial | LLM | AI generated |
| Service Info Box | Local | **USER** | User provided |
| Why Choose Local List | Local | LLM | AI generated |
| Materials/Requirements Box | How-To | LLM | AI generated |
| Pro Tips List | How-To | LLM | AI generated |
| Key Takeaways Box | Informational | LLM | AI generated |
| Quick Facts List | Informational | LLM | AI generated |
| Topic Overview | Comparison | LLM | AI generated |
| Comparison Table | Comparison | LLM | AI generated |
| Quick Verdict Box | Comparison | LLM | AI generated |
| Features List | Review | LLM | AI generated |
| Pros & Cons Lists | Review | LLM | AI generated |
| Rating Paragraph | Review | LLM | AI generated |
| Honorable Mentions | Listicle | LLM | AI generated |
| Ingredients List | Recipe | LLM | AI generated |
| Instructions List | Recipe | LLM | AI generated |
| Tips Paragraph | Recipe | LLM | AI generated |
| Nutrition Table | Recipe | LLM | AI generated* |

*Nutrition Table includes "approximate values" disclaimer as it's AI-generated.

---

## 14. Component Validation Rules

### Overview

Defines what makes a component valid or invalid, including required fields and format checks.

### 14.1 Universal Validation Rules

| Validation | Rule | Action on Failure |
|------------|------|-------------------|
| **Required Fields** | All required fields must be present | Reject, flag for completion |
| **Character Limits** | Must not exceed defined limits | Truncate or regenerate |
| **Word Limits** | Must be within word count range | Regenerate if too short/long |
| **Format Match** | Must match expected structure | Regenerate |
| **Content Type** | Must be appropriate type (text, list, etc.) | Regenerate |

### 14.2 Component-Specific Validation

| Component | Required Fields | Format Check | Content Check |
|-----------|-----------------|--------------|---------------|
| **H1** | Text content | ≤60 chars | Contains keyword |
| **H2** | Text content | ≤60 chars | Matches H1 type |
| **Paragraph** | Text content | Word count in range | Ends with period |
| **Meta Title** | Text content | 50-60 chars | Contains keyword |
| **Meta Description** | Text content | 140-160 chars | Summarizes content |
| **Alt Text** | Text content | 80-125 chars | Describes image |
| **Bulleted List** | ≥3 items | Proper `<ul>` format | Each item complete |
| **Numbered List** | ≥3 items | Proper `<ol>` format | Sequential logic |
| **Table** | Headers + rows | Proper `<table>` format | All cells filled |
| **Product Card** | All 5 elements | Card structure | Valid price/rating |
| **Service Info Box** | ≥5 rows | 2-column format | Valid contact info |

### 14.3 Validation Status Codes

| Code | Status | Meaning |
|------|--------|---------|
| **VALID** | Pass | Component meets all requirements |
| **INVALID_FORMAT** | Fail | Structure doesn't match expected format |
| **INVALID_LENGTH** | Fail | Exceeds or below character/word limits |
| **MISSING_REQUIRED** | Fail | Required field is empty |
| **INVALID_CONTENT** | Fail | Content doesn't meet rules (keyword missing, etc.) |
| **INVALID_TYPE** | Fail | Wrong content type for component |

### 14.4 Validation Workflow

```
Component Generated
       ↓
Check Required Fields
       ↓ (Pass)
Check Format/Structure
       ↓ (Pass)
Check Character/Word Limits
       ↓ (Pass)
Check Content Rules
       ↓ (Pass)
VALID ✓

Any Fail → Return Error Code → Regenerate
```

### 14.5 Validation Error Handling

| Error Type | Retry Strategy |
|------------|----------------|
| Missing field | Regenerate with explicit field request |
| Too long | Regenerate with stricter length instruction |
| Too short | Regenerate with minimum length instruction |
| Wrong format | Regenerate with format template |
| Invalid content | Regenerate with content constraints |

---

*Document Type: STRUCTURE Layer - Component Taxonomy and Relationships*
*Last Updated: January 2026*
*Version: 3.1 (Updated with Badge Rules, AI Permissions, Data Sources, Validation)*
