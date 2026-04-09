Here is the comprehensive Master Rules Document. It consolidates every rule, constraint, and logic flow from the Controller, Model, and View layers into a single system specification.

***

# SCAI SYSTEM MASTER SPECIFICATION
**Version:** 2026.1
**Scope:** Full System Architecture (Model, View, Controller)

---

## 1. CORE ARCHITECTURAL RULES

The system operates on a strict MVC (Model-View-Controller) separation.

1.  **CONTROLLER Layer (Logic)**: Defines HOW content is generated, processed, validated, and sequenced.
2.  **MODEL Layer (Data)**: Defines WHAT the components are, their data structures, and relationships.
3.  **VIEW Layer (Presentation)**: Defines HOW content is displayed, styled, and rendered.

---

## 2. THE GOLDEN RULES (CRITICAL)

These rules override all others and allow for zero exceptions.

1.  **Header Consistency Rule**: The **H1 Type** determines the **H2 Type**.
    *   If H1 is a *Question*, ALL H2s must be *Questions*.
    *   If H1 is a *Statement*, ALL H2s must be *Statements*.
    *   If H1 is a *Listicle*, ALL H2s must be *Numbered Items*.
2.  **Color Restriction**: The UI and Content presentation must use **Black, White, and Grayscale ONLY**. No chromatic colors (Red, Blue, etc.) are allowed.
3.  **No Emoji Rule**: Emojis are strictly forbidden in all generated content.
4.  **One Type Per Article**: An article can only be one of the 9 defined types. You cannot mix "Recipe" components into a "Commercial" article.
5.  **H1 Exclusivity**: There is exactly **ONE H1** per article. It is the very first component. All subsequent section headers must be H2.

---

## 3. MODEL LAYER: COMPONENT DEFINITIONS

### 3.1 Universal Components (Available to All Types)

| Component | Limit/Constraint | Data Structure |
|-----------|------------------|----------------|
| **H1** | Max 60 chars | Text. 3 Types: Question, Statement, Listicle. |
| **Featured Image** | Full Width | Image generated from H1 text. |
| **Overview Paragraph** | 100 words | 2 sub-paragraphs × 50 words. Elaborates on H1. |
| **H2** | Max 60 chars | Text. Matches H1 Type. Used for all sections. |
| **H2 Image** | Content Width | Image generated from H2 text (Optional). |
| **Standard Paragraph** | 150 words | 3 sub-paragraphs × 50 words. Elaborates on H2. |
| **Closing H2** | Max 60 chars | Text. Must not use forbidden phrases (e.g., "Conclusion"). |
| **Closing Paragraph** | 50 words | 1 paragraph. Summarizes article. |
| **FAQ H2** | Max 30 chars | Text. Parent header for FAQ section. |
| **FAQ H3** | 30-60 chars | Text. Exactly 5 questions. |
| **FAQ Answer** | 28 words each | Text. 5 answers total (140 words total). |
| **Meta Title** | 50-60 chars | Strict SEO text. No semi-colons. |
| **Meta Description** | 140-160 chars | Strict SEO text. No duplicate headings. |

### 3.2 Unique Components (By Article Type)

#### Affiliate
*   **Product Card**: Source: External API (Amazon). Contains: Image, Name, Rating, Price, CTA Button.

#### Commercial
*   **Feature H2**: Max 60 chars. Adapts to H1 type.
*   **Feature List**: 100-120 words. Bulleted list (`<ul>`). 5-7 bullets × 15-20 words.
*   **CTA Box**: 20-30 words. Highlighted box.

#### Comparison
*   **Topic H2**: Max 60 chars. Repeats for each topic (min 2).
*   **Topic Overview**: 80 words (2 sub-paras × 40 words). Para 1: Feature; Para 2: Benefit.
*   **Comparison Table**: 120-150 words. Rows: Features; Cols: Topics.
*   **Quick Verdict Box**: 50 words. Conditional recommendations.

#### How-To
*   **Materials H2**: Max 60 chars. Adapts to H1 type.
*   **Materials Box**: 20-120 words. 5-15 bullets × 2-12 words.
*   **Pro Tips H2**: Max 60 chars.
*   **Pro Tips List**: 80-120 words. 5-7 bullets × 12-18 words.

#### Informational
*   **Key Takeaways Box**: 50-75 words. **REQUIRED**. 5-6 bullets × 10-12 words.
*   **Quick Facts H2**: 40-50 chars (Shorter).
*   **Quick Facts List**: 80-100 words. 5-7 bullets × 12-15 words.

