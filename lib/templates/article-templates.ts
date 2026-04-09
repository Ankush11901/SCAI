/**
 * Fixed HTML Templates for Article Components
 * 
 * These templates ensure 100% consistent HTML structure across all generations.
 * The AI only provides text content - it cannot modify the HTML structure.
 */

// ============================================================================
// UNIVERSAL COMPONENT TEMPLATES
// ============================================================================

export function buildH1(title: string): string {
  return `<h1 data-component="scai-h1" class="scai-h1">${escapeHtml(title)}</h1>`
}

export function buildFeaturedImage(src: string, alt: string): string {
  return `<figure data-component="scai-featured-image" class="scai-featured-image">
  <img src="${src}" alt="${escapeHtml(alt)}" loading="eager" />
</figure>`
}

export function buildH2(id: string, title: string): string {
  return `<h2 id="${id}" data-component="scai-h2" class="scai-h2">${escapeHtml(title)}</h2>`
}

export function buildH2Image(src: string, alt: string): string {
  return `<figure data-component="scai-h2-image" class="scai-h2-image">
  <img src="${src}" alt="${escapeHtml(alt)}" loading="lazy" />
</figure>`
}

export function buildParagraph(content: string): string {
  return `<p data-component="scai-paragraph" class="scai-paragraph">${content}</p>`
}

export function buildTableOfContents(sections: { id: string; title: string; subsections?: { id: string; title: string }[] }[]): string {
  let listItems = ''
  sections.forEach((section, index) => {
    const sectionNum = index + 1
    listItems += `    <li class="scai-toc-item">
      <a href="#${section.id}" class="scai-toc-link">${sectionNum}. ${escapeHtml(section.title)}</a>`
    
    if (section.subsections && section.subsections.length > 0) {
      listItems += `
      <ol class="scai-toc-sublist">`
      section.subsections.forEach((sub, subIndex) => {
        listItems += `
        <li class="scai-toc-subitem">
          <a href="#${sub.id}" class="scai-toc-sublink">${sectionNum}.${subIndex + 1}. ${escapeHtml(sub.title)}</a>
        </li>`
      })
      listItems += `
      </ol>`
    }
    
    listItems += `
    </li>
`
  })

  return `<nav data-component="scai-toc" class="scai-toc">
  <h3 class="scai-toc-title">Table of Contents</h3>
  <ol class="scai-toc-list">
${listItems}  </ol>
</nav>`
}

export function buildFAQ(items: { question: string; answer: string }[]): string {
  const faqItems = items.map(item => `  <div class="scai-faq-item">
    <h3 class="scai-faq-question">${escapeHtml(item.question)}</h3>
    <p class="scai-faq-answer">${item.answer}</p>
  </div>`).join('\n')

  return `<section data-component="scai-faq" class="scai-faq">
  <h2 class="scai-faq-title">Frequently Asked Questions</h2>
${faqItems}
</section>`
}

export function buildClosingSection(title: string, content: string): string {
  return `<section data-component="scai-closing" class="scai-closing">
  <h2 class="scai-h2">${escapeHtml(title)}</h2>
  <p class="scai-paragraph">${content}</p>
</section>`
}

// ============================================================================
// UNIQUE COMPONENT TEMPLATES BY ARTICLE TYPE
// ============================================================================

// --- AFFILIATE ARTICLE COMPONENTS ---

export function buildProductCard(product: {
  name: string
  description: string
  price: string
  rating: number
  amazonUrl: string
  imageUrl: string
  features: string[]
}): string {
  const stars = buildStarRating(product.rating)
  const featuresList = product.features.map(f => `      <li class="scai-product-feature">${escapeHtml(f)}</li>`).join('\n')

  return `<div data-component="scai-product-card" class="scai-product-card">
  <div class="scai-product-image-wrapper">
    <img src="${product.imageUrl}" alt="${escapeHtml(product.name)}" class="scai-product-image" />
  </div>
  <div class="scai-product-content">
    <h3 class="scai-product-name">${escapeHtml(product.name)}</h3>
    <div class="scai-product-rating">${stars} <span class="scai-rating-text">(${product.rating.toFixed(1)}/5)</span></div>
    <p class="scai-product-description">${product.description}</p>
    <ul class="scai-product-features">
${featuresList}
    </ul>
    <div class="scai-product-footer">
      <span class="scai-product-price">${escapeHtml(product.price)}</span>
      <a href="${product.amazonUrl}" target="_blank" rel="nofollow noopener" class="scai-product-cta">Check Price on Amazon</a>
    </div>
  </div>
</div>`
}

