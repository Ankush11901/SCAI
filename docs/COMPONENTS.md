# Article Component Specifications

> Complete guide to universal and unique components, their variations, and HTML structure

---

## 1. Overview

### 1.1 Component Categories

| Category | Count | Description |
|----------|-------|-------------|
| **Universal** | 10 | Shared across all 9 article types |
| **Unique** | Variable | Specific to certain article types |

### 1.2 Component Properties

Every component has:
- `id` — Unique identifier (e.g., `h1`, `product-card`)
- `name` — Human-readable name
- `type` — `universal` or `unique`
- `required` — Whether it can be disabled
- `constraints` — Character/word limits
- `variations` — 3 WordPress-native style options

---

## 2. Universal Components

These appear in ALL article types.

### 2.1 H1 (Title)

| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 3 |
| Max Characters | 60 |

**Variation 1: Clean**
```html
<h1 class="scai-h1" data-component="h1">
  Article Title Here
</h1>
```

**Variation 2: With Accent Line**
```html
<div class="scai-h1-wrapper" data-component="h1">
  <div class="scai-h1-accent"></div>
  <h1 class="scai-h1">Article Title Here</h1>
</div>
```

**Variation 3: With Category Tag**
```html
<div class="scai-h1-wrapper" data-component="h1">
  <span class="scai-category-tag">Category</span>
  <h1 class="scai-h1">Article Title Here</h1>
</div>
```

---

### 2.2 Featured Image

| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 3 |
| Aspect Ratio | 16:9 |

**Variation 1: Full Width**
```html
<figure class="scai-featured-image" data-component="featured-image">
  <img src="..." alt="Descriptive alt text" />
</figure>
```

**Variation 2: With Caption**
```html
<figure class="scai-featured-image scai-featured-image--captioned" data-component="featured-image">
  <img src="..." alt="Descriptive alt text" />
  <figcaption class="scai-image-caption">Image caption here</figcaption>
</figure>
```

**Variation 3: With Overlay Text**
```html
<figure class="scai-featured-image scai-featured-image--overlay" data-component="featured-image">
  <img src="..." alt="Descriptive alt text" />
  <div class="scai-image-overlay">
    <span class="scai-overlay-text">Featured</span>
  </div>
</figure>
```

---

### 2.3 Paragraph

| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 1 (standardized) |
| Word Count | 50-100 per paragraph |

```html
<p class="scai-paragraph" data-component="paragraph">
  Paragraph content here. Each paragraph should be 50-100 words 
  for optimal readability and SEO.
</p>
```

---

### 2.4 H2 (Section Header)

| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 3 |
| Max Characters | 60 |

**Variation 1: Simple**
```html
<h2 class="scai-h2" data-component="h2">Section Title</h2>
```

**Variation 2: With Underline**
```html
<h2 class="scai-h2 scai-h2--underlined" data-component="h2">
  Section Title
</h2>
```

**Variation 3: With Icon**
```html
<h2 class="scai-h2 scai-h2--with-icon" data-component="h2">
  <span class="scai-h2-icon">[icon]</span>
  Section Title
</h2>
```

---

### 2.5 H2 Image

| Property | Value |
|----------|-------|
| Required | No |
| Variations | 3 |
| Aspect Ratio | 16:9 or 4:3 |

**Variation 1: Inline**
```html
<figure class="scai-h2-image" data-component="h2-image">
  <img src="..." alt="..." />
</figure>
```

**Variation 2: Floated Right**
```html
<figure class="scai-h2-image scai-h2-image--float-right" data-component="h2-image">
  <img src="..." alt="..." />
</figure>
```

**Variation 3: With Border**
```html
<figure class="scai-h2-image scai-h2-image--bordered" data-component="h2-image">
  <img src="..." alt="..." />
</figure>
```

---

### 2.6 Table of Contents (TOC)

| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 3 |
| Position | After intro paragraph |

