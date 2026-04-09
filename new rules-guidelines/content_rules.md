# Content Rules - CONTROLLER Layer

**Purpose**: Defines HOW content is processed and generated - business logic, flow control, validation, and quality standards.

**This file contains ONLY**:
- Content generation logic (LLM vs external vs auto)
- Header consistency and adaptation rules
- Content flow and sequencing
- SEO and keyword integration
- Validation rules and forbidden phrases
- Tone and style settings
- Word count distribution logic
- Quality standards

**This file does NOT contain**: Component definitions, word limits, or visual styling rules.

---

## Table of Contents
1. [Generation Workflow](#1-generation-workflow)
2. [Content Source Rules](#2-content-source-rules)
3. [Header Consistency Rule](#3-header-consistency-rule)
4. [Content Flow and Sequencing](#4-content-flow-and-sequencing)
5. [SEO and Keyword Rules](#5-seo-and-keyword-rules)
6. [Validation and Forbidden Phrases](#6-validation-and-forbidden-phrases)
7. [Tone and Style Settings](#7-tone-and-style-settings)
8. [Word Count Distribution](#8-word-count-distribution)
9. [Quality Standards](#9-quality-standards)

---

## 1. Generation Workflow

### Article Generation Steps

```
1. SELECT TYPE       →  Choose 1 of 9 article types
        ↓
2. CONFIGURE         →  Set optional toggles on/off
        ↓
3. DATA INPUT        →  Enter keyword/topic
                        Pre-fill external data (if applicable)
        ↓
4. HEADER TYPE       →  Select: Question / Statement / Listicle
        ↓
5. GENERATE          →  LLM generates content
        ↓
6. VALIDATE          →  Check all rules compliance
```

### Article Type Selection

Nine article types available:
- Affiliate
- Commercial
- Comparison
- How-To
- Informational
- Listicle
- Local
- Recipe
- Review

**Selection Rules**:
- One article = one type
- Cannot mix article types
- Type determines required components
- Type determines content flow

---

## 2. Content Source Rules

### LLM-Generated Content

| Content Type | What LLM Generates |
|--------------|-------------------|
| Universal Components | H1, H2s, Overview, Standard Paragraphs, Closing |
| Meta Content | Meta Title, Meta Description |
| Alt Text | Featured Image Alt, H2 Image Alt |
| All Paragraphs | Prose content for all paragraph types |
| All Lists | Bullets, numbered items (except external data) |

### Article-Specific LLM Content

| Article Type | LLM Generates |
|--------------|---------------|
| Review | Features List, Pros & Cons Lists, Rating score + justification |
| Recipe | Nutrition Table (with "approximate values" disclaimer) |
| Commercial | Feature List, CTA Box text |
| All Types | All bulleted lists matching word count requirements |

### External/Pre-filled Content

| Article Type | Content Source | Data |
|--------------|----------------|------|
| Affiliate | Amazon/External API | Product Card: Image, Name, Rating, Price, CTA Button |
| Local | User Settings | Service Info Box: Hours, Area, Phone, License, Years in Business |

### Auto-Generated Content

| Content | Generation Method |
|---------|-------------------|
| Table of Contents | Auto-generated from all H2 headings |
| Header Types | Determined by H1 type selection |
| Listicle Numbers | Auto-numbered based on H1 type |

### Content Adaptation from External Data

- **Affiliate H2**: Generated from product name, adapted to H1 type
- **Affiliate Paragraph**: Describes product features from external data
- **All Content**: Must be relevant to provided keyword/topic

---

## 3. Header Consistency Rule

### CRITICAL: H1 Type Determines ALL H2 Types

```
┌─────────────────────────────────────────────────────────────┐
│  If H1 is X type, ALL H2s must be X type too!              │
│                                                             │
│  NO EXCEPTIONS - Applies to ALL H2s including unique        │
│  component H2s (FAQ, Rating, Features, etc.)               │
└─────────────────────────────────────────────────────────────┘
```

### Header Type Mapping

| H1 Type | ALL H2s Must Be | Example H2 |
|---------|-----------------|------------|
| Listicle | Listicle format | "1. First Point", "2. Second Point" |
| Statement | Statement format | "Understanding the Basics", "Key Features" |
| Question | Question format | "What Is This?", "How Does It Work?" |

### Header Adaptation Examples

**Topic: "Orange Nutrition"**

| H1 Type | H1 Example | H2 Examples |
|---------|------------|-------------|
| Question | "What Makes Oranges So Nutritious?" | "What Vitamins Do Oranges Contain?", "How Many Calories Are in an Orange?" |
| Statement | "Oranges Are Nutritional Powerhouses" | "Vitamin C Content in Oranges", "Caloric Value of Oranges" |
| Listicle | "7 Incredible Nutritional Benefits of Oranges" | "1. High in Vitamin C", "2. Low in Calories" |

### Unique Component H2 Adaptation Examples

| Component | Question | Statement | Listicle |
|-----------|----------|-----------|----------|
| Materials H2 | "What Do You Need to Get Started?" | "Required Materials and Tools" | "Materials You'll Need" |
| Features H2 | "What Are the Key Features?" | "Key Features Overview" | "Top Features of [Product]" |
| Ingredients H2 | "What Ingredients Do You Need?" | "Required Ingredients" | "Ingredients for [Recipe]" |
| Pros & Cons H2 | "What Are the Pros and Cons?" | "Pros & Cons Analysis" | "Advantages & Disadvantages" |
| Rating H2 | "What Is the Rating?" | "Overall Rating" | "Rating Score" |
| Pro Tips H2 | "What Pro Tips Should You Know?" | "Expert Pro Tips" | "Pro Tips for Success" |
| Quick Facts H2 | "Did You Know These [Topic] Facts?" | "Fascinating Facts About [Topic]" | "Quick [Topic] Facts to Remember" |
| Honorable Mentions H2 | "What Other [Items] Are Worth Trying?" | "Honorable Mentions" | "Other [Items] to Consider" |
| Nutrition H2 | "What Are the Nutritional Facts?" | "Nutritional Information" | "Nutrition Facts Breakdown" |
| Instructions H2 | "How Do You Make This?" | "Step-by-Step Instructions" | "Instructions to Follow" |
| Tips H2 | "What Tips Should You Know?" | "Essential Cooking Tips" | "Tips for Perfect Results" |

---

## 4. Content Flow and Sequencing

### Universal Content Flow

```
H1
  ↓
Featured Image
  ↓
Overview Paragraph (elaborates on H1)
  ↓
[Key Takeaways Box - Informational only, after Overview]
  ↓
[Table of Contents - optional, after Overview]
  ↓
MAIN CONTENT LOOP
  ├── H2
  ├── H2 Image (optional)
  └── Standard Paragraph (elaborates on H2)
  ↓
[SPECIAL SECTIONS - article-type specific]
  ↓
Closing H2 (optional)
  ↓
Closing Paragraph
  ↓
FAQ Section (optional)
```

### Article-Specific Sequences

| Article Type | Required Sequence |
|--------------|-------------------|
| Comparison | All topic sections → Comparison Table → Quick Verdict |
| How-To | Materials/Requirements Box → Step H2s → Pro Tips |
| Recipe | Ingredients → Instructions → Tips → Nutrition (fixed order) |
| Review | Features List → Pros & Cons → Analysis Loop → Rating → Closing |
| Affiliate | Product Card → H2 → Standard Paragraph (loop for each product) |

### Heading-Paragraph Relationships

| Heading | Paired Content | Relationship |
|---------|---------------|--------------|
| H1 | Overview Paragraph | Overview always elaborates on H1 topic |
| H2 | Standard Paragraph | Each paragraph expands on its H2 |
| Special H2 | Special Content | Features H2 → Features List, Pros & Cons H2 → P&C Lists, etc. |
| Closing H2 | Closing Paragraph | Paired, both summarize article |

---

## 5. SEO and Keyword Rules

### H1 Keyword Integration

- Primary keyword MUST APPEAR in the H1 title text
- All headings must maintain the SENTIMENT of the keyword
- All headings must be UNDER 60 CHARACTERS
- Headings should be SIMILAR IN NATURE to provided keyword and context

### H2 Keyword Integration

- Generate specified number of H2 headings about keyword and context
- All headings must be UNDER 60 CHARACTERS - use shorter words/phrases
- Must INCLUDE MAIN TOPIC KEYWORD from original context
- Explore DIFFERENT ASPECTS of the topic - not identical to keyword
- Phrased differently from each other while staying focused on topic
- NEVER include words that CONTRADICT the keyword in the H1
- NEVER CONTRADICT THE SENTIMENT of original keyword and context
- Maintain CONSISTENCY IN SENTIMENT throughout all H2s

### Meta Title Rules

- 50-60 characters (strict)
- Maintain exact keyword sentiment from Heading
- Must NOT contain semi-colons (:)
- Must NOT have poor wording readability
- Must be eye-catching and encourage clicks
- Concise - use shorter words/phrases

### Meta Description Rules

- 140-160 characters (strict)
- NEVER put heading identically into description
- Elaborate keyword naturally - avoid adding heading
- Keyword sentiment persisted throughout
- Must flow naturally, not forced
- Summarizes purpose and content of article

### Alt Text SEO Rules

**Featured Image Alt Text**:
- Accessibility-first: Describe the visual scene accurately
- Include primary keyword naturally in context
- NO "Image of" or "Picture of" phrases

**H2 Image Alt Text**:
- Contextual match: Describe specific action/object tied to H2 topic
- Use LSI/related keywords to build topical depth
- Maintain brevity and factual descriptions

### Local Article Keywords

- Keyword structure: Service + Location (e.g., "Plumber + Atlanta GA")
- Both service and location must be incorporated into headings

### Semantic Keyword Variations

- Use semantic variations of the keyword naturally throughout the content
- Avoid repetitive use of exact keyword phrase
- Include related terms, synonyms, and LSI keywords
- Maintain natural language flow while building topical depth

---

## 6. Validation and Forbidden Phrases

### H2 Heading Forbidden Content

**NEVER use in H2 headings**:
- Conjunctions "and" or "or" - each H2 must be single-focused
- Colons (:) - avoid colons in H2 heading text
- Multiple questions combined - each H2 must be ONE question or statement only

### FAQ Question Forbidden Content

**NEVER combine multiple questions** in a single FAQ H3 - each FAQ must be a single, focused question.

### Closing H2 Forbidden Phrases

**MUST NEVER literally say**:
- "Closing"
- "Conclusion"
- "Final Thoughts"
- "Summary"
- "In Summary"
- "To Wrap Up"
- Or any similar concluding terms

**Instead use**: Descriptive, elaborative headings

| H1 Type | Acceptable Closing H2 Example |
|---------|------------------------------|
| Question | "Why Should Oranges Be Part of Your Diet?" |
| Statement | "Oranges Belong in Every Healthy Kitchen" |
| Listicle | "Your Path to Better Health Starts Here" |

### Closing Paragraph Forbidden Phrases

**MUST NEVER start with**:
- "In conclusion"
- "To summarize"
- "In summary"
- "To wrap up"
- "Finally"
- "As we've discussed"
- Or similar announcement phrases

**Instead**: End naturally with value reinforcement

### Content Quality Validation

| Check | Requirement |
|-------|-------------|
| Word Count | Must meet component-specific requirements |
| Header Consistency | All H2s match H1 type |
| Paragraph Connection | Each paragraph relates to its heading |
| No Filler | Every paragraph adds value |
| Accuracy | Factually correct information |

---

## 7. Tone and Style Settings

### Available Tones (9)

| Tone | Description |
|------|-------------|
| Professional | Polished, business-appropriate, credible |
| Conversational | Natural speech, uses "you", relaxed |
| Authoritative | Expert voice, confident, knowledgeable |
| Friendly | Warm, approachable, personable |
| Persuasive | Compelling, benefit-driven, action-oriented |
| Educational | Clear explanations, teaching voice |
| Objective | Unbiased, fact-based, balanced |
| Enthusiastic | Energetic, excited, passionate |
| Empathetic | Understanding, compassionate, acknowledges struggles |

### Available Styles (3)

| Style | Words per Sentence | Description |
|-------|-------------------|-------------|
| Concise | 5-10 | Short, punchy, direct |
| Balanced | 12-18 | Standard, natural flow |
| Detailed | 20-30 | Thorough, comprehensive |

### Article Type Defaults

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

### Tone and Style Behavior

- Defaults are presets based on article type
- Users can override with any tone/style combination
- Tone affects voice and attitude of content
- Style affects sentence structure and length

---

## 8. Word Count Distribution

### Global Word Count Settings

| Setting | Value |
|---------|-------|
| Minimum | 800 words |
| Maximum | 4000 words |

### Content Tier Defaults

| Tier | Default Words | Use Case |
|------|---------------|----------|
| Primary | 2000 words | Pillar content, competitive keywords, comprehensive guides |
| Secondary | 1000 words | Supporting content, long-tail keywords, topic clusters |

### Word Count Behavior

- Defaults are presets, not hard constraints
- Users can adjust within global range (800-4000)
- System validates against global min/max only

### Article Type Overrides

| Article Type | Override | Reason |
|--------------|----------|--------|
| Listicle | Minimum 850 | 5 items minimum (odd rule) |

### H2 Loop Scaling

- H2 + Standard Paragraph loop minimum: 1 iteration
- Loop expands based on target word count
- Each loop iteration adds ~150 words (Standard Paragraph)

### Word Count Distribution Logic

Target word count distributes as:
1. Required components (fixed word counts from MODEL)
2. H2 + Standard Paragraph loops (variable, fills remaining)
3. Optional components when enabled

---

## 9. Quality Standards

### Paragraph Writing Rules

- Written clearly as a complete paragraph
- Must conclude with a period to indicate end of paragraph
- Address all key points of the heading it belongs to
- Writing must be clear and well-organized
- Proofread to eliminate errors in grammar, spelling, or punctuation
- Goal: Provide clear and informative response that conveys understanding of the topic

### Natural Language

- Content should sound natural and conversational, not robotic or AI-generated
- Avoid overly formal or mechanical phrasing
- Write as a knowledgeable human would speak to the reader
- Vary sentence structure and length for natural rhythm

### Clarity and Readability

- Use clear, concise language
- Break complex topics into digestible sections
- Maintain consistent tone throughout article
- Ensure logical flow between sections

### Value and Relevance

- Every paragraph must add value
- Content must directly relate to H2 topic
- Avoid filler or redundant information
- Focus on user benefit and practical application

### Actionable Content

- Include actionable tips, steps, or recommendations where appropriate
- Provide concrete examples readers can apply
- Avoid vague or generic advice
- Give readers clear next steps or takeaways

### Accuracy and Authority

- LLM-generated content must be factually accurate
- Review articles require balanced, fair assessment
- How-To steps must be executable and safe
- Recipe nutrition must include "approximate" disclaimer

### Engagement and Scannability

- Use bullet points for easy scanning
- Keep sentences and paragraphs focused
- Highlight key information in boxes/lists
- Structure content for quick comprehension

### Article-Specific Quality Rules

| Article Type | Quality Requirements |
|--------------|---------------------|
| Affiliate | H2 must contain product name; paragraph describes features |
| Commercial | Feature List scannable; CTA action-oriented |
| Comparison | Topic Overview follows 40+40 structure; balanced coverage |
| How-To | Steps clear and sequential; Materials upfront |
| Informational | Key Takeaways at top; minimum 4 H2 sections |
| Listicle | Odd numbers only; equal treatment per item |
| Local | Keywords include Service + Location |
| Recipe | Ingredients bulleted; Instructions numbered; Tips practical |
| Review | 100% LLM-generated; balanced Pros & Cons; Rating justified |

---

## Validation Checklist

Before publishing, verify:

1. **Structure**
   - [ ] Correct article type structure followed
   - [ ] All required components present
   - [ ] Optional components properly toggled

2. **Header Consistency**
   - [ ] H1 type selected
   - [ ] ALL H2s match H1 type
   - [ ] No mixed header formats

3. **Content Quality**
   - [ ] All paragraphs elaborate on their headings
   - [ ] No forbidden phrases in Closing
   - [ ] Keyword integrated naturally

4. **Word Count**
   - [ ] Within global range (800-4000)
   - [ ] Individual components meet requirements

5. **SEO**
   - [ ] Meta Title 50-60 characters
   - [ ] Meta Description 140-160 characters
   - [ ] Alt text for all images

---

*Document Type: CONTROLLER Layer - Content Processing Logic*
*Last Updated: January 2026*