#### Listicle
*   **Listicle Count**: **Odd numbers only** (5, 7, 9... 23).
*   **Honorable Mentions H2**: 40-50 chars.
*   **Honorable Mentions H3**: 30-40 chars. (3-4 items).
*   **HM Paragraph**: 40-50 words per H3.

#### Local
*   **Why Choose Local H2**: 40-50 chars.
*   **Why Choose Local Img**: Generated from H2. Left-aligned.
*   **Why Choose Local List**: 40-60 words. 4-5 bullets.
*   **Service Info Box**: 40-60 words. Table format (Label | Info). Source: User Data.

#### Recipe
*   **Ingredients H2**: Max 60 chars.
*   **Ingredients List**: 150 words. Bulleted (`<ul>`).
*   **Instructions H2**: Max 60 chars.
*   **Instructions List**: 150-400 words. Numbered (`<ol>`).
*   **Tips H2**: Max 60 chars.
*   **Tips Paragraph**: 150 words (Standard format).
*   **Nutrition H2**: Max 60 chars.
*   **Nutrition Table**: 100 words. Must include disclaimer "Approximate values".

#### Review
*   **Features H2**: Max 60 chars.
*   **Features List**: 150 words. 7-10 bullets × 15-20 words.
*   **Pros & Cons H2**: Max 60 chars.
*   **Pros & Cons Lists**: 150 words total (75/75). Dual lists.
*   **Rating H2**: Max 30 chars.
*   **Rating Paragraph**: 100 words. Score + Justification.

### 3.3 Component Relationships

*   **Parent-Child**:
    *   H1 → Overview Paragraph
    *   H2 → Standard Paragraph
    *   H2 → H2 Image → H2 Image Alt Text
    *   FAQ H2 → FAQ H3s → FAQ Answers
    *   Closing H2 → Closing Paragraph
*   **Looping Behavior**:
    *   *Standard Loop*: H2 + Standard Paragraph (Repeats to fill word count).
    *   *Affiliate Loop*: Product Card + H2 + Paragraph (Repeats per product).
    *   *How-To Loop*: Step H2 + Paragraph (5-10 iterations).
    *   *Listicle Loop*: Item H2 + Paragraph (Odd iterations).

---

## 4. CONTROLLER LAYER: LOGIC & RULES

### 4.1 Generation Workflow
1.  **Select Type**: Choose 1 of 9 types.
2.  **Configure**: Toggle optional components.
3.  **Data Input**: Keyword/Topic + External Data (if applicable).
4.  **Header Type**: Select Question / Statement / Listicle.
5.  **Generate**: Pipeline execution (Keyword Filter -> Heading Gen -> Answer Gen -> Dupe Check -> Interlinking).
6.  **Validate**: Apply rule checks.

### 4.2 Content Sequencing (Flow)
**Universal Sequence**:
`H1` -> `Featured Image` -> `Overview` -> `[Type Specific Top]` -> `[Main Loop]` -> `[Type Specific Bottom]` -> `Closing H2` -> `Closing Para` -> `FAQ`

**Specific Type Requirements**:
*   **Comparison**: Topic sections must appear *before* Comparison Table.
*   **How-To**: Materials Box must appear *before* Steps.
*   **Recipe**: Fixed order: Ingredients -> Instructions -> Tips -> Nutrition.
*   **Review**: Features -> Pros/Cons -> Analysis -> Rating -> Closing.

### 4.3 SEO & Keyword Rules
*   **H1**: Keyword must appear in text.
*   **H2s**:
    *   Must be < 60 chars.
    *   Must include main topic keyword/context.
    *   Must explore *different* aspects (no repetition).
    *   Must maintain consistent sentiment with H1.
*   **Meta Title**: 50-60 chars. No semi-colons.
*   **Meta Description**: 140-160 chars. Never copy header identically.
*   **Alt Text**:
    *   Featured: Describe scene + keyword. No "Image of".
    *   H2: Contextual match + LSI keywords.

### 4.4 Forbidden Content (Validation)
*   **H2 Headings**: No conjunctions ("and", "or"). No colons (:). No multiple questions.
*   **Closing H2**: NEVER use "Conclusion", "Summary", "Wrap Up", "Closing".
*   **Closing Paragraph**: NEVER start with "In conclusion", "To summarize", "Finally".
*   **FAQ**: One question per H3. Do not combine questions.