export function buildAffiliateDisclosure(): string {
  return `<div data-component="scai-affiliate-disclosure" class="scai-affiliate-disclosure">
  <p class="scai-disclosure-text">As an Amazon Associate, we earn from qualifying purchases. This means if you click on a link and make a purchase, we may receive a small commission at no extra cost to you.</p>
</div>`
}

// --- COMPARISON ARTICLE COMPONENTS ---

export function buildComparisonTable(products: {
  name: string
  features: Record<string, string>
}[], featureNames: string[]): string {
  const headerCells = products.map(p => `      <th class="scai-comparison-header">${escapeHtml(p.name)}</th>`).join('\n')
  
  const rows = featureNames.map(feature => {
    const cells = products.map(p => `      <td class="scai-comparison-cell">${escapeHtml(p.features[feature] || '-')}</td>`).join('\n')
    return `    <tr class="scai-comparison-row">
      <td class="scai-comparison-feature">${escapeHtml(feature)}</td>
${cells}
    </tr>`
  }).join('\n')

  return `<table data-component="scai-comparison-table" class="scai-comparison-table">
  <thead>
    <tr>
      <th class="scai-comparison-corner">Feature</th>
${headerCells}
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>`
}

export function buildVerdictBox(winner: string, reason: string): string {
  return `<div data-component="scai-verdict-box" class="scai-verdict-box">
  <h3 class="scai-verdict-title">Our Verdict</h3>
  <p class="scai-verdict-winner"><strong>Winner:</strong> ${escapeHtml(winner)}</p>
  <p class="scai-verdict-reason">${reason}</p>
</div>`
}

// --- HOW-TO ARTICLE COMPONENTS ---

export function buildStepByStep(steps: { number: number; title: string; content: string; imageUrl?: string }[]): string {
  const stepItems = steps.map(step => {
    const imageHtml = step.imageUrl 
      ? `\n    <figure class="scai-step-image-wrapper"><img src="${step.imageUrl}" alt="Step ${step.number}: ${escapeHtml(step.title)}" class="scai-step-image" /></figure>` 
      : ''
    return `  <div class="scai-step" data-step="${step.number}">
    <div class="scai-step-header">
      <span class="scai-step-number">${step.number}</span>
      <h3 class="scai-step-title">${escapeHtml(step.title)}</h3>
    </div>
    <p class="scai-step-content">${step.content}</p>${imageHtml}
  </div>`
  }).join('\n')

  return `<div data-component="scai-step-by-step" class="scai-step-by-step">
${stepItems}
</div>`
}

export function buildMaterialsList(items: string[]): string {
  const listItems = items.map(item => `    <li class="scai-material-item">${escapeHtml(item)}</li>`).join('\n')
  return `<div data-component="scai-materials-list" class="scai-materials-list">
  <h3 class="scai-materials-title">What You Will Need</h3>
  <ul class="scai-materials-items">
${listItems}
  </ul>
</div>`
}

export function buildTimeCostBox(time: string, cost: string, difficulty: string): string {
  return `<div data-component="scai-time-cost-box" class="scai-time-cost-box">
  <div class="scai-tcb-item">
    <span class="scai-tcb-label">Time Required</span>
    <span class="scai-tcb-value">${escapeHtml(time)}</span>
  </div>
  <div class="scai-tcb-item">
    <span class="scai-tcb-label">Estimated Cost</span>
    <span class="scai-tcb-value">${escapeHtml(cost)}</span>
  </div>
  <div class="scai-tcb-item">
    <span class="scai-tcb-label">Difficulty</span>
    <span class="scai-tcb-value">${escapeHtml(difficulty)}</span>
  </div>
</div>`
}

// --- LISTICLE ARTICLE COMPONENTS ---

export function buildNumberedList(items: { number: number; title: string; content: string; imageUrl?: string }[]): string {
  const listItems = items.map(item => {
    const imageHtml = item.imageUrl 
      ? `\n    <figure class="scai-list-image-wrapper"><img src="${item.imageUrl}" alt="${escapeHtml(item.title)}" class="scai-list-image" /></figure>` 
      : ''
    return `  <div class="scai-numbered-item" data-number="${item.number}">
    <div class="scai-item-header">
      <span class="scai-item-number">${item.number}</span>
      <h3 class="scai-item-title">${escapeHtml(item.title)}</h3>
    </div>
    <p class="scai-item-content">${item.content}</p>${imageHtml}
  </div>`
  }).join('\n')

  return `<div data-component="scai-numbered-list" class="scai-numbered-list">
${listItems}
</div>`
}

// --- RECIPE ARTICLE COMPONENTS ---