**Variation 1: Simple List**
```html
<nav class="scai-toc" data-component="toc">
  <h3 class="scai-toc-title">Table of Contents</h3>
  <ol class="scai-toc-list">
    <li><a href="#section-1">Section 1</a></li>
    <li><a href="#section-2">Section 2</a></li>
  </ol>
</nav>
```

**Variation 2: Boxed**
```html
<nav class="scai-toc scai-toc--boxed" data-component="toc">
  <h3 class="scai-toc-title">In This Article</h3>
  <ol class="scai-toc-list">
    <li><a href="#section-1">Section 1</a></li>
  </ol>
</nav>
```

**Variation 3: Collapsible**
```html
<details class="scai-toc scai-toc--collapsible" data-component="toc">
  <summary class="scai-toc-title">Table of Contents</summary>
  <ol class="scai-toc-list">
    <li><a href="#section-1">Section 1</a></li>
  </ol>
</details>
```

---

### 2.7 FAQ

| Property | Value |
|----------|-------|
| Required | No |
| Variations | 3 |
| Min Questions | 3 |
| Max Questions | 7 |

**Variation 1: Simple**
```html
<section class="scai-faq" data-component="faq">
  <h2 class="scai-faq-title">Frequently Asked Questions</h2>
  <div class="scai-faq-item">
    <h3 class="scai-faq-question">Question here?</h3>
    <p class="scai-faq-answer">Answer here.</p>
  </div>
</section>
```

**Variation 2: Accordion**
```html
<section class="scai-faq scai-faq--accordion" data-component="faq">
  <h2 class="scai-faq-title">FAQ</h2>
  <details class="scai-faq-item">
    <summary class="scai-faq-question">Question?</summary>
    <p class="scai-faq-answer">Answer.</p>
  </details>
</section>
```

**Variation 3: Schema Markup (JSON-LD)**
```html
<section class="scai-faq" data-component="faq">
  <h2 class="scai-faq-title">FAQ</h2>
  <!-- Visual FAQ items -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [...]
  }
  </script>
</section>
```

---

### 2.8 Closing Section

| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 3 |
| CRITICAL | Never use the word "Closing" or "Conclusion" in H2 |

**Variation 1: Summary**
```html
<section class="scai-closing" data-component="closing">
  <h2 class="scai-h2">Final Thoughts</h2>
  <p class="scai-paragraph">Summary paragraph...</p>
</section>
```

**Variation 2: With CTA**
```html
<section class="scai-closing scai-closing--with-cta" data-component="closing">
  <h2 class="scai-h2">What's Next?</h2>
  <p class="scai-paragraph">Summary...</p>
  <a href="#" class="scai-cta-button">Take Action</a>
</section>
```

**Variation 3: Key Takeaways Box**
```html
<section class="scai-closing scai-closing--takeaways" data-component="closing">
  <h2 class="scai-h2">Key Takeaways</h2>
  <ul class="scai-takeaways-list">
    <li>Takeaway 1</li>
    <li>Takeaway 2</li>
  </ul>
</section>
```

---

### 2.9 Meta Tags

| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 1 (standardized) |

```html
<head>
  <meta name="description" content="155 chars max..." />
  <meta name="keywords" content="keyword1, keyword2" />
  <meta property="og:title" content="Article Title" />
  <meta property="og:description" content="..." />
  <meta property="og:image" content="featured-image-url" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
```

---

### 2.10 Alt Text

| Property | Value |
|----------|-------|
| Required | Yes (for all images) |
| Max Length | 125 characters |
| Rules | Descriptive, no "image of" prefix |

---

## 3. Unique Components by Article Type

### 3.1 Affiliate Article

#### Product Card
| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 3 |

**Variation 1: Horizontal**
```html
<div class="scai-product-card scai-product-card--horizontal" data-component="product-card">
  <div class="scai-product-image">
    <img src="..." alt="Product Name" />
  </div>
  <div class="scai-product-details">
    <span class="scai-product-badge">Our Top Pick</span>
    <h3 class="scai-product-name">Product Name</h3>
    <p class="scai-product-description">Brief description...</p>
    <div class="scai-product-rating">[5 stars] (1,234 reviews)</div>
    <a href="#" class="scai-amazon-button">Check Price on Amazon</a>
  </div>
</div>
```

