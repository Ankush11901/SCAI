# Component Rules - MODEL Layer

**Purpose**: Defines WHAT the data entities are - component definitions, constraints, relationships, and structure.

**This file contains ONLY**:
- Component names and definitions
- Character and word count limits
- Data types and formats
- Component relationships and dependencies
- Required vs Optional status
- Looping behavior

**This file does NOT contain**: Styling, colors, generation logic, SEO rules, or validation logic.

---

## Table of Contents
1. [Universal Components](#1-universal-components)
2. [Unique Components by Article Type](#2-unique-components-by-article-type)
3. [Component Relationships](#3-component-relationships)
4. [Component Structure Formats](#4-component-structure-formats)
5. [Required vs Optional Status](#5-required-vs-optional-status)

---

## 1. Universal Components

### Core Required Components (5)

| # | Component | Constraint | Data Type |
|---|-----------|------------|-----------|
| 1 | **H1** | 60 characters; 3 types: Statement, Listicle, Question; Exactly 1 per article (FIRST heading only) | Text heading |
| 2 | **Featured Image** | Generated from H1 | Image |
| 3 | **Overview Paragraph** | 100 words (2 × 50 words) | Text paragraph |
| 4 | **H2** | 60 characters; Follows H1 type; Used for ALL content sections | Text heading |
| 5 | **Standard Paragraph** | 150 words (3 × 50 words) | Text paragraph |

### Optional Toggleable Components (11)

| # | Component | Constraint | Data Type |
|---|-----------|------------|-----------|
| 6 | **H2 Image** | Generated from H2 | Image |
| 7 | **Closing H2** | 60 characters | Text heading |
| 8 | **Closing Paragraph** | 50 words | Text paragraph |
| 9 | **FAQ H2** | 30 characters | Text heading (parent only) |
| 10 | **FAQ H3** | 30-60 characters (variable) | Text heading (5 fixed) |
| 11 | **FAQ Answer Paragraph** | 28 words each (5 fixed = 140 total) | Text paragraph |
| 12 | **Meta Title** | 50-60 characters (strict) | SEO text |
| 13 | **Meta Description** | 140-160 characters (strict) | SEO text |
| 14 | **Table of Contents** | Auto-generated from H2s | Navigation list |
| 15 | **Featured Image Alt Text** | 100-125 characters | Accessibility text |
| 16 | **H2 Image Alt Text** | 80-100 characters | Accessibility text |

---

## 2. Unique Components by Article Type

### Affiliate Article Type

| Component | Constraint | Data Type | Format |
|-----------|------------|-----------|--------|
| **Product Card** | External API data | Composite | Contains: Product Image, Product Name, Star Rating, Price, CTA Button |

### Commercial Article Type

| Component | Constraint | Data Type | Format |
|-----------|------------|-----------|--------|
| **Feature H2** | 60 characters | Text heading | Adapts to H1 type |
| **Feature List** | 100-120 words | Bulleted list | 5-7 bullets × 15-20 words each |
| **CTA Box** | 20-30 words | Highlighted box | Call-to-action element |

### Comparison Article Type

| Component | Constraint | Data Type | Format |
|-----------|------------|-----------|--------|
| **Topic H2** | 60 characters | Text heading | Repeats for each topic (2+) |
| **Topic Overview** | 80 words (2 × 40 words) | Text paragraph | Para 1: What + feature; Para 2: Who + benefit |
| **Comparison Table** | 120-150 words | Table | Rows: features; Columns: topics |
| **Quick Verdict Box** | 50 words (optional) | Highlighted box | Conditional recommendations |

### How-To Article Type

| Component | Constraint | Data Type | Format |
|-----------|------------|-----------|--------|
| **Materials/Requirements H2** | 60 characters | Text heading | Adapts to H1 type |
| **Materials/Requirements Box** | 20-120 words (flexible) | Box/card | 5-15 bullets × 2-12 words each |
| **Pro Tips H2** | 60 characters (optional) | Text heading | Adapts to H1 type |
| **Pro Tips List** | 80-120 words (optional) | Bulleted list | 5-7 bullets × 12-18 words each |

### Informational Article Type

| Component | Constraint | Data Type | Format |
|-----------|------------|-----------|--------|
| **Key Takeaways Box** | 50-75 words (REQUIRED) | Highlighted box | 5-6 bullets × 10-12 words each |
| **Quick Facts H2** | 40-50 characters (optional) | Text heading | Shorter than standard H2 |
| **Quick Facts List** | 80-100 words (optional) | Bulleted list | 5-7 bullets × 12-15 words each |

### Listicle Article Type

| Component | Constraint | Data Type | Format |
|-----------|------------|-----------|--------|
| **Listicle Count** | Odd numbers only: 5, 7, 9, 11, 13, 15, 17, 19, 21, 23 | Count rule | Determined by word count |
| **Honorable Mentions H2** | 40-50 characters (optional) | Text heading | Shorter than standard H2 |
| **Honorable Mentions H3** | 30-40 characters (optional) | Text heading | 3-4 fixed H3s |
| **Honorable Mentions Paragraph** | 40-50 words per H3 (optional) | Text paragraph | Total: 120-200 words |

### Local Article Type

| Component | Constraint | Data Type | Format |
|-----------|------------|-----------|--------|
| **Why Choose Local H2** | 40-50 characters (optional) | Text heading | Shorter than standard H2 |
| **Why Choose Local Image** | Generated from H2 (optional) | Image | Left-aligned, beside list |
| **Why Choose Local List** | 40-60 words (optional) | Bulleted list | 4-5 bullets × 8-12 words each |
| **Service Info Box** | 40-60 words (optional) | Table | 5-6 rows, Label + Info columns |

### Recipe Article Type

| Component | Constraint | Data Type | Format |
|-----------|------------|-----------|--------|
| **Ingredients H2** | 60 characters | Text heading | Adapts to H1 type |
| **Ingredients List** | 150 words | Bulleted list | `<ul>` format |
| **Instructions H2** | 60 characters | Text heading | Adapts to H1 type |
| **Instructions List** | 150-400 words (flexible) | Numbered list | `<ol>` format, one step per item |
| **Tips H2** | 60 characters | Text heading | Adapts to H1 type |
| **Tips Paragraph** | 150 words (3 × 50 words) | Text paragraph | Standard paragraph format |
| **Nutrition Facts H2** | 60 characters | Text heading | Adapts to H1 type |
| **Nutrition Table** | 100 words | Table | Nutritional values |

### Review Article Type

| Component | Constraint | Data Type | Format |
|-----------|------------|-----------|--------|
| **Features H2** | 60 characters | Text heading | Adapts to H1 type |
| **Features List** | 150 words | Bulleted list | 7-10 bullets × 15-20 words each |
| **Pros & Cons H2** | 60 characters | Text heading | Adapts to H1 type |
| **Pros & Cons Lists** | 150 words total (75 + 75) | Dual bulleted lists | 5-7 bullets each |
| **Rating H2** | 30 characters | Text heading | Shorter than standard H2 |
| **Rating Paragraph** | 100 words | Text paragraph | Score + justification |

---

## 3. Component Relationships

### Parent-Child Dependencies

| Parent | Child | Relationship |
|--------|-------|--------------|
| H1 | Overview Paragraph | Overview elaborates on H1 |
| H2 | Standard Paragraph | Paragraph elaborates on H2 |
| H2 | H2 Image | Image generated from H2 (optional) |
| H2 Image | H2 Image Alt Text | Alt text requires image enabled |
| FAQ H2 | FAQ H3 (×5) | H3s nested under H2 |
| FAQ H3 | FAQ Answer Paragraph | Answer paired with H3 |
| Closing H2 | Closing Paragraph | Paragraph paired with H2 |
| Honorable Mentions H2 | Honorable Mentions H3 (×3-4) | H3s nested under H2 |
| Honorable Mentions H3 | Honorable Mentions Paragraph | Paragraph paired with H3 |

### Heading Level Rules

| Level | Usage | Count | Rule |
|-------|-------|-------|------|
| **H1** | Article title only | Exactly 1 | FIRST and ONLY H1 per article |
| **H2** | All content sections | Multiple | ALL sections after H1 use H2 |
| **H3** | FAQ and Honorable Mentions only | Limited | Only within specific components |

**Critical Rules**:
- H1 is the FIRST heading of the article - no other heading can be H1
- ALL other sections start with H2 - never use H1 for section headings
- H1 has 3 types: Statement, Listicle, Question - chosen type applies to ALL H2s

### H3 Usage Restrictions

H3 tags exist ONLY in these components:
- FAQ section (exactly 5 H3s)
- Honorable Mentions section (3-4 H3s)

No other components use H3 tags.

### Looping Components

| Component Pattern | Article Types | Behavior |
|-------------------|---------------|----------|
| H2 + Standard Paragraph | All types | Loops until word count met |
| Product Card → H2 → Standard Paragraph | Affiliate | Loops for each product |
| Step H2 + Standard Paragraph | How-To | 5-10 iterations recommended |
| Listicle Item H2 + Standard Paragraph | Listicle | Odd number of iterations |
| Topic H2 + Topic Overview | Comparison | Repeats for each topic (2+) |

### Non-Looping Components (Appear Once Only)

- FAQ section (fixed 5 H3s)
- Pros & Cons Lists
- Comparison Table
- Key Takeaways Box
- Rating H2 + Paragraph
- Materials/Requirements Box
- All "Box" type components

---

## 4. Component Structure Formats

### Paragraph Structures

| Paragraph Type | Sub-paragraphs | Words per Sub | Total Words |
|----------------|----------------|---------------|-------------|
| Overview Paragraph | 2 | 50 | 100 |
| Standard Paragraph | 3 | 50 | 150 |
| Closing Paragraph | 1 | 50 | 50 |
| FAQ Answer | 1 | 28 | 28 |
| Topic Overview | 2 | 40 | 80 |
| Rating Paragraph | 1 | 100 | 100 |
| Tips Paragraph | 3 | 50 | 150 |
| Honorable Mentions Para | 1 | 40-50 | 40-50 |

### List Formats

**Bulleted Lists (`<ul>`)**:
- Feature List (Commercial)
- Key Takeaways Box (Informational)
- Quick Facts List (Informational)
- Materials/Requirements Box (How-To)
- Pro Tips List (How-To)
- Why Choose Local List (Local)
- Ingredients List (Recipe)
- Features List (Review)
- Pros & Cons Lists (Review)

**Numbered Lists (`<ol>`)**:
- Instructions List (Recipe) - ONLY numbered list in system

### Table Formats

| Table Type | Structure | Article Type |
|------------|-----------|--------------|
| Comparison Table | Rows: features; Columns: topics | Comparison |
| Service Info Box | 2 columns: Label, Information | Local |
| Nutrition Table | Nutritional values | Recipe |

### Character Limit Variations

| Component Type | Character Limit | Variation from Standard |
|----------------|-----------------|-------------------------|
| Standard H2 | 60 characters | Baseline |
| FAQ H2 | 30 characters | 50% shorter |
| Rating H2 | 30 characters | 50% shorter |
| Quick Facts H2 | 40-50 characters | 17-33% shorter |
| Honorable Mentions H2 | 40-50 characters | 17-33% shorter |
| Why Choose Local H2 | 40-50 characters | 17-33% shorter |

---

## 5. Required vs Optional Status

### Always Required (Core Components)

1. H1 (60 characters)
2. Featured Image
3. Overview Paragraph (100 words)
4. H2 (60 characters)
5. Standard Paragraph (150 words)

### Conditionally Required by Article Type

| Component | Required For |
|-----------|--------------|
| Closing H2 & Paragraph | Informational, Comparison, How-To, Review |
| Key Takeaways Box | Informational only |
| Materials/Requirements Box | How-To only |
| All recipe components | Recipe only |
| Product Card | Affiliate only |
| Feature List + CTA Box | Commercial only |
| Topic H2 + Topic Overview + Comparison Table | Comparison only |
| Features List + Pros & Cons Lists + Rating | Review only |

### Always Optional (Toggle On/Off)

1. H2 Image
2. FAQ H2, H3, and Answer Paragraphs
3. Meta Title and Meta Description
4. Table of Contents
5. Featured Image Alt Text and H2 Image Alt Text
6. Quick Facts H2 and List (Informational)
7. Pro Tips H2 and List (How-To)
8. Honorable Mentions section (Listicle)
9. Why Choose Local section (Local)
10. Quick Verdict Box (Comparison)
11. Closing H2 and Paragraph (Affiliate only)

---

## Component Summary

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

---

*Document Type: MODEL Layer - Component Definitions*
*Last Updated: January 2026*