export function buildRecipeCard(recipe: {
  name: string
  prepTime: string
  cookTime: string
  totalTime: string
  servings: string
  calories?: string
}): string {
  const caloriesHtml = recipe.calories 
    ? `\n    <div class="scai-recipe-meta-item"><span class="scai-meta-label">Calories</span><span class="scai-meta-value">${escapeHtml(recipe.calories)}</span></div>` 
    : ''
  return `<div data-component="scai-recipe-card" class="scai-recipe-card">
  <h3 class="scai-recipe-name">${escapeHtml(recipe.name)}</h3>
  <div class="scai-recipe-meta">
    <div class="scai-recipe-meta-item"><span class="scai-meta-label">Prep Time</span><span class="scai-meta-value">${escapeHtml(recipe.prepTime)}</span></div>
    <div class="scai-recipe-meta-item"><span class="scai-meta-label">Cook Time</span><span class="scai-meta-value">${escapeHtml(recipe.cookTime)}</span></div>
    <div class="scai-recipe-meta-item"><span class="scai-meta-label">Total Time</span><span class="scai-meta-value">${escapeHtml(recipe.totalTime)}</span></div>
    <div class="scai-recipe-meta-item"><span class="scai-meta-label">Servings</span><span class="scai-meta-value">${escapeHtml(recipe.servings)}</span></div>${caloriesHtml}
  </div>
</div>`
}

export function buildIngredientsList(sections: { title?: string; items: string[] }[]): string {
  const sectionsHtml = sections.map(section => {
    const titleHtml = section.title ? `  <h4 class="scai-ingredients-section-title">${escapeHtml(section.title)}</h4>\n` : ''
    const itemsHtml = section.items.map(item => `    <li class="scai-ingredient-item">${escapeHtml(item)}</li>`).join('\n')
    return `${titleHtml}  <ul class="scai-ingredients-items">
${itemsHtml}
  </ul>`
  }).join('\n')

  return `<div data-component="scai-ingredients-list" class="scai-ingredients-list">
  <h3 class="scai-ingredients-title">Ingredients</h3>
${sectionsHtml}
</div>`
}

export function buildInstructions(steps: { number: number; instruction: string }[]): string {
  const stepsHtml = steps.map(step => `  <li class="scai-instruction-item" data-step="${step.number}">
    <span class="scai-instruction-number">${step.number}.</span>
    <span class="scai-instruction-text">${step.instruction}</span>
  </li>`).join('\n')

  return `<div data-component="scai-instructions" class="scai-instructions">
  <h3 class="scai-instructions-title">Instructions</h3>
  <ol class="scai-instructions-list">
${stepsHtml}
  </ol>
</div>`
}

export function buildNutritionFacts(facts: Record<string, string>): string {
  const factsHtml = Object.entries(facts).map(([label, value]) => 
    `    <div class="scai-nutrition-row"><span class="scai-nutrition-label">${escapeHtml(label)}</span><span class="scai-nutrition-value">${escapeHtml(value)}</span></div>`
  ).join('\n')

  return `<div data-component="scai-nutrition-facts" class="scai-nutrition-facts">
  <h3 class="scai-nutrition-title">Nutrition Facts</h3>
  <div class="scai-nutrition-grid">
${factsHtml}
  </div>
</div>`
}

// --- REVIEW ARTICLE COMPONENTS ---

export function buildRatingSection(overall: number, categories: { name: string; score: number }[]): string {
  const categoriesHtml = categories.map(cat => 
    `    <div class="scai-rating-category">
      <span class="scai-rating-cat-name">${escapeHtml(cat.name)}</span>
      <div class="scai-rating-bar-wrapper">
        <div class="scai-rating-bar" style="width: ${cat.score * 10}%"></div>
      </div>
      <span class="scai-rating-cat-score">${cat.score}/10</span>
    </div>`
  ).join('\n')

  return `<div data-component="scai-rating-section" class="scai-rating-section">
  <div class="scai-overall-rating">
    <span class="scai-overall-score">${overall.toFixed(1)}</span>
    <span class="scai-overall-label">Overall Score</span>
    <div class="scai-overall-stars">${buildStarRating(overall / 2)}</div>
  </div>
  <div class="scai-rating-breakdown">
${categoriesHtml}
  </div>
</div>`
}

export function buildProsCons(pros: string[], cons: string[]): string {
  const prosHtml = pros.map(p => `      <li class="scai-pro-item">${escapeHtml(p)}</li>`).join('\n')
  const consHtml = cons.map(c => `      <li class="scai-con-item">${escapeHtml(c)}</li>`).join('\n')

  return `<div data-component="scai-pros-cons" class="scai-pros-cons">
  <div class="scai-pros">
    <h4 class="scai-pros-title">Pros</h4>
    <ul class="scai-pros-list">
${prosHtml}
    </ul>
  </div>
  <div class="scai-cons">
    <h4 class="scai-cons-title">Cons</h4>
    <ul class="scai-cons-list">
${consHtml}
    </ul>
  </div>
</div>`
}

