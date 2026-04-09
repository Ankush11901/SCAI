"use client";

import { ArticleType } from "@/data/article-types";
import { ImageIcon, Download } from "lucide-react";
import { IsolatedArticlePreview } from "@/components/article/IsolatedArticlePreview";

interface LiveBuilderProps {
  content: string;
  articleType: ArticleType | null;
  isGenerating: boolean;
}

/**
 * LiveBuilder
 * Real-time article preview during generation
 */
export default function LiveBuilder({
  content,
  articleType,
  isGenerating,
}: LiveBuilderProps) {
  const handleDownload = () => {
    if (!content) return;

    // Comprehensive styles matching the in-app preview
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${articleType?.name || "Article"}</title>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Georgia&display=swap" rel="stylesheet">
  <style>
    /* ═══════════════════════════════════════════════════════════════════════════════
       SCAI ARTICLE - COMPREHENSIVE STYLES
       ═══════════════════════════════════════════════════════════════════════════════ */
    
    /* Base */
    html { scroll-behavior: smooth; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      line-height: 1.8;
      color: #111827;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background: #fff;
    }
    
    /* Typography */
    h1 { font-size: 2.5rem; font-weight: 900; margin-bottom: 1.5rem; line-height: 1.1; color: #000; letter-spacing: -0.03em; font-family: 'Inter', sans-serif; }
    h2 { font-size: 1.75rem; font-weight: 800; margin-top: 2.5rem; margin-bottom: 1.25rem; color: #000; letter-spacing: -0.02em; font-family: 'Inter', sans-serif; scroll-margin-top: 80px; }
    h3 { font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #111; font-family: 'Inter', sans-serif; }
    p { margin-bottom: 1.5rem; color: #374151; font-size: 1.1rem; }
    ul, ol { margin-bottom: 1.5rem; padding-left: 1.5rem; color: #374151; }
    li { margin-bottom: 0.5rem; }
    blockquote { border-left: 4px solid #000; padding-left: 1.5rem; font-style: italic; color: #4B5563; margin: 2rem 0; }
    
    /* Sections - scroll margin for TOC links */
    section[id] { scroll-margin-top: 80px; }
    
    /* Images */
    img { max-width: 100%; height: auto; max-height: 400px; width: 100%; object-fit: cover; border-radius: 20px; margin: 2rem 0; box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.1); }
    
    /* Tables */
    table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.95rem; }
    th, td { padding: 0.75rem 1rem; border: 1px solid #E5E7EB; text-align: left; }
    th { background-color: #F9FAFB; font-weight: 700; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       TABLE OF CONTENTS
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-toc, nav[data-component="scai-toc"] { background: #f0f7ff; border-radius: 8px; padding: 1.5rem 2rem; margin: 2rem 0; }
    .scai-toc-title { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.25rem; font-weight: 700; color: #1a1a1a; margin: 0 0 1rem 0; }
    .scai-toc-list { list-style: none; padding: 0; margin: 0; }
    .scai-toc-list > li { margin: 0.5rem 0; }
    .scai-toc-list > li > a { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; color: #1a1a1a; text-decoration: none; font-weight: 600; }
    .scai-toc-list > li > a:hover { color: #2563eb; text-decoration: underline; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       FAQ SECTION
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-faq { margin: 2.5rem 0; padding: 2rem; background: #fafafa; border-radius: 8px; }
    .scai-faq-title { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.5rem; font-weight: 700; color: #1a1a1a; margin: 0 0 1.5rem 0; }
    .scai-faq-item { margin: 1.25rem 0; padding-bottom: 1.25rem; border-bottom: 1px solid #e5e7eb; }
    .scai-faq-item:last-child { border-bottom: none; padding-bottom: 0; }
    .scai-faq-question { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.0625rem; font-weight: 700; color: #1a1a1a; margin: 0 0 0.5rem 0; }
    .scai-faq-answer { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; line-height: 1.7; color: #4b5563; margin: 0; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       CLOSING SECTION
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-closing { margin: 2.5rem 0; padding: 2rem; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; border-left: 4px solid #1a1a1a; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       PRODUCT CARD (Affiliate)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-product-card { display: flex; gap: 1.5rem; padding: 1.5rem; margin: 1.5rem 0; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); }
    .scai-product-image { position: relative; flex-shrink: 0; width: 200px; }
    .scai-product-image img { width: 100%; max-width: 200px; height: auto; max-height: 200px; object-fit: contain; border-radius: 8px; margin: 0; box-shadow: none; }
    .scai-product-badge { position: absolute; top: 8px; left: 8px; background: #dc2626; color: white; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.5rem; border-radius: 4px; }
    .scai-product-details { flex: 1; }
    .scai-product-name { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.25rem; font-weight: 700; color: #1a1a1a; margin: 0 0 0.5rem 0; }
    .scai-product-rating { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .scai-stars { color: #f59e0b; font-size: 1rem; }
    .scai-review-count { font-size: 0.875rem; color: #6b7280; }
    .scai-product-price { font-size: 1.5rem; font-weight: 700; color: #16a34a; margin-bottom: 0.75rem; }
    .scai-product-pros { list-style: none; padding: 0; margin: 0 0 1rem 0; }
    .scai-product-pros li { font-size: 0.9375rem; color: #374151; padding: 0.25rem 0; padding-left: 1.25rem; position: relative; }
    .scai-product-pros li::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; background: #16a34a; border-radius: 50%; }
    .scai-amazon-button { display: inline-block; background: linear-gradient(180deg, #f7ca00 0%, #f0a804 100%); color: #111; font-weight: 700; font-size: 0.9375rem; padding: 0.75rem 1.5rem; border-radius: 24px; text-decoration: none; transition: transform 0.15s, box-shadow 0.15s; }
    .scai-amazon-button:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(240, 168, 4, 0.3); }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       FEATURE LIST (Commercial)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-feature-list { margin: 2.5rem 0; padding: 1.5rem; background: #f0fdf4; border-radius: 8px; }
    .scai-feature-list ul { list-style: none; padding: 0; margin: 0; }
    .scai-feature-list li { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; color: #166534; padding: 0.5rem 0; padding-left: 1.75rem; position: relative; }
    .scai-feature-list li::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; background: #16a34a; border-radius: 50%; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       CTA BOX (Commercial)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-cta-box { margin: 2rem 0; padding: 2rem; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px; text-align: center; }
    .scai-cta-text { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.125rem; color: #ffffff; margin: 0 0 1.25rem 0; }
    .scai-cta-button { display: inline-block; background: #ffffff; color: #1e40af; font-weight: 700; font-size: 1rem; padding: 0.875rem 2rem; border-radius: 8px; text-decoration: none; transition: transform 0.15s, box-shadow 0.15s; }
    .scai-cta-button:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       COMPARISON TABLE
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-comparison-table { margin: 2rem 0; overflow-x: auto; }
    .scai-comparison-table table { width: 100%; border-collapse: collapse; font-family: 'Georgia', 'Times New Roman', serif; }
    .scai-comparison-table th { background: #f3f4f6; font-weight: 700; font-size: 0.9375rem; color: #1a1a1a; padding: 1rem; text-align: left; border: 1px solid #e5e7eb; }
    .scai-comparison-table td { padding: 0.875rem 1rem; font-size: 0.9375rem; color: #374151; border: 1px solid #e5e7eb; }
    .scai-comparison-table tbody tr:nth-child(even) { background: #fafafa; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       QUICK VERDICT (Comparison)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-quick-verdict { margin: 2rem 0; padding: 1.5rem; background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; }
    .scai-verdict-title { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.125rem; font-weight: 700; color: #92400e; margin: 0 0 0.75rem 0; }
    .scai-verdict-content { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; line-height: 1.7; color: #78350f; margin: 0; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       MATERIALS BOX (How-To)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-materials-box { margin: 1.5rem 0; padding: 1.5rem; background: #fef3c7; border-radius: 8px; }
    .scai-materials-title { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.125rem; font-weight: 700; color: #92400e; margin: 0 0 1rem 0; }
    .scai-materials-list { list-style: disc; padding-left: 1.25rem; margin: 0; }
    .scai-materials-list li { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; color: #78350f; padding: 0.25rem 0; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       PRO TIPS (How-To)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-pro-tips { margin: 1.5rem 0; padding: 1.5rem; background: #ecfdf5; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0; }
    .scai-pro-tips-title { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.125rem; font-weight: 700; color: #166534; margin: 0 0 1rem 0; }
    .scai-pro-tips-list { list-style: none; padding: 0; margin: 0; }
    .scai-pro-tips-list li { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; color: #166534; padding: 0.5rem 0; padding-left: 1.5rem; position: relative; }
    .scai-pro-tips-list li::before { content: ''; position: absolute; left: 0; top: 0.875rem; width: 8px; height: 8px; background: #16a34a; border-radius: 2px; transform: rotate(45deg); }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       KEY TAKEAWAYS (Informational)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-key-takeaways { margin: 2.5rem 0; padding: 1.5rem; background: #eff6ff; border-radius: 8px; }
    .scai-takeaways-title { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.125rem; font-weight: 700; color: #1e40af; margin: 0 0 1rem 0; }
    .scai-takeaways-list { list-style: none; padding: 0; margin: 0; }
    .scai-takeaways-list li { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; color: #1e40af; padding: 0.5rem 0; padding-left: 1.5rem; position: relative; }
    .scai-takeaways-list li::before { content: ''; position: absolute; left: 0; top: 0.75rem; width: 10px; height: 10px; background: #3b82f6; border-radius: 50%; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       QUICK FACTS (Informational)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-quick-facts { margin: 2.5rem 0; padding: 1.5rem; background: #f3f4f6; border-radius: 8px; }
    .scai-quick-facts-title { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.125rem; font-weight: 700; color: #1a1a1a; margin: 0 0 1rem 0; }
    .scai-quick-facts-list { list-style: disc; padding-left: 1.25rem; margin: 0; }
    .scai-quick-facts-list li { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; color: #374151; padding: 0.25rem 0; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       INGREDIENTS (Recipe)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-ingredients { margin: 2.5rem 0; padding: 1.5rem; background: #fefce8; border-radius: 8px; }
    .scai-ingredients-title, .scai-ingredients h2 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.25rem; font-weight: 700; color: #713f12; margin: 0 0 1rem 0; border: none; }
    .scai-ingredients-list { list-style: none; padding: 0; margin: 0; }
    .scai-ingredients-list li { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; color: #78350f; padding: 0.5rem 0; padding-left: 1.5rem; position: relative; border-bottom: 1px dashed #fde68a; }
    .scai-ingredients-list li:last-child { border-bottom: none; }
    .scai-ingredients-list li::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; background: #eab308; border-radius: 50%; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       INSTRUCTIONS (Recipe)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-instructions { margin: 2.5rem 0; }
    .scai-instructions-title, .scai-instructions h2 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.25rem; font-weight: 700; color: #1a1a1a; margin: 0 0 1rem 0; border: none; }
    .scai-instructions-list { list-style: none; padding: 0; margin: 0; counter-reset: step-counter; }
    .scai-instructions-list li { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; color: #374151; line-height: 1.7; padding: 1rem 0; padding-left: 3.5rem; position: relative; border-bottom: 1px solid #e5e7eb; counter-increment: step-counter; }
    .scai-instructions-list li:last-child { border-bottom: none; }
    .scai-instructions-list li::before { content: counter(step-counter); position: absolute; left: 0; top: 1rem; width: 2rem; height: 2rem; background: #1a1a1a; color: #ffffff; font-weight: 700; font-size: 0.875rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       NUTRITION TABLE (Recipe)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-nutrition-table { margin: 2.5rem 0; padding: 1.5rem; background: #f9fafb; border-radius: 8px; }
    .scai-nutrition-title, .scai-nutrition-h2 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.125rem; font-weight: 700; color: #1a1a1a; margin: 0 0 1rem 0; border: none; }
    .scai-nutrition-table table { width: 100%; border-collapse: collapse; }
    .scai-nutrition-table td { font-family: 'Georgia', 'Times New Roman', serif; font-size: 0.9375rem; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb; }
    .scai-nutrition-table td:first-child { color: #6b7280; }
    .scai-nutrition-table td:last-child { color: #1a1a1a; font-weight: 600; text-align: right; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       PROS & CONS (Review)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-pros-cons { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 2.5rem 0; }
    @media (max-width: 640px) { .scai-pros-cons { grid-template-columns: 1fr; } }
    .scai-pros { padding: 1.5rem; background: #f0fdf4; border-radius: 8px; }
    .scai-cons { padding: 1.5rem; background: #fef2f2; border-radius: 8px; }
    .scai-pros-title { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.125rem; font-weight: 700; color: #166534; margin: 0 0 1rem 0; }
    .scai-cons-title { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.125rem; font-weight: 700; color: #991b1b; margin: 0 0 1rem 0; }
    .scai-pros ul, .scai-cons ul { list-style: none; padding: 0; margin: 0; }
    .scai-pros li { font-family: 'Georgia', 'Times New Roman', serif; font-size: 0.9375rem; color: #166534; padding: 0.5rem 0; padding-left: 1.5rem; position: relative; }
    .scai-cons li { font-family: 'Georgia', 'Times New Roman', serif; font-size: 0.9375rem; color: #991b1b; padding: 0.5rem 0; padding-left: 1.5rem; position: relative; }
    .scai-pros li::before { content: '+'; position: absolute; left: 0; font-weight: 700; color: #16a34a; }
    .scai-cons li::before { content: '-'; position: absolute; left: 0; font-weight: 700; color: #dc2626; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       RATING SECTION (Review)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-rating-section { margin: 2.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; text-align: center; }
    .scai-rating-h2 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.25rem; font-weight: 700; color: #92400e; margin: 0 0 1rem 0; border: none; }
    .scai-rating-score { font-family: 'Georgia', 'Times New Roman', serif; font-size: 3rem; font-weight: 700; color: #92400e; margin-bottom: 0.5rem; }
    .scai-rating-summary { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; color: #78350f; margin: 0; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       SERVICE INFO (Local)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-service-info { margin: 2.5rem 0; padding: 1.5rem; background: #f3f4f6; border-radius: 8px; }
    .scai-service-info table { width: 100%; border-collapse: collapse; }
    .scai-service-info td { font-family: 'Georgia', 'Times New Roman', serif; font-size: 0.9375rem; padding: 0.625rem 0; border-bottom: 1px solid #e5e7eb; }
    .scai-service-info td:first-child { color: #6b7280; width: 40%; }
    .scai-service-info td:last-child { color: #1a1a1a; font-weight: 600; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       WHY CHOOSE LOCAL (Local)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-why-choose-local { margin: 2.5rem 0; padding: 1.5rem; background: #ecfdf5; border-radius: 8px; }
    .scai-why-choose-local-title, .scai-why-choose-local h2 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.25rem; font-weight: 700; color: #166534; margin: 0 0 1rem 0; border: none; }
    .scai-why-choose-local-list { list-style: none; padding: 0; margin: 0; }
    .scai-why-choose-local-list li { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; color: #166534; padding: 0.5rem 0; padding-left: 1.5rem; position: relative; }
    .scai-why-choose-local-list li::before { content: '✓'; position: absolute; left: 0; color: #16a34a; font-weight: 700; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       HONORABLE MENTIONS (Listicle)
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-honorable-mentions { margin: 2.5rem 0; padding: 1.5rem; background: #faf5ff; border-radius: 8px; }
    .scai-honorable-title, .scai-honorable-mentions h2 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.25rem; font-weight: 700; color: #581c87; margin: 0 0 1rem 0; border: none; }
    .scai-honorable-item { padding: 1rem 0; border-bottom: 1px solid #e9d5ff; }
    .scai-honorable-item:last-child { border-bottom: none; padding-bottom: 0; }
    .scai-honorable-item h4 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1rem; font-weight: 700; color: #7e22ce; margin: 0 0 0.5rem 0; }
    .scai-honorable-item p { font-family: 'Georgia', 'Times New Roman', serif; font-size: 0.9375rem; color: #6b21a8; margin: 0; line-height: 1.6; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       SCAI COMPONENT CLASSES
       ───────────────────────────────────────────────────────────────────────────── */
    .scai-h1 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 2.25rem; font-weight: 700; line-height: 1.2; color: #1a1a1a; margin: 0 0 1.5rem 0; }
    .scai-featured-image { margin: 0 0 2rem 0; }
    .scai-h2 { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.5rem; font-weight: 700; line-height: 1.3; color: #1a1a1a; margin: 2.5rem 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb; scroll-margin-top: 80px; }
    .scai-h2-image { margin: 1rem 0 1.5rem 0; }
    .scai-paragraph { font-family: 'Georgia', 'Times New Roman', serif; font-size: 1.0625rem; line-height: 1.8; color: #374151; margin: 0 0 1.25rem 0; }
    
    /* ─────────────────────────────────────────────────────────────────────────────
       RESPONSIVE ADJUSTMENTS
       ───────────────────────────────────────────────────────────────────────────── */
    @media (max-width: 640px) {
      body { padding: 15px; margin: 20px auto; }
      h1 { font-size: 1.75rem; }
      h2 { font-size: 1.35rem; }
      .scai-product-card { flex-direction: column; }
      .scai-product-image { width: 100%; }
      .scai-product-image img { max-width: 100%; max-height: 250px; }
    }
  </style>
</head>
<body>
${content}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `article-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!content) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-scai-surface border border-scai-border flex items-center justify-center mb-4">
          <ImageIcon className="w-8 h-8 text-scai-text-muted" />
        </div>
        <h3 className="font-semibold mb-1">Preview will appear here</h3>
        <p className="text-sm text-scai-text-sec max-w-xs">
          Start generating an article to see it build in real-time
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Preview header */}
      <div className="p-4 border-b border-scai-border flex items-center justify-between bg-scai-card">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-scai-text-muted">
            article-preview.html
          </span>
        </div>
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-scai-input border border-scai-border rounded-lg hover:border-scai-brand1 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </button>
      </div>

      {/* Article preview (Isolated in iframe) */}
      <div className="flex-1 overflow-hidden bg-white">
        <IsolatedArticlePreview html={content} className="h-full" />
      </div>

      {/* Generation status */}
      {isGenerating && (
        <div className="p-3 border-t border-scai-border bg-scai-card flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-scai-brand1 animate-pulse" />
            <div
              className="w-2 h-2 rounded-full bg-scai-brand1 animate-pulse"
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className="w-2 h-2 rounded-full bg-scai-brand1 animate-pulse"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
          <span className="text-sm text-scai-text-sec">
            Generating article...
          </span>
        </div>
      )}
    </div>
  );
}