**Variation 2: Vertical**
```html
<div class="scai-product-card scai-product-card--vertical" data-component="product-card">
  <img src="..." alt="..." class="scai-product-image" />
  <h3 class="scai-product-name">Product Name</h3>
  <div class="scai-product-rating">[4 stars]</div>
  <a href="#" class="scai-amazon-button">View on Amazon</a>
</div>
```

**Variation 3: Compact Row**
```html
<div class="scai-product-card scai-product-card--compact" data-component="product-card">
  <img src="..." alt="..." />
  <span class="scai-product-name">Product Name</span>
  <span class="scai-product-price">$99.99</span>
  <a href="#" class="scai-amazon-button">Shop Now</a>
</div>
```

---

### 3.2 Comparison Article

#### Comparison Table
| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 3 |

**Variation 1: Standard Table**
```html
<div class="scai-comparison-table" data-component="comparison-table">
  <table>
    <thead>
      <tr>
        <th>Feature</th>
        <th>Product A</th>
        <th>Product B</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Price</td>
        <td>$99</td>
        <td>$149</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Variation 2: Card Comparison**
```html
<div class="scai-comparison-cards" data-component="comparison-table">
  <div class="scai-comparison-card">
    <h4>Product A</h4>
    <ul>
      <li>Feature 1</li>
    </ul>
  </div>
  <div class="scai-comparison-vs">VS</div>
  <div class="scai-comparison-card">
    <h4>Product B</h4>
    <ul>
      <li>Feature 1</li>
    </ul>
  </div>
</div>
```

**Variation 3: Winner Highlight**
```html
<div class="scai-comparison-table scai-comparison-table--winner" data-component="comparison-table">
  <table>
    <thead>
      <tr>
        <th></th>
        <th class="scai-winner">Product A [Winner]</th>
        <th>Product B</th>
      </tr>
    </thead>
    <!-- ... -->
  </table>
</div>
```

---

### 3.3 Recipe Article

#### Ingredients List
| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 3 |

**Variation 1: Simple List**
```html
<div class="scai-ingredients" data-component="ingredients">
  <h3 class="scai-ingredients-title">Ingredients</h3>
  <ul class="scai-ingredients-list">
    <li>2 cups flour</li>
    <li>1 tsp salt</li>
  </ul>
</div>
```

**Variation 2: Grouped**
```html
<div class="scai-ingredients scai-ingredients--grouped" data-component="ingredients">
  <h3 class="scai-ingredients-title">Ingredients</h3>
  <div class="scai-ingredients-group">
    <h4>For the Dough</h4>
    <ul>
      <li>2 cups flour</li>
    </ul>
  </div>
  <div class="scai-ingredients-group">
    <h4>For the Filling</h4>
    <ul>
      <li>1 lb beef</li>
    </ul>
  </div>
</div>
```

**Variation 3: With Checkboxes**
```html
<div class="scai-ingredients scai-ingredients--checkable" data-component="ingredients">
  <h3 class="scai-ingredients-title">Ingredients</h3>
  <ul class="scai-ingredients-list">
    <li>
      <label>
        <input type="checkbox" />
        <span>2 cups flour</span>
      </label>
    </li>
  </ul>
</div>
```

#### Instructions
| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 3 |

**Variation 1: Numbered Steps**
```html
<div class="scai-instructions" data-component="instructions">
  <h3 class="scai-instructions-title">Instructions</h3>
  <ol class="scai-instructions-list">
    <li>Preheat oven to 350°F.</li>
    <li>Mix dry ingredients.</li>
  </ol>
</div>
```

**Variation 2: With Images**
```html
<div class="scai-instructions scai-instructions--with-images" data-component="instructions">
  <div class="scai-instruction-step">
    <div class="scai-step-number">1</div>
    <div class="scai-step-content">
      <p>Preheat oven to 350°F.</p>
      <img src="..." alt="Preheating oven" />
    </div>
  </div>
