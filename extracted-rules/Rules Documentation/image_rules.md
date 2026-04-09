# Image Rules - VISUAL GENERATION Layer

**One-Line Definition**: Specifications and constraints for AI-generated images including quality thresholds, aspect ratios, regeneration logic, and content restrictions.

**Purpose**: Defines HOW images should be generated - quality standards, dimensions, prompt guidelines, failure handling, and content restrictions.

**This file contains ONLY**:
- Image aspect ratio requirements
- Image quality thresholds
- Image regeneration logic
- Multi-step image handling
- Prompt-level image rules
- Image style consistency
- Image content restrictions

**This file does NOT contain**: Text content rules, component definitions, user toggles, character limits.

**Cross-References**:
- For image placement in layout → See `general_rules.md`
- For image component definitions → See `component_rules.md`
- For image alt text limits → See `programmatic_rules.md`
- For user image settings → See `user_options.md`
- For AI behavior rules → See `prompt_rules.md`

---

## Table of Contents
1. [Image Aspect Ratio Requirements](#1-image-aspect-ratio-requirements)
2. [Image Quality Thresholds](#2-image-quality-thresholds)
3. [Image Regeneration Logic](#3-image-regeneration-logic)
4. [Multi-Step Image Handling](#4-multi-step-image-handling)
5. [Prompt-Level Image Rules](#5-prompt-level-image-rules)
6. [Image Style Consistency](#6-image-style-consistency)
7. [Image Content Restrictions](#7-image-content-restrictions)
8. [Quick Reference](#8-quick-reference)

---

## 1. Image Aspect Ratio Requirements

### Overview

All images must conform to specific aspect ratios to ensure consistent visual presentation across the system.

### 1.1 Aspect Ratio by Image Type

| Image Type | Aspect Ratio | Dimensions (Recommended) | Usage |
|------------|--------------|--------------------------|-------|
| **Featured Image** | 16:9 | 1200 × 675 px | Main article image after H1 |
| **H2 Image** | 16:9 | 800 × 450 px | Section images between H2 and paragraph |
| **Product Card Image** | 1:1 | 400 × 400 px | Affiliate product displays |
| **Why Choose Local Image** | 4:3 | 400 × 300 px | Local article side image |
| **Thumbnail** | 1:1 | 150 × 150 px | Preview/listing images |
| **Social Share Image** | 1.91:1 | 1200 × 628 px | Open Graph / social media |

### 1.2 Aspect Ratio Visual Reference

```
Featured Image (16:9)          Product Image (1:1)
┌─────────────────────────┐    ┌───────────────┐
│                         │    │               │
│                         │    │               │
│         16:9            │    │      1:1      │
│                         │    │               │
│                         │    │               │
└─────────────────────────┘    └───────────────┘

Why Choose Local (4:3)         Thumbnail (1:1)
┌───────────────────┐          ┌─────────┐
│                   │          │         │
│        4:3        │          │   1:1   │
│                   │          │         │
└───────────────────┘          └─────────┘
```

### 1.3 Aspect Ratio Tolerance

| Tolerance | Description |
|-----------|-------------|
| **Strict** | Must be exact ratio (±1%) |
| **Flexible** | Within 5% of target ratio |

**Default**: Strict tolerance for all image types.

**Handling Non-Conforming Images**:
- Crop to fit (center-weighted)
- Regenerate if cropping loses important content
- Never stretch or distort

---

## 2. Image Quality Thresholds

### Overview

Minimum quality standards images must meet before acceptance into the system.

### 2.1 Resolution Requirements

| Image Type | Minimum Width | Minimum Height | Minimum DPI |
|------------|---------------|----------------|-------------|
| **Featured Image** | 1200 px | 675 px | 72 DPI |
| **H2 Image** | 800 px | 450 px | 72 DPI |
| **Product Card Image** | 400 px | 400 px | 72 DPI |
| **Why Choose Local Image** | 400 px | 300 px | 72 DPI |
| **Thumbnail** | 150 px | 150 px | 72 DPI |

### 2.2 File Specifications

| Specification | Requirement |
|---------------|-------------|
| **File Formats** | JPEG, PNG, WebP |
| **Preferred Format** | WebP (best compression) |
| **Fallback Format** | JPEG (universal support) |
| **PNG Usage** | Only when transparency needed |
| **Max File Size** | 500 KB per image |
| **Compression Quality** | Minimum 80% (JPEG) |

### 2.3 Visual Quality Standards

| Standard | Requirement |
|----------|-------------|
| **Sharpness** | Primary subject must be in focus |
| **Noise** | Minimal visible noise/grain |
| **Artifacts** | No visible compression artifacts |
| **Watermarks** | NO watermarks allowed |
| **Text Overlay** | NO text unless intentional design |
| **Borders** | No unintended borders or frames |
| **Color Accuracy** | Colors must appear natural |
| **Lighting** | Adequate, even lighting |

### 2.4 Quality Scoring

| Score Range | Quality Level | Action |
|-------------|---------------|--------|
| 90-100 | Excellent | Accept |
| 75-89 | Good | Accept |
| 60-74 | Acceptable | Review, may accept |
| Below 60 | Poor | Regenerate |

**Quality Check Factors**:
- Resolution score (25%)
- Sharpness score (25%)
- Composition score (20%)
- Technical quality (15%)
- Content relevance (15%)

---

## 3. Image Regeneration Logic

### Overview

Defines when and how failed images trigger regeneration.

### 3.1 Regeneration Triggers

| Trigger | Description | Action |
|---------|-------------|--------|
| **Quality Below Threshold** | Score < 60 | Regenerate with same prompt |
| **Wrong Aspect Ratio** | Outside tolerance | Regenerate with explicit dimensions |
| **Watermark Detected** | Any watermark present | Regenerate with "no watermark" instruction |
| **Wrong Content** | Doesn't match prompt | Regenerate with refined prompt |
| **Text in Image** | Unintended text | Regenerate with "no text" instruction |
| **Inappropriate Content** | Violates restrictions | Regenerate with content filter |
| **Technical Failure** | API error, timeout | Retry same request |
| **File Too Large** | Exceeds 500 KB | Compress or regenerate |

### 3.2 Retry Logic

| Attempt | Action | Wait Time |
|---------|--------|-----------|
| **1st** | Original prompt | Immediate |
| **2nd** | Refined prompt + explicit constraints | 2 seconds |
| **3rd** | Alternative prompt approach | 5 seconds |
| **4th** | Fallback to simpler prompt | 10 seconds |
| **5th** | Use placeholder image | N/A |

**Maximum Retries**: 5 attempts per image

### 3.3 Prompt Refinement Strategy

**If Image Fails Quality Check**:
```
Original: "A professional image of running shoes"
Refined:  "A high-quality, sharp, professional photograph of running shoes on white background, studio lighting, no text, no watermarks, 4K quality"
```

**If Image Has Wrong Content**:
```
Original: "An image of a laptop for productivity"
Refined:  "A modern laptop computer open on a clean desk, showing productivity software, minimalist style, professional setting, no people, no text overlays"
```

### 3.4 Fallback Behavior

When all retries exhausted:

| Option | Description |
|--------|-------------|
| **Placeholder** | Use category-appropriate placeholder image |
| **Skip** | Generate article without image (flag for manual review) |
| **Queue** | Add to manual generation queue |

---

## 4. Multi-Step Image Handling

### Overview

Workflow for complex image generation requiring multiple processing steps.

### 4.1 Standard Image Pipeline

```
Step 1: Initial Generation
    ↓
Step 2: Quality Assessment
    ↓
Step 3: Enhancement (if needed)
    ↓
Step 4: Format Optimization
    ↓
Step 5: Final Validation
    ↓
Output: Approved Image
```

### 4.2 Pipeline Steps Detailed

| Step | Process | Output |
|------|---------|--------|
| **1. Initial Generation** | AI generates image from prompt | Raw image file |
| **2. Quality Assessment** | Automated quality scoring | Pass/Fail + Score |
| **3. Enhancement** | Upscaling, sharpening if needed | Enhanced image |
| **4. Format Optimization** | Convert to WebP, compress | Optimized file |
| **5. Final Validation** | Check all requirements | Approved/Rejected |

### 4.3 Enhancement Options

| Enhancement | When Applied | Method |
|-------------|--------------|--------|
| **Upscaling** | Resolution below minimum | AI upscaling (2x) |
| **Sharpening** | Slight blur detected | Unsharp mask filter |
| **Noise Reduction** | Visible grain | AI denoising |
| **Color Correction** | Colors appear off | Auto color balance |
| **Compression** | File too large | Quality reduction (min 80%) |

### 4.4 Layered Generation (Advanced)

For complex compositions:

```
Layer 1: Background generation
    ↓
Layer 2: Main subject generation
    ↓
Layer 3: Composition merge
    ↓
Layer 4: Style harmonization
    ↓
Output: Composite image
```

**Use Cases for Layered Generation**:
- Product on custom background
- Multiple elements requiring separate control
- Brand-specific styling requirements

---

## 5. Prompt-Level Image Rules

### Overview

Guidelines for constructing effective image generation prompts.

### 5.1 Prompt Structure

**Recommended Format**:
```
[Subject] + [Style] + [Setting] + [Composition] + [Quality Modifiers] + [Exclusions]
```

**Example**:
```
"Professional photograph of fresh oranges in a kitchen setting,
bright natural lighting, centered composition, high resolution,
sharp focus, no text, no watermarks, no people"
```

### 5.2 Prompt Components

| Component | Description | Examples |
|-----------|-------------|----------|
| **Subject** | Main focus of image | "running shoes", "kitchen interior", "laptop" |
| **Style** | Visual style | "photograph", "illustration", "minimalist" |
| **Setting** | Environment/context | "white background", "outdoor", "office desk" |
| **Composition** | Layout/framing | "centered", "rule of thirds", "close-up" |
| **Quality Modifiers** | Quality descriptors | "high resolution", "4K", "sharp", "professional" |
| **Exclusions** | What to avoid | "no text", "no watermarks", "no people" |

### 5.3 Style Keywords by Image Type

| Image Type | Recommended Style Keywords |
|------------|---------------------------|
| **Featured Image** | Professional, high-quality, editorial, vibrant, engaging |
| **H2 Image** | Clean, relevant, contextual, supporting, illustrative |
| **Product Image** | Product photography, studio lighting, white background, sharp |
| **Local Service Image** | Professional, trustworthy, local, friendly, authentic |

### 5.4 Prompt Do's and Don'ts

**DO**:
- Be specific about subject matter
- Include quality modifiers
- Specify what to exclude
- Match style to article type
- Include composition guidance

**DON'T**:
- Use vague descriptions
- Request copyrighted characters/brands
- Ask for text/words in image
- Request real people's faces
- Use ambiguous terms

### 5.5 Prompt Templates

**Featured Image Template**:
```
"High-quality professional [style] of [subject], [setting],
[lighting description], [composition], suitable for article header,
no text, no watermarks, 16:9 aspect ratio"
```

**Product Image Template**:
```
"Product photography of [product name], white background,
studio lighting, centered, sharp focus, e-commerce style,
no text, no watermarks, square format"
```

**H2 Section Image Template**:
```
"[Style] image illustrating [H2 topic concept], [setting],
clean composition, supporting content about [keyword],
no text, no watermarks, 16:9 aspect ratio"
```

---

## 6. Image Style Consistency

### Overview

Rules ensuring all images within an article maintain visual coherence.

### 6.1 Style Consistency Requirements

| Requirement | Description |
|-------------|-------------|
| **Same Visual Style** | All images in article use same style (photo, illustration, etc.) |
| **Consistent Lighting** | Similar lighting mood across images |
| **Color Harmony** | Colors complement each other |
| **Quality Uniformity** | All images meet same quality standards |
| **Subject Treatment** | Similar approach to depicting subjects |

### 6.2 Style Categories

| Style | Description | Best For |
|-------|-------------|----------|
| **Photographic** | Realistic photographs | Reviews, Local, Commercial |
| **Illustrated** | Digital illustrations | How-To, Informational |
| **Minimalist** | Clean, simple imagery | Listicles, Comparisons |
| **Editorial** | Magazine-style photos | Affiliate, Recipe |
| **Flat Design** | 2D vector style | Infographics, diagrams |

### 6.3 Per-Article Style Lock

**Rule**: Once first image style is determined, all subsequent images must match.

```
Article Start
    ↓
Featured Image Generated (Style: Photographic)
    ↓
Style Lock: Photographic
    ↓
All H2 Images → Must be Photographic style
    ↓
All other images → Must be Photographic style
```

### 6.4 Style Consistency Checks

| Check | Method |
|-------|--------|
| **Visual Inspection** | Compare images side-by-side |
| **Style Tagging** | AI tags style of each image |
| **Color Analysis** | Extract and compare color palettes |
| **Quality Matching** | Ensure similar quality scores |

---

## 7. Image Content Restrictions

### Overview

Defines what images must NOT contain to ensure safety and appropriateness.

### 7.1 Prohibited Content

| Category | Restriction |
|----------|-------------|
| **Faces** | No identifiable human faces without explicit consent/licensing |
| **Copyrighted Material** | No logos, brand imagery, trademarked content |
| **Offensive Content** | No violence, gore, disturbing imagery |
| **Adult Content** | No sexually explicit or suggestive imagery |
| **Discriminatory Content** | No racist, sexist, or discriminatory imagery |
| **Misleading Content** | No fake news, manipulated imagery |
| **Text/Words** | No embedded text (unless explicitly requested) |
| **Watermarks** | No watermarks of any kind |
| **Low Quality** | No pixelated, blurry, or artifact-heavy images |

### 7.2 Content Restrictions by Article Type

| Article Type | Additional Restrictions |
|--------------|------------------------|
| **Affiliate** | No competitor product images |
| **Commercial** | No competitor branding |
| **Local** | Must represent actual service area appropriately |
| **Recipe** | Food must look appetizing and safe |
| **Review** | Must accurately represent product |
| **How-To** | Steps must be clearly visible/understandable |

### 7.3 Safe Content Guidelines

**Images SHOULD**:
- Be relevant to article topic
- Support the content message
- Be appropriate for all audiences
- Be legally usable (royalty-free or generated)
- Enhance reader understanding

**Images SHOULD NOT**:
- Distract from content
- Mislead about product/service
- Create negative associations
- Violate any copyright
- Contain hidden inappropriate content

### 7.4 Content Moderation

| Stage | Check |
|-------|-------|
| **Pre-Generation** | Prompt screened for prohibited requests |
| **Post-Generation** | Image analyzed for prohibited content |
| **Pre-Publish** | Final human review for sensitive content |

**Automated Detection**:
- Face detection → Flag for review
- Text detection → Flag for removal
- Brand/logo detection → Reject
- NSFW detection → Reject

---

## 8. Quick Reference

### Image Generation Checklist

**Before Generation**:
- [ ] Aspect ratio specified
- [ ] Style determined
- [ ] Quality requirements clear
- [ ] Exclusions listed in prompt
- [ ] Content appropriate for article type

**After Generation**:
- [ ] Aspect ratio correct
- [ ] Quality score acceptable (≥60)
- [ ] No watermarks
- [ ] No unintended text
- [ ] No prohibited content
- [ ] Style matches article
- [ ] File size under 500 KB

### Quick Specs Table

| Image Type | Ratio | Min Size | Max File | Format |
|------------|-------|----------|----------|--------|
| Featured | 16:9 | 1200×675 | 500 KB | WebP/JPEG |
| H2 | 16:9 | 800×450 | 500 KB | WebP/JPEG |
| Product | 1:1 | 400×400 | 500 KB | WebP/JPEG |
| Local | 4:3 | 400×300 | 500 KB | WebP/JPEG |
| Thumbnail | 1:1 | 150×150 | 100 KB | WebP/JPEG |

### Regeneration Quick Guide

| Problem | Solution |
|---------|----------|
| Blurry | Add "sharp, high resolution, 4K" to prompt |
| Wrong subject | Be more specific, add exclusions |
| Watermark | Add "no watermarks" explicitly |
| Text in image | Add "no text, no words, no letters" |
| Wrong style | Specify style explicitly |
| Low quality | Add quality modifiers |
| Wrong ratio | Specify dimensions explicitly |

---

*Document Type: VISUAL GENERATION Layer - Image Rules and Specifications*
*Last Updated: January 2026*
*Version: 1.0*