export function buildSpecificationsTable(specs: Record<string, string>): string {
  const rowsHtml = Object.entries(specs).map(([label, value]) =>
    `    <tr class="scai-spec-row">
      <td class="scai-spec-label">${escapeHtml(label)}</td>
      <td class="scai-spec-value">${escapeHtml(value)}</td>
    </tr>`
  ).join('\n')

  return `<table data-component="scai-specifications" class="scai-specifications">
  <tbody>
${rowsHtml}
  </tbody>
</table>`
}

// --- COMMERCIAL ARTICLE COMPONENTS ---

export function buildFeatureList(features: { title: string; description: string }[]): string {
  const featuresHtml = features.map(f => `  <div class="scai-feature-item">
    <h4 class="scai-feature-title">${escapeHtml(f.title)}</h4>
    <p class="scai-feature-description">${f.description}</p>
  </div>`).join('\n')

  return `<div data-component="scai-feature-list" class="scai-feature-list">
${featuresHtml}
</div>`
}

export function buildPricingTable(plans: { name: string; price: string; features: string[]; highlighted?: boolean }[]): string {
  const plansHtml = plans.map(plan => {
    const highlightedClass = plan.highlighted ? ' scai-plan-highlighted' : ''
    const featuresHtml = plan.features.map(f => `        <li class="scai-plan-feature">${escapeHtml(f)}</li>`).join('\n')
    return `    <div class="scai-pricing-plan${highlightedClass}">
      <h4 class="scai-plan-name">${escapeHtml(plan.name)}</h4>
      <div class="scai-plan-price">${escapeHtml(plan.price)}</div>
      <ul class="scai-plan-features">
${featuresHtml}
      </ul>
    </div>`
  }).join('\n')

  return `<div data-component="scai-pricing-table" class="scai-pricing-table">
${plansHtml}
</div>`
}

export function buildCallToAction(text: string, buttonText: string, url: string): string {
  return `<div data-component="scai-cta" class="scai-cta">
  <p class="scai-cta-text">${text}</p>
  <a href="${url}" class="scai-cta-button">${escapeHtml(buttonText)}</a>
</div>`
}

// --- LOCAL ARTICLE COMPONENTS ---

export function buildLocalBusinessCard(business: {
  name: string
  address: string
  phone: string
  hours: string
  rating?: number
  website?: string
}): string {
  const ratingHtml = business.rating 
    ? `\n  <div class="scai-business-rating">${buildStarRating(business.rating)} <span>(${business.rating.toFixed(1)})</span></div>` 
    : ''
  const websiteHtml = business.website 
    ? `\n  <a href="${business.website}" target="_blank" rel="noopener" class="scai-business-website">Visit Website</a>` 
    : ''

  return `<div data-component="scai-local-business-card" class="scai-local-business-card">
  <h3 class="scai-business-name">${escapeHtml(business.name)}</h3>${ratingHtml}
  <p class="scai-business-address">${escapeHtml(business.address)}</p>
  <p class="scai-business-phone">${escapeHtml(business.phone)}</p>
  <p class="scai-business-hours">${escapeHtml(business.hours)}</p>${websiteHtml}
</div>`
}

export function buildMapEmbed(location: string): string {
  const encodedLocation = encodeURIComponent(location)
  return `<div data-component="scai-map-embed" class="scai-map-embed">
  <iframe 
    src="https://www.google.com/maps?q=${encodedLocation}&output=embed" 
    width="100%" 
    height="300" 
    style="border:0; border-radius: 8px;" 
    allowfullscreen="" 
    loading="lazy" 
    referrerpolicy="no-referrer-when-downgrade"
    title="Map showing ${escapeHtml(location)}">
  </iframe>
</div>`
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildStarRating(rating: number): string {
  const fullStars = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)
  
  let stars = ''
  for (let i = 0; i < fullStars; i++) {
    stars += '<span class="scai-star scai-star-full"></span>'
  }
  if (hasHalf) {
    stars += '<span class="scai-star scai-star-half"></span>'
  }
  for (let i = 0; i < emptyStars; i++) {
    stars += '<span class="scai-star scai-star-empty"></span>'
  }
  return `<span class="scai-stars">${stars}</span>`
}

// ============================================================================
// FULL ARTICLE BUILDER
// ============================================================================

