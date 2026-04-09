# General Rules - PRESENTATION Layer

**One-Line Definition**: Visual layout rules defining where elements appear, structural diagrams, design philosophy, and cross-system alignment requirements.

**Purpose**: Defines WHERE things appear - visual layout, element placement, structural diagrams, and design philosophy.

**This file contains ONLY**:
- Layout structure diagrams
- Image placement positions
- Box component visual treatment
- Table visual layouts
- Special component layouts
- CSS reference file locations
- Design philosophy and principles

**This file does NOT contain**: Color hex codes, typography values, character limits, validation rules, user toggles.

**Cross-References**:
- For color palette and typography → See `programmatic_rules.md`
- For component definitions → See `component_rules.md`
- For generation logic → See `content_rules.md`
- For user settings → See `user_options.md`

---

## Table of Contents
1. [Standard Content Layout](#1-standard-content-layout)
2. [Image Placement Rules](#2-image-placement-rules)
3. [Box Component Layouts](#3-box-component-layouts)
4. [Table Layouts](#4-table-layouts)
5. [Special Component Layouts](#5-special-component-layouts)
6. [CSS Reference Files](#6-css-reference-files)
7. [Design Philosophy](#7-design-philosophy)

---

## 1. Standard Content Layout

### Article Structure Diagram

```
┌─────────────────────────────────────┐
│              HEADER                 │
│         (Navigation, Logo)          │
├─────────────────────────────────────┤
│                                     │
│              [H1]                   │
│         Article Title               │
│                                     │
├─────────────────────────────────────┤
│                                     │
│         [Featured Image]            │
│          (Center-aligned)           │
│          (Full-width)               │
│                                     │
├─────────────────────────────────────┤
│                                     │
│       [Overview Paragraph]          │
│          (Content-width)            │
│                                     │
├─────────────────────────────────────┤
│                                     │
│     [Table of Contents - opt]       │
│                                     │
├─────────────────────────────────────┤
│                                     │
│         [Content Area]              │
│    H2 → Image → Paragraph loops     │
│          (Content-width)            │
│                                     │
├─────────────────────────────────────┤
│                                     │
│      [Special Sections - opt]       │
│   (Article-type specific content)   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│        [Closing Section]            │
│     Closing H2 + Paragraph          │
│                                     │
├─────────────────────────────────────┤
│                                     │
│       [FAQ Section - opt]           │
│      FAQ H2 → H3s → Answers         │
│                                     │
├─────────────────────────────────────┤
│              FOOTER                 │
└─────────────────────────────────────┘
```

### Content Width Zones

| Zone | Width | Content |
|------|-------|---------|
| Full-width | 100% viewport | Featured Image |
| Content-width | Readable column | All text content, H2 images |
| Header/Footer | Full-width | Site navigation |

### Table of Contents Position

**Exact Placement**: Table of Contents appears **after Overview Paragraph** and **before the first H2**.

```
┌─────────────────────────────────────┐
│       [Overview Paragraph]          │
├─────────────────────────────────────┤
│                                     │
│     [TABLE OF CONTENTS]             │  ← After Overview, before first H2
│      • H2 Link 1                    │
│      • H2 Link 2                    │
│      • H2 Link 3                    │
│      • ...                          │
│                                     │
├─────────────────────────────────────┤
│           [First H2]                │
└─────────────────────────────────────┘
```

**Format**: Bulleted list of clickable H2 headings (jump links)

---

## 2. Image Placement Rules

### Featured Image Position

Featured image appears immediately after H1:

```
┌─────────────────────────────────────┐
│                                     │
│           [H1 Heading]              │
│                                     │
├─────────────────────────────────────┤
│                                     │
│         [FEATURED IMAGE]            │  ← Always here
│          Center-aligned             │
│           Full-width                │
│                                     │
├─────────────────────────────────────┤
│                                     │
│       [Overview Paragraph]          │
│                                     │
└─────────────────────────────────────┘
```

### H2 Image Position

When H2 Image is enabled, it appears between H2 and its paragraph:

```
┌─────────────────────────────────────┐
│                                     │
│           [H2 Heading]              │
│                                     │
├─────────────────────────────────────┤
│                                     │
│           [H2 IMAGE]                │  ← Between H2 and paragraph
│         Center-aligned              │
│         Content-width               │
│                                     │
├─────────────────────────────────────┤
│                                     │
│       [Standard Paragraph]          │
│                                     │
└─────────────────────────────────────┘
```

### Image Alignment Summary

| Image Type | Horizontal Alignment | Width |
|------------|---------------------|-------|
| Featured Image | Center | Full-width |
| H2 Image | Center | Content-width |
| Why Choose Local Image | **Left** (exception) | Side-by-side with list |

---

## 3. Box Component Layouts

### Box Visual Treatment

Box components are visually distinct from regular content:

```
┌─────────────────────────────────────┐
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │      BOX COMPONENT            │  │
│  │   • Background highlighted    │  │
│  │   • Border or shadow          │  │
│  │   • Padding around content    │  │
│  │   • Margin from other content │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│     [Regular paragraph content]     │
│                                     │
└─────────────────────────────────────┘
```

### Box Components in System

| Component | Visual Style |
|-----------|--------------|
| Key Takeaways Box | Highlighted background, bulleted list |
| Materials/Requirements Box | Card style, bulleted list |
| CTA Box | Prominent styling, action-focused |
| Quick Verdict Box | Highlighted, conditional format |
| Product Card | Card with image, details, CTA button |

---

## 4. Table Layouts

### Comparison Table Layout

Side-by-side comparison of topics:

```
┌─────────────────────────────────────────────────┐
│                COMPARISON TABLE                  │
├─────────────┬───────────────┬───────────────────┤
│  FEATURE    │   TOPIC A     │     TOPIC B       │
├─────────────┼───────────────┼───────────────────┤
│  Feature 1  │   Value A1    │     Value B1      │
├─────────────┼───────────────┼───────────────────┤
│  Feature 2  │   Value A2    │     Value B2      │
├─────────────┼───────────────┼───────────────────┤
│  Feature 3  │   Value A3    │     Value B3      │
└─────────────┴───────────────┴───────────────────┘
```

### Service Info Box Layout

Two-column label-information format:

```
┌─────────────────────────────────────────────────┐
│              SERVICE INFO BOX                    │
├─────────────────────┬───────────────────────────┤
│  LABEL              │  INFORMATION              │
├─────────────────────┼───────────────────────────┤
│  Working Hours      │  24/7                     │
├─────────────────────┼───────────────────────────┤
│  Response Time      │  30 minutes               │
├─────────────────────┼───────────────────────────┤
│  Service Call Fee   │  $49                      │
├─────────────────────┼───────────────────────────┤
│  Emergency Fee      │  $79                      │
├─────────────────────┼───────────────────────────┤
│  Service Area       │  Downtown LA              │
├─────────────────────┼───────────────────────────┤
│  Payment Methods    │  Cash, Card, Financing    │
└─────────────────────┴───────────────────────────┘
```

### Nutrition Table Layout

Standard data table format:

```
┌─────────────────────────────────────────────────┐
│              NUTRITION FACTS                     │
│      (Approximate nutritional values)            │
├─────────────────────┬───────────────────────────┤
│  Nutrient           │  Amount                   │
├─────────────────────┼───────────────────────────┤
│  Calories           │  250                      │
├─────────────────────┼───────────────────────────┤
│  Protein            │  12g                      │
├─────────────────────┼───────────────────────────┤
│  Carbohydrates      │  35g                      │
├─────────────────────┼───────────────────────────┤
│  Fat                │  8g                       │
└─────────────────────┴───────────────────────────┘
```

---

## 5. Special Component Layouts

### Why Choose Local Layout

Unique side-by-side layout with image left-aligned:

```
┌─────────────────────────────────────────────────┐
│                                                  │
│     [Why Choose Local H2]                        │
│                                                  │
├──────────────────┬──────────────────────────────┤
│                  │                               │
│                  │  • Bullet point 1 (8-12 w)   │
│     IMAGE        │  • Bullet point 2 (8-12 w)   │
│  (Left Align)    │  • Bullet point 3 (8-12 w)   │
│                  │  • Bullet point 4 (8-12 w)   │
│                  │  • Bullet point 5 (optional) │
│                  │                               │
└──────────────────┴──────────────────────────────┘
```

**Note**: This is the ONLY layout where image is left-aligned instead of centered.

### Product Card Layout (Affiliate)

Card component with multiple elements:

```
┌─────────────────────────────────────────────────┐
│                                                  │
│              [Product Image]                     │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│           [Product Name]                         │
│                                                  │
│         ★★★★☆  (Star Rating)                    │
│                                                  │
│              $XX.XX (Price)                      │
│                                                  │
│         [    CTA Button    ]                     │
│                                                  │
└─────────────────────────────────────────────────┘
```

### FAQ Section Layout

Question-answer pairs under parent heading:

```
┌─────────────────────────────────────────────────┐
│                                                  │
│             [FAQ H2 Heading]                     │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  [FAQ H3 Question 1]                             │
│  Answer paragraph 1...                           │
│                                                  │
│  [FAQ H3 Question 2]                             │
│  Answer paragraph 2...                           │
│                                                  │
│  [FAQ H3 Question 3]                             │
│  Answer paragraph 3...                           │
│                                                  │
│  [FAQ H3 Question 4]                             │
│  Answer paragraph 4...                           │
│                                                  │
│  [FAQ H3 Question 5]                             │
│  Answer paragraph 5...                           │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Honorable Mentions Layout

Similar to FAQ but with different content:

```
┌─────────────────────────────────────────────────┐
│                                                  │
│       [Honorable Mentions H2 Heading]            │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  [H3 Item Name 1]                                │
│  Description paragraph 1...                      │
│                                                  │
│  [H3 Item Name 2]                                │
│  Description paragraph 2...                      │
│                                                  │
│  [H3 Item Name 3]                                │
│  Description paragraph 3...                      │
│                                                  │
│  [H3 Item Name 4 - optional]                     │
│  Description paragraph 4...                      │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Pros & Cons Layout (Review)

Side-by-side or stacked dual lists:

```
┌─────────────────────────────────────────────────┐
│                                                  │
│           [Pros & Cons H2 Heading]               │
│                                                  │
├──────────────────────┬──────────────────────────┤
│                      │                           │
│    PROS              │    CONS                   │
│    + Pro item 1      │    – Con item 1          │
│    + Pro item 2      │    – Con item 2          │
│    + Pro item 3      │    – Con item 3          │
│    + Pro item 4      │    – Con item 4          │
│    + Pro item 5      │    – Con item 5          │
│                      │                           │
└──────────────────────┴──────────────────────────┘
```

---

## 6. CSS Reference Files

### File Locations

```
/Component Libraries/
├── universal-components.html  ← Universal component styles
└── unique-components.html     ← Unique component styles

/Article Examples/
└── [article-type].html        ← Example implementations
```

### Usage Guidelines

- Reference these files for exact HTML structure
- Copy styling exactly from documentation
- Follow established class naming conventions
- See `programmatic_rules.md` for CSS usage constraints

---

## 7. Design Philosophy

### Core Principles

The SCAI system follows a strict black and white design philosophy:

1. **Simplicity**: Clean, minimal aesthetic
2. **Consistency**: Same styling across all article types
3. **Hierarchy**: Clear visual distinction between heading levels
4. **Accessibility**: Readable by all users and devices
5. **Responsiveness**: Scales appropriately for different screens

### Visual Hierarchy

| Level | Visual Weight | Purpose |
|-------|--------------|---------|
| H1 | Largest, boldest | Article title, draws immediate attention |
| H2 | Medium-large | Section divisions, scannable |
| H3 | Medium | Sub-sections (FAQ, Honorable Mentions only) |
| Paragraph | Standard | Body content, readable |
| Lists | Scannable | Quick information delivery |
| Tables | Structured | Comparative data display |
| Boxes | Highlighted | Important callouts |

### Content Flow Direction

All content flows vertically (top to bottom) with consistent spacing:

```
Header
   ↓
H1 + Featured Image
   ↓
Overview
   ↓
Table of Contents
   ↓
Main Content (H2 → Paragraph loops)
   ↓
Special Sections
   ↓
Closing
   ↓
FAQ
   ↓
Footer
```

### Spacing Principles

- Consistent vertical rhythm between sections
- Headings have more space above than below (creates grouping)
- Paragraphs have standard line spacing
- Lists have compact but readable spacing
- Boxes have internal padding and external margin

---

## 8. System Alignment Rules

### Overview

High-level rules ensuring all generated content aligns with the complete rule system and maintains consistency across categories.

### 8.1 Output Must Align with Rule Categories

**Rule**: All generated content must pass validation against all applicable rule categories before acceptance.

| Rule Category | What It Validates |
|---------------|-------------------|
| **Content Rules** | Quality, safety, narrative consistency |
| **Component Rules** | Structure, format, data sources |
| **Programmatic Options** | Limits, constraints, enforcement |
| **Prompt Rules** | SEO, topic relevance, AI behavior |
| **Image Rules** | Quality, dimensions, restrictions |
| **User Options** | Respects user selections |
| **General Rules** | Layout, design, alignment |

**Validation Order**:
```
Generated Content
       ↓
[1] Programmatic Constraints (hard limits)
       ↓
[2] Component Rules (structure)
       ↓
[3] Content Rules (quality & safety)
       ↓
[4] Image Rules (if applicable)
       ↓
[5] Prompt Rules (SEO & relevance)
       ↓
[6] General Rules (layout & design)
       ↓
APPROVED ✓
```

### 8.2 Rules May Overlap But Must Not Conflict

**Principle**: The same content may be governed by multiple rule categories, but rules cannot contradict each other.

**Acceptable Overlap**:
| Content | Applicable Rules | Relationship |
|---------|------------------|--------------|
| H1 Heading | Content Rules + Component Rules + Programmatic | All complement each other |
| Image | Image Rules + Component Rules + General Rules | All complement each other |
| Paragraph | Content Rules + Prompt Rules | Both ensure quality |

**Unacceptable Conflict Examples**:
| Rule A | Rule B | Conflict |
|--------|--------|----------|
| "Minimum 150 words" | "Maximum 100 words" | Direct contradiction |
| "Must include keyword" | "No keyword stuffing" | Can coexist with balance |
| "Professional tone" | "Friendly tone" | Mutually exclusive |

**Conflict Resolution**: See `programmatic_rules.md` Section 19 for resolution hierarchy.

### 8.3 Cross-Category Validation Requirement

**Rule**: Before publishing, content must be validated against multiple rule categories.

**Minimum Validation Set**:

| Category | Validations Required |
|----------|---------------------|
| **Content Rules** | Safety, quality, consistency |
| **Component Rules** | Structure, format |
| **Programmatic Options** | Character/word limits |

**Extended Validation** (Recommended):

| Category | Additional Checks |
|----------|-------------------|
| **Prompt Rules** | SEO compliance, topic relevance |
| **Image Rules** | If images present |
| **General Rules** | Layout compliance |

**Validation Matrix by Article Type**:

| Article Type | Content | Component | Programmatic | Prompt | Image | General |
|--------------|---------|-----------|--------------|--------|-------|---------|
| All Types | ✓ Required | ✓ Required | ✓ Required | ✓ Recommended | If images | ✓ Recommended |

---

## 9. Contradiction Test Documentation

### Overview

Process for validating that rules across all categories do not conflict with each other.

### 9.1 Contradiction Test Purpose

**Goal**: Ensure the rule system is internally consistent and no rules contradict each other.

**When to Run**:
- After adding new rules
- After modifying existing rules
- During quarterly rule audits
- When conflicts are reported

### 9.2 Contradiction Test Process

**Step 1: Rule Extraction**
```
Extract all rules from:
├── content_rules.md
├── component_rules.md
├── programmatic_rules.md
├── prompt_rules.md
├── image_rules.md
├── user_options.md
└── general_rules.md
```

**Step 2: Categorization**
| Category | Rule Types |
|----------|------------|
| Limits | Character counts, word counts, quantities |
| Formats | Structure requirements, templates |
| Content | What must/must not be included |
| Behavior | How things should work |
| Permissions | What's allowed/forbidden |

**Step 3: Pairwise Comparison**
- Compare each rule against every other rule
- Flag potential conflicts
- Document relationships (complements, independent, conflicts)

**Step 4: Conflict Analysis**
| Conflict Type | Action |
|---------------|--------|
| Direct contradiction | Must resolve - change one rule |
| Ambiguity | Clarify both rules |
| Edge case conflict | Document exception handling |
| No conflict | Mark as verified |

### 9.3 AI-Assisted Contradiction Test

**Prompt Template for AI Validation**:
```
Review the following rules for contradictions:

Rule 1: [Rule text]
Rule 2: [Rule text]

Questions:
1. Do these rules contradict each other?
2. Can both rules be satisfied simultaneously?
3. Are there edge cases where they conflict?
4. How should conflicts be resolved?
```

**AI Test Frequency**:
| Trigger | Scope |
|---------|-------|
| New rule added | Test new rule against all existing |
| Rule modified | Test modified rule against related rules |
| Quarterly audit | Full system test |

### 9.4 Contradiction Test Checklist

**Pre-Test**:
- [ ] All rule files current version
- [ ] All rules extracted and categorized
- [ ] Test environment ready

**During Test**:
- [ ] Limit rules compared (no contradicting min/max)
- [ ] Format rules compared (compatible structures)
- [ ] Content rules compared (no forbidden/required conflicts)
- [ ] Permission rules compared (allowed/not-allowed clear)
- [ ] Cross-category rules compared

**Post-Test**:
- [ ] All conflicts documented
- [ ] Resolution proposed for each conflict
- [ ] Rules updated if needed
- [ ] Test results archived

### 9.5 Contradiction Test Report Template

```
CONTRADICTION TEST REPORT
========================
Date: [Date]
Tested By: [Name/System]
Scope: [Full/Partial]

SUMMARY
-------
Total Rules Tested: [Number]
Conflicts Found: [Number]
Resolved: [Number]
Pending: [Number]

CONFLICTS IDENTIFIED
--------------------
Conflict #1:
- Rule A: [Source file] - [Rule text]
- Rule B: [Source file] - [Rule text]
- Type: [Direct/Ambiguity/Edge Case]
- Resolution: [Proposed solution]
- Status: [Resolved/Pending]

[Repeat for each conflict]

VERIFICATION
------------
Rules Verified Compatible: [List]

RECOMMENDATIONS
---------------
[Any system-wide recommendations]
```

---

*Document Type: PRESENTATION Layer - Visual Layout and Structure*
*Last Updated: January 2026*
*Version: 3.1 (Updated with System Alignment Rules and Contradiction Test)*