</div>
```

**Variation 3: Timeline Style**
```html
<div class="scai-instructions scai-instructions--timeline" data-component="instructions">
  <div class="scai-instruction-step">
    <div class="scai-timeline-marker"></div>
    <div class="scai-step-content">
      <span class="scai-step-time">5 min</span>
      <p>Preheat oven...</p>
    </div>
  </div>
</div>
```

---

### 3.4 Review Article

#### Pros & Cons
| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 3 |

**Variation 1: Side by Side**
```html
<div class="scai-pros-cons" data-component="pros-cons">
  <div class="scai-pros">
    <h4 class="scai-pros-title">Pros</h4>
    <ul>
      <li>Great battery life</li>
    </ul>
  </div>
  <div class="scai-cons">
    <h4 class="scai-cons-title">Cons</h4>
    <ul>
      <li>Expensive</li>
    </ul>
  </div>
</div>
```

**Variation 2: Stacked**
```html
<div class="scai-pros-cons scai-pros-cons--stacked" data-component="pros-cons">
  <div class="scai-pros">
    <h4>What We Liked</h4>
    <ul>...</ul>
  </div>
  <div class="scai-cons">
    <h4>What Could Be Better</h4>
    <ul>...</ul>
  </div>
</div>
```

**Variation 3: With Icons**
```html
<div class="scai-pros-cons scai-pros-cons--icons" data-component="pros-cons">
  <ul class="scai-pros-list">
    <li><span class="scai-icon-pro">[+]</span> Great battery</li>
  </ul>
  <ul class="scai-cons-list">
    <li><span class="scai-icon-con">[-]</span> Expensive</li>
  </ul>
</div>
```

#### Rating Box
| Property | Value |
|----------|-------|
| Required | Yes |
| Variations | 3 |

**Variation 1: Stars**
```html
<div class="scai-rating-box" data-component="rating-box">
  <div class="scai-rating-score">4.5/5</div>
  <div class="scai-rating-stars">[4.5 stars]</div>
  <p class="scai-rating-verdict">Highly Recommended</p>
</div>
```

**Variation 2: Numeric**
```html
<div class="scai-rating-box scai-rating-box--numeric" data-component="rating-box">
  <div class="scai-rating-number">9.2</div>
  <div class="scai-rating-label">Excellent</div>
</div>
```

**Variation 3: Breakdown**
```html
<div class="scai-rating-box scai-rating-box--breakdown" data-component="rating-box">
  <div class="scai-rating-overall">
    <span class="scai-rating-score">4.5</span>
    <span class="scai-rating-label">Overall</span>
  </div>
  <div class="scai-rating-categories">
    <div class="scai-rating-category">
      <span>Performance</span>
      <div class="scai-rating-bar" style="width: 90%"></div>
    </div>
    <div class="scai-rating-category">
      <span>Value</span>
      <div class="scai-rating-bar" style="width: 75%"></div>
    </div>
  </div>
</div>
```

---

## 4. CSS Class Naming Convention

### 4.1 Prefix
All classes use `scai-` prefix to prevent conflicts.

### 4.2 BEM-like Structure
```
.scai-{component}
.scai-{component}--{modifier}
.scai-{component}__{element}
.scai-{component}__{element}--{modifier}
```

### 4.3 Examples
```css
.scai-product-card                    /* Block */
.scai-product-card--horizontal        /* Modifier */
.scai-product-card__image             /* Element */
.scai-product-card__image--featured   /* Element modifier */
```

---

## 5. Component Constraints Summary

| Component | Max Length | Required | Notes |
|-----------|------------|----------|-------|
| H1 | 60 chars | Yes | Include primary keyword |
| H2 | 60 chars | Yes | Support long-tail keywords |
| Paragraph | 50-100 words | Yes | 2-3 per H2 section |
| Meta Description | 155 chars | Yes | Compelling, keyword-rich |
| Alt Text | 125 chars | Yes | Descriptive, no "image of" |
| FAQ Questions | 3-7 items | No | Natural questions |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-24 | SCAI Team | Initial component specs |

