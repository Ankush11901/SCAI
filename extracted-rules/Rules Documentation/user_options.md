# User Options - USER CHOICES Layer

**One-Line Definition**: All user-configurable settings including article type, toggles, tone/style selections, and input fields available during content generation.

**Purpose**: Defines WHAT users can configure - all settings, toggles, selections, and input fields available during content generation.

**This file contains ONLY**:
- Article type selection options
- Header type selection options
- Word count input settings
- Tone and style selection options
- All ON/OFF toggle settings
- Image settings
- Interlinking toggle settings
- Article type-specific toggle settings
- Business information input fields
- Export and storage options
- Default values for all settings

**This file does NOT contain**: Actual constraint values (limits), validation rules, component definitions, visual layouts.

**Cross-References**:
- For character/word limits → See `programmatic_options.md`
- For tone/style definitions → See `content_rules.md`
- For component definitions → See `component_rules.md`
- For visual layout → See `general_rules.md`

---

## Table of Contents
1. [Article Type Selection](#1-article-type-selection)
2. [Header Type Selection](#2-header-type-selection)
3. [Content Settings](#3-content-settings)
4. [Keyword Settings](#4-keyword-settings)
5. [Universal Toggle Settings](#5-universal-toggle-settings)
6. [Image Settings](#6-image-settings)
7. [Interlinking Settings](#7-interlinking-settings)
8. [Article Type-Specific Settings](#8-article-type-specific-settings)
9. [Export and Storage Options](#9-export-and-storage-options)
10. [Quick Reference](#10-quick-reference)

---

## 1. Article Type Selection

### Available Article Types (9)

User selects ONE article type per generation:

| # | Article Type | Description | Best For |
|---|--------------|-------------|----------|
| 1 | **Informational** | Educational content explaining topics | Knowledge sharing, SEO traffic |
| 2 | **Commercial** | Service/product promotion content | Conversions, sales pages |
| 3 | **Local** | Location-based service content | Local SEO, service areas |
| 4 | **How-To** | Step-by-step instructional guides | Tutorials, DIY content |
| 5 | **Comparison** | Side-by-side topic comparisons | Buyer guides, decision content |
| 6 | **Review** | Product/service evaluation content | Trust building, affiliate prep |
| 7 | **Listicle** | Numbered list-based articles | Viral content, quick reads |
| 8 | **Affiliate** | Product recommendation with affiliate links | Monetization, product promotion |
| 9 | **Recipe** | Cooking/recipe instructional content | Food blogs, recipe sites |

### Selection Rules

- One article = one type
- Cannot mix article types within a single article
- Selection determines available components and settings

---

## 2. Header Type Selection

### H1 Type Options (3)

User selects ONE heading type for the article:

| Type | Description | Example |
|------|-------------|---------|
| **Question** | H1 is phrased as a question | "What Makes Oranges Nutritious?" |
| **Statement** | H1 is phrased as a statement | "Oranges Are Nutritional Powerhouses" |
| **Listicle** | H1 uses numbered format | "7 Benefits of Oranges" |

### Automatic Behavior

**Important**: H2 type is NOT a separate setting. When user selects H1 type:
- ALL H2s automatically follow the same type
- This is enforced by the system (see `programmatic_options.md`)

---

## 3. Content Settings

### A. Word Count Settings

| Setting | Input Type | Range | Default |
|---------|------------|-------|---------|
| **Primary Length** | Numeric input | 800-4000 words | 2000 words |
| **Secondary Length** | Numeric input | 800-4000 words | 1000 words |

**Tier Usage**:
- **Primary**: Pillar content, competitive keywords, comprehensive guides
- **Secondary**: Supporting content, long-tail keywords, topic clusters

### B. Language Selection

| Setting | Input Type | Description |
|---------|------------|-------------|
| **Content Language** | Dropdown | Language for content generation |

### C. Tone Selection

User selects ONE tone for the article:

| Tone | Best For |
|------|----------|
| **Professional** | B2B, corporate content |
| **Conversational** | Blogs, casual content |
| **Authoritative** | Reviews, expert guides |
| **Friendly** | Local, community content |
| **Persuasive** | Commercial, affiliate content |
| **Educational** | How-to, informational content |
| **Objective** | Comparison, balanced reviews |
| **Enthusiastic** | Listicles, recommendations |
| **Empathetic** | Problem-solving content |

See `content_rules.md` for detailed tone definitions.

### D. Style Selection

User selects ONE writing style:

| Style | Words per Sentence | Best For |
|-------|-------------------|----------|
| **Concise** | 5-10 | Quick reads, scannable content |
| **Balanced** | 12-18 | General purpose, natural flow |
| **Detailed** | 20-30 | In-depth guides, technical content |

See `content_rules.md` for detailed style definitions.

### E. Article Type Defaults

If user doesn't override, these defaults apply:

| Article Type | Default Tone | Default Style |
|--------------|--------------|---------------|
| Affiliate | Persuasive | Balanced |
| Commercial | Persuasive | Concise |
| Comparison | Objective | Detailed |
| How-To | Educational | Concise |
| Informational | Educational | Detailed |
| Listicle | Conversational | Concise |
| Local | Friendly | Balanced |
| Recipe | Friendly | Concise |
| Review | Authoritative | Detailed |

---

## 4. Keyword Settings

### Primary Topic

| Setting | Input Type | Description |
|---------|------------|-------------|
| **Primary Topic** | Text input | Main keyword/topic for content generation |

### Local Article Keywords

For **Local** article type, keyword input has two parts:

| Field | Input Type | Example |
|-------|------------|---------|
| **Service** | Text input | "Plumber", "HVAC Repair" |
| **Location** | Text input | "Atlanta GA", "Los Angeles" |

Combined keyword format: `Service + Location` (e.g., "Plumber Atlanta GA")

---

## 5. Universal Toggle Settings

### Universal Optional Components

These toggles are available for ALL article types:

| Component | Toggle | Default | When Enabled |
|-----------|--------|---------|--------------|
| **Table of Contents** | ON/OFF | OFF | Auto-generates navigation from H2 headings |
| **Meta Title** | ON/OFF | OFF | Generates SEO title |
| **Meta Description** | ON/OFF | OFF | Generates SEO description |
| **FAQs** | ON/OFF | OFF | Adds FAQ section with 5 Q&As |
| **Featured Image** | ON/OFF | ON | Main article image |
| **H2 Image** | ON/OFF | OFF | Images between H2 and paragraph |
| **Featured Image Alt Text** | ON/OFF | OFF | Accessibility text for featured image |
| **H2 Image Alt Text** | ON/OFF | OFF | Accessibility text for H2 images |

### Toggle Dependencies

Some toggles require other toggles to be enabled:

| If Enabling | Must Also Enable |
|-------------|------------------|
| H2 Image Alt Text | H2 Image |
| Featured Image Alt Text | Featured Image |
| Closing Paragraph | Closing H2 (where applicable) |
| FAQ H3 & Answers | FAQ H2 (automatic) |

---

## 6. Image Settings

### Image Style Selection

| Setting | Input Type | Description |
|---------|------------|-------------|
| **Image Style** | Dropdown | Visual style for AI-generated images |

### Image Toggles

| Setting | Toggle | Default | Description |
|---------|--------|---------|-------------|
| **Featured Image** | ON/OFF | ON | Enable/disable featured image |
| **H2 Image** | ON/OFF | OFF | Enable/disable H2 section images |

---

## 7. Interlinking Settings

### Master Toggle

| Setting | Toggle | Default | Description |
|---------|--------|---------|-------------|
| **Enable Internal Linking** | ON/OFF | **ON** | Master toggle for all interlinking |

### Sub-Options (When Internal Linking is ON)

Sub-options appear based on article type:

| Sub-Option | Description | Available For |
|------------|-------------|---------------|
| **Topic Linking** | Links to related informational content | All 9 article types |
| **Service Linking** | Links to service/product pages | Commercial, Local only |
| **Location Linking** | Links to geographical hierarchy pages | Local only |

### Sub-Options by Article Type

| Article Type | Available Sub-Options | Count |
|--------------|----------------------|-------|
| **Local** | Topic, Service, Location | 3 |
| **Commercial** | Topic, Service | 2 |
| Informational | Topic only | 1 |
| How-To | Topic only | 1 |
| Comparison | Topic only | 1 |
| Review | Topic only | 1 |
| Listicle | Topic only | 1 |
| Affiliate | Topic only | 1 |
| Recipe | Topic only | 1 |

### Interlinking Behavior

- **When Master Toggle OFF**: All interlinking disabled, no sub-options shown
- **When Master Toggle ON**: Sub-options appear based on article type
- Each sub-option can be individually toggled ON/OFF
- **Default**: Internal Linking ON, Topic Linking enabled

---

## 8. Article Type-Specific Settings

### Informational Settings

| Setting | Toggle | Default | Description |
|---------|--------|---------|-------------|
| **Quick Facts Section** | ON/OFF | OFF | Adds Quick Facts H2 + Quick Facts List |

**Always Included (No Toggle)**:
- Key Takeaways Box (appears after Overview)
- Closing H2 + Closing Paragraph

---

### Commercial Settings

**Always Included (No Toggle)**:
- Feature H2
- Feature List
- CTA Box

**No optional toggles for Commercial.**

---

### Local Settings

| Setting | Toggle | Default | Description |
|---------|--------|---------|-------------|
| **Why Choose Local Section** | ON/OFF | OFF | Adds H2 + Image + List layout |
| **Service Info Box** | ON/OFF | OFF | Business info table |

**CRITICAL: Local Article Keyword Structure**

Local Article Type targets **Service Area Pages** where keyword requires TWO parts:

| Part | Description | Example |
|------|-------------|---------|
| **Part 1: Service** | The service being offered | "Plumber", "HVAC Repair", "Locksmith" |
| **Part 2: Location** | The geographical area | "Atlanta GA", "Los Angeles", "Downtown Chicago" |

**Combined Format**: `Service + Location` (e.g., "Plumber Atlanta GA")

Both service AND location must be incorporated into headings and content.

**Business Information Input Fields** (for Service Info Box):

| Field | Input Type | Description |
|-------|------------|-------------|
| **Service Keyword(s)** | Text | Service being offered |
| **Address** | Text | Business street address |
| **City** | Text | Business city |
| **State** | Text | Business state |
| **Business Phone** | Text | Contact phone number |
| **Business Name** | Text | Name of business |

**IMPORTANT: Service Info Box Data Source**
- Service Info Box data comes from these user-provided fields
- This data is **pre-filled before generation**
- **NOT LLM-generated** - uses only user-provided values
- Displays in structured two-column table format (Label | Information)

---

### How-To Settings

| Setting | Toggle | Default | Description |
|---------|--------|---------|-------------|
| **Pro Tips Section** | ON/OFF | OFF | Adds Pro Tips H2 + Pro Tips List |
| **Enable Steps Number** | ON/OFF | OFF | Show step numbers in H2 headings |

**Always Included (No Toggle)**:
- Materials/Requirements H2 + Box
- Closing H2 + Closing Paragraph

---

### Comparison Settings

| Setting | Toggle | Default | Description |
|---------|--------|---------|-------------|
| **Quick Verdict Box** | ON/OFF | OFF | Conditional recommendations summary |

**Always Included (No Toggle)**:
- Topic H2 (for each topic, minimum 2)
- Topic Overview
- Comparison Table
- Closing H2 + Closing Paragraph

---

### Review Settings

**Always Included (No Toggle)**:
- Features H2 + Features List
- Pros & Cons H2 + Pros & Cons Lists
- Rating H2 + Rating Paragraph
- Closing H2 + Closing Paragraph

**No optional toggles for Review.**

**Note**: Review is 100% LLM-generated. No external API.

**Suitable For All Review Types:**
- Products
- Services
- Experiences
- Software
- Editorial reviews

---

### Listicle Settings

| Setting | Toggle | Default | Description |
|---------|--------|---------|-------------|
| **Honorable Mentions Section** | ON/OFF | OFF | Adds H2 + H3s (3-4) + Paragraphs |
| **Enable Listicles Ranking** | ON/OFF | OFF | Show ranking numbers in list items |

**When Enable Listicles Ranking is ON**:

| Sub-Setting | Options | Description |
|-------------|---------|-------------|
| **Ranking Order** | Ascending | Items numbered 1, 2, 3... (lowest to highest) |
| | Descending | Items numbered ...3, 2, 1 (highest to lowest) |

---

### Affiliate Settings

| Setting | Toggle | Default | Description |
|---------|--------|---------|-------------|
| **Closing Section** | ON/OFF | OFF | Adds Closing H2 + Closing Paragraph |

**Always Included (No Toggle)**:
- Product Card (from Amazon/external API)

**Note**: Affiliate is the ONLY article type that uses Amazon API for Product Card data.

---

### Recipe Settings

| Setting | Toggle | Default | Description |
|---------|--------|---------|-------------|
| **Nutrition Facts Section** | ON/OFF | OFF | Adds Nutrition H2 + Nutrition Table |
| **FAQ Section** | ON/OFF | OFF | Adds FAQ H2 + 5 FAQ H3s + Answers |

**Always Included (No Toggle)**:
- Ingredients H2 + Ingredients List
- Instructions H2 + Instructions List
- Tips H2 + Tips Paragraph

---

## 9. Export and Storage Options

### Export Destinations

| Option | Description |
|--------|-------------|
| **WordPress** | Export directly to WordPress site |
| **Shopify** | Export directly to Shopify store |

### Storage Options

| Option | Description |
|--------|-------------|
| **Save to Database** | Store in system database |
| **JSON Export** | Download as JSON file |
| **Google Doc Export** | Export to Google Docs |

---

## 10. Quick Reference

### All Global Toggles (Available for All Article Types)

| Toggle | Default | Description |
|--------|---------|-------------|
| Table of Contents | OFF | Navigation links |
| Meta Title | OFF | SEO title |
| Meta Description | OFF | SEO description |
| FAQs | OFF | 5 Q&A section |
| Featured Image | ON | Main article image |
| H2 Image | OFF | Section images |
| Featured Image Alt Text | OFF | Accessibility text |
| H2 Image Alt Text | OFF | Accessibility text |
| Enable Internal Linking | **ON** | Master interlinking toggle |

### Closing Section Availability by Article Type

| Availability | Article Types |
|--------------|---------------|
| **Required (Always On)** | Informational, Comparison, How-To, Review |
| **Optional Toggle** | Affiliate only |
| **Not Available** | Commercial, Local, Listicle, Recipe |

### Article-Specific Toggles Summary

| Article Type | Optional Toggles | Required (No Toggle) |
|--------------|------------------|----------------------|
| **Informational** | Quick Facts Section | Key Takeaways Box, Closing |
| **Commercial** | (none) | Feature H2, Feature List, CTA Box |
| **Local** | Why Choose Local, Service Info Box | (none) |
| **How-To** | Pro Tips Section, Enable Steps Number | Materials/Requirements Box, Closing |
| **Comparison** | Quick Verdict Box | Topic sections, Comparison Table, Closing |
| **Review** | (none) | Features, Pros & Cons, Rating, Closing |
| **Listicle** | Honorable Mentions, Enable Ranking | Odd number items |
| **Affiliate** | Closing Section | Product Card |
| **Recipe** | Nutrition Facts, FAQ | Ingredients, Instructions, Tips |

### Interlinking Sub-Options Summary

| Article Type | Sub-Options When Internal Linking ON |
|--------------|--------------------------------------|
| **Local** | Topic Linking, Service Linking, Location Linking (3) |
| **Commercial** | Topic Linking, Service Linking (2) |
| **Other 7 types** | Topic Linking only (1) |

---

*Document Type: USER CHOICES Layer - All User-Configurable Settings*
*Last Updated: January 2026*
*Version: 3.1 (Updated with One-Line Definition)*