export interface ArticleContent {
  title: string
  featuredImageAlt: string
  sections: {
    id: string
    title: string
    paragraphs: string[]
    imageAlt?: string
  }[]
  faq?: { question: string; answer: string }[]
  closingTitle: string
  closingContent: string
  // Type-specific content
  products?: any[]
  comparisonProducts?: any[]
  steps?: any[]
  materials?: string[]
  listItems?: any[]
  recipe?: any
  ingredients?: any
  instructions?: any
  nutrition?: any
  rating?: any
  pros?: string[]
  cons?: string[]
  specs?: any
  features?: any[]
  pricing?: any[]
  cta?: any
  business?: any
}

export function buildArticleHtml(
  articleType: string,
  content: ArticleContent,
  images: Record<string, string>
): string {
  const parts: string[] = []

  // H1
  parts.push(buildH1(content.title))

  // Affiliate disclosure (if affiliate)
  if (articleType === 'affiliate') {
    parts.push(buildAffiliateDisclosure())
  }

  // Featured image
  const featuredImageUrl = images['featured'] || 'https://placehold.co/800x400/f3f4f6/9ca3af?text=Loading'
  parts.push(buildFeaturedImage(featuredImageUrl, content.featuredImageAlt))

  // Intro paragraph (first section before TOC)
  if (content.sections.length > 0 && content.sections[0].paragraphs.length > 0) {
    parts.push(buildParagraph(content.sections[0].paragraphs[0]))
  }

  // Table of Contents
  const tocSections = content.sections.slice(1).map(s => ({ id: s.id, title: s.title }))
  if (tocSections.length > 0) {
    parts.push(buildTableOfContents(tocSections))
  }

  // Type-specific components before main content
  if (articleType === 'how-to' && content.materials) {
    parts.push(buildMaterialsList(content.materials))
  }
  if (articleType === 'recipe' && content.recipe) {
    parts.push(buildRecipeCard(content.recipe))
  }
  if (articleType === 'recipe' && content.ingredients) {
    parts.push(buildIngredientsList(content.ingredients))
  }

  // Main content sections
  content.sections.slice(1).forEach((section, idx) => {
    parts.push(buildH2(section.id, section.title))
    
    // H2 image
    const imageKey = `section-${idx}`
    const imageUrl = images[imageKey] || 'https://placehold.co/800x400/f3f4f6/9ca3af?text=Loading'
    if (section.imageAlt) {
      parts.push(buildH2Image(imageUrl, section.imageAlt))
    }

    // Paragraphs
    section.paragraphs.forEach(p => {
      parts.push(buildParagraph(p))
    })

    // Type-specific inline components
    if (articleType === 'affiliate' && content.products && content.products[idx]) {
      parts.push(buildProductCard(content.products[idx]))
    }
  })

  // Type-specific components after main content
  if (articleType === 'comparison' && content.comparisonProducts) {
    const features = Object.keys(content.comparisonProducts[0]?.features || {})
    parts.push(buildComparisonTable(content.comparisonProducts, features))
  }
  if (articleType === 'how-to' && content.steps) {
    parts.push(buildStepByStep(content.steps))
  }
  if (articleType === 'listicle' && content.listItems) {
    parts.push(buildNumberedList(content.listItems))
  }
  if (articleType === 'recipe' && content.instructions) {
    parts.push(buildInstructions(content.instructions))
  }
  if (articleType === 'recipe' && content.nutrition) {
    parts.push(buildNutritionFacts(content.nutrition))
  }
  if (articleType === 'review' && content.rating) {
    parts.push(buildRatingSection(content.rating.overall, content.rating.categories))
  }
  if (articleType === 'review' && content.pros && content.cons) {
    parts.push(buildProsCons(content.pros, content.cons))
  }
  if (articleType === 'review' && content.specs) {
    parts.push(buildSpecificationsTable(content.specs))
  }
  if (articleType === 'commercial' && content.features) {
    parts.push(buildFeatureList(content.features))
  }
  if (articleType === 'commercial' && content.pricing) {
    parts.push(buildPricingTable(content.pricing))
  }
  if (articleType === 'commercial' && content.cta) {
    parts.push(buildCallToAction(content.cta.text, content.cta.buttonText, content.cta.url))
  }
  if (articleType === 'local' && content.business) {
    parts.push(buildLocalBusinessCard(content.business))
  }

  // FAQ
  if (content.faq && content.faq.length > 0) {
    parts.push(buildFAQ(content.faq))
  }

  // Closing section
  parts.push(buildClosingSection(content.closingTitle, content.closingContent))

  return parts.join('\n\n')
}
