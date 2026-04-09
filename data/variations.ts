/**
 * Component Variations
 *
 * This file contains the 21 specialized components extracted from HTML reference document.
 * BASE_STYLES are injected by the visualize page renderer, not stored here.
 */

export interface ComponentVariation {
      name: string;
      html: string;
      css?: string;
}

export const COMPONENT_VARIATIONS: Record<string, ComponentVariation[]> = {
      // ══════════════════════════════════════════════════════════════════════════
      // EXTRACTED COMPONENTS (from HTML reference document - 21 total)
      // ══════════════════════════════════════════════════════════════════════════

      // TOC
      toc: [
            // 1. Clean Studio TOC
            {
                  name: "Clean Studio",
                  html: `<nav class="scai-toc-clean" data-component="scai-table-of-contents" id="scai-q-toc-1">
<div class="scai-toc-title">Table of Contents</div>
<ul class="scai-toc-list">
<li><a href="#section1">Introduction to the Topic</a></li>
<li><a href="#section2">Key Features and Benefits</a></li>
<li><a href="#section3">How to Get Started</a></li>
<li><a href="#section4">Frequently Asked Questions</a></li>
</ul>
</nav>`,
                  css: `/* Clean Studio TOC */
.scai-toc-clean { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
.scai-toc-clean .scai-toc-title { font-size: 1.25rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; padding: 1.25rem 1.5rem 0.75rem; }
.scai-toc-clean .scai-toc-list { list-style: none; padding: 0 1.5rem 1.25rem; margin: 0; }
.scai-toc-clean .scai-toc-list li { padding: 0.5rem 0; }
.scai-toc-clean .scai-toc-list a { color: #525252; text-decoration: none; font-size: 1rem; font-weight: 500; transition: color 0.2s; }
.scai-toc-clean .scai-toc-list a:hover { color: #171717; }`,
            },// 8. Airy Premium TOC
            {
                  name: "Airy Premium",
                  html: `<nav class="scai-toc-airy" data-component="scai-table-of-contents" id="scai-q-toc-8">
<div class="scai-toc-title">Table of Contents</div>
<ul class="scai-toc-list">
<li><a href="#section1">Introduction to the Topic</a></li>
<li><a href="#section2">Key Features and Benefits</a></li>
<li><a href="#section3">How to Get Started</a></li>
<li><a href="#section4">Frequently Asked Questions</a></li>
</ul>
</nav>`,
                  css: `/* Airy Premium TOC */
.scai-toc-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); padding: 2rem; }
.scai-toc-airy .scai-toc-title { font-size: 1.25rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding-bottom: 1.5rem; margin-bottom: 1rem; border-bottom: 1px solid #f5f5f5; }
.scai-toc-airy .scai-toc-list { list-style: none; padding: 0; margin: 0; }
.scai-toc-airy .scai-toc-list li { padding: 0.75rem 0; }
.scai-toc-airy .scai-toc-list a { color: #525252; text-decoration: none; font-size: 1rem; font-weight: 500; transition: all 0.3s; display: inline-block; }
.scai-toc-airy .scai-toc-list a:hover { color: #171717; transform: translateX(8px); }`,
            },// 10. Gradient Glow TOC
            {
                  name: "Gradient Glow",
                  html: `<nav class="scai-toc-glow" data-component="scai-table-of-contents" id="scai-q-toc-10">
<div class="scai-toc-title">Table of Contents</div>
<ul class="scai-toc-list">
<li><a href="#section1">Introduction to the Topic</a></li>
<li><a href="#section2">Key Features and Benefits</a></li>
<li><a href="#section3">How to Get Started</a></li>
<li><a href="#section4">Frequently Asked Questions</a></li>
</ul>
</nav>`,
                  css: `/* Gradient Glow TOC */
.scai-toc-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-toc-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-toc-glow .scai-toc-title { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.25rem 1.5rem; font-size: 1.25rem; font-weight: 700; border-bottom: 1px solid #f5f5f5; }
.scai-toc-glow .scai-toc-list { list-style: none; padding: 1.25rem 1.5rem; margin: 0; }
.scai-toc-glow .scai-toc-list li { padding: 0.5rem 0; }
.scai-toc-glow .scai-toc-list a { color: #525252; text-decoration: none; font-size: 1rem; font-weight: 500; transition: all 0.2s; display: inline-block; }
.scai-toc-glow .scai-toc-list a:hover { color: #171717; transform: translateX(4px); }`,
            },// 13. Soft Stone TOC
            {
                  name: "Soft Stone",
                  html: `<nav class="scai-toc-stone" data-component="scai-table-of-contents" id="scai-q-toc-13">
<div class="scai-toc-title">Table of Contents</div>
<ul class="scai-toc-list">
<li><a href="#section1">Introduction to the Topic</a></li>
<li><a href="#section2">Key Features and Benefits</a></li>
<li><a href="#section3">How to Get Started</a></li>
<li><a href="#section4">Frequently Asked Questions</a></li>
</ul>
</nav>`,
                  css: `/* Soft Stone TOC */
.scai-toc-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-toc-stone .scai-toc-title { font-size: 1.25rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e7e5e4; }
.scai-toc-stone .scai-toc-list { list-style: none; padding: 1.25rem 1.5rem; margin: 0; }
.scai-toc-stone .scai-toc-list li { padding: 0.5rem 0; position: relative; padding-left: 1rem; }
.scai-toc-stone .scai-toc-list li::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 4px; height: 4px; background: #a8a29e; border-radius: 50%; }
.scai-toc-stone .scai-toc-list a { color: #78716c; text-decoration: none; font-size: 1rem; font-weight: 500; transition: color 0.2s; }
.scai-toc-stone .scai-toc-list a:hover { color: #44403c; }`,
            }],

      // FAQ
      faq: [
            // 1. Clean Studio FAQ
            {
                  name: "Clean Studio",
                  html: `<div class="scai-faq-studio" data-component="scai-faq-section" id="scai-q-faq-section-1">
<h2 class="scai-faq-h2" data-component="scai-faq-h2">Frequently Asked Questions</h2>
<div class="scai-faq-item">
<h3 class="scai-faq-h3" data-component="scai-faq-h3">What are the primary benefits?</h3>
<p class="scai-faq-answer" data-component="scai-faq-answer">Significant improvement in operational efficiency, allowing your team to automate repetitive tasks and save time.</p>
</div>
<div class="scai-faq-item">
<h3 class="scai-faq-h3" data-component="scai-faq-h3">How long does shipping take?</h3>
<p class="scai-faq-answer" data-component="scai-faq-answer">Standard shipping takes 3-5 business days. Expedited options are available for 24-48 hour delivery.</p>
</div>
</div>`,
                  css: `/* Clean Studio FAQ */
.scai-faq-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-faq-studio .scai-faq-h2 { font-size: 1.5rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-faq-studio .scai-faq-item { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f5f5f5; }
.scai-faq-studio .scai-faq-item:last-child { border-bottom: none; }
.scai-faq-studio .scai-faq-h3 { font-size: 1.0625rem; font-weight: 600; color: #171717; margin: 0 0 0.5rem 0; }
.scai-faq-studio .scai-faq-answer { font-size: 1rem; color: #525252; margin: 0; line-height: 1.6; }`,
            },// 8. Airy Premium FAQ
            {
                  name: "Airy Premium",
                  html: `<div class="scai-faq-airy" data-component="scai-faq-section" id="scai-q-faq-section-8">
<h2 class="scai-faq-h2" data-component="scai-faq-h2">FAQ</h2>
<div class="scai-faq-item">
<h3 class="scai-faq-h3" data-component="scai-faq-h3">What are the primary benefits?</h3>
<p class="scai-faq-answer" data-component="scai-faq-answer">Significant improvement in operational efficiency. Automate repetitive tasks and save valuable time.</p>
</div>
<div class="scai-faq-item">
<h3 class="scai-faq-h3" data-component="scai-faq-h3">How long does shipping take?</h3>
<p class="scai-faq-answer" data-component="scai-faq-answer">Standard shipping takes 3-5 business days. Expedited options available within 24-48 hours.</p>
</div>
</div>`,
                  css: `/* Airy Premium FAQ */
.scai-faq-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-faq-airy .scai-faq-h2 { font-size: 1.5rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; margin: 0; }
.scai-faq-airy .scai-faq-item { padding: 1.25rem 2rem; border-bottom: 1px solid #f5f5f5; }
.scai-faq-airy .scai-faq-item:last-child { border-bottom: none; padding-bottom: 2rem; }
.scai-faq-airy .scai-faq-h3 { font-size: 1.0625rem; font-weight: 600; color: #171717; margin: 0 0 0.5rem 0; }
.scai-faq-airy .scai-faq-answer { font-size: 1rem; color: #525252; margin: 0; line-height: 1.6; }`,
            },// 10. Gradient Glow FAQ
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-faq-glow" data-component="scai-faq-section" id="scai-q-faq-section-10">
<h2 class="scai-faq-h2" data-component="scai-faq-h2">FAQ</h2>
<div class="scai-faq-item">
<h3 class="scai-faq-h3" data-component="scai-faq-h3">What are the primary benefits?</h3>
<p class="scai-faq-answer" data-component="scai-faq-answer">Significant improvement in operational efficiency. Automate repetitive tasks and save valuable time.</p>
</div>
<div class="scai-faq-item">
<h3 class="scai-faq-h3" data-component="scai-faq-h3">How long does shipping take?</h3>
<p class="scai-faq-answer" data-component="scai-faq-answer">Standard shipping takes 3-5 business days. Expedited options available within 24-48 hours.</p>
</div>
</div>`,
                  css: `/* Gradient Glow FAQ */
.scai-faq-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-faq-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-faq-glow .scai-faq-h2 { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.25rem 1.5rem; font-size: 1.5rem; font-weight: 700; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-faq-glow .scai-faq-item { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f5f5f5; }
.scai-faq-glow .scai-faq-item:last-child { border-bottom: none; }
.scai-faq-glow .scai-faq-h3 { font-size: 1.0625rem; font-weight: 600; color: #171717; margin: 0 0 0.5rem 0; }
.scai-faq-glow .scai-faq-answer { font-size: 1rem; color: #525252; margin: 0; line-height: 1.6; }`,
            },// 13. Soft Stone FAQ
            {
                  name: "Soft Stone",
                  html: `<div class="scai-faq-stone" data-component="scai-faq-section" id="scai-q-faq-section-13">
<h2 class="scai-faq-h2" data-component="scai-faq-h2">Frequently Asked Questions</h2>
<div class="scai-faq-item">
<h3 class="scai-faq-h3" data-component="scai-faq-h3">What are the primary benefits?</h3>
<p class="scai-faq-answer" data-component="scai-faq-answer">Significant improvement in operational efficiency. Automate repetitive tasks and save valuable time.</p>
</div>
<div class="scai-faq-item">
<h3 class="scai-faq-h3" data-component="scai-faq-h3">How long does shipping take?</h3>
<p class="scai-faq-answer" data-component="scai-faq-answer">Standard shipping takes 3-5 business days. Expedited options available within 24-48 hours.</p>
</div>
</div>`,
                  css: `/* Soft Stone FAQ */
.scai-faq-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-faq-stone .scai-faq-h2 { font-size: 1.5rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-faq-stone .scai-faq-item { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e7e5e4; }
.scai-faq-stone .scai-faq-item:last-child { border-bottom: none; }
.scai-faq-stone .scai-faq-h3 { font-size: 1.0625rem; font-weight: 600; color: #57534e; margin: 0 0 0.5rem 0; }
.scai-faq-stone .scai-faq-answer { font-size: 1rem; color: #78716c; margin: 0; line-height: 1.6; }`,
            }],

      // PRODUCT-CARD (Responsive: Horizontal on desktop, Vertical on mobile)
      "product-card": [
            // 1. Clean Studio - Modern, rounded, subtle shadow
            {
                  name: "Clean Studio",
                  html: `<div class="scai-pc-clean" data-component="scai-product-card" id="scai-q-product-card-1">
<div class="scai-pc-image-wrap">
<img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop" alt="Product" class="scai-pc-img">
</div>
<div class="scai-pc-content">
<div class="scai-pc-header">
<span class="scai-pc-badge">{{BADGE}}</span>
<h3 class="scai-pc-title" data-component="scai-product-card-name">Premium Wireless Headphones</h3>
</div>
<div class="scai-pc-rating" data-component="scai-product-card-rating">
<span class="scai-pc-rating-num">4.8</span>
<span class="scai-pc-stars"><svg class="scai-pc-star scai-pc-star-active" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-pc-star scai-pc-star-active" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-pc-star scai-pc-star-active" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-pc-star scai-pc-star-active" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-pc-star scai-pc-star-inactive" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>
<span class="scai-pc-rating-count">(15,420)</span>
</div>
<p class="scai-pc-desc">Industry-leading noise cancellation with dual processors and 8 mics. Lightweight design for all-day comfort.</p>
<div class="scai-pc-footer">
<div class="scai-pc-price-row">
<span class="scai-pc-currency">USD</span>
<span class="scai-pc-price" data-component="scai-product-card-price">$398.00</span>
</div>
<a href="#" class="scai-pc-cta" data-component="scai-product-card-cta" target="_blank" rel="noopener noreferrer">View on Amazon</a>
</div>
</div>
</div>`,
                  css: `/* Clean Studio - Modern minimal */
.scai-pc-clean { display: flex; flex-direction: column; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.3s ease; }
@media (min-width: 768px) { .scai-pc-clean { flex-direction: row; } }
.scai-pc-clean .scai-pc-image-wrap { position: relative; overflow: hidden; background: rgba(250,250,250,0.5); min-height: 240px; }
@media (min-width: 768px) { .scai-pc-clean .scai-pc-image-wrap { width: 40%; min-height: 340px; } }
.scai-pc-clean .scai-pc-img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; transition: transform 0.7s ease; }
.scai-pc-clean:hover .scai-pc-img { transform: scale(1.05); }
.scai-pc-clean .scai-pc-content { flex: 1; padding: 1.5rem 2rem; display: flex; flex-direction: column; justify-content: space-between; border-left: 1px solid rgba(229,231,235,0.5); }
.scai-pc-clean .scai-pc-header { margin-bottom: 1rem; }
.scai-pc-clean .scai-pc-badge { display: inline-flex; align-items: center; background: #171717; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; padding: 4px 10px; border-radius: 9999px; margin-bottom: 0.75rem; }
.scai-pc-clean .scai-pc-title { font-size: 1.5rem; font-weight: 700; color: #171717; line-height: 1.1; letter-spacing: -0.025em; }
.scai-pc-clean .scai-pc-rating { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
.scai-pc-clean .scai-pc-rating-num { font-size: 0.875rem; font-weight: 700; color: #171717; }
.scai-pc-clean .scai-pc-stars { display: flex; align-items: center; gap: -2px; }
.scai-pc-clean .scai-pc-star { width: 14px; height: 14px; margin-left: -1px; }
.scai-pc-clean .scai-pc-star-active { color: #171717; }
.scai-pc-clean .scai-pc-star-inactive { color: #e5e5e5; }
.scai-pc-clean .scai-pc-rating-count { font-size: 11px; font-weight: 500; letter-spacing: 0.025em; color: #737373; }
.scai-pc-clean .scai-pc-desc { color: #737373; font-size: 14px; line-height: 1.6; margin-bottom: 1.5rem; }
.scai-pc-clean .scai-pc-footer { margin-top: auto; padding-top: 2rem; }
.scai-pc-clean .scai-pc-price-row { display: flex; align-items: baseline; gap: 0.25rem; margin-bottom: 1.5rem; }
.scai-pc-clean .scai-pc-currency { color: #737373; font-size: 0.875rem; font-weight: 500; }
.scai-pc-clean .scai-pc-price { font-size: 1.25rem; font-weight: 700; color: #171717; }
.scai-pc-clean .scai-pc-cta { display: flex; align-items: center; justify-content: center; background: #171717; color: #fff; text-align: center; padding: 14px 24px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; border-radius: 8px; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.scai-pc-clean .scai-pc-cta:hover { background: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }`,
            },// 8. Airy Premium - Soft, elevated
            {
                  name: "Airy Premium",
                  html: `<div class="scai-pc-airy" data-component="scai-product-card" id="scai-q-product-card-8">
<div class="scai-pc-inner">
<div class="scai-pc-image-wrap">
<img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop" alt="Product" class="scai-pc-img">
</div>
<div class="scai-pc-content">
<div class="scai-pc-header">
<span class="scai-pc-badge">{{BADGE}}</span>
<h3 class="scai-pc-title" data-component="scai-product-card-name">Sony WH-1000XM5</h3>
</div>
<div class="scai-pc-rating" data-component="scai-product-card-rating">
<span class="scai-pc-rating-num">4.8</span>
<span class="scai-pc-stars"><svg class="scai-star" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-star" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-star" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-star" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-star scai-star-inactive" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>
<span class="scai-pc-rating-text">(15,420)</span>
</div>
<p class="scai-pc-desc">Industry-leading noise cancellation with dual processors and 8 mics. Lightweight design for all-day comfort.</p>
<div class="scai-pc-footer">
<div class="scai-pc-price-row" data-component="scai-product-card-price">
<span class="scai-pc-price-usd">USD</span>
<span class="scai-pc-price">$398.00</span>
</div>
<a href="#" class="scai-pc-cta" data-component="scai-product-card-cta" target="_blank" rel="noopener noreferrer">View on Amazon</a>
</div>
</div>
</div>
</div>`,
                  css: `/* Airy Premium - Soft, elevated aesthetic */
.scai-pc-airy { background: #fff; border: 1px solid #f5f5f5; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 40px rgba(115,115,115,0.08); }
.scai-pc-airy .scai-pc-inner { display: flex; flex-direction: column; }
@media (min-width: 768px) { .scai-pc-airy .scai-pc-inner { flex-direction: row; } }
.scai-pc-airy .scai-pc-image-wrap { background: linear-gradient(to bottom right, #fff, #fafafa); position: relative; overflow: hidden; min-height: 240px; }
@media (min-width: 768px) { .scai-pc-airy .scai-pc-image-wrap { width: 40%; min-height: 340px; } }
.scai-pc-airy .scai-pc-img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; }
.scai-pc-airy .scai-pc-content { flex: 1; padding: 1.5rem 2rem; display: flex; flex-direction: column; justify-content: space-between; }
.scai-pc-airy .scai-pc-header { margin-bottom: 1rem; }
.scai-pc-airy .scai-pc-badge { display: inline-flex; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; padding: 4px 10px; border-radius: 9999px; background: #f5f5f5; color: #737373; margin-bottom: 0.75rem; }
.scai-pc-airy .scai-pc-title { font-size: 1.25rem; font-weight: 700; color: #171717; line-height: 1.1; letter-spacing: -0.025em; }
.scai-pc-airy .scai-pc-rating { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
.scai-pc-airy .scai-pc-rating-num { font-size: 0.875rem; font-weight: 700; color: #171717; }
.scai-pc-airy .scai-pc-stars { display: flex; align-items: center; }
.scai-pc-airy .scai-star { width: 14px; height: 14px; color: #171717; }
.scai-pc-airy .scai-star-inactive { color: #e5e5e5; }
.scai-pc-airy .scai-pc-rating-text { font-size: 11px; font-weight: 500; color: #737373; letter-spacing: 0.05em; }
.scai-pc-airy .scai-pc-desc { color: #737373; font-size: 0.875rem; line-height: 1.6; margin-bottom: 1rem; }
.scai-pc-airy .scai-pc-footer { margin-top: auto; padding-top: 2rem; }
.scai-pc-airy .scai-pc-price-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 1.5rem; }
.scai-pc-airy .scai-pc-price-usd { font-size: 0.875rem; font-weight: 500; color: #737373; }
.scai-pc-airy .scai-pc-price { font-size: 1.125rem; font-weight: 700; color: #171717; }
.scai-pc-airy .scai-pc-cta { display: block; width: 100%; background: #171717; color: #fff; text-align: center; padding: 14px 24px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; border-radius: 9999px; box-shadow: 0 10px 40px rgba(23,23,23,0.2); transition: transform 0.2s, box-shadow 0.2s; }
.scai-pc-airy .scai-pc-cta:hover { transform: scale(1.05); box-shadow: 0 15px 50px rgba(23,23,23,0.25); }`,
            },// 10. Gradient Glow - Modern, energetic
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-pc-glow" data-component="scai-product-card" id="scai-q-product-card-10">
<div class="scai-pc-inner">
<div class="scai-pc-image-wrap">
<img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop" alt="Product" class="scai-pc-img">
</div>
<div class="scai-pc-content">
<div class="scai-pc-header">
<span class="scai-pc-badge">{{BADGE}}</span>
<h3 class="scai-pc-title" data-component="scai-product-card-name">Sony WH-1000XM5</h3>
</div>
<div class="scai-pc-rating" data-component="scai-product-card-rating">
<span class="scai-pc-rating-num">4.8</span>
<span class="scai-pc-stars"><svg class="scai-star" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-star" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-star" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-star" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-star scai-star-inactive" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>
<span class="scai-pc-rating-text">(15,420)</span>
</div>
<p class="scai-pc-desc">Industry-leading noise cancellation with dual processors and 8 mics. Lightweight design for all-day comfort.</p>
<div class="scai-pc-footer">
<div class="scai-pc-price-row" data-component="scai-product-card-price">
<span class="scai-pc-price-usd">USD</span>
<span class="scai-pc-price">$398.00</span>
</div>
<a href="#" class="scai-pc-cta" data-component="scai-product-card-cta" target="_blank" rel="noopener noreferrer">View on Amazon</a>
</div>
</div>
</div>
</div>`,
                  css: `/* Gradient Glow - Modern, energetic */
.scai-pc-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(115,115,115,0.1); border: 2px solid #f5f5f5; transition: border-color 0.3s; }
.scai-pc-glow:hover { border-color: #d4d4d4; }
.scai-pc-glow .scai-pc-inner { display: flex; flex-direction: column; }
@media (min-width: 768px) { .scai-pc-glow .scai-pc-inner { flex-direction: row; } }
.scai-pc-glow .scai-pc-image-wrap { background: linear-gradient(to top right, #fafafa, #fff); position: relative; overflow: hidden; min-height: 240px; }
@media (min-width: 768px) { .scai-pc-glow .scai-pc-image-wrap { width: 40%; min-height: 340px; } }
.scai-pc-glow .scai-pc-img { width: 100%; height: 100%; object-fit: contain; }
.scai-pc-glow .scai-pc-content { flex: 1; padding: 1.5rem 2rem; display: flex; flex-direction: column; justify-content: space-between; }
.scai-pc-glow .scai-pc-header { margin-bottom: 1rem; }
.scai-pc-glow .scai-pc-badge { display: inline-flex; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; padding: 4px 10px; border-radius: 9999px; background: #f5f5f5; color: #737373; margin-bottom: 0.75rem; }
.scai-pc-glow .scai-pc-title { font-size: 1.25rem; font-weight: 700; background: linear-gradient(to right, #171717, #525252); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.1; }
.scai-pc-glow .scai-pc-rating { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
.scai-pc-glow .scai-pc-rating-num { font-size: 0.875rem; font-weight: 700; color: #171717; }
.scai-pc-glow .scai-pc-stars { display: flex; align-items: center; }
.scai-pc-glow .scai-star { width: 14px; height: 14px; color: #171717; }
.scai-pc-glow .scai-star-inactive { color: #d4d4d4; }
.scai-pc-glow .scai-pc-rating-text { font-size: 11px; font-weight: 500; color: #737373; }
.scai-pc-glow .scai-pc-desc { color: #737373; font-size: 0.875rem; line-height: 1.6; margin-bottom: 1rem; }
.scai-pc-glow .scai-pc-footer { margin-top: auto; padding-top: 2rem; }
.scai-pc-glow .scai-pc-price-row { display: inline-flex; align-items: baseline; gap: 4px; margin-bottom: 1.5rem; }
.scai-pc-glow .scai-pc-price-usd { font-size: 0.875rem; font-weight: 500; color: #a3a3a3; }
.scai-pc-glow .scai-pc-price { font-size: 1.5rem; font-weight: 700; color: #171717; }
.scai-pc-glow .scai-pc-cta { display: block; width: 100%; background: linear-gradient(to right, #171717, #404040); color: #fff; text-align: center; padding: 14px 24px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; border-radius: 12px; box-shadow: 0 10px 40px rgba(23,23,23,0.2); transition: transform 0.2s, box-shadow 0.2s; }
.scai-pc-glow .scai-pc-cta:hover { transform: translateY(-2px); box-shadow: 0 15px 50px rgba(23,23,23,0.3); }`,
            },// 13. Soft Stone - Warm stone tones, rounded
            {
                  name: "Soft Stone",
                  html: `<div class="scai-pc-stone" data-component="scai-product-card" id="scai-q-product-card-13">
<div class="scai-pc-inner">
<div class="scai-pc-image-wrap">
<img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop" alt="Product" class="scai-pc-img">
</div>
<div class="scai-pc-content">
<div class="scai-pc-header">
<span class="scai-pc-badge">{{BADGE}}</span>
<h3 class="scai-pc-title" data-component="scai-product-card-name">Sony WH-1000XM5</h3>
</div>
<div class="scai-pc-rating" data-component="scai-product-card-rating">
<span class="scai-pc-rating-num">4.8</span>
<span class="scai-pc-stars"><svg class="scai-star" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-star" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-star" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-star" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="scai-star scai-star-inactive" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>
<span class="scai-pc-rating-text">(15,420)</span>
</div>
<p class="scai-pc-desc">Industry-leading noise cancellation with dual processors and 8 mics. Lightweight design for all-day comfort.</p>
<div class="scai-pc-footer">
<div class="scai-pc-price-row" data-component="scai-product-card-price">
<span class="scai-pc-price-usd">USD</span>
<span class="scai-pc-price">$398.00</span>
</div>
<a href="#" class="scai-pc-cta" data-component="scai-product-card-cta" target="_blank" rel="noopener noreferrer">View on Amazon</a>
</div>
</div>
</div>
</div>`,
                  css: `/* Soft Stone - Warm stone tones */
.scai-pc-stone { background: #fff; border: 0; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03); outline: 1px solid #f5f5f5; outline-offset: -1px; }
.scai-pc-stone .scai-pc-inner { display: flex; flex-direction: column; }
@media (min-width: 768px) { .scai-pc-stone .scai-pc-inner { flex-direction: row; } }
.scai-pc-stone .scai-pc-image-wrap { position: relative; overflow: hidden; background: #f5f5f4; min-height: 240px; }
@media (min-width: 768px) { .scai-pc-stone .scai-pc-image-wrap { width: 40%; min-height: 340px; } }
.scai-pc-stone .scai-pc-img { width: 100%; height: 100%; object-fit: contain; }
.scai-pc-stone .scai-pc-content { flex: 1; padding: 1.5rem 2rem; display: flex; flex-direction: column; justify-content: space-between; }
.scai-pc-stone .scai-pc-header { margin-bottom: 1rem; }
.scai-pc-stone .scai-pc-badge { display: inline-flex; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; padding: 4px 10px; border-radius: 9999px; background: #f5f5f5; color: #737373; margin-bottom: 0.75rem; }
.scai-pc-stone .scai-pc-title { font-size: 1.25rem; font-weight: 700; color: #44403c; line-height: 1.1; }
.scai-pc-stone .scai-pc-rating { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
.scai-pc-stone .scai-pc-rating-num { font-size: 0.875rem; font-weight: 600; color: #78716c; }
.scai-pc-stone .scai-pc-stars { display: flex; align-items: center; }
.scai-pc-stone .scai-star { width: 14px; height: 14px; color: #78716c; }
.scai-pc-stone .scai-star-inactive { color: #d6d3d1; }
.scai-pc-stone .scai-pc-rating-text { font-size: 11px; font-weight: 500; color: #a8a29e; }
.scai-pc-stone .scai-pc-desc { color: #78716c; font-size: 0.875rem; line-height: 1.6; margin-bottom: 1rem; }
.scai-pc-stone .scai-pc-footer { margin-top: auto; padding-top: 2rem; }
.scai-pc-stone .scai-pc-price-row { display: inline-flex; align-items: baseline; gap: 4px; margin-bottom: 1.5rem; }
.scai-pc-stone .scai-pc-price-usd { font-size: 0.875rem; font-weight: 500; color: #a8a29e; }
.scai-pc-stone .scai-pc-price { font-size: 1.25rem; font-weight: 700; color: #57534e; }
.scai-pc-stone .scai-pc-cta { display: block; width: 100%; background: #d6d3d1; color: #44403c; text-align: center; padding: 14px 24px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; border-radius: 12px; transition: background 0.2s; }
.scai-pc-stone .scai-pc-cta:hover { background: #c7c5c2; }`,
            }],

      // FEATURE-LIST
      "feature-list": [
            // 1. Clean Studio Feature List
            {
                  name: "Clean Studio",
                  html: `<div class="scai-feature-clean" data-component="scai-feature-section" id="scai-q-feature-section-1">
<h2 class="scai-feature-h2" data-component="scai-feature-h2">Key Features</h2>
<ul class="scai-feature-list" data-component="scai-feature-list">
<li>Advanced AI-powered automation handles complex workflows</li>
<li>Real-time analytics dashboard for instant visibility</li>
<li>Seamless integration with 50+ popular tools</li>
<li>Dedicated 24/7 customer support</li>
<li>Enterprise-grade security and encryption</li>
</ul>
</div>`,
                  css: `/* Clean Studio Feature List */
.scai-feature-clean { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
.scai-feature-clean .scai-feature-h2 { font-size: 1.125rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; padding: 1.25rem 1.5rem 0.75rem; margin: 0; }
.scai-feature-clean .scai-feature-list { list-style: none; padding: 0 1.5rem 1.25rem; margin: 0; }
.scai-feature-clean .scai-feature-list li { padding: 0.5rem 0; font-size: 1rem; font-weight: 500; color: #525252; display: flex; gap: 0.75rem; align-items: center; }
.scai-feature-clean .scai-feature-list li::before { content: '✓'; color: #525252; font-weight: 700; }`,
            },// 8. Airy Premium Feature List
            {
                  name: "Airy Premium",
                  html: `<div class="scai-feature-airy" data-component="scai-feature-section" id="scai-q-feature-section-8">
<h2 class="scai-feature-h2" data-component="scai-feature-h2">Key Features</h2>
<ul class="scai-feature-list" data-component="scai-feature-list">
<li>Advanced AI-powered automation handles complex workflows</li>
<li>Real-time analytics dashboard for instant visibility</li>
<li>Seamless integration with 50+ popular tools</li>
<li>Dedicated 24/7 customer support</li>
<li>Enterprise-grade security and encryption</li>
</ul>
</div>`,
                  css: `/* Airy Premium Feature List */
.scai-feature-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); padding: 2rem; }
.scai-feature-airy .scai-feature-h2 { font-size: 1.125rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding-bottom: 1.5rem; margin: 0 0 1rem 0; border-bottom: 1px solid #f5f5f5; }
.scai-feature-airy .scai-feature-list { list-style: none; padding: 0; margin: 0; }
.scai-feature-airy .scai-feature-list li { padding: 0.75rem 0; font-size: 1rem; font-weight: 500; color: #525252; display: flex; gap: 0.75rem; align-items: center; transition: transform 0.3s; }
.scai-feature-airy .scai-feature-list li:hover { transform: translateX(8px); }
.scai-feature-airy .scai-feature-list li::before { content: '✓'; color: #525252; font-weight: 700; }`,
            },// 10. Gradient Glow Feature List
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-feature-glow" data-component="scai-feature-section" id="scai-q-feature-section-10">
<h2 class="scai-feature-h2" data-component="scai-feature-h2">Key Features</h2>
<ul class="scai-feature-list" data-component="scai-feature-list">
<li>Advanced AI-powered automation handles complex workflows</li>
<li>Real-time analytics dashboard for instant visibility</li>
<li>Seamless integration with 50+ popular tools</li>
<li>Dedicated 24/7 customer support</li>
<li>Enterprise-grade security and encryption</li>
</ul>
</div>`,
                  css: `/* Gradient Glow Feature List */
.scai-feature-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-feature-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-feature-glow .scai-feature-h2 { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.25rem 1.5rem; font-size: 1.125rem; font-weight: 700; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-feature-glow .scai-feature-list { list-style: none; padding: 1.25rem 1.5rem; margin: 0; }
.scai-feature-glow .scai-feature-list li { padding: 0.5rem 0; font-size: 1rem; font-weight: 500; color: #525252; display: flex; gap: 0.75rem; align-items: center; transition: transform 0.2s; }
.scai-feature-glow .scai-feature-list li:hover { transform: translateX(4px); }
.scai-feature-glow .scai-feature-list li::before { content: '●'; background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 0.5rem; }`,
            },// 13. Soft Stone Feature List
            {
                  name: "Soft Stone",
                  html: `<div class="scai-feature-stone" data-component="scai-feature-section" id="scai-q-feature-section-13">
<h2 class="scai-feature-h2" data-component="scai-feature-h2">Key Features</h2>
<ul class="scai-feature-list" data-component="scai-feature-list">
<li>Advanced AI-powered automation handles complex workflows</li>
<li>Real-time analytics dashboard for instant visibility</li>
<li>Seamless integration with 50+ popular tools</li>
<li>Dedicated 24/7 customer support</li>
<li>Enterprise-grade security and encryption</li>
</ul>
</div>`,
                  css: `/* Soft Stone Feature List */
.scai-feature-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-feature-stone .scai-feature-h2 { font-size: 1.125rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-feature-stone .scai-feature-list { list-style: none; padding: 1.25rem 1.5rem; margin: 0; }
.scai-feature-stone .scai-feature-list li { padding: 0.5rem 0; font-size: 1rem; font-weight: 500; color: #78716c; padding-left: 1rem; position: relative; }
.scai-feature-stone .scai-feature-list li::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 4px; height: 4px; background: #a8a29e; border-radius: 50%; }`,
            }],

      // CTA-BOX
      "cta-box": [
            // 1. Clean Studio - Normal (left-aligned)
            {
                  name: "Clean Studio",
                  html: `<div class="scai-cta-studio" data-component="scai-cta-box" id="scai-q-cta-box-1">
<div class="scai-cta-inner">
<h3 class="scai-cta-title" data-component="scai-cta-title">Ready to transform your workflow?</h3>
<p class="scai-cta-text">Start your free trial today and experience the difference immediately with our premium tools.</p>
</div>
<a href="#" class="scai-cta-button">Get Started Free</a>
</div>`,
                  css: `/* 1. Clean Studio */
.scai-cta-studio { background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 2rem; display: flex; justify-content: space-between; align-items: center; gap: 2rem; flex-wrap: wrap; }
.scai-cta-studio .scai-cta-inner { flex: 1; min-width: 200px; }
.scai-cta-studio .scai-cta-title { font-size: 1.25rem; font-weight: 600; color: #171717; margin: 0 0 0.5rem 0; }
.scai-cta-studio .scai-cta-text { font-size: 1.125rem; color: #525252; margin: 0; line-height: 1.6; }
.scai-cta-studio .scai-cta-button { display: inline-block; background: #171717; color: #fff; padding: 14px 28px; text-decoration: none; font-weight: 600; font-size: 1rem; border-radius: 8px; transition: background 0.2s, box-shadow 0.2s; }
.scai-cta-studio .scai-cta-button:hover { background: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }`,
            },
            // 1b. Clean Studio - Centered
            {
                  name: "Clean Studio Centered",
                  html: `<div class="scai-cta-studio-c" data-component="scai-cta-box" id="scai-q-cta-box-2">
<h3 class="scai-cta-title" data-component="scai-cta-title">Ready to transform your workflow?</h3>
<p class="scai-cta-text">Start your free trial today and experience the difference immediately with our premium tools.</p>
<a href="#" class="scai-cta-button">Get Started Free</a>
</div>`,
                  css: `/* 1b. Clean Studio Centered */
.scai-cta-studio-c { background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 2.5rem; text-align: center; }
.scai-cta-studio-c .scai-cta-title { font-size: 1.25rem; font-weight: 600; color: #171717; margin: 0 0 0.75rem 0; }
.scai-cta-studio-c .scai-cta-text { font-size: 1.125rem; color: #525252; margin: 0 0 1.5rem 0; line-height: 1.6; max-width: 480px; margin-left: auto; margin-right: auto; }
.scai-cta-studio-c .scai-cta-button { display: inline-block; background: #171717; color: #fff; padding: 14px 28px; text-decoration: none; font-weight: 600; font-size: 1rem; border-radius: 8px; transition: background 0.2s, box-shadow 0.2s; }
.scai-cta-studio-c .scai-cta-button:hover { background: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }`,
            },// 2b. Neo-Brutalist - Centered// 3b. Glass Frost - Centered// 4b. Dark Elegance - Centered// 5b. Swiss Grid - Centered// 6b. Eco Paper - Centered// 7b. Heavy Industrial - Centered// 8. Airy Premium - Normal
            {
                  name: "Airy Premium",
                  html: `<div class="scai-cta-airy" data-component="scai-cta-box" id="scai-q-cta-box-15">
<div class="scai-cta-inner">
<h3 class="scai-cta-title" data-component="scai-cta-title">Ready to transform your workflow?</h3>
<p class="scai-cta-text">Start your free trial today and experience the difference immediately with our premium tools.</p>
</div>
<a href="#" class="scai-cta-button">Get Started</a>
</div>`,
                  css: `/* 8. Airy Premium */
.scai-cta-airy { background: #fafafa; border-radius: 16px; padding: 3rem; display: flex; justify-content: space-between; align-items: center; gap: 3rem; flex-wrap: wrap; }
.scai-cta-airy .scai-cta-inner { flex: 1; min-width: 200px; }
.scai-cta-airy .scai-cta-title { font-size: 1.25rem; font-weight: 300; color: #262626; margin: 0 0 0.75rem 0; letter-spacing: 0.025em; }
.scai-cta-airy .scai-cta-text { font-size: 1.125rem; font-weight: 300; color: #737373; margin: 0; line-height: 1.7; }
.scai-cta-airy .scai-cta-button { display: inline-block; background: #171717; color: #fff; padding: 18px 36px; text-decoration: none; font-weight: 400; font-size: 1rem; border-radius: 50px; box-shadow: 0 10px 40px rgba(23,23,23,0.15); transition: transform 0.2s, box-shadow 0.2s; }
.scai-cta-airy .scai-cta-button:hover { transform: scale(1.05); box-shadow: 0 15px 50px rgba(23,23,23,0.25); }`,
            },
            // 8b. Airy Premium - Centered
            {
                  name: "Airy Premium Centered",
                  html: `<div class="scai-cta-airy-c" data-component="scai-cta-box" id="scai-q-cta-box-16">
<h3 class="scai-cta-title" data-component="scai-cta-title">Ready to transform your workflow?</h3>
<p class="scai-cta-text">Start your free trial today and experience the difference immediately with our premium tools.</p>
<a href="#" class="scai-cta-button">Get Started</a>
</div>`,
                  css: `/* 8b. Airy Premium Centered */
.scai-cta-airy-c { background: #fafafa; border-radius: 16px; padding: 3.5rem; text-align: center; }
.scai-cta-airy-c .scai-cta-title { font-size: 1.25rem; font-weight: 300; color: #262626; margin: 0 0 1rem 0; letter-spacing: 0.025em; }
.scai-cta-airy-c .scai-cta-text { font-size: 1.125rem; font-weight: 300; color: #737373; margin: 0 auto 2rem auto; line-height: 1.7; max-width: 480px; }
.scai-cta-airy-c .scai-cta-button { display: inline-block; background: #171717; color: #fff; padding: 18px 36px; text-decoration: none; font-weight: 400; font-size: 1rem; border-radius: 50px; box-shadow: 0 10px 40px rgba(23,23,23,0.15); transition: transform 0.2s, box-shadow 0.2s; }
.scai-cta-airy-c .scai-cta-button:hover { transform: scale(1.05); box-shadow: 0 15px 50px rgba(23,23,23,0.25); }`,
            },// 9b. Cyber Dark - Centered// 10. Gradient Glow - Normal
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-cta-gradient" data-component="scai-cta-box" id="scai-q-cta-box-19">
<div class="scai-cta-inner">
<h3 class="scai-cta-title" data-component="scai-cta-title">Ready to transform your workflow?</h3>
<p class="scai-cta-text">Start your free trial today and experience the difference immediately.</p>
</div>
<a href="#" class="scai-cta-button">Get Started Free</a>
</div>`,
                  css: `/* 10. Gradient Glow */
.scai-cta-gradient { background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 50%, #e5e5e5 100%); border-radius: 16px; padding: 2rem; display: flex; justify-content: space-between; align-items: center; gap: 2rem; box-shadow: 0 8px 32px rgba(0,0,0,0.08); flex-wrap: wrap; }
.scai-cta-gradient .scai-cta-inner { flex: 1; min-width: 200px; }
.scai-cta-gradient .scai-cta-title { font-size: 1.25rem; font-weight: 500; color: #171717; margin: 0 0 0.5rem 0; }
.scai-cta-gradient .scai-cta-text { font-size: 1.125rem; color: #525252; margin: 0; }
.scai-cta-gradient .scai-cta-button { display: inline-block; background: #171717; color: #fff; padding: 16px 32px; text-decoration: none; font-weight: 600; font-size: 1rem; border-radius: 10px; box-shadow: 0 10px 40px rgba(23,23,23,0.2); transition: transform 0.2s, box-shadow 0.2s; }
.scai-cta-gradient .scai-cta-button:hover { transform: translateY(-2px); box-shadow: 0 15px 50px rgba(23,23,23,0.3); }`,
            },
            // 10b. Gradient Glow - Centered
            {
                  name: "Gradient Glow Centered",
                  html: `<div class="scai-cta-gradient-c" data-component="scai-cta-box" id="scai-q-cta-box-20">
<h3 class="scai-cta-title" data-component="scai-cta-title">Ready to transform your workflow?</h3>
<p class="scai-cta-text">Start your free trial today and experience the difference immediately.</p>
<a href="#" class="scai-cta-button">Get Started Free</a>
</div>`,
                  css: `/* 10b. Gradient Glow Centered */
.scai-cta-gradient-c { background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 50%, #e5e5e5 100%); border-radius: 16px; padding: 2.5rem; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
.scai-cta-gradient-c .scai-cta-title { font-size: 1.25rem; font-weight: 500; color: #171717; margin: 0 0 0.75rem 0; }
.scai-cta-gradient-c .scai-cta-text { font-size: 1.125rem; color: #525252; margin: 0 auto 1.5rem auto; max-width: 400px; }
.scai-cta-gradient-c .scai-cta-button { display: inline-block; background: #171717; color: #fff; padding: 16px 32px; text-decoration: none; font-weight: 600; font-size: 1rem; border-radius: 10px; box-shadow: 0 10px 40px rgba(23,23,23,0.2); transition: transform 0.2s, box-shadow 0.2s; }
.scai-cta-gradient-c .scai-cta-button:hover { transform: translateY(-2px); box-shadow: 0 15px 50px rgba(23,23,23,0.3); }`,
            },// 11b. Minimal Outline - Centered// 12b. Technical Grid - Centered// 13. Soft Stone - Normal
            {
                  name: "Soft Stone",
                  html: `<div class="scai-cta-stone" data-component="scai-cta-box" id="scai-q-cta-box-25">
<div class="scai-cta-inner">
<h3 class="scai-cta-title" data-component="scai-cta-title">Ready to transform your workflow?</h3>
<p class="scai-cta-text">Start your free trial today and experience the difference.</p>
</div>
<a href="#" class="scai-cta-button">Get Started</a>
</div>`,
                  css: `/* 13. Soft Stone */
.scai-cta-stone { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 2rem; display: flex; justify-content: space-between; align-items: center; gap: 2rem; flex-wrap: wrap; }
.scai-cta-stone .scai-cta-inner { flex: 1; min-width: 200px; }
.scai-cta-stone .scai-cta-title { font-size: 1.25rem; font-weight: 500; color: #44403c; margin: 0 0 0.5rem 0; }
.scai-cta-stone .scai-cta-text { font-size: 1.125rem; color: #78716c; margin: 0; }
.scai-cta-stone .scai-cta-button { display: inline-block; background: #a8a29e; color: #fafaf9; padding: 14px 28px; text-decoration: none; font-weight: 600; font-size: 1rem; border-radius: 8px; transition: background 0.2s; }
.scai-cta-stone .scai-cta-button:hover { background: #78716c; }`,
            },
            // 13b. Soft Stone - Centered
            {
                  name: "Soft Stone Centered",
                  html: `<div class="scai-cta-stone-c" data-component="scai-cta-box" id="scai-q-cta-box-26">
<h3 class="scai-cta-title" data-component="scai-cta-title">Ready to transform your workflow?</h3>
<p class="scai-cta-text">Start your free trial today and experience the difference.</p>
<a href="#" class="scai-cta-button">Get Started</a>
</div>`,
                  css: `/* 13b. Soft Stone Centered */
.scai-cta-stone-c { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 2.5rem; text-align: center; }
.scai-cta-stone-c .scai-cta-title { font-size: 1.25rem; font-weight: 500; color: #44403c; margin: 0 0 0.75rem 0; }
.scai-cta-stone-c .scai-cta-text { font-size: 1.125rem; color: #78716c; margin: 0 auto 1.5rem auto; max-width: 380px; }
.scai-cta-stone-c .scai-cta-button { display: inline-block; background: #a8a29e; color: #fafaf9; padding: 14px 28px; text-decoration: none; font-weight: 600; font-size: 1rem; border-radius: 8px; transition: background 0.2s; }
.scai-cta-stone-c .scai-cta-button:hover { background: #78716c; }`,
            },// 14b. Editorial Serif - Centered// 15b. Corporate Pro - Centered// 16b. Polaroid Frame - Centered// 17b. Wired Dashed - Centered// 18b. Pill Pop - Centered],

      // COMPARISON-TABLE
      "comparison-table": [
            // 1. Clean Studio Comparison
            {
                  name: "Clean Studio",
                  html: `<div class="scai-comp-studio" data-component="scai-comparison-table" id="scai-q-comparison-table-1">
<h3 class="scai-comp-title">Product Comparison</h3>
<table class="scai-comp-table">
<thead><tr><th>Feature</th><th>Product A</th><th>Product B</th></tr></thead>
<tbody>
<tr><td>Price</td><td>$49/mo</td><td>$79/mo</td></tr>
<tr><td>Storage</td><td>50GB</td><td>100GB</td></tr>
<tr><td>Support</td><td>Email</td><td>24/7 Live</td></tr>
<tr><td>Users</td><td>5</td><td>Unlimited</td></tr>
</tbody>
</table>
</div>`,
                  css: `/* Clean Studio Comparison */
.scai-comp-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-comp-studio .scai-comp-title { font-size: 1.125rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-comp-studio .scai-comp-table { width: 100%; border-collapse: collapse; }
.scai-comp-studio th, .scai-comp-studio td { padding: 1rem 1.5rem; text-align: left; font-size: 0.9375rem; }
.scai-comp-studio th { font-weight: 500; color: #a3a3a3; font-size: 0.9375rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f5f5f5; }
.scai-comp-studio th:not(:first-child) { text-align: center; }
.scai-comp-studio td { color: #525252; font-weight: 500; }
.scai-comp-studio tr:hover td { background: rgba(0,0,0,0.02); }
.scai-comp-studio td:not(:first-child) { text-align: center; color: #171717; font-weight: 600; }`,
            },// 8. Airy Premium Comparison
            {
                  name: "Airy Premium",
                  html: `<div class="scai-comp-airy" data-component="scai-comparison-table" id="scai-q-comparison-table-8">
<h3 class="scai-comp-title">Product Comparison</h3>
<table class="scai-comp-table">
<thead><tr><th>Feature</th><th>Product A</th><th>Product B</th></tr></thead>
<tbody>
<tr><td>Price</td><td>$49/mo</td><td>$79/mo</td></tr>
<tr><td>Storage</td><td>50GB</td><td>100GB</td></tr>
<tr><td>Support</td><td>Email</td><td>24/7 Live</td></tr>
<tr><td>Users</td><td>5</td><td>Unlimited</td></tr>
</tbody>
</table>
</div>`,
                  css: `/* Airy Premium Comparison */
.scai-comp-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-comp-airy .scai-comp-title { font-size: 1.125rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; margin: 0; }
.scai-comp-airy .scai-comp-table { width: 100%; border-collapse: collapse; }
.scai-comp-airy th, .scai-comp-airy td { padding: 1rem 2rem; text-align: left; font-size: 0.9375rem; }
.scai-comp-airy th { font-weight: 600; color: #a3a3a3; font-size: 0.9375rem; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #f5f5f5; }
.scai-comp-airy th:not(:first-child) { text-align: center; }
.scai-comp-airy td { color: #525252; font-weight: 500; }
.scai-comp-airy tr:hover td { background: rgba(0,0,0,0.02); }
.scai-comp-airy td:not(:first-child) { text-align: center; color: #171717; font-weight: 600; }`,
            },// 10. Gradient Glow Comparison
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-comp-glow" data-component="scai-comparison-table" id="scai-q-comparison-table-10">
<h3 class="scai-comp-title">Product Comparison</h3>
<table class="scai-comp-table">
<thead><tr><th>Feature</th><th>Product A</th><th>Product B</th></tr></thead>
<tbody>
<tr><td>Price</td><td>$49/mo</td><td>$79/mo</td></tr>
<tr><td>Storage</td><td>50GB</td><td>100GB</td></tr>
<tr><td>Support</td><td>Email</td><td>24/7 Live</td></tr>
<tr><td>Users</td><td>5</td><td>Unlimited</td></tr>
</tbody>
</table>
</div>`,
                  css: `/* Gradient Glow Comparison */
.scai-comp-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-comp-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-comp-glow .scai-comp-title { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.5rem; font-size: 1.125rem; font-weight: 700; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-comp-glow .scai-comp-table { width: 100%; border-collapse: collapse; }
.scai-comp-glow th, .scai-comp-glow td { padding: 1rem 1.5rem; text-align: left; font-size: 0.9375rem; }
.scai-comp-glow th { font-weight: 600; color: #a3a3a3; font-size: 0.9375rem; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #f5f5f5; }
.scai-comp-glow th:not(:first-child) { text-align: center; }
.scai-comp-glow td { color: #525252; font-weight: 500; }
.scai-comp-glow td:not(:first-child) { text-align: center; color: #171717; font-weight: 600; }`,
            },// 13. Soft Stone Comparison
            {
                  name: "Soft Stone",
                  html: `<div class="scai-comp-stone" data-component="scai-comparison-table" id="scai-q-comparison-table-13">
<h3 class="scai-comp-title">Product Comparison</h3>
<table class="scai-comp-table">
<thead><tr><th>Feature</th><th>Product A</th><th>Product B</th></tr></thead>
<tbody>
<tr><td>Price</td><td>$49/mo</td><td>$79/mo</td></tr>
<tr><td>Storage</td><td>50GB</td><td>100GB</td></tr>
<tr><td>Support</td><td>Email</td><td>24/7 Live</td></tr>
<tr><td>Users</td><td>5</td><td>Unlimited</td></tr>
</tbody>
</table>
</div>`,
                  css: `/* Soft Stone Comparison */
.scai-comp-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-comp-stone .scai-comp-title { font-size: 1.125rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-comp-stone .scai-comp-table { width: 100%; border-collapse: collapse; }
.scai-comp-stone th, .scai-comp-stone td { padding: 1rem 1.5rem; text-align: left; font-size: 0.9375rem; }
.scai-comp-stone th { font-weight: 600; color: #a8a29e; font-size: 0.9375rem; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #e7e5e4; }
.scai-comp-stone th:not(:first-child) { text-align: center; }
.scai-comp-stone td { color: #78716c; font-weight: 500; }
.scai-comp-stone td:not(:first-child) { text-align: center; color: #44403c; font-weight: 600; }`,
            }],

      // QUICK-VERDICT
      "quick-verdict": [
            // 1. Clean Studio Quick Verdict
            {
                  name: "Clean Studio",
                  html: `<div class="scai-verdict-studio" data-component="scai-quick-verdict" id="scai-q-quick-verdict-1">
<div class="scai-verdict-title">Quick Verdict</div>
<div class="scai-verdict-options">
<div class="scai-verdict-option">
<div class="scai-verdict-label">Choose Product A</div>
<p class="scai-verdict-text">Best for budget-conscious small teams who need essential tools without complexity.</p>
</div>
<div class="scai-verdict-option">
<div class="scai-verdict-label">Choose Product B</div>
<p class="scai-verdict-text">Best for enterprises needing unlimited scalability and advanced analytics.</p>
</div>
</div>
</div>`,
                  css: `/* Clean Studio Quick Verdict */
.scai-verdict-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-verdict-studio .scai-verdict-title { font-size: 1.125rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f5f5f5; }
.scai-verdict-studio .scai-verdict-options { display: flex; }
.scai-verdict-studio .scai-verdict-option { flex: 1; padding: 1.5rem; }
.scai-verdict-studio .scai-verdict-option:first-child { border-right: 1px solid #f5f5f5; }
.scai-verdict-studio .scai-verdict-label { font-size: 1rem; font-weight: 600; color: #171717; margin-bottom: 0.5rem; }
.scai-verdict-studio .scai-verdict-text { font-size: 1rem; color: #525252; line-height: 1.6; margin: 0; }`,
            },// 8. Airy Premium Quick Verdict
            {
                  name: "Airy Premium",
                  html: `<div class="scai-verdict-airy" data-component="scai-quick-verdict" id="scai-q-quick-verdict-8">
<div class="scai-verdict-title">Quick Verdict</div>
<div class="scai-verdict-options">
<div class="scai-verdict-option">
<div class="scai-verdict-label">Choose Product A</div>
<p class="scai-verdict-text">Best for budget-conscious small teams who need essential tools without complexity.</p>
</div>
<div class="scai-verdict-option">
<div class="scai-verdict-label">Choose Product B</div>
<p class="scai-verdict-text">Best for enterprises needing unlimited scalability and advanced analytics.</p>
</div>
</div>
</div>`,
                  css: `/* Airy Premium Quick Verdict */
.scai-verdict-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-verdict-airy .scai-verdict-title { font-size: 1.125rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; }
.scai-verdict-airy .scai-verdict-options { display: flex; padding: 0 2rem 2rem; }
.scai-verdict-airy .scai-verdict-option { flex: 1; }
.scai-verdict-airy .scai-verdict-option:first-child { padding-right: 2rem; border-right: 1px solid #f5f5f5; }
.scai-verdict-airy .scai-verdict-option:last-child { padding-left: 2rem; }
.scai-verdict-airy .scai-verdict-label { font-size: 1rem; font-weight: 600; color: #171717; margin-bottom: 0.5rem; }
.scai-verdict-airy .scai-verdict-text { font-size: 1rem; color: #737373; line-height: 1.6; margin: 0; }`,
            },// 10. Gradient Glow Quick Verdict
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-verdict-glow" data-component="scai-quick-verdict" id="scai-q-quick-verdict-10">
<div class="scai-verdict-title">Quick Verdict</div>
<div class="scai-verdict-options">
<div class="scai-verdict-option">
<div class="scai-verdict-label">Choose Product A</div>
<p class="scai-verdict-text">Best for budget-conscious small teams who need essential tools without complexity.</p>
</div>
<div class="scai-verdict-option">
<div class="scai-verdict-label">Choose Product B</div>
<p class="scai-verdict-text">Best for enterprises needing unlimited scalability and advanced analytics.</p>
</div>
</div>
</div>`,
                  css: `/* Gradient Glow Quick Verdict */
.scai-verdict-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-verdict-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-verdict-glow .scai-verdict-title { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.5rem; font-size: 1.125rem; font-weight: 700; border-bottom: 1px solid #f5f5f5; }
.scai-verdict-glow .scai-verdict-options { display: flex; }
.scai-verdict-glow .scai-verdict-option { flex: 1; padding: 1.5rem; }
.scai-verdict-glow .scai-verdict-option:first-child { border-right: 1px solid #f5f5f5; }
.scai-verdict-glow .scai-verdict-label { font-size: 1rem; font-weight: 600; color: #171717; margin-bottom: 0.5rem; }
.scai-verdict-glow .scai-verdict-text { font-size: 1rem; color: #525252; line-height: 1.6; margin: 0; }`,
            },// 13. Soft Stone Quick Verdict
            {
                  name: "Soft Stone",
                  html: `<div class="scai-verdict-stone" data-component="scai-quick-verdict" id="scai-q-quick-verdict-13">
<div class="scai-verdict-title">Quick Verdict</div>
<div class="scai-verdict-options">
<div class="scai-verdict-option">
<div class="scai-verdict-label">Choose Product A</div>
<p class="scai-verdict-text">Best for budget-conscious small teams who need essential tools without complexity.</p>
</div>
<div class="scai-verdict-option">
<div class="scai-verdict-label">Choose Product B</div>
<p class="scai-verdict-text">Best for enterprises needing unlimited scalability and advanced analytics.</p>
</div>
</div>
</div>`,
                  css: `/* Soft Stone Quick Verdict */
.scai-verdict-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-verdict-stone .scai-verdict-title { font-size: 1.125rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e7e5e4; }
.scai-verdict-stone .scai-verdict-options { display: flex; }
.scai-verdict-stone .scai-verdict-option { flex: 1; padding: 1.5rem; }
.scai-verdict-stone .scai-verdict-option:first-child { border-right: 1px solid #e7e5e4; }
.scai-verdict-stone .scai-verdict-label { font-size: 1rem; font-weight: 600; color: #44403c; margin-bottom: 0.5rem; }
.scai-verdict-stone .scai-verdict-text { font-size: 1rem; color: #78716c; line-height: 1.6; margin: 0; }`,
            }],

      // REQUIREMENTS-BOX
      "requirements-box": [
            // 1. Clean Studio Requirements
            {
                  name: "Clean Studio",
                  html: `<div class="scai-req-studio" data-component="scai-requirements-box" id="scai-q-requirements-1">
<h2 class="scai-requirements-h2" data-component="scai-requirements-h2">What You Will Need</h2>
<ul class="scai-requirements-list" data-component="scai-requirements-list">
<li>Phillips head screwdriver</li>
<li>Measuring tape</li>
<li>Level tool</li>
<li>Pencil for marking</li>
<li>Safety glasses</li>
</ul>
</div>`,
                  css: `/* Clean Studio Requirements */
.scai-req-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-req-studio .scai-requirements-h2 { font-size: 1.125rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-req-studio .scai-requirements-list { list-style: none; padding: 1.5rem; margin: 0; }
.scai-req-studio .scai-requirements-list li { padding: 0.5rem 0; font-size: 1rem; color: #525252; display: flex; align-items: center; gap: 0.75rem; }
.scai-req-studio .scai-requirements-list li::before { content: '✓'; color: #171717; font-weight: 500; }`,
            },// 8. Airy Premium Requirements
            {
                  name: "Airy Premium",
                  html: `<div class="scai-req-airy" data-component="scai-requirements-box" id="scai-q-requirements-8">
<h2 class="scai-requirements-h2" data-component="scai-requirements-h2">What You Will Need</h2>
<ul class="scai-requirements-list" data-component="scai-requirements-list">
<li>Phillips head screwdriver</li>
<li>Measuring tape</li>
<li>Level tool</li>
<li>Pencil for marking</li>
<li>Safety glasses</li>
</ul>
</div>`,
                  css: `/* Airy Premium Requirements */
.scai-req-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-req-airy .scai-requirements-h2 { font-size: 1.125rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; margin: 0; }
.scai-req-airy .scai-requirements-list { list-style: none; padding: 0 2rem 2rem; margin: 0; }
.scai-req-airy .scai-requirements-list li { padding: 0.625rem 0; font-size: 1rem; color: #525252; display: flex; align-items: center; gap: 0.75rem; }
.scai-req-airy .scai-requirements-list li::before { content: ''; width: 6px; height: 6px; background: #d4d4d4; border-radius: 50%; }`,
            },// 10. Gradient Glow Requirements
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-req-glow" data-component="scai-requirements-box" id="scai-q-requirements-10">
<h2 class="scai-requirements-h2" data-component="scai-requirements-h2">What You Will Need</h2>
<ul class="scai-requirements-list" data-component="scai-requirements-list">
<li>Phillips head screwdriver</li>
<li>Measuring tape</li>
<li>Level tool</li>
<li>Pencil for marking</li>
<li>Safety glasses</li>
</ul>
</div>`,
                  css: `/* Gradient Glow Requirements */
.scai-req-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-req-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-req-glow .scai-requirements-h2 { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.5rem; font-size: 1.125rem; font-weight: 700; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-req-glow .scai-requirements-list { list-style: none; padding: 1.5rem; margin: 0; }
.scai-req-glow .scai-requirements-list li { padding: 0.5rem 0; font-size: 1rem; color: #525252; display: flex; align-items: center; gap: 0.75rem; }
.scai-req-glow .scai-requirements-list li::before { content: '✓'; color: #525252; font-weight: 600; }`,
            },// 13. Soft Stone Requirements
            {
                  name: "Soft Stone",
                  html: `<div class="scai-req-stone" data-component="scai-requirements-box" id="scai-q-requirements-13">
<h2 class="scai-requirements-h2" data-component="scai-requirements-h2">What You Will Need</h2>
<ul class="scai-requirements-list" data-component="scai-requirements-list">
<li>Phillips head screwdriver</li>
<li>Measuring tape</li>
<li>Level tool</li>
<li>Pencil for marking</li>
<li>Safety glasses</li>
</ul>
</div>`,
                  css: `/* Soft Stone Requirements */
.scai-req-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-req-stone .scai-requirements-h2 { font-size: 1.125rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-req-stone .scai-requirements-list { list-style: none; padding: 1.5rem; margin: 0; }
.scai-req-stone .scai-requirements-list li { padding: 0.5rem 0; font-size: 1rem; color: #78716c; display: flex; align-items: center; gap: 0.75rem; }
.scai-req-stone .scai-requirements-list li::before { content: '◦'; color: #a8a29e; }`,
            }],

      // PRO-TIPS
      "pro-tips": [
            // 1. Clean Studio Pro Tips
            {
                  name: "Clean Studio",
                  html: `<div class="scai-tips-studio" data-component="scai-pro-tips-section" id="scai-q-pro-tips-1">
<h2 class="scai-tips-h2" data-component="scai-tips-h2">Pro Tips</h2>
<ol class="scai-tips-list" data-component="scai-tips-list">
<li>Always measure your workspace twice before making cuts.</li>
<li>Invest in high-quality materials from reputable suppliers.</li>
<li>Work in a well-ventilated area when using adhesives.</li>
<li>Schedule regular breaks to maintain focus.</li>
<li>Clean all tools immediately after use.</li>
</ol>
</div>`,
                  css: `/* Clean Studio Pro Tips */
.scai-tips-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-tips-studio .scai-tips-h2 { font-size: 1.125rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-tips-studio .scai-tips-list { list-style: none; padding: 1.5rem; margin: 0; counter-reset: tip-counter; }
.scai-tips-studio .scai-tips-list li { padding: 0.75rem 0; font-size: 1rem; color: #525252; display: flex; gap: 1rem; counter-increment: tip-counter; border-bottom: 1px solid #f5f5f5; line-height: 1.5; }
.scai-tips-studio .scai-tips-list li:last-child { border-bottom: none; }
.scai-tips-studio .scai-tips-list li::before { content: counter(tip-counter); background: #171717; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; }`,
            },// 8. Airy Premium Pro Tips
            {
                  name: "Airy Premium",
                  html: `<div class="scai-tips-airy" data-component="scai-pro-tips-section" id="scai-q-pro-tips-8">
<h2 class="scai-tips-h2" data-component="scai-tips-h2">Pro Tips</h2>
<ol class="scai-tips-list" data-component="scai-tips-list">
<li>Always measure your workspace twice before making cuts.</li>
<li>Invest in high-quality materials from reputable suppliers.</li>
<li>Work in a well-ventilated area when using adhesives.</li>
<li>Schedule regular breaks to maintain focus.</li>
<li>Clean all tools immediately after use.</li>
</ol>
</div>`,
                  css: `/* Airy Premium Pro Tips */
.scai-tips-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-tips-airy .scai-tips-h2 { font-size: 1.125rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; margin: 0; }
.scai-tips-airy .scai-tips-list { list-style: none; padding: 0 2rem 2rem; margin: 0; counter-reset: tip-counter; }
.scai-tips-airy .scai-tips-list li { padding: 0.75rem 0; font-size: 1rem; color: #525252; display: flex; gap: 1rem; counter-increment: tip-counter; border-bottom: 1px solid #f5f5f5; line-height: 1.5; }
.scai-tips-airy .scai-tips-list li:last-child { border-bottom: none; }
.scai-tips-airy .scai-tips-list li::before { content: counter(tip-counter); background: linear-gradient(135deg, #f5f5f5, #e5e5e5); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: #171717; flex-shrink: 0; }`,
            },// 10. Gradient Glow Pro Tips
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-tips-glow" data-component="scai-pro-tips-section" id="scai-q-pro-tips-10">
<h2 class="scai-tips-h2" data-component="scai-tips-h2">Pro Tips</h2>
<ol class="scai-tips-list" data-component="scai-tips-list">
<li>Always measure your workspace twice before making cuts.</li>
<li>Invest in high-quality materials from reputable suppliers.</li>
<li>Work in a well-ventilated area when using adhesives.</li>
<li>Schedule regular breaks to maintain focus.</li>
<li>Clean all tools immediately after use.</li>
</ol>
</div>`,
                  css: `/* Gradient Glow Pro Tips */
.scai-tips-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-tips-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-tips-glow .scai-tips-h2 { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.25rem 1.5rem; font-size: 1.125rem; font-weight: 700; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-tips-glow .scai-tips-list { list-style: none; padding: 1.5rem; margin: 0; counter-reset: tip-counter; }
.scai-tips-glow .scai-tips-list li { padding: 0.75rem 0; font-size: 1rem; color: #525252; display: flex; gap: 1rem; counter-increment: tip-counter; border-bottom: 1px solid #f5f5f5; line-height: 1.5; }
.scai-tips-glow .scai-tips-list li:last-child { border-bottom: none; }
.scai-tips-glow .scai-tips-list li::before { content: counter(tip-counter); background: linear-gradient(135deg, #525252, #737373); color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; }`,
            },// 13. Soft Stone Pro Tips
            {
                  name: "Soft Stone",
                  html: `<div class="scai-tips-stone" data-component="scai-pro-tips-section" id="scai-q-pro-tips-13">
<h2 class="scai-tips-h2" data-component="scai-tips-h2">Pro Tips</h2>
<ol class="scai-tips-list" data-component="scai-tips-list">
<li>Always measure your workspace twice before making cuts.</li>
<li>Invest in high-quality materials from reputable suppliers.</li>
<li>Work in a well-ventilated area when using adhesives.</li>
<li>Schedule regular breaks to maintain focus.</li>
<li>Clean all tools immediately after use.</li>
</ol>
</div>`,
                  css: `/* Soft Stone Pro Tips */
.scai-tips-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-tips-stone .scai-tips-h2 { font-size: 1.125rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-tips-stone .scai-tips-list { list-style: none; padding: 1.5rem; margin: 0; counter-reset: tip-counter; }
.scai-tips-stone .scai-tips-list li { padding: 0.75rem 0; font-size: 1rem; color: #78716c; display: flex; gap: 1rem; counter-increment: tip-counter; border-bottom: 1px solid #e7e5e4; line-height: 1.5; }
.scai-tips-stone .scai-tips-list li:last-child { border-bottom: none; }
.scai-tips-stone .scai-tips-list li::before { content: counter(tip-counter); background: #e7e5e4; color: #57534e; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; }`,
            }],

      // KEY-TAKEAWAYS
      "key-takeaways": [
            // 1. Clean Studio Key Takeaways
            {
                  name: "Clean Studio",
                  html: `<div class="scai-takeaways-studio" data-component="scai-key-takeaways" id="scai-q-key-takeaways-1">
<div class="scai-takeaways-title">Key Takeaways</div>
<ul class="scai-takeaways-list">
<li>Significant time savings for busy professionals</li>
<li>Minimal learning curve thanks to intuitive design</li>
<li>Seamless integration with existing tools</li>
<li>Reliable 24/7 customer support</li>
<li>Flexible pricing that scales with your needs</li>
</ul>
</div>`,
                  css: `/* Clean Studio Key Takeaways */
.scai-takeaways-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-takeaways-studio .scai-takeaways-title { font-size: 1.125rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-takeaways-studio .scai-takeaways-list { list-style: none; padding: 1.25rem 1.5rem; margin: 0; }
.scai-takeaways-studio .scai-takeaways-list li { padding: 0.5rem 0; font-size: 1rem; color: #525252; display: flex; gap: 0.75rem; align-items: center; line-height: 1.5; }
.scai-takeaways-studio .scai-takeaways-list li::before { content: '✓'; color: #525252; font-weight: 600; }`,
            },// 8. Airy Premium Key Takeaways
            {
                  name: "Airy Premium",
                  html: `<div class="scai-takeaways-airy" data-component="scai-key-takeaways" id="scai-q-key-takeaways-8">
<div class="scai-takeaways-title">Takeaways</div>
<ul class="scai-takeaways-list">
<li>Significant time savings for busy professionals</li>
<li>Minimal learning curve thanks to intuitive design</li>
<li>Seamless integration with existing tools</li>
<li>Reliable 24/7 customer support</li>
<li>Flexible pricing that scales with your needs</li>
</ul>
</div>`,
                  css: `/* Airy Premium Key Takeaways */
.scai-takeaways-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-takeaways-airy .scai-takeaways-title { font-size: 1.125rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; margin: 0; }
.scai-takeaways-airy .scai-takeaways-list { list-style: none; padding: 0 2rem 2rem; margin: 0; }
.scai-takeaways-airy .scai-takeaways-list li { padding: 0.5rem 0; font-size: 1rem; color: #525252; display: flex; gap: 0.75rem; align-items: center; border-bottom: 1px solid #f5f5f5; }
.scai-takeaways-airy .scai-takeaways-list li:last-child { border-bottom: none; }
.scai-takeaways-airy .scai-takeaways-list li::before { content: '✓'; color: #525252; font-weight: 600; }`,
            },// 10. Gradient Glow Key Takeaways
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-takeaways-glow" data-component="scai-key-takeaways" id="scai-q-key-takeaways-10">
<div class="scai-takeaways-title">Key Takeaways</div>
<ul class="scai-takeaways-list">
<li>Significant time savings for busy professionals</li>
<li>Minimal learning curve thanks to intuitive design</li>
<li>Seamless integration with existing tools</li>
<li>Reliable 24/7 customer support</li>
<li>Flexible pricing that scales with your needs</li>
</ul>
</div>`,
                  css: `/* Gradient Glow Key Takeaways */
.scai-takeaways-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-takeaways-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-takeaways-glow .scai-takeaways-title { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.25rem 1.5rem; font-size: 1.125rem; font-weight: 700; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-takeaways-glow .scai-takeaways-list { list-style: none; padding: 1.25rem 1.5rem; margin: 0; }
.scai-takeaways-glow .scai-takeaways-list li { padding: 0.5rem 0; font-size: 1rem; color: #525252; display: flex; gap: 0.75rem; align-items: center; }
.scai-takeaways-glow .scai-takeaways-list li::before { content: '✓'; background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 700; }`,
            },// 13. Soft Stone Key Takeaways
            {
                  name: "Soft Stone",
                  html: `<div class="scai-takeaways-stone" data-component="scai-key-takeaways" id="scai-q-key-takeaways-13">
<div class="scai-takeaways-title">Key Takeaways</div>
<ul class="scai-takeaways-list">
<li>Significant time savings for busy professionals</li>
<li>Minimal learning curve thanks to intuitive design</li>
<li>Seamless integration with existing tools</li>
<li>Reliable 24/7 customer support</li>
<li>Flexible pricing that scales with your needs</li>
</ul>
</div>`,
                  css: `/* Soft Stone Key Takeaways */
.scai-takeaways-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-takeaways-stone .scai-takeaways-title { font-size: 1.125rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-takeaways-stone .scai-takeaways-list { list-style: none; padding: 1.25rem 1.5rem; margin: 0; }
.scai-takeaways-stone .scai-takeaways-list li { padding: 0.5rem 0; font-size: 1rem; color: #78716c; display: flex; gap: 0.75rem; align-items: center; }
.scai-takeaways-stone .scai-takeaways-list li::before { content: '✓'; color: #a8a29e; font-weight: 600; }`,
            }],

      // QUICK-FACTS
      "quick-facts": [
            // 1. Clean Studio Quick Facts
            {
                  name: "Clean Studio",
                  html: `<div class="scai-facts-studio" data-component="scai-quick-facts-section" id="scai-q-quick-facts-1">
<span class="scai-facts-title" data-component="scai-quick-facts-h2">Quick Facts</span>
<ul class="scai-facts-list" data-component="scai-quick-facts-list">
<li>Founded in 2015, San Francisco HQ</li>
<li>10M+ active users worldwide</li>
<li>99.9% uptime guarantee</li>
<li>SOC 2 Type II certified</li>
<li>Available in 25+ languages</li>
</ul>
</div>`,
                  css: `/* Clean Studio Quick Facts */
.scai-facts-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-facts-studio .scai-facts-title { font-size: 1.125rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; margin: 0; display: block; border-bottom: 1px solid #f5f5f5; }
.scai-facts-studio .scai-facts-list { list-style: none; padding: 1.25rem 1.5rem; margin: 0; }
.scai-facts-studio .scai-facts-list li { padding: 0.5rem 0; font-size: 1rem; color: #525252; display: flex; gap: 0.75rem; align-items: center; line-height: 1.5; }
.scai-facts-studio .scai-facts-list li::before { content: '→'; color: #171717; font-weight: 600; }`,
            },// 8. Airy Premium Quick Facts
            {
                  name: "Airy Premium",
                  html: `<div class="scai-facts-airy" data-component="scai-quick-facts-section" id="scai-q-quick-facts-8">
<span class="scai-facts-title" data-component="scai-quick-facts-h2">Quick Facts</span>
<ul class="scai-facts-list" data-component="scai-quick-facts-list">
<li>Founded in 2015, San Francisco HQ</li>
<li>10M+ active users worldwide</li>
<li>99.9% uptime guarantee</li>
<li>SOC 2 Type II certified</li>
<li>Available in 25+ languages</li>
</ul>
</div>`,
                  css: `/* Airy Premium Quick Facts */
.scai-facts-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-facts-airy .scai-facts-title { font-size: 1.125rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; display: block; margin: 0; }
.scai-facts-airy .scai-facts-list { list-style: none; padding: 0 2rem 2rem; margin: 0; }
.scai-facts-airy .scai-facts-list li { padding: 0.5rem 0; font-size: 1rem; color: #525252; display: flex; gap: 0.75rem; align-items: center; border-bottom: 1px solid #f5f5f5; }
.scai-facts-airy .scai-facts-list li:last-child { border-bottom: none; }
.scai-facts-airy .scai-facts-list li::before { content: '→'; color: #a3a3a3; font-weight: 600; }`,
            },// 10. Gradient Glow Quick Facts
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-facts-glow" data-component="scai-quick-facts-section" id="scai-q-quick-facts-10">
<span class="scai-facts-title" data-component="scai-quick-facts-h2">Quick Facts</span>
<ul class="scai-facts-list" data-component="scai-quick-facts-list">
<li>Founded in 2015, San Francisco HQ</li>
<li>10M+ active users worldwide</li>
<li>99.9% uptime guarantee</li>
<li>SOC 2 Type II certified</li>
<li>Available in 25+ languages</li>
</ul>
</div>`,
                  css: `/* Gradient Glow Quick Facts */
.scai-facts-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-facts-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-facts-glow .scai-facts-title { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.25rem 1.5rem; font-size: 1.125rem; font-weight: 700; display: block; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-facts-glow .scai-facts-list { list-style: none; padding: 1.25rem 1.5rem; margin: 0; }
.scai-facts-glow .scai-facts-list li { padding: 0.5rem 0; font-size: 1rem; color: #525252; display: flex; gap: 0.75rem; align-items: center; }
.scai-facts-glow .scai-facts-list li::before { content: '→'; background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 700; }`,
            },// 13. Soft Stone Quick Facts
            {
                  name: "Soft Stone",
                  html: `<div class="scai-facts-stone" data-component="scai-quick-facts-section" id="scai-q-quick-facts-13">
<span class="scai-facts-title" data-component="scai-quick-facts-h2">Quick Facts</span>
<ul class="scai-facts-list" data-component="scai-quick-facts-list">
<li>Founded in 2015, San Francisco HQ</li>
<li>10M+ active users worldwide</li>
<li>99.9% uptime guarantee</li>
<li>SOC 2 Type II certified</li>
<li>Available in 25+ languages</li>
</ul>
</div>`,
                  css: `/* Soft Stone Quick Facts */
.scai-facts-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-facts-stone .scai-facts-title { font-size: 1.125rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; display: block; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-facts-stone .scai-facts-list { list-style: none; padding: 1.25rem 1.5rem; margin: 0; }
.scai-facts-stone .scai-facts-list li { padding: 0.5rem 0; font-size: 1rem; color: #78716c; display: flex; gap: 0.75rem; align-items: center; }
.scai-facts-stone .scai-facts-list li::before { content: '→'; color: #a8a29e; font-weight: 600; }`,
            }],

      // HONORABLE-MENTIONS
      "honorable-mentions": [
            // 1. Clean Studio
            {
                  name: "Clean Studio",
                  html: `<div class="scai-hm-studio" data-component="scai-honorable-mentions" id="scai-q-honorable-mentions-1">
<h2 class="scai-hm-h2" data-component="scai-hm-h2">Honorable Mentions</h2>
<div class="scai-hm-list">
<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">Product Alpha: Reliable Basic Choice</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">While missing some premium features, Product Alpha delivers exceptional reliability and solid core performance that budget-conscious buyers will appreciate. Its straightforward interface and dependable uptime make it a strong contender.</p>
</div>
<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">Product Beta: Specialized Powerhouse</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">Product Beta carves out a unique niche by offering specialized tools designed specifically for complex technical workflows that other platforms ignore. Verified experts find its depth indispensable.</p>
</div>
<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">Product Gamma: The Emerging Contender</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">As an emerging player in the market, Product Gamma shows tremendous potential with its rapid update cycle and innovative new features. Early adopters report its modern architecture makes it a promising investment.</p>
</div>
</div>
</div>`,
                  css: `/* 1. Clean Studio */
.scai-hm-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-hm-studio .scai-hm-h2 { font-size: 1.25rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-hm-studio .scai-hm-list { padding: 0; }
.scai-hm-studio .scai-hm-item { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f5f5f5; }
.scai-hm-studio .scai-hm-item:last-child { border-bottom: none; }
.scai-hm-studio .scai-hm-h3 { font-size: 1rem; font-weight: 600; color: #171717; margin: 0 0 0.5rem 0; }
.scai-hm-studio .scai-hm-paragraph { font-size: 0.9375rem; color: #525252; line-height: 1.6; margin: 0; }`,
            },// 8. Airy Premium
            {
                  name: "Airy Premium",
                  html: `<div class="scai-hm-airy" data-component="scai-honorable-mentions" id="scai-q-honorable-mentions-8">
<h2 class="scai-hm-h2" data-component="scai-hm-h2">Honorable Mentions</h2>
<div class="scai-hm-list">
<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">Product Alpha: Reliable Basic Choice</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">While missing some premium features, Product Alpha delivers exceptional reliability and solid core performance that budget-conscious buyers will appreciate. Its straightforward interface and dependable uptime make it a strong contender.</p>
</div>
<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">Product Beta: Specialized Powerhouse</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">Product Beta carves out a unique niche by offering specialized tools designed specifically for complex technical workflows that other platforms ignore. Verified experts find its depth indispensable.</p>
</div>
<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">Product Gamma: The Emerging Contender</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">As an emerging player in the market, Product Gamma shows tremendous potential with its rapid update cycle and innovative new features. Early adopters report its modern architecture makes it a promising investment.</p>
</div>
</div>
</div>`,
                  css: `/* 8. Airy Premium */
.scai-hm-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-hm-airy .scai-hm-h2 { font-size: 1.25rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; margin: 0; }
.scai-hm-airy .scai-hm-list { padding: 0 2rem 2rem; }
.scai-hm-airy .scai-hm-item { padding: 1.25rem 0; border-bottom: 1px solid #f5f5f5; }
.scai-hm-airy .scai-hm-item:last-child { border-bottom: none; }
.scai-hm-airy .scai-hm-h3 { font-size: 1rem; font-weight: 600; color: #171717; margin: 0 0 0.5rem 0; }
.scai-hm-airy .scai-hm-paragraph { font-size: 0.9375rem; color: #525252; line-height: 1.6; margin: 0; }`,
            },// 10. Gradient Glow
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-hm-glow" data-component="scai-honorable-mentions" id="scai-q-honorable-mentions-10">
<h2 class="scai-hm-h2" data-component="scai-hm-h2">Honorable Mentions</h2>
<div class="scai-hm-list">
<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">Product Alpha: Reliable Basic Choice</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">While missing some premium features, Product Alpha delivers exceptional reliability and solid core performance that budget-conscious buyers will appreciate. Its straightforward interface and dependable uptime make it a strong contender.</p>
</div>
<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">Product Beta: Specialized Powerhouse</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">Product Beta carves out a unique niche by offering specialized tools designed specifically for complex technical workflows that other platforms ignore. Verified experts find its depth indispensable.</p>
</div>
<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">Product Gamma: The Emerging Contender</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">As an emerging player in the market, Product Gamma shows tremendous potential with its rapid update cycle and innovative new features. Early adopters report its modern architecture makes it a promising investment.</p>
</div>
</div>
</div>`,
                  css: `/* 10. Gradient Glow */
.scai-hm-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-hm-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-hm-glow .scai-hm-h2 { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.5rem; font-size: 1.25rem; font-weight: 700; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-hm-glow .scai-hm-list { padding: 0; }
.scai-hm-glow .scai-hm-item { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f5f5f5; }
.scai-hm-glow .scai-hm-item:last-child { border-bottom: none; }
.scai-hm-glow .scai-hm-h3 { font-size: 1rem; font-weight: 600; color: #171717; margin: 0 0 0.5rem 0; }
.scai-hm-glow .scai-hm-paragraph { font-size: 0.9375rem; color: #525252; line-height: 1.6; margin: 0; }`,
            },// 13. Soft Stone
            {
                  name: "Soft Stone",
                  html: `<div class="scai-hm-stone" data-component="scai-honorable-mentions" id="scai-q-honorable-mentions-13">
<h2 class="scai-hm-h2" data-component="scai-hm-h2">Honorable Mentions</h2>
<div class="scai-hm-list">
<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">Product Alpha: Reliable Basic Choice</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">While missing some premium features, Product Alpha delivers exceptional reliability and solid core performance that budget-conscious buyers will appreciate. Its straightforward interface and dependable uptime make it a strong contender.</p>
</div>
<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">Product Beta: Specialized Powerhouse</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">Product Beta carves out a unique niche by offering specialized tools designed specifically for complex technical workflows that other platforms ignore. Verified experts find its depth indispensable.</p>
</div>
<div class="scai-hm-item">
<h3 class="scai-hm-h3" data-component="scai-hm-h3">Product Gamma: The Emerging Contender</h3>
<p class="scai-hm-paragraph" data-component="scai-hm-paragraph">As an emerging player in the market, Product Gamma shows tremendous potential with its rapid update cycle and innovative new features. Early adopters report its modern architecture makes it a promising investment.</p>
</div>
</div>
</div>`,
                  css: `/* 13. Soft Stone */
.scai-hm-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-hm-stone .scai-hm-h2 { font-size: 1.25rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-hm-stone .scai-hm-list { padding: 0; }
.scai-hm-stone .scai-hm-item { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e7e5e4; }
.scai-hm-stone .scai-hm-item:last-child { border-bottom: none; }
.scai-hm-stone .scai-hm-h3 { font-size: 1rem; font-weight: 600; color: #57534e; margin: 0 0 0.5rem 0; }
.scai-hm-stone .scai-hm-paragraph { font-size: 0.9375rem; color: #78716c; line-height: 1.6; margin: 0; }`,
            }],

      // WHY-CHOOSE-LOCAL
      "why-choose-local": [
            // 1. Clean Studio - Soft rounded card with subtle shadow, green checkmarks
            {
                  name: "Clean Studio",
                  html: `<div class="scai-local-studio" data-component="scai-why-local-section" id="scai-q-why-local-1">
<div class="scai-local-image">
<img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=400&fit=crop" alt="Local Provider" class="scai-local-img">
</div>
<div class="scai-local-content">
<span class="scai-local-badge">Local Partner</span>
<h2 class="scai-local-title">Why Choose a Local Provider</h2>
<ul class="scai-local-list">
<li>Fast emergency response with no corporate delays</li>
<li>Personalized attention tailored to your specific needs</li>
<li>Deep knowledge of local codes and requirements</li>
<li>Support local economy by keeping money here</li>
<li>Build lasting partnerships with trusted professionals</li>
</ul>
</div>
</div>`,
                  css: `/* 1. Clean Studio */
.scai-local-studio { display: flex; flex-direction: column; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
@media (min-width: 768px) { .scai-local-studio { flex-direction: row; } }
.scai-local-studio .scai-local-image { position: relative; overflow: hidden; background: #fafafa; min-height: 200px; }
@media (min-width: 768px) { .scai-local-studio .scai-local-image { width: 40%; min-height: 280px; } }
.scai-local-studio .scai-local-img { width: 100%; height: 100%; object-fit: cover; }
.scai-local-studio .scai-local-content { flex: 1; padding: 1.5rem 2rem; display: flex; flex-direction: column; justify-content: center; }
.scai-local-studio .scai-local-badge { display: inline-block; background: #171717; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; padding: 4px 10px; border-radius: 9999px; margin-bottom: 0.75rem; align-self: flex-start; }
.scai-local-studio .scai-local-title { font-size: 1.375rem; font-weight: 700; color: #171717; margin: 0 0 1rem 0; line-height: 1.2; }
.scai-local-studio .scai-local-list { list-style: none; padding: 0; margin: 0; }
.scai-local-studio .scai-local-list li { padding: 0.5rem 0; font-size: 1rem; color: #525252; display: flex; gap: 0.75rem; align-items: flex-start; line-height: 1.5; border-bottom: 1px solid #f5f5f5; }
.scai-local-studio .scai-local-list li:last-child { border-bottom: none; }
.scai-local-studio .scai-local-list li::before { content: '✓'; color: #525252; font-weight: 600; flex-shrink: 0; }`,
            },// 8. Airy Premium - Large rounded corners, gradient background, spacious padding
            {
                  name: "Airy Premium",
                  html: `<div class="scai-local-airy" data-component="scai-why-local-section" id="scai-q-why-local-8">
<div class="scai-local-image">
<img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=400&fit=crop" alt="Local Provider" class="scai-local-img">
</div>
<div class="scai-local-content">
<span class="scai-local-label">Local Advantage</span>
<h2 class="scai-local-title">Why Choose a Local Provider</h2>
<ul class="scai-local-list">
<li>Faster response from professionals in your neighborhood</li>
<li>Expertise in local building regulations and codes</li>
<li>Economic benefits stay within your community</li>
<li>Personalized service with genuine accountability</li>
<li>Trusted relationships that grow stronger over time</li>
</ul>
</div>
</div>`,
                  css: `/* 8. Airy Premium */
.scai-local-airy { display: flex; flex-direction: column; background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
@media (min-width: 768px) { .scai-local-airy { flex-direction: row; } }
.scai-local-airy .scai-local-image { position: relative; overflow: hidden; background: #f5f5f5; min-height: 220px; }
@media (min-width: 768px) { .scai-local-airy .scai-local-image { width: 42%; min-height: 300px; } }
.scai-local-airy .scai-local-img { width: 100%; height: 100%; object-fit: cover; }
.scai-local-airy .scai-local-content { flex: 1; padding: 2rem 2.5rem; display: flex; flex-direction: column; justify-content: center; }
.scai-local-airy .scai-local-label { font-size: 0.6875rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 0.5rem; }
.scai-local-airy .scai-local-title { font-size: 1.5rem; font-weight: 600; color: #171717; margin: 0 0 1.5rem 0; line-height: 1.2; }
.scai-local-airy .scai-local-list { list-style: none; padding: 0; margin: 0; }
.scai-local-airy .scai-local-list li { padding: 0.625rem 0; font-size: 1rem; color: #525252; display: flex; gap: 0.75rem; align-items: flex-start; line-height: 1.5; border-bottom: 1px solid #f0f0f0; }
.scai-local-airy .scai-local-list li:last-child { border-bottom: none; }
.scai-local-airy .scai-local-list li::before { content: '✓'; color: #525252; font-weight: 600; flex-shrink: 0; }`,
            },// 10. Gradient Glow - Gradient border effect with pink-purple-cyan, vibrant modern
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-local-glow" data-component="scai-why-local-section" id="scai-q-why-local-10">
<div class="scai-local-image">
<img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=400&fit=crop" alt="Local Provider" class="scai-local-img">
</div>
<div class="scai-local-content">
<h2 class="scai-local-title">Why Choose Local</h2>
<ul class="scai-local-list">
<li>Rapid emergency response without delays</li>
<li>Expert understanding of local regulations</li>
<li>Direct support for community growth</li>
<li>Personal accountability you can trust</li>
<li>Lasting professional relationships</li>
</ul>
</div>
</div>`,
                  css: `/* 10. Gradient Glow */
.scai-local-glow { display: flex; flex-direction: column; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); position: relative; }
.scai-local-glow::before { content: ''; position: absolute; inset: 0; border-radius: 16px; padding: 2px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
@media (min-width: 768px) { .scai-local-glow { flex-direction: row; } }
.scai-local-glow .scai-local-image { position: relative; overflow: hidden; background: #fafafa; min-height: 200px; }
@media (min-width: 768px) { .scai-local-glow .scai-local-image { width: 40%; min-height: 280px; } }
.scai-local-glow .scai-local-img { width: 100%; height: 100%; object-fit: cover; }
.scai-local-glow .scai-local-content { flex: 1; padding: 1.5rem 2rem; display: flex; flex-direction: column; justify-content: center; }
.scai-local-glow .scai-local-title { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 1.375rem; font-weight: 700; margin: 0 0 1.25rem 0; }
.scai-local-glow .scai-local-list { list-style: none; padding: 0; margin: 0; }
.scai-local-glow .scai-local-list li { padding: 0.5rem 0; font-size: 1rem; color: #525252; display: flex; gap: 0.75rem; align-items: flex-start; line-height: 1.5; border-bottom: 1px solid #f5f5f5; }
.scai-local-glow .scai-local-list li:last-child { border-bottom: none; }
.scai-local-glow .scai-local-list li::before { content: '✓'; background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 700; flex-shrink: 0; }`,
            },// 13. Soft Stone - Warm stone palette with gentle shadows, earthy modern
            {
                  name: "Soft Stone",
                  html: `<div class="scai-local-stone" data-component="scai-why-local-section" id="scai-q-why-local-13">
<div class="scai-local-image">
<img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=400&fit=crop" alt="Local Provider" class="scai-local-img">
</div>
<div class="scai-local-content">
<h2 class="scai-local-title">Why Choose Local</h2>
<ul class="scai-local-list">
<li>Fast response from trusted neighborhood experts</li>
<li>Thorough knowledge of local building standards</li>
<li>Your spending supports the local economy</li>
<li>Genuine care and personal accountability</li>
<li>Relationships built on mutual trust</li>
</ul>
</div>
</div>`,
                  css: `/* 13. Soft Stone */
.scai-local-stone { display: flex; flex-direction: column; background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
@media (min-width: 768px) { .scai-local-stone { flex-direction: row; } }
.scai-local-stone .scai-local-image { position: relative; overflow: hidden; background: #f5f5f4; min-height: 200px; }
@media (min-width: 768px) { .scai-local-stone .scai-local-image { width: 40%; min-height: 280px; } }
.scai-local-stone .scai-local-img { width: 100%; height: 100%; object-fit: cover; }
.scai-local-stone .scai-local-content { flex: 1; padding: 1.5rem 2rem; display: flex; flex-direction: column; justify-content: center; border-left: 1px solid #e7e5e4; }
.scai-local-stone .scai-local-title { font-size: 1.25rem; font-weight: 600; color: #57534e; margin: 0 0 1.25rem 0; }
.scai-local-stone .scai-local-list { list-style: none; padding: 0; margin: 0; }
.scai-local-stone .scai-local-list li { padding: 0.5rem 0; font-size: 1rem; color: #78716c; display: flex; gap: 0.75rem; align-items: flex-start; line-height: 1.5; border-bottom: 1px solid #e7e5e4; }
.scai-local-stone .scai-local-list li:last-child { border-bottom: none; }
.scai-local-stone .scai-local-list li::before { content: '✓'; color: #a8a29e; font-weight: 600; flex-shrink: 0; }`,
            }],

      // SERVICE-INFO-BOX
      "service-info-box": [
            // 1. Clean Studio - Minimal with subtle shadows
            {
                  name: "Clean Studio",
                  html: `<div class="scai-svc-studio" data-component="scai-service-info-box" id="scai-q-service-info-1">
<div class="scai-svc-header">Service Information</div>
<div class="scai-svc-row"><span class="scai-svc-label">Working Hours</span><span class="scai-svc-value">Available 24/7 for all emergency calls and inquiries</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Response Time</span><span class="scai-svc-value">Guaranteed arrival within 30 minutes or less</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Service Call Fee</span><span class="scai-svc-value">$49 flat rate for diagnostic visits and quotes</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Service Area</span><span class="scai-svc-value">Serving all Downtown LA and surrounding metro areas</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Payment Methods</span><span class="scai-svc-value">Accepting Cash, Credit Cards, Apple Pay, and Checks</span></div>
</div>`,
                  css: `/* 1. Clean Studio */
.scai-svc-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-svc-studio .scai-svc-header { font-size: 1.125rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f5f5f5; }
.scai-svc-studio .scai-svc-row { display: flex; flex-direction: column; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f5f5f5; gap: 0.25rem; }
@media (min-width: 640px) { .scai-svc-studio .scai-svc-row { flex-direction: row; align-items: center; } }
.scai-svc-studio .scai-svc-row:last-child { border-bottom: none; }
.scai-svc-studio .scai-svc-label { font-size: 0.9375rem; font-weight: 600; color: #171717; min-width: 140px; }
.scai-svc-studio .scai-svc-value { font-size: 0.9375rem; color: #525252; flex: 1; line-height: 1.6; }`,
            },// 8. Airy Premium - Light, premium, lots of whitespace
            {
                  name: "Airy Premium",
                  html: `<div class="scai-svc-airy" data-component="scai-service-info-box" id="scai-q-service-info-8">
<div class="scai-svc-header">Service Information</div>
<div class="scai-svc-row"><span class="scai-svc-label">Working Hours</span><span class="scai-svc-value">Available 24/7 for all emergency calls and inquiries</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Response Time</span><span class="scai-svc-value">Guaranteed arrival within 30 minutes or less</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Service Call Fee</span><span class="scai-svc-value">$49 flat rate for diagnostic visits and quotes</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Service Area</span><span class="scai-svc-value">Serving all Downtown LA and surrounding metro areas</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Payment Methods</span><span class="scai-svc-value">Accepting Cash, Credit Cards, Apple Pay, and Checks</span></div>
</div>`,
                  css: `/* 8. Airy Premium */
.scai-svc-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-svc-airy .scai-svc-header { font-size: 1.125rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; }
.scai-svc-airy .scai-svc-row { display: flex; flex-direction: column; padding: 1.25rem 2rem; border-bottom: 1px solid #f5f5f5; gap: 0.25rem; }
@media (min-width: 640px) { .scai-svc-airy .scai-svc-row { flex-direction: row; align-items: center; } }
.scai-svc-airy .scai-svc-row:last-child { border-bottom: none; padding-bottom: 2rem; }
.scai-svc-airy .scai-svc-label { font-size: 1rem; font-weight: 600; color: #171717; min-width: 140px; }
.scai-svc-airy .scai-svc-value { font-size: 0.9375rem; color: #525252; flex: 1; line-height: 1.6; }`,
            },// 10. Gradient Glow - Soft gradient background with glow
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-svc-glow" data-component="scai-service-info-box" id="scai-q-service-info-10">
<div class="scai-svc-header">Service Information</div>
<div class="scai-svc-row"><span class="scai-svc-label">Working Hours</span><span class="scai-svc-value">Available 24/7 for all emergency calls and inquiries</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Response Time</span><span class="scai-svc-value">Guaranteed arrival within 30 minutes or less</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Service Call Fee</span><span class="scai-svc-value">$49 flat rate for diagnostic visits and quotes</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Service Area</span><span class="scai-svc-value">Serving all Downtown LA and surrounding metro areas</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Payment Methods</span><span class="scai-svc-value">Accepting Cash, Credit Cards, Apple Pay, and Checks</span></div>
</div>`,
                  css: `/* 10. Gradient Glow */
.scai-svc-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-svc-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-svc-glow .scai-svc-header { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.25rem 1.5rem; font-size: 1.125rem; font-weight: 700; border-bottom: 1px solid #f5f5f5; }
.scai-svc-glow .scai-svc-row { display: flex; flex-direction: column; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f5f5f5; gap: 0.25rem; }
@media (min-width: 640px) { .scai-svc-glow .scai-svc-row { flex-direction: row; align-items: center; } }
.scai-svc-glow .scai-svc-row:last-child { border-bottom: none; }
.scai-svc-glow .scai-svc-label { font-size: 0.9375rem; font-weight: 600; color: #171717; min-width: 130px; }
.scai-svc-glow .scai-svc-value { font-size: 0.9375rem; color: #525252; flex: 1; line-height: 1.6; }`,
            },// 13. Soft Stone - Warm stone/concrete colors
            {
                  name: "Soft Stone",
                  html: `<div class="scai-svc-stone" data-component="scai-service-info-box" id="scai-q-service-info-13">
<div class="scai-svc-header">Service Information</div>
<div class="scai-svc-row"><span class="scai-svc-label">Working Hours</span><span class="scai-svc-value">Available 24/7 for all emergency calls and inquiries</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Response Time</span><span class="scai-svc-value">Guaranteed arrival within 30 minutes or less</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Service Call Fee</span><span class="scai-svc-value">$49 flat rate for diagnostic visits and quotes</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Service Area</span><span class="scai-svc-value">Serving all Downtown LA and surrounding metro areas</span></div>
<div class="scai-svc-row"><span class="scai-svc-label">Payment Methods</span><span class="scai-svc-value">Accepting Cash, Credit Cards, Apple Pay, and Checks</span></div>
</div>`,
                  css: `/* 13. Soft Stone */
.scai-svc-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-svc-stone .scai-svc-header { font-size: 1.125rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e7e5e4; }
.scai-svc-stone .scai-svc-row { display: flex; flex-direction: column; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e7e5e4; gap: 0.25rem; }
@media (min-width: 640px) { .scai-svc-stone .scai-svc-row { flex-direction: row; align-items: center; } }
.scai-svc-stone .scai-svc-row:last-child { border-bottom: none; }
.scai-svc-stone .scai-svc-label { font-size: 0.9375rem; font-weight: 600; color: #57534e; min-width: 130px; }
.scai-svc-stone .scai-svc-value { font-size: 0.9375rem; color: #78716c; flex: 1; line-height: 1.6; }`,
            }],

      // INGREDIENTS
      ingredients: [
            // 1. Clean Studio - Minimal with subtle shadows
            {
                  name: "Clean Studio",
                  html: `<div class="scai-ing-studio" data-component="scai-ingredients-section" id="scai-q-ingredients-1">
<h2 class="scai-ing-h2" data-component="scai-ingredients-h2">Ingredients</h2>
<ul class="scai-ing-list" data-component="scai-ingredients-list">
<li>2 cups of premium all-purpose flour, measured using the scoop-and-level method</li>
<li>1 cup of fine granulated sugar for sweetening and aeration</li>
<li>1/2 cup of unsalted butter, softened to room temperature</li>
<li>2 large eggs, brought to room temperature for binding</li>
<li>1 teaspoon of pure vanilla extract for flavor enhancement</li>
<li>1/2 teaspoon of fine sea salt for balance</li>
</ul>
</div>`,
                  css: `/* 1. Clean Studio */
.scai-ing-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-ing-studio .scai-ing-h2 { font-size: 1.25rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #f5f5f5; text-transform: uppercase; letter-spacing: 0.05em; }
.scai-ing-studio .scai-ing-list { list-style: none; padding: 1.5rem; margin: 0; }
.scai-ing-studio .scai-ing-list li { padding: 0.75rem 0; font-size: 1rem; color: #525252; display: flex; gap: 0.75rem; align-items: flex-start; border-bottom: 1px solid #f5f5f5; line-height: 1.5; }
.scai-ing-studio .scai-ing-list li:last-child { border-bottom: none; }
.scai-ing-studio .scai-ing-list li::before { content: '☐'; color: #171717; font-size: 0.875rem; flex-shrink: 0; margin-top: 1px; }`,
            },// 8. Airy Premium - Spacious, minimal luxury feel
            {
                  name: "Airy Premium",
                  html: `<div class="scai-ing-airy" data-component="scai-ingredients-section" id="scai-q-ingredients-8">
<h2 class="scai-ing-h2" data-component="scai-ingredients-h2">Ingredients</h2>
<ul class="scai-ing-list" data-component="scai-ingredients-list">
<li>2 cups of premium all-purpose flour, measured using the scoop-and-level method</li>
<li>1 cup of fine granulated sugar for sweetening and aeration</li>
<li>1/2 cup of unsalted butter, softened to room temperature</li>
<li>2 large eggs, brought to room temperature for binding</li>
<li>1 teaspoon of pure vanilla extract for flavor enhancement</li>
<li>1/2 teaspoon of fine sea salt for balance</li>
</ul>
</div>`,
                  css: `/* 8. Airy Premium */
.scai-ing-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-ing-airy .scai-ing-h2 { font-size: 1.25rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; margin: 0; }
.scai-ing-airy .scai-ing-list { list-style: none; padding: 0 2rem 2rem; margin: 0; }
.scai-ing-airy .scai-ing-list li { padding: 1rem 0; font-size: 1rem; color: #525252; display: flex; gap: 1rem; align-items: flex-start; border-bottom: 1px solid #f5f5f5; line-height: 1.6; }
.scai-ing-airy .scai-ing-list li:last-child { border-bottom: none; }
.scai-ing-airy .scai-ing-list li::before { content: '—'; color: #a3a3a3; font-size: 0.875rem; flex-shrink: 0; }`,
            },// 10. Gradient Glow - Neutral gray gradient
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-ing-gradient" data-component="scai-ingredients-section" id="scai-q-ingredients-10">
<h2 class="scai-ing-h2" data-component="scai-ingredients-h2">Ingredients</h2>
<ul class="scai-ing-list" data-component="scai-ingredients-list">
<li>2 cups of premium all-purpose flour, measured using the scoop-and-level method</li>
<li>1 cup of fine granulated sugar for sweetening and aeration</li>
<li>1/2 cup of unsalted butter, softened to room temperature</li>
<li>2 large eggs, brought to room temperature for binding</li>
<li>1 teaspoon of pure vanilla extract for flavor enhancement</li>
<li>1/2 teaspoon of fine sea salt for balance</li>
</ul>
</div>`,
                  css: `/* 10. Gradient Glow */
.scai-ing-gradient { background: #fff; border-radius: 16px; overflow: visible; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-ing-gradient::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-ing-gradient .scai-ing-h2 { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.25rem 1.5rem; font-size: 1.25rem; font-weight: 700; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-ing-gradient .scai-ing-list { list-style: none; padding: 1.5rem; margin: 0; }
.scai-ing-gradient .scai-ing-list li { padding: 0.75rem 0; font-size: 1rem; color: #525252; display: flex; gap: 0.75rem; align-items: flex-start; border-bottom: 1px solid #f5f5f5; line-height: 1.5; }
.scai-ing-gradient .scai-ing-list li:last-child { border-bottom: none; }
.scai-ing-gradient .scai-ing-list li::before { content: '◆'; color: #737373; font-size: 0.5rem; flex-shrink: 0; margin-top: 5px; }`,
            },// 13. Soft Stone - Warm stone tones
            {
                  name: "Soft Stone",
                  html: `<div class="scai-ing-stone" data-component="scai-ingredients-section" id="scai-q-ingredients-13">
<h2 class="scai-ing-h2" data-component="scai-ingredients-h2">Ingredients</h2>
<ul class="scai-ing-list" data-component="scai-ingredients-list">
<li>2 cups of premium all-purpose flour, measured using the scoop-and-level method</li>
<li>1 cup of fine granulated sugar for sweetening and aeration</li>
<li>1/2 cup of unsalted butter, softened to room temperature</li>
<li>2 large eggs, brought to room temperature for binding</li>
<li>1 teaspoon of pure vanilla extract for flavor enhancement</li>
<li>1/2 teaspoon of fine sea salt for balance</li>
</ul>
</div>`,
                  css: `/* 13. Soft Stone */
.scai-ing-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-ing-stone .scai-ing-h2 { font-size: 1.25rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-ing-stone .scai-ing-list { list-style: none; padding: 1.5rem; margin: 0; }
.scai-ing-stone .scai-ing-list li { padding: 0.75rem 0; font-size: 1rem; color: #78716c; display: flex; gap: 0.75rem; align-items: flex-start; border-bottom: 1px solid #e7e5e4; line-height: 1.6; }
.scai-ing-stone .scai-ing-list li:last-child { border-bottom: none; }
.scai-ing-stone .scai-ing-list li::before { content: '•'; color: #78716c; font-size: 1rem; flex-shrink: 0; line-height: 1.3; }`,
            }],

      // INSTRUCTIONS
      instructions: [
            // 1. Clean Studio Instructions
            {
                  name: "Clean Studio",
                  html: `<div class="scai-inst-studio" data-component="scai-instructions-section" id="scai-q-instructions-1">
<h2 class="scai-instructions-h2" data-component="scai-instructions-h2">Step-by-Step Instructions</h2>
<ol class="scai-instructions-list" data-component="scai-instructions-list">
<li>Begin by preheating your oven to exactly 350°F (175°C) and ensuring the rack is in the center position.</li>
<li>In a medium mixing bowl, whisk together the flour and salt until they are thoroughly combined.</li>
<li>In a separate large bowl, cream the softened butter and granulated sugar together using an electric mixer.</li>
<li>Add the eggs one at a time to the butter mixture, beating well after each addition.</li>
<li>Gradually add the dry flour mixture to the wet ingredients in three batches, mixing until just combined.</li>
</ol>
</div>`,
                  css: `/* Clean Studio Instructions */
.scai-inst-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-inst-studio .scai-instructions-h2 { font-size: 1.25rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-inst-studio .scai-instructions-list { list-style: none; padding: 1.5rem; margin: 0; counter-reset: step; }
.scai-inst-studio .scai-instructions-list li { padding: 1rem 0; font-size: 1rem; color: #525252; display: flex; gap: 1rem; counter-increment: step; border-bottom: 1px solid #f5f5f5; line-height: 1.6; }
.scai-inst-studio .scai-instructions-list li:last-child { border-bottom: none; }
.scai-inst-studio .scai-instructions-list li::before { content: counter(step); background: #171717; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; }`,
            },// 8. Airy Premium Instructions
            {
                  name: "Airy Premium",
                  html: `<div class="scai-inst-airy" data-component="scai-instructions-section" id="scai-q-instructions-8">
<h2 class="scai-instructions-h2" data-component="scai-instructions-h2">Instructions</h2>
<ol class="scai-instructions-list" data-component="scai-instructions-list">
<li>Begin by preheating your oven to exactly 350°F (175°C) and ensuring the rack is in the center position.</li>
<li>In a medium mixing bowl, whisk together the flour and salt until they are thoroughly combined.</li>
<li>In a separate large bowl, cream the softened butter and granulated sugar together using an electric mixer.</li>
<li>Add the eggs one at a time to the butter mixture, beating well after each addition.</li>
<li>Gradually add the dry flour mixture to the wet ingredients in three batches, mixing until just combined.</li>
</ol>
</div>`,
                  css: `/* Airy Premium Instructions */
.scai-inst-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-inst-airy .scai-instructions-h2 { font-size: 1.25rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; margin: 0; }
.scai-inst-airy .scai-instructions-list { list-style: none; padding: 0 2rem 2rem; margin: 0; counter-reset: step; }
.scai-inst-airy .scai-instructions-list li { padding: 1rem 0; font-size: 1rem; color: #525252; display: flex; gap: 1rem; counter-increment: step; border-bottom: 1px solid #f5f5f5; line-height: 1.6; }
.scai-inst-airy .scai-instructions-list li:last-child { border-bottom: none; }
.scai-inst-airy .scai-instructions-list li::before { content: counter(step); background: linear-gradient(135deg, #f5f5f5, #e5e5e5); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 600; color: #171717; flex-shrink: 0; }`,
            },// 10. Gradient Glow Instructions
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-inst-glow" data-component="scai-instructions-section" id="scai-q-instructions-10">
<h2 class="scai-instructions-h2" data-component="scai-instructions-h2">Instructions</h2>
<ol class="scai-instructions-list" data-component="scai-instructions-list">
<li>Begin by preheating your oven to exactly 350°F (175°C) and ensuring the rack is in the center position.</li>
<li>In a medium mixing bowl, whisk together the flour and salt until they are thoroughly combined.</li>
<li>In a separate large bowl, cream the softened butter and granulated sugar together using an electric mixer.</li>
<li>Add the eggs one at a time to the butter mixture, beating well after each addition.</li>
<li>Gradually add the dry flour mixture to the wet ingredients in three batches, mixing until just combined.</li>
</ol>
</div>`,
                  css: `/* Gradient Glow Instructions */
.scai-inst-glow { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-inst-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-inst-glow .scai-instructions-h2 { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.5rem; font-size: 1.25rem; font-weight: 700; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-inst-glow .scai-instructions-list { list-style: none; padding: 1.5rem; margin: 0; counter-reset: step; }
.scai-inst-glow .scai-instructions-list li { padding: 1rem 0; font-size: 1rem; color: #525252; display: flex; gap: 1rem; counter-increment: step; border-bottom: 1px solid #f5f5f5; line-height: 1.6; }
.scai-inst-glow .scai-instructions-list li:last-child { border-bottom: none; }
.scai-inst-glow .scai-instructions-list li::before { content: counter(step); background: linear-gradient(135deg, #525252, #737373); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; }`,
            },// 13. Soft Stone Instructions
            {
                  name: "Soft Stone",
                  html: `<div class="scai-inst-stone" data-component="scai-instructions-section" id="scai-q-instructions-13">
<h2 class="scai-instructions-h2" data-component="scai-instructions-h2">Instructions</h2>
<ol class="scai-instructions-list" data-component="scai-instructions-list">
<li>Begin by preheating your oven to exactly 350°F (175°C) and ensuring the rack is in the center position.</li>
<li>In a medium mixing bowl, whisk together the flour and salt until they are thoroughly combined.</li>
<li>In a separate large bowl, cream the softened butter and granulated sugar together using an electric mixer.</li>
<li>Add the eggs one at a time to the butter mixture, beating well after each addition.</li>
<li>Gradually add the dry flour mixture to the wet ingredients in three batches, mixing until just combined.</li>
</ol>
</div>`,
                  css: `/* Soft Stone Instructions */
.scai-inst-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-inst-stone .scai-instructions-h2 { font-size: 1.25rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-inst-stone .scai-instructions-list { list-style: none; padding: 1.5rem; margin: 0; counter-reset: step; }
.scai-inst-stone .scai-instructions-list li { padding: 1rem 0; font-size: 1rem; color: #78716c; display: flex; gap: 1rem; counter-increment: step; border-bottom: 1px solid #e7e5e4; line-height: 1.6; }
.scai-inst-stone .scai-instructions-list li:last-child { border-bottom: none; }
.scai-inst-stone .scai-instructions-list li::before { content: counter(step); background: #e7e5e4; color: #57534e; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; }`,
            }],

      // RECIPE-TIPS
      "recipe-tips": [
            // 1. Clean Studio - Minimal with subtle shadows
            {
                  name: "Clean Studio",
                  html: `<div class="scai-tips-studio" data-component="scai-tips-section" id="scai-q-tips-section-1">
<h2 class="scai-tips-h2" data-component="scai-tips-h2">Chef's Tips</h2>
<p class="scai-tips-paragraph" data-component="scai-tips-paragraph">To guarantee the best possible results with this recipe, it is absolutely critical to ensure all your refrigerated ingredients, specifically the butter and eggs, are at room temperature before you begin. Room temperature ingredients emulsify much more easily, creating a lighter, fluffier texture in your final bake. Additionally, when measuring your flour, avoid scooping directly from the bag as this packs it down; instead, spoon it into your measuring cup and level it off with a flat knife.</p>
</div>`,
                  css: `/* 1. Clean Studio */
.scai-tips-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-tips-studio .scai-tips-h2 { font-size: 1.125rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-tips-studio .scai-tips-paragraph { font-size: 1rem; color: #525252; padding: 1.25rem 1.5rem; margin: 0; line-height: 1.6; }`,
            },// 8. Airy Premium - Spacious, minimal luxury feel
            {
                  name: "Airy Premium",
                  html: `<div class="scai-tips-airy" data-component="scai-tips-section" id="scai-q-tips-section-8">
<h2 class="scai-tips-h2" data-component="scai-tips-h2">Tips</h2>
<p class="scai-tips-paragraph" data-component="scai-tips-paragraph">To guarantee the best possible results with this recipe, it is absolutely critical to ensure all your refrigerated ingredients, specifically the butter and eggs, are at room temperature before you begin. Room temperature ingredients emulsify much more easily, creating a lighter, fluffier texture in your final bake. Additionally, when measuring your flour, avoid scooping directly from the bag as this packs it down; instead, spoon it into your measuring cup and level it off with a flat knife.</p>
</div>`,
                  css: `/* 8. Airy Premium */
.scai-tips-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-tips-airy .scai-tips-h2 { font-size: 1.125rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; margin: 0; }
.scai-tips-airy .scai-tips-paragraph { font-size: 1rem; color: #525252; padding: 0 2rem 2rem; margin: 0; line-height: 1.6; }`,
            },// 10. Gradient Glow - White with gray gradient border
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-tips-glow" data-component="scai-tips-section" id="scai-q-tips-section-10">
<h2 class="scai-tips-h2" data-component="scai-tips-h2">Tips</h2>
<p class="scai-tips-paragraph" data-component="scai-tips-paragraph">To guarantee the best possible results with this recipe, it is absolutely critical to ensure all your refrigerated ingredients, specifically the butter and eggs, are at room temperature before you begin. Room temperature ingredients emulsify much more easily, creating a lighter, fluffier texture in your final bake. Additionally, when measuring your flour, avoid scooping directly from the bag as this packs it down; instead, spoon it into your measuring cup and level it off with a flat knife.</p>
</div>`,
                  css: `/* 10. Gradient Glow */
.scai-tips-glow { background: #fff; border-radius: 16px; overflow: visible; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-tips-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-tips-glow .scai-tips-h2 { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.25rem 1.5rem; font-size: 1.125rem; font-weight: 700; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-tips-glow .scai-tips-paragraph { font-size: 1rem; color: #525252; padding: 1.25rem 1.5rem; margin: 0; line-height: 1.6; }`,
            },// 13. Soft Stone - Warm stone tones
            {
                  name: "Soft Stone",
                  html: `<div class="scai-tips-stone" data-component="scai-tips-section" id="scai-q-tips-section-13">
<h2 class="scai-tips-h2" data-component="scai-tips-h2">Chef's Tips</h2>
<p class="scai-tips-paragraph" data-component="scai-tips-paragraph">To guarantee the best possible results with this recipe, it is absolutely critical to ensure all your refrigerated ingredients, specifically the butter and eggs, are at room temperature before you begin. Room temperature ingredients emulsify much more easily, creating a lighter, fluffier texture in your final bake. Additionally, when measuring your flour, avoid scooping directly from the bag as this packs it down; instead, spoon it into your measuring cup and level it off with a flat knife.</p>
</div>`,
                  css: `/* 13. Soft Stone */
.scai-tips-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-tips-stone .scai-tips-h2 { font-size: 1.125rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-tips-stone .scai-tips-paragraph { font-size: 1rem; color: #78716c; padding: 1.25rem 1.5rem; margin: 0; line-height: 1.6; }`,
            }],

      // NUTRITION-TABLE
      "nutrition-table": [
            // 1. Clean Studio - Minimal with subtle shadows
            {
                  name: "Clean Studio",
                  html: `<div class="scai-nutr-studio" data-component="scai-nutrition-section" id="scai-q-nutrition-1">
<h2 class="scai-nutr-h2" data-component="scai-nutrition-h2">Nutrition Facts</h2>
<table class="scai-nutr-table" data-component="scai-nutrition-table">
<tbody>
<tr><td>Calories</td><td>250</td></tr>
<tr><td>Total Fat</td><td>12g</td></tr>
<tr><td>Carbohydrates</td><td>32g</td></tr>
<tr><td>Protein</td><td>4g</td></tr>
<tr><td>Sodium</td><td>180mg</td></tr>
<tr><td>Fiber</td><td>2g</td></tr>
</tbody>
</table>
<p class="scai-nutr-disclaimer">Values based on a 2,000 calorie diet. Consult a nutritionist for specific requirements.</p>
</div>`,
                  css: `/* 1. Clean Studio */
.scai-nutr-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-nutr-studio .scai-nutr-h2 { font-size: 1.125rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-nutr-studio .scai-nutr-table { width: 100%; border-collapse: collapse; }
.scai-nutr-studio .scai-nutr-table td { padding: 0.75rem 1.5rem; font-size: 0.9375rem; color: #525252; border-bottom: 1px solid #f5f5f5; }
.scai-nutr-studio .scai-nutr-table td:last-child { text-align: right; font-weight: 600; color: #171717; }
.scai-nutr-studio .scai-nutr-table tr:last-child td { border-bottom: none; }
.scai-nutr-studio .scai-nutr-disclaimer { font-size: 0.75rem; color: #737373; padding: 1rem 1.5rem; margin: 0; border-top: 1px solid #f5f5f5; }`,
            },// 8. Airy Premium - Spacious, minimal luxury feel
            {
                  name: "Airy Premium",
                  html: `<div class="scai-nutr-airy" data-component="scai-nutrition-section" id="scai-q-nutrition-8">
<h2 class="scai-nutr-h2" data-component="scai-nutrition-h2">Nutrition</h2>
<table class="scai-nutr-table" data-component="scai-nutrition-table">
<tbody>
<tr><td>Calories</td><td>250</td></tr>
<tr><td>Total Fat</td><td>12g</td></tr>
<tr><td>Carbohydrates</td><td>32g</td></tr>
<tr><td>Protein</td><td>4g</td></tr>
<tr><td>Sodium</td><td>180mg</td></tr>
<tr><td>Fiber</td><td>2g</td></tr>
</tbody>
</table>
<p class="scai-nutr-disclaimer">Values based on a 2,000 calorie diet.</p>
</div>`,
                  css: `/* 8. Airy Premium */
.scai-nutr-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-nutr-airy .scai-nutr-h2 { font-size: 1.125rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; margin: 0; }
.scai-nutr-airy .scai-nutr-table { width: 100%; border-collapse: collapse; }
.scai-nutr-airy .scai-nutr-table td { padding: 0.75rem 2rem; font-size: 0.9375rem; color: #525252; border-bottom: 1px solid #f5f5f5; }
.scai-nutr-airy .scai-nutr-table td:last-child { text-align: right; font-weight: 600; color: #171717; }
.scai-nutr-airy .scai-nutr-table tr:last-child td { border-bottom: none; }
.scai-nutr-airy .scai-nutr-disclaimer { font-size: 0.75rem; color: #a3a3a3; padding: 1rem 2rem 2rem; margin: 0; }`,
            },// 10. Gradient Glow - White with gray gradient border
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-nutr-glow" data-component="scai-nutrition-section" id="scai-q-nutrition-10">
<h2 class="scai-nutr-h2" data-component="scai-nutrition-h2">Nutrition Facts</h2>
<table class="scai-nutr-table" data-component="scai-nutrition-table">
<tbody>
<tr><td>Calories</td><td>250</td></tr>
<tr><td>Total Fat</td><td>12g</td></tr>
<tr><td>Carbohydrates</td><td>32g</td></tr>
<tr><td>Protein</td><td>4g</td></tr>
<tr><td>Sodium</td><td>180mg</td></tr>
<tr><td>Fiber</td><td>2g</td></tr>
</tbody>
</table>
<p class="scai-nutr-disclaimer">Values based on a 2,000 calorie diet.</p>
</div>`,
                  css: `/* 10. Gradient Glow */
.scai-nutr-glow { background: #fff; border-radius: 16px; overflow: visible; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-nutr-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-nutr-glow .scai-nutr-h2 { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.25rem 1.5rem; font-size: 1.125rem; font-weight: 700; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-nutr-glow .scai-nutr-table { width: 100%; border-collapse: collapse; }
.scai-nutr-glow .scai-nutr-table td { padding: 0.75rem 1.5rem; font-size: 0.9375rem; color: #525252; border-bottom: 1px solid #f5f5f5; }
.scai-nutr-glow .scai-nutr-table td:last-child { text-align: right; font-weight: 600; color: #171717; }
.scai-nutr-glow .scai-nutr-table tr:last-child td { border-bottom: none; }
.scai-nutr-glow .scai-nutr-disclaimer { font-size: 0.75rem; color: #737373; padding: 1rem 1.5rem; margin: 0; border-top: 1px solid #f5f5f5; }`,
            },// 13. Soft Stone - Warm stone tones
            {
                  name: "Soft Stone",
                  html: `<div class="scai-nutr-stone" data-component="scai-nutrition-section" id="scai-q-nutrition-13">
<h2 class="scai-nutr-h2" data-component="scai-nutrition-h2">Nutrition Facts</h2>
<table class="scai-nutr-table" data-component="scai-nutrition-table">
<tbody>
<tr><td>Calories</td><td>250</td></tr>
<tr><td>Total Fat</td><td>12g</td></tr>
<tr><td>Carbohydrates</td><td>32g</td></tr>
<tr><td>Protein</td><td>4g</td></tr>
<tr><td>Sodium</td><td>180mg</td></tr>
<tr><td>Fiber</td><td>2g</td></tr>
</tbody>
</table>
<p class="scai-nutr-disclaimer">Values based on a 2,000 calorie diet.</p>
</div>`,
                  css: `/* 13. Soft Stone */
.scai-nutr-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-nutr-stone .scai-nutr-h2 { font-size: 1.125rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-nutr-stone .scai-nutr-table { width: 100%; border-collapse: collapse; }
.scai-nutr-stone .scai-nutr-table td { padding: 0.75rem 1.5rem; font-size: 0.9375rem; color: #78716c; border-bottom: 1px solid #e7e5e4; }
.scai-nutr-stone .scai-nutr-table td:last-child { text-align: right; font-weight: 600; color: #57534e; }
.scai-nutr-stone .scai-nutr-table tr:last-child td { border-bottom: none; }
.scai-nutr-stone .scai-nutr-disclaimer { font-size: 0.75rem; color: #78716c; padding: 1rem 1.5rem; margin: 0; border-top: 1px solid #e7e5e4; }`,
            }],

      // FEATURES-LIST
      "features-list": [
            // 1. Clean Studio - Minimal with subtle shadows
            {
                  name: "Clean Studio",
                  html: `<div class="scai-feat-studio" data-component="scai-features-section" id="scai-q-features-1">
<h2 class="scai-feat-h2" data-component="scai-features-h2">Key Features</h2>
<ul class="scai-feat-list" data-component="scai-features-list">
<li>Advanced AI-driven automation reducing manual tasks by 40%</li>
<li>Real-time analytics dashboard with customizable insights</li>
<li>Seamless integration with 200+ popular applications</li>
<li>Enterprise-grade security with end-to-end encryption</li>
<li>Native mobile apps for iOS and Android devices</li>
<li>24/7 priority customer support via chat and phone</li>
</ul>
</div>`,
                  css: `/* 1. Clean Studio */
.scai-feat-studio { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.scai-feat-studio .scai-feat-h2 { font-size: 1.125rem; font-weight: 600; color: #171717; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-feat-studio .scai-feat-list { list-style: none; padding: 0; margin: 0; }
.scai-feat-studio .scai-feat-list li { padding: 0.75rem 1.5rem; font-size: 1rem; color: #525252; border-bottom: 1px solid #f5f5f5; position: relative; padding-left: 2.5rem; }
.scai-feat-studio .scai-feat-list li::before { content: '✓'; position: absolute; left: 1.5rem; color: #171717; font-weight: 600; }
.scai-feat-studio .scai-feat-list li:last-child { border-bottom: none; }`,
            },// 8. Airy Premium - Spacious, minimal luxury feel
            {
                  name: "Airy Premium",
                  html: `<div class="scai-feat-airy" data-component="scai-features-section" id="scai-q-features-8">
<h2 class="scai-feat-h2" data-component="scai-features-h2">Features</h2>
<ul class="scai-feat-list" data-component="scai-features-list">
<li>Advanced AI-driven automation reducing manual tasks</li>
<li>Real-time analytics dashboard with customizable insights</li>
<li>Seamless integration with 200+ popular applications</li>
<li>Enterprise-grade security with end-to-end encryption</li>
<li>Native mobile apps for iOS and Android devices</li>
<li>24/7 priority customer support via chat and phone</li>
</ul>
</div>`,
                  css: `/* 8. Airy Premium */
.scai-feat-airy { background: linear-gradient(to bottom right, #fff, #fafafa); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.1); }
.scai-feat-airy .scai-feat-h2 { font-size: 1.125rem; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.2em; padding: 2rem 2rem 1rem; margin: 0; }
.scai-feat-airy .scai-feat-list { list-style: none; padding: 0 2rem 2rem; margin: 0; }
.scai-feat-airy .scai-feat-list li { padding: 0.75rem 0; font-size: 1rem; color: #525252; border-bottom: 1px solid #f5f5f5; position: relative; padding-left: 1.5rem; }
.scai-feat-airy .scai-feat-list li::before { content: '—'; position: absolute; left: 0; color: #a3a3a3; }
.scai-feat-airy .scai-feat-list li:last-child { border-bottom: none; }`,
            },// 10. Gradient Glow - White with gray gradient border
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-feat-glow" data-component="scai-features-section" id="scai-q-features-10">
<h2 class="scai-feat-h2" data-component="scai-features-h2">Features</h2>
<ul class="scai-feat-list" data-component="scai-features-list">
<li>Advanced AI-driven automation reducing manual tasks</li>
<li>Real-time analytics dashboard with customizable insights</li>
<li>Seamless integration with 200+ popular applications</li>
<li>Enterprise-grade security with end-to-end encryption</li>
<li>Native mobile apps for iOS and Android devices</li>
<li>24/7 priority customer support via chat and phone</li>
</ul>
</div>`,
                  css: `/* 10. Gradient Glow */
.scai-feat-glow { background: #fff; border-radius: 16px; overflow: visible; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 2px solid transparent; background-clip: padding-box; position: relative; }
.scai-feat-glow::before { content: ''; position: absolute; inset: -2px; border-radius: 18px; background: linear-gradient(135deg, #a3a3a3, #525252, #737373); z-index: -1; }
.scai-feat-glow .scai-feat-h2 { background: linear-gradient(135deg, #525252, #737373); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 1.25rem 1.5rem; font-size: 1.125rem; font-weight: 700; margin: 0; border-bottom: 1px solid #f5f5f5; }
.scai-feat-glow .scai-feat-list { list-style: none; padding: 0; margin: 0; }
.scai-feat-glow .scai-feat-list li { padding: 0.75rem 1.5rem; font-size: 1rem; color: #525252; border-bottom: 1px solid #f5f5f5; position: relative; padding-left: 2.5rem; }
.scai-feat-glow .scai-feat-list li::before { content: '●'; position: absolute; left: 1.5rem; font-size: 0.5rem; color: #737373; top: 1rem; }
.scai-feat-glow .scai-feat-list li:last-child { border-bottom: none; }`,
            },// 13. Soft Stone - Warm stone tones
            {
                  name: "Soft Stone",
                  html: `<div class="scai-feat-stone" data-component="scai-features-section" id="scai-q-features-13">
<h2 class="scai-feat-h2" data-component="scai-features-h2">Features</h2>
<ul class="scai-feat-list" data-component="scai-features-list">
<li>Advanced AI-driven automation reducing manual tasks</li>
<li>Real-time analytics dashboard with customizable insights</li>
<li>Seamless integration with 200+ popular applications</li>
<li>Enterprise-grade security with end-to-end encryption</li>
<li>Native mobile apps for iOS and Android devices</li>
<li>24/7 priority customer support via chat and phone</li>
</ul>
</div>`,
                  css: `/* 13. Soft Stone */
.scai-feat-stone { background: #fafaf9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(120,113,108,0.1); }
.scai-feat-stone .scai-feat-h2 { font-size: 1.125rem; font-weight: 600; color: #57534e; padding: 1.25rem 1.5rem; margin: 0; border-bottom: 1px solid #e7e5e4; }
.scai-feat-stone .scai-feat-list { list-style: none; padding: 0; margin: 0; }
.scai-feat-stone .scai-feat-list li { padding: 0.75rem 1.5rem; font-size: 1rem; color: #78716c; border-bottom: 1px solid #e7e5e4; position: relative; padding-left: 2.5rem; }
.scai-feat-stone .scai-feat-list li::before { content: '◆'; position: absolute; left: 1.5rem; color: #a8a29e; font-size: 0.5rem; top: 1rem; }
.scai-feat-stone .scai-feat-list li:last-child { border-bottom: none; }`,
            }],

      // PROS-CONS
      "pros-cons": [
            // 1. Clean Studio - Refined minimalism with subtle shadows
            {
                  name: "Clean Studio",
                  html: `<div class="scai-pc-studio" data-component="scai-pros-cons-section" id="scai-q-pros-cons-1">
<h2 class="scai-pc-h2">Pros and Cons</h2>
<div class="scai-pc-grid">
<div class="scai-pc-pros">
<div class="scai-pc-header">Advantages</div>
<ul class="scai-pc-list" data-component="scai-pros-list">
<li>Exceptionally intuitive user interface requiring no training</li>
<li>Outstanding 24/7 customer support with rapid response</li>
<li>Comprehensive feature set replacing multiple tools</li>
<li>Regular updates adding new functionality seamlessly</li>
<li>Highly competitive pricing with superior value</li>
</ul>
</div>
<div class="scai-pc-cons">
<div class="scai-pc-header">Limitations</div>
<ul class="scai-pc-list" data-component="scai-cons-list">
<li>Steep learning curve for advanced automation</li>
<li>Limited mobile app functionality vs desktop</li>
<li>Premium features locked behind higher tiers</li>
<li>Restricted offline functionality</li>
<li>Complex legacy system integration setup</li>
</ul>
</div>
</div>
</div>`,
                  css: `/* 1. Clean Studio - Refined minimalism */
.scai-pc-studio { background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
.scai-pc-studio .scai-pc-h2 { font-size: 1.125rem; font-weight: 600; color: #171717; padding: 1.5rem; margin: 0; border-bottom: 1px solid #e5e5e5; }
.scai-pc-studio .scai-pc-grid { display: flex; }
.scai-pc-studio .scai-pc-pros, .scai-pc-studio .scai-pc-cons { flex: 1; padding: 1.5rem; }
.scai-pc-studio .scai-pc-pros { border-right: 1px solid #e5e5e5; }
.scai-pc-studio .scai-pc-header { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #525252; margin-bottom: 1rem; }
.scai-pc-studio .scai-pc-list { list-style: none; padding: 0; margin: 0; }
.scai-pc-studio .scai-pc-list li { position: relative; padding: 0.625rem 0 0.625rem 1.5rem; font-size: 0.9375rem; color: #525252; border-bottom: 1px solid #f5f5f5; }
.scai-pc-studio .scai-pc-list li:last-child { border-bottom: none; }
.scai-pc-studio .scai-pc-pros .scai-pc-list li::before { content: '+'; position: absolute; left: 0; font-weight: 600; color: #171717; }
.scai-pc-studio .scai-pc-cons .scai-pc-list li::before { content: '−'; position: absolute; left: 0; font-weight: 600; color: #737373; }
@media (max-width: 768px) { .scai-pc-studio .scai-pc-grid { flex-direction: column; } .scai-pc-studio .scai-pc-pros { border-right: none; border-bottom: 1px solid #e5e5e5; } }`,
            },
            // Neo-Brutalist Pros/Cons// Glass Frost Pros/Cons// Dark Elegance Pros/Cons// Swiss Grid Pros/Cons// Eco Paper Pros/Cons// 8. Airy Premium - Generous white space
            {
                  name: "Airy Premium",
                  html: `<div class="scai-pc-airy" data-component="scai-pros-cons-section" id="scai-q-pros-cons-8">
<h2 class="scai-pc-h2">Pros and Cons</h2>
<div class="scai-pc-grid">
<div class="scai-pc-pros">
<div class="scai-pc-header">Pros</div>
<ul class="scai-pc-list" data-component="scai-pros-list">
<li>Exceptionally intuitive user interface requiring no training</li>
<li>Outstanding 24/7 customer support with rapid response</li>
<li>Comprehensive feature set replacing multiple tools</li>
<li>Regular updates adding new functionality seamlessly</li>
<li>Highly competitive pricing with superior value</li>
</ul>
</div>
<div class="scai-pc-cons">
<div class="scai-pc-header">Cons</div>
<ul class="scai-pc-list" data-component="scai-cons-list">
<li>Steep learning curve for advanced automation</li>
<li>Limited mobile app functionality vs desktop</li>
<li>Premium features locked behind higher tiers</li>
<li>Restricted offline functionality</li>
<li>Complex legacy system integration setup</li>
</ul>
</div>
</div>
</div>`,
                  css: `/* 8. Airy Premium */
.scai-pc-airy { background: #fafafa; border-radius: 16px; padding: 3rem; }
.scai-pc-airy .scai-pc-h2 { font-size: 1.125rem; font-weight: 300; color: #262626; text-align: center; margin: 0 0 2.5rem 0; letter-spacing: 0.1em; }
.scai-pc-airy .scai-pc-grid { display: flex; gap: 3rem; }
.scai-pc-airy .scai-pc-pros, .scai-pc-airy .scai-pc-cons { flex: 1; }
.scai-pc-airy .scai-pc-header { font-size: 0.8125rem; font-weight: 500; color: #737373; margin-bottom: 1.5rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e5e5e5; }
.scai-pc-airy .scai-pc-list { list-style: none; padding: 0; margin: 0; }
.scai-pc-airy .scai-pc-list li { position: relative; padding: 1rem 0 1rem 1.5rem; font-size: 0.9375rem; font-weight: 300; color: #525252; line-height: 1.6; }
.scai-pc-airy .scai-pc-pros .scai-pc-list li::before { content: '+'; position: absolute; left: 0; font-weight: 400; color: #171717; }
.scai-pc-airy .scai-pc-cons .scai-pc-list li::before { content: '−'; position: absolute; left: 0; font-weight: 400; color: #737373; }
@media (max-width: 768px) { .scai-pc-airy { padding: 2rem; } .scai-pc-airy .scai-pc-grid { flex-direction: column; gap: 2rem; } }`,
            },// 10. Gradient Glow - Subtle gradient background
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-pc-gradient" data-component="scai-pros-cons-section" id="scai-q-pros-cons-10">
<h2 class="scai-pc-h2">Pros and Cons</h2>
<div class="scai-pc-grid">
<div class="scai-pc-pros">
<div class="scai-pc-header">Advantages</div>
<ul class="scai-pc-list" data-component="scai-pros-list">
<li>Exceptionally intuitive user interface requiring no training</li>
<li>Outstanding 24/7 customer support with rapid response</li>
<li>Comprehensive feature set replacing multiple tools</li>
<li>Regular updates adding new functionality seamlessly</li>
<li>Highly competitive pricing with superior value</li>
</ul>
</div>
<div class="scai-pc-cons">
<div class="scai-pc-header">Drawbacks</div>
<ul class="scai-pc-list" data-component="scai-cons-list">
<li>Steep learning curve for advanced automation</li>
<li>Limited mobile app functionality vs desktop</li>
<li>Premium features locked behind higher tiers</li>
<li>Restricted offline functionality</li>
<li>Complex legacy system integration setup</li>
</ul>
</div>
</div>
</div>`,
                  css: `/* 10. Gradient Glow */
.scai-pc-gradient { background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 50%, #e5e5e5 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
.scai-pc-gradient .scai-pc-h2 { font-size: 1.125rem; font-weight: 500; color: #171717; padding: 1.5rem 2rem; margin: 0; background: rgba(255,255,255,0.6); border-bottom: 1px solid rgba(0,0,0,0.06); }
.scai-pc-gradient .scai-pc-grid { display: flex; }
.scai-pc-gradient .scai-pc-pros, .scai-pc-gradient .scai-pc-cons { flex: 1; padding: 1.5rem 2rem; }
.scai-pc-gradient .scai-pc-pros { border-right: 1px solid rgba(0,0,0,0.06); }
.scai-pc-gradient .scai-pc-header { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #525252; margin-bottom: 1.25rem; }
.scai-pc-gradient .scai-pc-list { list-style: none; padding: 0; margin: 0; }
.scai-pc-gradient .scai-pc-list li { position: relative; padding: 0.75rem 0 0.75rem 1.5rem; font-size: 0.9375rem; color: #374151; background: rgba(255,255,255,0.4); margin-bottom: 0.5rem; border-radius: 6px; }
.scai-pc-gradient .scai-pc-list li:last-child { margin-bottom: 0; }
.scai-pc-gradient .scai-pc-pros .scai-pc-list li::before { content: '+'; position: absolute; left: 0.5rem; font-weight: 600; color: #171717; }
.scai-pc-gradient .scai-pc-cons .scai-pc-list li::before { content: '−'; position: absolute; left: 0.5rem; font-weight: 600; color: #737373; }
@media (max-width: 768px) { .scai-pc-gradient .scai-pc-grid { flex-direction: column; } .scai-pc-gradient .scai-pc-pros { border-right: none; border-bottom: 1px solid rgba(0,0,0,0.06); } }`,
            },// 13. Soft Stone - Warm neutral tones
            {
                  name: "Soft Stone",
                  html: `<div class="scai-pc-stone" data-component="scai-pros-cons-section" id="scai-q-pros-cons-13">
<h2 class="scai-pc-h2">Pros and Cons</h2>
<div class="scai-pc-grid">
<div class="scai-pc-pros">
<div class="scai-pc-header">Advantages</div>
<ul class="scai-pc-list" data-component="scai-pros-list">
<li>Exceptionally intuitive user interface requiring no training</li>
<li>Outstanding 24/7 customer support with rapid response</li>
<li>Comprehensive feature set replacing multiple tools</li>
<li>Regular updates adding new functionality seamlessly</li>
<li>Highly competitive pricing with superior value</li>
</ul>
</div>
<div class="scai-pc-cons">
<div class="scai-pc-header">Considerations</div>
<ul class="scai-pc-list" data-component="scai-cons-list">
<li>Steep learning curve for advanced automation</li>
<li>Limited mobile app functionality vs desktop</li>
<li>Premium features locked behind higher tiers</li>
<li>Restricted offline functionality</li>
<li>Complex legacy system integration setup</li>
</ul>
</div>
</div>
</div>`,
                  css: `/* 13. Soft Stone */
.scai-pc-stone { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden; }
.scai-pc-stone .scai-pc-h2 { font-size: 1.125rem; font-weight: 500; color: #44403c; padding: 1.5rem; margin: 0; background: #f5f5f4; border-bottom: 1px solid #e7e5e4; }
.scai-pc-stone .scai-pc-grid { display: flex; }
.scai-pc-stone .scai-pc-pros, .scai-pc-stone .scai-pc-cons { flex: 1; padding: 1.5rem; }
.scai-pc-stone .scai-pc-pros { border-right: 1px solid #e7e5e4; }
.scai-pc-stone .scai-pc-header { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #78716c; margin-bottom: 1rem; }
.scai-pc-stone .scai-pc-list { list-style: none; padding: 0; margin: 0; }
.scai-pc-stone .scai-pc-list li { position: relative; padding: 0.75rem 0 0.75rem 1.5rem; font-size: 0.9375rem; color: #57534e; border-bottom: 1px solid #f5f5f4; }
.scai-pc-stone .scai-pc-list li:last-child { border-bottom: none; }
.scai-pc-stone .scai-pc-pros .scai-pc-list li::before { content: '✓'; position: absolute; left: 0; font-weight: 500; color: #57534e; }
.scai-pc-stone .scai-pc-cons .scai-pc-list li::before { content: '✗'; position: absolute; left: 0; font-weight: 500; color: #a8a29e; }
@media (max-width: 768px) { .scai-pc-stone .scai-pc-grid { flex-direction: column; } .scai-pc-stone .scai-pc-pros { border-right: none; border-bottom: 1px solid #e7e5e4; } }`,
            }],

      // RATING
      rating: [
            // 1. Clean Studio - Refined minimalism with subtle shadows
            {
                  name: "Clean Studio",
                  html: `<div class="scai-rt-studio" data-component="scai-rating-section" id="scai-q-rating-1">
<h2 class="scai-rt-h2">Our Verdict</h2>
<div class="scai-rt-body">
<div class="scai-rt-score-wrap">
<span class="scai-rt-score" data-component="scai-rating-score">8.5</span>
<span class="scai-rt-label">out of 10</span>
</div>
<div class="scai-rt-content">
<h3 class="scai-rt-title">Excellent</h3>
<p class="scai-rt-paragraph" data-component="scai-rating-paragraph">After extensive testing, we award this product a strong 8.5 out of 10. This score reflects its exceptional feature set, intuitive user experience, and outstanding overall value. Teams of all sizes can adapt quickly thanks to the user-friendly design, while 24/7 support ensures smooth operations. A smart, future-proof investment.</p>
</div>
</div>
</div>`,
                  css: `/* 1. Clean Studio */
.scai-rt-studio { background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 2rem; }
.scai-rt-studio .scai-rt-h2 { font-size: 1.125rem; font-weight: 600; color: #171717; margin: 0 0 1.5rem 0; padding-bottom: 1rem; border-bottom: 1px solid #e5e5e5; }
.scai-rt-studio .scai-rt-body { display: flex; gap: 2rem; align-items: flex-start; }
.scai-rt-studio .scai-rt-score-wrap { text-align: center; flex-shrink: 0; }
.scai-rt-studio .scai-rt-score { font-size: 3rem; font-weight: 600; color: #171717; display: block; line-height: 1; }
.scai-rt-studio .scai-rt-label { font-size: 0.75rem; color: #737373; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-top: 0.5rem; }
.scai-rt-studio .scai-rt-content { flex: 1; }
.scai-rt-studio .scai-rt-title { font-size: 1rem; font-weight: 600; color: #171717; margin: 0 0 0.75rem 0; }
.scai-rt-studio .scai-rt-paragraph { font-size: 1rem; line-height: 1.7; color: #525252; margin: 0; }
@media (max-width: 640px) { .scai-rt-studio .scai-rt-body { flex-direction: column; } }`,
            },// 8. Airy Premium - Generous white space
            {
                  name: "Airy Premium",
                  html: `<div class="scai-rt-airy" data-component="scai-rating-section" id="scai-q-rating-8">
<div class="scai-rt-body">
<div class="scai-rt-score-wrap">
<span class="scai-rt-score" data-component="scai-rating-score">8.5</span>
<span class="scai-rt-label">Exceptional</span>
</div>
<div class="scai-rt-content">
<h3 class="scai-rt-title">Our Verdict</h3>
<p class="scai-rt-paragraph" data-component="scai-rating-paragraph">After extensive testing, we award this product a strong 8.5 out of 10. This score reflects its exceptional feature set, intuitive user experience, and outstanding overall value. Teams of all sizes can adapt quickly thanks to the user-friendly design. A smart, future-proof investment.</p>
</div>
</div>
</div>`,
                  css: `/* 8. Airy Premium */
.scai-rt-airy { background: #fafafa; border-radius: 16px; padding: 3rem; }
.scai-rt-airy .scai-rt-body { display: flex; gap: 3rem; align-items: center; }
.scai-rt-airy .scai-rt-score-wrap { text-align: center; flex-shrink: 0; }
.scai-rt-airy .scai-rt-score { font-size: 3rem; font-weight: 200; color: #262626; display: block; line-height: 1; }
.scai-rt-airy .scai-rt-label { font-size: 0.8125rem; font-weight: 400; color: #737373; display: block; margin-top: 0.75rem; letter-spacing: 0.05em; }
.scai-rt-airy .scai-rt-content { flex: 1; }
.scai-rt-airy .scai-rt-title { font-size: 1rem; font-weight: 400; color: #525252; margin: 0 0 1rem 0; letter-spacing: 0.05em; }
.scai-rt-airy .scai-rt-paragraph { font-size: 1rem; font-weight: 300; line-height: 1.8; color: #525252; margin: 0; }
@media (max-width: 640px) { .scai-rt-airy { padding: 2rem; } .scai-rt-airy .scai-rt-body { flex-direction: column; text-align: center; gap: 2rem; } }`,
            },// 10. Gradient Glow - Subtle gradient background
            {
                  name: "Gradient Glow",
                  html: `<div class="scai-rt-gradient" data-component="scai-rating-section" id="scai-q-rating-10">
<div class="scai-rt-body">
<div class="scai-rt-score-wrap">
<span class="scai-rt-score" data-component="scai-rating-score">8.5</span>
<span class="scai-rt-label">out of 10</span>
</div>
<div class="scai-rt-content">
<h3 class="scai-rt-title">Our Verdict</h3>
<p class="scai-rt-paragraph" data-component="scai-rating-paragraph">After extensive testing, we award this product a strong 8.5 out of 10. This score reflects its exceptional feature set, intuitive user experience, and outstanding overall value. Teams of all sizes can adapt quickly thanks to the user-friendly design.</p>
</div>
</div>
</div>`,
                  css: `/* 10. Gradient Glow */
.scai-rt-gradient { background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 50%, #e5e5e5 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.08); padding: 2rem; }
.scai-rt-gradient .scai-rt-body { display: flex; gap: 2rem; align-items: center; }
.scai-rt-gradient .scai-rt-score-wrap { text-align: center; flex-shrink: 0; background: rgba(255,255,255,0.8); padding: 1.5rem 2rem; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
.scai-rt-gradient .scai-rt-score { font-size: 3rem; font-weight: 600; color: #171717; display: block; line-height: 1; }
.scai-rt-gradient .scai-rt-label { font-size: 0.75rem; color: #737373; display: block; margin-top: 0.5rem; }
.scai-rt-gradient .scai-rt-content { flex: 1; }
.scai-rt-gradient .scai-rt-title { font-size: 1.125rem; font-weight: 500; color: #171717; margin: 0 0 1rem 0; }
.scai-rt-gradient .scai-rt-paragraph { font-size: 1rem; line-height: 1.7; color: #525252; margin: 0; }
@media (max-width: 640px) { .scai-rt-gradient .scai-rt-body { flex-direction: column; text-align: center; } }`,
            },// 13. Soft Stone - Warm neutral tones
            {
                  name: "Soft Stone",
                  html: `<div class="scai-rt-stone" data-component="scai-rating-section" id="scai-q-rating-13">
<div class="scai-rt-body">
<div class="scai-rt-score-wrap">
<span class="scai-rt-score" data-component="scai-rating-score">8.5</span>
<span class="scai-rt-label">Excellent</span>
</div>
<div class="scai-rt-content">
<h3 class="scai-rt-title">Our Verdict</h3>
<p class="scai-rt-paragraph" data-component="scai-rating-paragraph">After extensive testing, we award this product a strong 8.5 out of 10. This score reflects its exceptional feature set, intuitive user experience, and outstanding overall value. Teams of all sizes can adapt quickly thanks to the user-friendly design.</p>
</div>
</div>
</div>`,
                  css: `/* 13. Soft Stone */
.scai-rt-stone { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden; padding: 2rem; }
.scai-rt-stone .scai-rt-body { display: flex; gap: 2rem; align-items: center; }
.scai-rt-stone .scai-rt-score-wrap { text-align: center; flex-shrink: 0; background: #f5f5f4; padding: 1.5rem 2rem; border-radius: 8px; }
.scai-rt-stone .scai-rt-score { font-size: 3rem; font-weight: 500; color: #44403c; display: block; line-height: 1; }
.scai-rt-stone .scai-rt-label { font-size: 0.75rem; color: #78716c; display: block; margin-top: 0.5rem; }
.scai-rt-stone .scai-rt-content { flex: 1; }
.scai-rt-stone .scai-rt-title { font-size: 1.125rem; font-weight: 500; color: #44403c; margin: 0 0 1rem 0; }
.scai-rt-stone .scai-rt-paragraph { font-size: 1rem; line-height: 1.7; color: #57534e; margin: 0; }
@media (max-width: 640px) { .scai-rt-stone .scai-rt-body { flex-direction: column; text-align: center; } }`,
            }],
};