### 4.5 Word Count Logic
*   **Global Range**: 800 (min) to 4000 (max) words.
*   **Listicle Exception**: Minimum 850 words (5 items).
*   **Distribution**:
    1.  Fill required fixed components first.
    2.  Fill remaining count with "H2 + Standard Paragraph" loops.
    3.  Each loop adds ~150 words.

### 4.6 Tone and Style
*   **Tones (9)**: Professional, Conversational, Authoritative, Friendly, Persuasive, Educational, Objective, Enthusiastic, Empathetic.
*   **Styles (3)**:
    *   Concise (5-10 words/sentence).
    *   Balanced (12-18 words/sentence).
    *   Detailed (20-30 words/sentence).

### 4.7 Interlinking Logic
*   **Topic Linking**: Available to ALL types. Links to related informational content (Guides, Blogs).
*   **Service Linking**: Available to **Commercial & Local** ONLY. Links high-intent keywords to Money Pages.
*   **Location Linking**: Available to **Local** ONLY. Links City -> State and Nearby Locations.

---

## 5. VIEW LAYER: PRESENTATION RULES

### 5.1 Color Palette
*   **Allowed**: Black (#000000), White (#FFFFFF), Grayscale (#F5F5F5 to #333333).
*   **Forbidden**: ANY chromatic color (Red, Blue, Green, etc.). No accent colors.

### 5.2 Typography
*   **Text**: Black.
*   **Secondary/Captions**: Dark/Medium Grays.
*   **Fonts**: System-defined families only.
*   **Hierarchy**: H1 (Largest) -> H2 (Section) -> H3 (Sub-section).

### 5.3 Layout & Alignment
*   **Featured Image**: Center Aligned, Full Width. Placed *after* H1, *before* Overview.
*   **H2 Image**: Center Aligned, Content Width. Placed *between* H2 and Paragraph.
*   **Why Choose Local**: SPECIAL LAYOUT. Left-aligned Image side-by-side with Bullet List.
*   **Tables**:
    *   Comparison: Columns = Topics.
    *   Service Info: 2 Columns (Label | Info).

### 5.4 Symbols & Icons
*   **No Emojis**: Strictly forbidden.
*   **Allowed Symbols**:
    *   Checkmark (✓) - Completion/Features.
    *   Bullet (•) - Lists.
    *   Star (★/☆) - Ratings only.
    *   Plus/Minus (+/-) - Pros/Cons only.

### 5.5 Accessibility
*   **Images**: Must have Alt Text.
*   **Contrast**: Black text on White/Light Gray background.
*   **Focus**: Visible focus states on interactive elements.
*   **Structure**: Proper semantic heading hierarchy.

---

## 6. CONFIGURATION: USER VS. SYSTEM

### 6.1 User Impacted Options (Configurable)
*   **Article Type**: Select 1 of 9.
*   **Header Type**: Question, Statement, or Listicle.
*   **Word Count**: Target length (Primary/Secondary tiers).
*   **Tone & Style**: Select from presets.
*   **Toggles (Universal)**:
    *   Table of Contents (Default: OFF)
    *   Meta Title/Desc (Default: OFF)
    *   FAQs (Default: OFF)
    *   Images (Featured: ON, H2: OFF)
    *   Alt Text (Default: OFF)
*   **Toggles (Type Specific)**:
    *   Quick Facts (Informational)
    *   Pro Tips (How-To)
    *   Why Choose Local (Local)
    *   Nutrition Facts (Recipe)
    *   Honorable Mentions (Listicle)
*   **Interlinking**: Enable/Disable. Select sub-strategies (Topic/Service/Location).

### 6.2 Programmatic Options (Hardcoded)
*   **Limits**: Character counts (H1: 60), Word counts (Para: 150), Listicle counts (Odd only).
*   **Visuals**: Color restrictions, CSS classes.
*   **Logic**: Header consistency rule, Pipeline steps, H3 restriction (FAQ/Honorable Mentions only).
*   **Validation**: Forbidden phrases, API requirements.

---

## 7. QUALITY STANDARDS

1.  **Paragraphs**: Must be clear, complete, and end with a period. No filler.
2.  **Accuracy**: LLM content must be factual. Recipes/How-Tos must be safe/executable.
3.  **Natural Language**: Avoid robotic phrasing. Vary sentence structure.
4.  **Value**: Every component must address the H2 topic directly.
5.  **Actionable**: Provide concrete steps or takeaways where possible.

---

*End of Master Specification*