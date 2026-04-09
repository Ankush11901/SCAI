/**
 * Guidelines Data
 *
 * All rules and guidelines for SCAI Article Generator
 * Based on Rules Documentation v3.x (January 2026)
 *
 * Categories:
 * 1. Golden Rules - Critical overriding rules
 * 2. Component Definitions - What components exist
 * 3. Content Logic - How content is generated
 * 4. Presentation - How content is displayed
 * 5. Configuration - User vs System settings
 * 6. AI Behavior - Token management, validation, prompts
 * 7. Image Generation - Image specs and quality
 * 8. Quality Standards - Content quality expectations
 */

import {
  FileText,
  Type,
  Image,
  Code,
  Ruler,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Box,
  Palette,
  Send,
  Zap,
  Target,
  List,
  Lightbulb,
  Volume2,
  PenTool,
  Settings,
  Hash,
  Shield,
  Layers,
  Cog,
  Eye,
  Star,
  Layout,
  Link,
  Database,
  RefreshCw,
  Scale,
  Brain,
  ImageIcon,
  Award,
  Lock,
  FileCheck,
  Timer,
  Repeat,
  Activity,
  AlertCircle,
  Cpu,
  Workflow,
  Table,
  LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RuleType = "rule" | "guideline";
export type Enforcement = "mandatory" | "recommended" | "forbidden";

export interface RuleItem {
  id: string;
  title: string;
  description: string;
  value?: string;
  type: RuleType;
  enforcement: Enforcement;
  examples?: { good?: string[]; bad?: string[] };
}

export interface SubSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: RuleItem[];
}

export interface MainCategory {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  subsections: SubSection[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN RULES (App Override Layer - Critical rules that override all others)
// ═══════════════════════════════════════════════════════════════════════════════

export const GOLDEN_RULES: MainCategory = {
  id: "golden-rules",
  title: "Golden Rules",
  description: "Application Override: Critical rules that override all others - App-specific enforcement",
  icon: Shield,
  color: "text-rose-400",
  bgColor: "bg-rose-500/10",
  subsections: [
    {
      id: "critical-rules",
      title: "Critical Rules",
      icon: AlertTriangle,
      items: [
        {
          id: "golden-header-consistency",
          title: "Header Consistency Rule",
          description: "The H1 Type determines the H2 Type. If H1 is a Question, ALL H2s must be Questions. If H1 is a Statement, ALL H2s must be Statements. If H1 is a Listicle, ALL H2s must be Numbered Items. NO EXCEPTIONS.",
          type: "rule",
          enforcement: "mandatory",
          examples: {
            good: [
              'H1 Question → H2: "What Features Matter Most?"',
              'H1 Statement → H2: "Key Features to Consider"',
              'H1 Listicle (7 Ways...) → H2: "1. First Method"',
            ],
            bad: ['H1 Question → H2: Statement (mixing formats)'],
          },
        },
        {
          id: "golden-color-restriction",
          title: "Color Restriction Rule",
          description: "The UI and Content presentation must use Black (#000000), White (#FFFFFF), and Grayscale ONLY. No chromatic colors (Red, Blue, Green, etc.) are allowed in article content.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "golden-no-emoji",
          title: "No Emoji Rule",
          description: "Emojis are strictly forbidden in all generated content. Only allowed symbols are: Checkmark (✓), Bullet (•), Star (★/☆), Plus/Minus (+/-).",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "golden-one-type",
          title: "One Type Per Article Rule",
          description: "An article can only be one of the 9 defined types. You cannot mix components from different article types (e.g., no Recipe components in a Commercial article).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "golden-h1-exclusivity",
          title: "H1 Exclusivity Rule",
          description: "There is exactly ONE H1 per article. It is the very first component. All subsequent section headers must be H2.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "golden-h3-restriction",
          title: "H3 Restriction Rule",
          description: "H3 tags exist ONLY in FAQ sections (5 H3s) and Honorable Mentions sections (3-4 H3s). No other components use H3 tags.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "golden-ai-no-modify",
          title: "AI Cannot Modify External Data",
          description: "AI must NEVER modify, fabricate, or change: Prices, Ratings, Reviews, Affiliate Links, Product Specs, Business Info (name/address/phone), License Numbers, Exact Quotes, Legal Disclaimers, Trademark Names.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1: COMPONENT RULES (component_rules.md) - STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPONENT_RULES: MainCategory = {
  id: "component-rules",
  title: "Component Rules",
  description: "STRUCTURE Layer: Component taxonomy, definitions, data structures, limits, and relationships",
  icon: Database,
  color: "text-blue-400",
  bgColor: "bg-blue-500/10",
  subsections: [
    {
      id: "universal-components",
      title: "Universal Components (16)",
      icon: Box,
      items: [
        {
          id: "comp-h1",
          title: "H1 Title",
          description: "Article title. Exactly 1 per article. FIRST heading only. Contains primary keyword. 3 Types: Question, Statement, Listicle.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-featured-image",
          title: "Featured Image",
          description: "Main article image generated from H1 content. Full width, center aligned. Placed after H1, before Overview.",
          value: "1200×675 px (16:9)",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-overview-para",
          title: "Overview Paragraph",
          description: "Introduces article topic. Elaborates on H1. Structured as 2 sub-paragraphs × 50 words each.",
          value: "100 words (2×50)",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-h2",
          title: "H2 Section Header",
          description: "Section headings. Matches H1 Type (Question/Statement/Listicle). Used for ALL content sections. Must include main topic keyword.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-h2-image",
          title: "H2 Image (Optional)",
          description: "Section image generated from H2 content. Content width, center aligned. Placed between H2 and paragraph.",
          value: "800×450 px (16:9)",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-standard-para",
          title: "Standard Paragraph",
          description: "Section content that elaborates on its H2. Structured as 3 sub-paragraphs × 50 words each.",
          value: "150 words (3×50)",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-closing-h2",
          title: "Closing H2",
          description: "Final section heading. Must NOT use forbidden phrases (Conclusion, Summary, Wrap Up, Final Thoughts).",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-closing-para",
          title: "Closing Paragraph",
          description: "Final section content. Single paragraph. Must NOT start with forbidden phrases (In conclusion, To summarize, etc.).",
          value: "50 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-faq-h2",
          title: "FAQ H2 (Optional)",
          description: "Parent heading for FAQ section.",
          value: "25-30 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-faq-h3",
          title: "FAQ H3 Questions",
          description: "Question headings. Exactly 5 per FAQ section. Single question per H3 (no combining).",
          value: "30-60 chars, 5 fixed",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-faq-answer",
          title: "FAQ Answers",
          description: "Answer content paired with each FAQ H3.",
          value: "28 words each × 5 = 140 total",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-meta-title",
          title: "Meta Title (Optional)",
          description: "SEO title. No semicolons. Contains keyword. Eye-catching for clicks.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-meta-desc",
          title: "Meta Description (Optional)",
          description: "SEO description. Never identical to H1. Keyword integrated naturally.",
          value: "140-160 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-toc",
          title: "Table of Contents (Optional)",
          description: "Auto-generated from H2 headings. Appears after Overview, before first H2.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-featured-alt",
          title: "Featured Image Alt Text (Optional)",
          description: "Describes featured image. Includes primary keyword. No 'Image of' prefix.",
          value: "100-125 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-h2-alt",
          title: "H2 Image Alt Text (Optional)",
          description: "Contextual match to H2 topic. Uses LSI/related keywords.",
          value: "80-100 characters",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "affiliate-components",
      title: "Affiliate Components (1)",
      icon: Box,
      items: [
        {
          id: "comp-product-card",
          title: "Product Card",
          description: "Source: External API (Amazon). Contains: Product Image, Name, Star Rating, Price, CTA Button. AI cannot modify this data.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "commercial-components",
      title: "Commercial Components (3)",
      icon: Box,
      items: [
        {
          id: "comp-feature-h2",
          title: "Feature H2",
          description: "Introduces feature section. Adapts to H1 type.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-feature-list",
          title: "Feature List",
          description: "Bulleted list (<ul>) of product/service features. 5-7 bullets × 15-20 words each.",
          value: "100-120 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-cta-box",
          title: "CTA Box",
          description: "Highlighted box with call-to-action.",
          value: "20-30 words",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "comparison-components",
      title: "Comparison Components (4)",
      icon: Box,
      items: [
        {
          id: "comp-topic-h2",
          title: "Topic H2",
          description: "Introduces each comparison topic. Repeats for each topic (minimum 2).",
          value: "50-60 chars, min 2 topics",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-topic-overview",
          title: "Topic Overview",
          description: "2 sub-paragraphs × 40 words. Para 1: What it is + main feature. Para 2: Who it's for + key benefit.",
          value: "80 words (2×40)",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-comparison-table",
          title: "Comparison Table",
          description: "Rows: Features. Columns: Topics being compared.",
          value: "120-150 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-quick-verdict",
          title: "Quick Verdict Box (Optional)",
          description: "Conditional recommendations based on comparison.",
          value: "50 words",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "howto-components",
      title: "How-To Components (4)",
      icon: Box,
      items: [
        {
          id: "comp-materials-h2",
          title: "Materials/Requirements H2",
          description: "Introduces materials section. Adapts to H1 type.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-materials-box",
          title: "Materials/Requirements Box",
          description: "5-15 bullets × 2-12 words each.",
          value: "20-120 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-pro-tips-h2",
          title: "Pro Tips H2 (Optional)",
          description: "Introduces tips section.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-pro-tips-list",
          title: "Pro Tips List (Optional)",
          description: "5-7 bullets × 12-18 words each.",
          value: "80-120 words",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "informational-components",
      title: "Informational Components (3)",
      icon: Box,
      items: [
        {
          id: "comp-key-takeaways",
          title: "Key Takeaways Box",
          description: "REQUIRED for Informational type. 5-6 bullets × 10-12 words each. Appears after Overview.",
          value: "50-75 words, REQUIRED",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-quick-facts-h2",
          title: "Quick Facts H2 (Optional)",
          description: "Shorter than standard H2.",
          value: "35-50 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-quick-facts-list",
          title: "Quick Facts List (Optional)",
          description: "5-7 bullets × 12-15 words each.",
          value: "80-100 words",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "listicle-components",
      title: "Listicle Components (4)",
      icon: Box,
      items: [
        {
          id: "comp-listicle-count",
          title: "Listicle Count Rule",
          description: "Listicle items must be ODD numbers ONLY: 5, 7, 9, 11, 13, 15, 17, 19, 21, or 23 items.",
          value: "ODD numbers only",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-honorable-h2",
          title: "Honorable Mentions H2 (Optional)",
          description: "Shorter than standard H2.",
          value: "35-50 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-honorable-h3",
          title: "Honorable Mentions H3",
          description: "3-4 items fixed.",
          value: "25-40 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-honorable-para",
          title: "Honorable Mentions Paragraph",
          description: "One per H3 item.",
          value: "40-50 words each",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "local-components",
      title: "Local Components (4)",
      icon: Box,
      items: [
        {
          id: "comp-why-choose-h2",
          title: "Why Choose Local H2 (Optional)",
          description: "Shorter than standard H2.",
          value: "35-50 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-why-choose-img",
          title: "Why Choose Local Image (Optional)",
          description: "SPECIAL LAYOUT: Left-aligned, beside list.",
          value: "400×300 px (4:3)",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-why-choose-list",
          title: "Why Choose Local List (Optional)",
          description: "4-5 bullets × 8-12 words each.",
          value: "40-60 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-service-info",
          title: "Service Info Box (Optional)",
          description: "Table format (Label | Info). 5-6 rows. Source: USER DATA - not AI generated.",
          value: "40-60 words",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "recipe-components",
      title: "Recipe Components (8)",
      icon: Box,
      items: [
        {
          id: "comp-ingredients-h2",
          title: "Ingredients H2",
          description: "Adapts to H1 type.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-ingredients-list",
          title: "Ingredients List",
          description: "Bulleted list (<ul>).",
          value: "150 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-instructions-h2",
          title: "Instructions H2",
          description: "Adapts to H1 type.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-instructions-list",
          title: "Instructions List",
          description: "Numbered list (<ol>). One step per item, sequential order.",
          value: "150-400 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-tips-h2",
          title: "Tips H2",
          description: "Adapts to H1 type.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-tips-para",
          title: "Tips Paragraph",
          description: "Standard paragraph format. 3 sub-paragraphs × 50 words.",
          value: "150 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-nutrition-h2",
          title: "Nutrition Facts H2 (Optional)",
          description: "Adapts to H1 type.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-nutrition-table",
          title: "Nutrition Table (Optional)",
          description: "Must include disclaimer 'Approximate values' (AI-generated).",
          value: "100 words",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "review-components",
      title: "Review Components (6)",
      icon: Box,
      items: [
        {
          id: "comp-features-h2",
          title: "Features H2",
          description: "Adapts to H1 type.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-features-list",
          title: "Features List",
          description: "7-10 bullets × 15-20 words each.",
          value: "150 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-pros-cons-h2",
          title: "Pros & Cons H2",
          description: "Adapts to H1 type.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-pros-cons-lists",
          title: "Pros & Cons Lists",
          description: "Dual lists. 5-7 bullets each × 10-15 words per bullet. 75/75 word split.",
          value: "150 words total",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-rating-h2",
          title: "Rating H2",
          description: "Shorter than standard H2.",
          value: "25-30 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "comp-rating-para",
          title: "Rating Paragraph",
          description: "Score + Justification.",
          value: "100 words",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "badge-rules",
      title: "Badge Rules",
      icon: Award,
      items: [
        {
          id: "badge-approved-labels",
          title: "Approved Badge Labels",
          description: "Only these badges allowed: Best Seller (11 chars), Top Pick (8), Editor's Choice (15), Verified (8), Recommended (11), Best Value (10), Premium (7), Budget Pick (11), Most Popular (12), New (3).",
          value: "3-15 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "badge-one-per-component",
          title: "One Badge Per Component",
          description: "Maximum one badge per component instance. Cannot combine or stack multiple badges.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "badge-truthfulness",
          title: "Badge Truthfulness",
          description: "Badge must accurately represent content. No custom text - only approved labels.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "badge-article-types",
          title: "Badge Usage by Article Type",
          description: "Affiliate: Product Card. Commercial: CTA Box, Features. Review: Rating section. Comparison: Quick Verdict, Topics. Listicle: Item headings. How-To/Recipe: NO badges.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "component-relationships",
      title: "Component Relationships",
      icon: Link,
      items: [
        {
          id: "rel-parent-child",
          title: "Parent-Child Dependencies",
          description: "H1 → Overview Paragraph. H2 → Standard Paragraph. H2 → H2 Image → Alt Text. FAQ H2 → FAQ H3s → FAQ Answers. Closing H2 → Closing Paragraph.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "rel-standard-loop",
          title: "Standard Loop Pattern",
          description: "H2 + Standard Paragraph repeats to fill word count. Each loop adds ~150 words.",
          value: "~150 words per loop",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "rel-affiliate-loop",
          title: "Affiliate Loop Pattern",
          description: "Product Card → H2 → Paragraph repeats per product.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "rel-howto-loop",
          title: "How-To Loop Pattern",
          description: "Step H2 + Paragraph repeats for 5-10 iterations recommended.",
          value: "5-10 steps",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "rel-listicle-loop",
          title: "Listicle Loop Pattern",
          description: "Item H2 + Paragraph repeats for odd number of iterations.",
          value: "ODD iterations",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "rel-comparison-loop",
          title: "Comparison Loop Pattern",
          description: "Topic H2 + Topic Overview repeats for each topic (minimum 2).",
          value: "min 2 topics",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "data-sources",
      title: "Component Data Sources",
      icon: Database,
      items: [
        {
          id: "source-llm",
          title: "LLM Generated Content",
          description: "H1, H2, Paragraphs, Meta content, Alt text, FAQ Q&A, Lists, Comparison Tables - all AI generated from keyword/context.",
          value: "LLM",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "source-api",
          title: "External API Data",
          description: "Product Card (Image, Name, Rating, Price, CTA Button) - from Amazon/external API. AI CANNOT modify.",
          value: "API",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "source-user",
          title: "User Input Data",
          description: "Service Info Box (Business Name, Address, Phone, Hours, License) - from user-provided fields. AI CANNOT fabricate.",
          value: "USER",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "source-auto",
          title: "Auto-Generated",
          description: "Table of Contents - system auto-generated from H2 headings.",
          value: "AUTO",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2: CONTENT RULES (content_rules.md) - LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

export const CONTENT_RULES: MainCategory = {
  id: "content-rules",
  title: "Content Rules",
  description: "LOGIC Layer: Generation logic, content flow, processing, validation, and sequencing",
  icon: Cog,
  color: "text-purple-400",
  bgColor: "bg-purple-500/10",
  subsections: [
    {
      id: "generation-workflow",
      title: "Generation Workflow",
      icon: Workflow,
      items: [
        {
          id: "workflow-steps",
          title: "Workflow Steps",
          description: "1. Select Type → 2. Configure Options → 3. Input Data/Keyword → 4. Select Header Type → 5. Generate Content → 6. Validate Output",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "workflow-pipeline",
          title: "Generation Pipeline",
          description: "Keyword Filter → Heading Generation → Answer Generation → Duplicate Check → Interlinking → Complete",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "workflow-affiliate-pipeline",
          title: "Affiliate Pipeline (Extended)",
          description: "Keyword Filter → Amazon API Request → Heading Generation → Product Card Generation → Answer Generation → Duplicate Check → Interlinking → Complete",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "content-sequencing",
      title: "Content Sequencing",
      icon: List,
      items: [
        {
          id: "seq-universal",
          title: "Universal Sequence",
          description: "H1 → Featured Image → Overview → [TOC] → [Type-Specific Top] → [Main Loop] → [Type-Specific Bottom] → Closing H2 → Closing Para → [FAQ]",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seq-informational",
          title: "Informational Sequence",
          description: "H1 → Featured Image → Overview → Key Takeaways → [H2 + Para loops] → [Quick Facts] → Closing → [FAQ]",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seq-comparison",
          title: "Comparison Sequence",
          description: "Topic sections must appear BEFORE Comparison Table. Table appears after all topics described.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seq-howto",
          title: "How-To Sequence",
          description: "Materials/Requirements Box must appear BEFORE Steps.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seq-recipe",
          title: "Recipe Sequence",
          description: "Fixed order: Ingredients → Instructions → Tips → Nutrition (if enabled).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seq-review",
          title: "Review Sequence",
          description: "Features → Pros/Cons → [H2 + Para loops for analysis] → Rating → Closing.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "seo-keyword-rules",
      title: "SEO & Keyword Rules",
      icon: Target,
      items: [
        {
          id: "seo-h1-keyword",
          title: "H1 Primary Keyword",
          description: "Primary keyword MUST appear in the H1 title.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seo-h2-constraints",
          title: "H2 Constraints",
          description: "Under 60 chars. Include main topic keyword or semantic variation. Explore different aspects (no repetition). Maintain consistent sentiment with H1. Never contradict keyword sentiment.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seo-keyword-flow",
          title: "Keyword Relevance Flow",
          description: "H1 (Primary Keyword) → H2 (Keyword Variation/Related Term) → Paragraph (Natural usage with LSI keywords). Avoid exact keyword repetition more than 2-3 times per section.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seo-meta-title-rules",
          title: "Meta Title Rules",
          description: "50-60 characters. No semicolons. Contains keyword. Eye-catching for clicks. Concise wording.",
          value: "50-60 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seo-meta-desc-rules",
          title: "Meta Description Rules",
          description: "140-160 characters. Never copy header identically. Keyword integrated naturally. Summarizes article purpose.",
          value: "140-160 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seo-alt-featured",
          title: "Featured Image Alt Text Rules",
          description: "Describe visual scene + include primary keyword. No 'Image of' or 'Picture of' prefix.",
          value: "100-125 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seo-alt-h2",
          title: "H2 Image Alt Text Rules",
          description: "Contextual match to H2 topic. Use LSI/related keywords. Maintain brevity.",
          value: "80-100 characters",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seo-local-keywords",
          title: "Local Article Keywords",
          description: "Keyword must include Service + Location (e.g., 'Plumber + Atlanta GA'). Both must be incorporated into headings.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "seo-semantic",
          title: "Semantic Keyword Usage",
          description: "Use semantic variations naturally. Avoid repetitive exact keyword phrase. Include related terms, synonyms, and LSI keywords.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "forbidden-content",
      title: "Forbidden Content",
      icon: AlertTriangle,
      items: [
        {
          id: "forbidden-h2-conjunctions",
          title: "H2 Conjunctions",
          description: "No conjunctions ('and', 'or') in H2 heading text. Each H2 must be single-focused.",
          type: "rule",
          enforcement: "forbidden",
          examples: {
            bad: ["Training and Feeding Your Dog", "Indoor or Outdoor Training"],
            good: ["Training Your Dog at Home", "Indoor Training Techniques"],
          },
        },
        {
          id: "forbidden-h2-colon",
          title: "H2 Colons",
          description: "No colons (:) in H2 heading text.",
          type: "rule",
          enforcement: "forbidden",
          examples: {
            bad: ["Dog Training: The Basics", "Step 1: Getting Started"],
            good: ["Dog Training Basics", "Getting Started with Training"],
          },
        },
        {
          id: "forbidden-multi-question",
          title: "Multiple Questions",
          description: "Never combine multiple questions in a single H2 or FAQ question.",
          type: "rule",
          enforcement: "forbidden",
          examples: {
            bad: ["What is Dog Training and Why is it Important?"],
            good: ["What is Dog Training", "Why Dog Training Matters"],
          },
        },
        {
          id: "forbidden-closing-h2",
          title: "Closing H2 Phrases",
          description: "Never use: Conclusion, Summary, Final Thoughts, In Summary, Wrapping Up, To Wrap Up.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "forbidden-closing-para",
          title: "Closing Paragraph Starters",
          description: "Never start with: In conclusion, To summarize, In summary, Finally, To wrap up, As we've discussed.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "forbidden-alt-prefix",
          title: "Alt Text Prefix",
          description: "Alt text must NEVER start with 'Image of', 'Picture of', or similar phrases.",
          type: "rule",
          enforcement: "forbidden",
        },
      ],
    },
    {
      id: "word-count-logic",
      title: "Word Count Logic",
      icon: Hash,
      items: [
        {
          id: "wc-global-range",
          title: "Global Word Count Range",
          description: "All articles must be 800 (min) to 4000 (max) words.",
          value: "800-4000 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "wc-listicle-min",
          title: "Listicle Minimum",
          description: "Listicle articles have minimum 850 words due to 5-item minimum (odd numbers rule).",
          value: "850 words minimum",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "wc-distribution",
          title: "Word Distribution Logic",
          description: "1. Fill required fixed components first. 2. Fill remaining count with H2 + Standard Paragraph loops. 3. Each loop adds ~150 words.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "wc-h2-sections",
          title: "H2 Section Count",
          description: "Include 5-7 H2 sections per article for comprehensive coverage.",
          value: "5-7 sections",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "wc-informational-min",
          title: "Informational H2 Minimum",
          description: "Informational articles should have minimum 4 H2 sections for comprehensive coverage.",
          value: "min 4 H2 sections",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "wc-review-loop",
          title: "Review H2 Loop",
          description: "Review articles should have 3-5 H2 sections in the analysis loop (between Pros & Cons and Rating).",
          value: "3-5 H2 sections",
          type: "guideline",
          enforcement: "recommended",
        },
      ],
    },
    {
      id: "interlinking-logic",
      title: "Interlinking Logic",
      icon: Link,
      items: [
        {
          id: "link-topic",
          title: "Topic Linking",
          description: "Available to ALL 9 types. Links to related informational content, guides, how-to articles. Builds topical authority and semantic clusters.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "link-service",
          title: "Service Linking",
          description: "Available to Commercial & Local ONLY. Funnels traffic to 'Money Pages' (Services & Products). Links high-intent keywords.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "link-location",
          title: "Location Linking",
          description: "Available to Local ONLY. Establishes geographical hierarchy. Links City → State and nearby locations. Reinforces local relevance.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "link-anchor-variance",
          title: "Anchor Text Variance (Anti-Spam)",
          description: "Exact Match: 20%. Semantic/Partial Match: 50%. Generic/Navigational: 30%.",
          value: "20/50/30 split",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "link-silo-enforcement",
          title: "Hard Silo Enforcement",
          description: "Links restricted to same Parent Category or Service Vertical. No cross-linking unrelated topics.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "link-position-priority",
          title: "Link Position Priority",
          description: "Primary Service Link placed within first 200 words.",
          value: "first 200 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "link-density-limiter",
          title: "Link Density Limiter",
          description: "Maximum 1 internal link per 150 words.",
          value: "max 1 per 150 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "link-orphan-protection",
          title: "Orphan Page Protection",
          description: "If no relevant links found, append 'Related Reading' section with 3 most recent articles in same category.",
          value: "3 fallback links",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "validation-rules",
      title: "Component Validation",
      icon: FileCheck,
      items: [
        {
          id: "val-required-fields",
          title: "Required Fields Check",
          description: "All required fields must be present. Missing fields → Reject, flag for completion.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "val-char-limits",
          title: "Character Limits Check",
          description: "Must not exceed defined limits. Exceeded → Truncate or regenerate.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "val-word-limits",
          title: "Word Limits Check",
          description: "Must be within word count range. Too short/long → Regenerate.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "val-format-match",
          title: "Format Match Check",
          description: "Must match expected structure (paragraph, list, table, etc.). Wrong format → Regenerate.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "val-keyword-presence",
          title: "Keyword Presence Check",
          description: "H1 must contain primary keyword. Meta title must contain keyword.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "val-status-codes",
          title: "Validation Status Codes",
          description: "VALID (pass), INVALID_FORMAT (structure wrong), INVALID_LENGTH (limits violated), MISSING_REQUIRED (empty field), INVALID_CONTENT (keyword missing), INVALID_TYPE (wrong content type).",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3: GENERAL RULES (general_rules.md) - PRESENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const GENERAL_RULES: MainCategory = {
  id: "general-rules",
  title: "General Rules",
  description: "PRESENTATION Layer: Visual layout, design philosophy, display and rendering rules",
  icon: Eye,
  color: "text-emerald-400",
  bgColor: "bg-emerald-500/10",
  subsections: [
    {
      id: "color-palette",
      title: "Color Palette",
      icon: Palette,
      items: [
        {
          id: "color-primary",
          title: "Primary Colors",
          description: "Black (#000000) for primary text, headings, borders. White (#FFFFFF) for backgrounds, contrast.",
          value: "#000000, #FFFFFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "color-grayscale",
          title: "Grayscale Palette",
          description: "Light Grays (#F5F5F5, #F9F9F9, #FAFAFA) for backgrounds/cards. Medium Grays (#E5E5E5, #F0F0F0) for borders. Dark Grays (#333333, #555555, #666666, #999999) for secondary text.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "color-forbidden",
          title: "Forbidden Colors",
          description: "NO chromatic colors: No red, blue, green, yellow. No accent colors. No brand colors. No theme colors.",
          type: "rule",
          enforcement: "forbidden",
        },
      ],
    },
    {
      id: "typography",
      title: "Typography",
      icon: Type,
      items: [
        {
          id: "typo-primary-text",
          title: "Primary Text Color",
          description: "Primary text must be Black (#000000).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "typo-secondary-text",
          title: "Secondary/Captions Color",
          description: "Secondary text and captions use Dark/Medium Grays (#333333, #555555, #666666, #999999).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "typo-fonts",
          title: "Font Families",
          description: "System-defined font families only. Predefined font sizes and weights. Consistent typography across all article types.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "typo-hierarchy",
          title: "Heading Visual Hierarchy",
          description: "H1 (Largest, primary) → H2 (Section heading) → H3 (Sub-section, FAQ/Honorable Mentions only). Proper semantic structure.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "layout-alignment",
      title: "Layout & Alignment",
      icon: Layout,
      items: [
        {
          id: "layout-article-width",
          title: "Article Max Width",
          description: "Article container maximum width of 800px.",
          value: "max-width: 800px",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "layout-featured",
          title: "Featured Image Layout",
          description: "Center Aligned, Full Width. Placed after H1, before Overview.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "layout-h2-image",
          title: "H2 Image Layout",
          description: "Center Aligned, Content Width. Placed between H2 and Paragraph.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "layout-why-choose",
          title: "Why Choose Local Layout",
          description: "SPECIAL: Left-aligned Image side-by-side with Bullet List (2-column layout).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "layout-comparison-table",
          title: "Comparison Table Layout",
          description: "Rows: Features. Columns: Topics being compared.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "layout-service-info",
          title: "Service Info Table Layout",
          description: "2 Columns (Label | Information).",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "symbols-icons",
      title: "Symbols & Icons",
      icon: Star,
      items: [
        {
          id: "symbol-no-emojis",
          title: "No Emojis",
          description: "Emojis are strictly forbidden in all generated content.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "symbol-checkmark",
          title: "Checkmark Symbol",
          description: "Checkmark (✓) allowed for feature lists and completion indicators.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "symbol-bullet",
          title: "Bullet Symbol",
          description: "Bullet (•) allowed for unordered lists.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "symbol-star",
          title: "Star Symbol",
          description: "Star (★/☆) allowed for ratings ONLY.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "symbol-plus-minus",
          title: "Plus/Minus Symbols",
          description: "Plus (+) and Minus (–) allowed for Pros/Cons ONLY.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "image-styling",
      title: "Image Styling",
      icon: Image,
      items: [
        {
          id: "img-max-height",
          title: "Max Height",
          description: "All article images maximum height of 400 pixels.",
          value: "max-height: 400px",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "img-border-radius",
          title: "Border Radius",
          description: "All article images border radius of 20 pixels.",
          value: "border-radius: 20px",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "img-width",
          title: "Width",
          description: "Images must be full width within the article container.",
          value: "width: 100%",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "img-object-fit",
          title: "Object Fit",
          description: "Images use cover to maintain aspect ratio while filling container.",
          value: "object-fit: cover",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "html-structure",
      title: "HTML Structure",
      icon: Code,
      items: [
        {
          id: "html-class-prefix",
          title: "Class Prefix",
          description: "All CSS classes must use scai- prefix (e.g., scai-h1, scai-paragraph, scai-image).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "html-data-attr",
          title: "Data Attributes",
          description: "Major sections must include data-component attributes for identification.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "html-semantic",
          title: "Semantic HTML",
          description: "Use proper semantic elements (article, section, header, nav, h1-h6, p, ul, ol, figure).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "html-no-inline",
          title: "No Inline Styles",
          description: "Never use inline styles, only scai- prefixed classes.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "html-section-ids",
          title: "Section IDs",
          description: "Each H2 section should have an ID for TOC linking (section-1, section-2, etc.).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "html-no-custom-css",
          title: "No Custom CSS",
          description: "Use existing classes only. No custom CSS or style modifications allowed.",
          type: "rule",
          enforcement: "forbidden",
        },
      ],
    },
    {
      id: "accessibility",
      title: "Accessibility",
      icon: CheckCircle,
      items: [
        {
          id: "a11y-alt-text",
          title: "Alt Text Required",
          description: "All images must have descriptive alt text.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "a11y-contrast",
          title: "Color Contrast",
          description: "Black text on White/Light Gray background. Sufficient contrast ratios. Dark gray text must have adequate contrast.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "a11y-focus",
          title: "Focus States",
          description: "Visible focus indicators on interactive elements. Consistent focus styling. Logical tab order.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "a11y-heading-structure",
          title: "Heading Structure",
          description: "Proper semantic heading hierarchy (H1 → H2 → H3) for screen reader navigation.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "a11y-aria",
          title: "ARIA Labels",
          description: "ARIA labels where necessary for screen reader support.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "a11y-keyboard",
          title: "Keyboard Navigation",
          description: "Keyboard navigation support. Consider skip-to-content links.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 4: PROGRAMMATIC RULES (programmatic_rules.md) - SYSTEM CONSTRAINTS
// ═══════════════════════════════════════════════════════════════════════════════

export const PROGRAMMATIC_RULES: MainCategory = {
  id: "programmatic-rules",
  title: "Programmatic Rules",
  description: "SYSTEM CONSTRAINTS Layer: Fixed values, character/word limits, validation rules, forbidden content, and token management",
  icon: Lock,
  color: "text-red-400",
  bgColor: "bg-red-500/10",
  subsections: [
    {
      id: "character-limits",
      title: "Character & Word Limits",
      icon: Ruler,
      items: [
        {
          id: "limit-h1",
          title: "H1 Title Limits",
          description: "H1 titles must be 50-60 characters. Contains primary keyword.",
          value: "50-60 chars",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "limit-h2",
          title: "H2 Section Header Limits",
          description: "H2 headers must be 50-60 characters. Matches H1 type.",
          value: "50-60 chars",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "limit-meta-title",
          title: "Meta Title Limits",
          description: "Meta titles must be 50-60 characters. No semicolons.",
          value: "50-60 chars",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "limit-meta-desc",
          title: "Meta Description Limits",
          description: "Meta descriptions must be 140-160 characters.",
          value: "140-160 chars",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "limit-overview",
          title: "Overview Paragraph",
          description: "Overview paragraph: 100 words (2 × 50 words).",
          value: "100 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "limit-standard-para",
          title: "Standard Paragraph",
          description: "Standard paragraphs: 150 words (3 × 50 words).",
          value: "150 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "limit-closing-para",
          title: "Closing Paragraph",
          description: "Closing paragraph: 50 words.",
          value: "50 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "limit-faq",
          title: "FAQ Limits",
          description: "FAQ: 5 questions × 28 words each = 140 total words.",
          value: "5 × 28 words",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "forbidden-content",
      title: "Forbidden Content",
      icon: AlertTriangle,
      items: [
        {
          id: "forbidden-closing-h2",
          title: "Forbidden Closing H2 Phrases",
          description: "NEVER use: Conclusion, Final Thoughts, Summary, In Summary, Wrapping Up, To Wrap Up, In Conclusion, To Conclude, In Closing, To Sum Up, Final Words, Last Thoughts, Summing Up.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "forbidden-closing-para",
          title: "Forbidden Closing Paragraph Starts",
          description: "NEVER start closing paragraphs with: In conclusion, To summarize, In summary, To wrap up, Finally, As we've discussed, As we've seen, To conclude, In closing, Wrapping up, To sum up, All in all, Overall, At the end of the day.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "forbidden-h2-conjunctions",
          title: "Forbidden H2 Conjunctions",
          description: "No conjunctions ('and', 'or') in H2 text. Each H2 must be single-focused.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "forbidden-h2-colon",
          title: "Forbidden H2 Colons",
          description: "No colons (:) in H2 heading text.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "forbidden-buzzwords",
          title: "Forbidden Marketing Buzzwords",
          description: "NEVER use: unique, amazing, incredible, unbelievable, spectacular, phenomenal, game-changer, revolutionary, cutting-edge, state-of-the-art, world-class, groundbreaking, unprecedented, next-gen, innovative, seamless, synergy, leverage, disruptive, paradigm.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "forbidden-emoji",
          title: "No Emojis",
          description: "Emojis are strictly forbidden. Only approved symbols: ✓ (checkmark), • (bullet), ★/☆ (stars), +/– (plus/minus).",
          type: "rule",
          enforcement: "forbidden",
        },
      ],
    },
    {
      id: "color-restrictions",
      title: "Color Palette (Fixed)",
      icon: Palette,
      items: [
        {
          id: "color-black",
          title: "Black (#000000)",
          description: "Primary text, headings, borders.",
          value: "#000000",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "color-white",
          title: "White (#FFFFFF)",
          description: "Backgrounds, contrast elements.",
          value: "#FFFFFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "color-grayscale",
          title: "Grayscale Only",
          description: "All UI and content must use Black, White, and Grayscale ONLY. No chromatic colors (Red, Blue, Green, etc.) in article content.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "validation-rules",
      title: "Validation Rules",
      icon: CheckCircle,
      items: [
        {
          id: "validate-header-consistency",
          title: "Header Type Consistency",
          description: "If H1 is Question → all H2s must be Questions. If H1 is Statement → all H2s must be Statements. If H1 is Listicle → all H2s must be Numbered.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "validate-listicle-odd",
          title: "Listicle Odd Numbers",
          description: "Listicle items must be ODD numbers ONLY: 5, 7, 9, 11, 13, 15, 17, 19, 21, or 23.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "validate-one-article-type",
          title: "Single Article Type",
          description: "An article can only be one of the 9 defined types. Cannot mix components from different types.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "validate-h3-restriction",
          title: "H3 Usage Restriction",
          description: "H3 tags exist ONLY in FAQ sections (5 H3s) and Honorable Mentions sections (3-4 H3s). No other components use H3.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 5: USER OPTIONS (user_options.md) - USER CHOICES
// ═══════════════════════════════════════════════════════════════════════════════

export const USER_OPTIONS: MainCategory = {
  id: "user-options",
  title: "User Options",
  description: "USER CHOICES Layer: User-configurable options, toggles, and selection settings",
  icon: Settings,
  color: "text-amber-400",
  bgColor: "bg-amber-500/10",
  subsections: [
    {
      id: "user-options",
      title: "User Configurable Options",
      icon: Settings,
      items: [
        {
          id: "opt-article-type",
          title: "Article Type Selection",
          description: "User selects 1 of 9 article types: Affiliate, Commercial, Comparison, How-To, Informational, Listicle, Local, Recipe, Review.",
          value: "9 types",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "opt-header-type",
          title: "H1 Type Selection",
          description: "User selects Question, Statement, or Listicle format. This automatically determines ALL H2 types.",
          value: "3 formats",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "opt-word-count",
          title: "Word Count Target",
          description: "User sets target length within 800-4000 word range.",
          value: "800-4000 words",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "opt-tone",
          title: "Tone Selection",
          description: "User selects from 9 tones: Professional, Conversational, Authoritative, Friendly, Persuasive, Educational, Objective, Enthusiastic, Empathetic.",
          value: "9 tones",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "opt-style",
          title: "Style Selection",
          description: "User selects from 3 styles: Concise (5-10 words/sentence), Balanced (12-18), Detailed (20-30).",
          value: "3 styles",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "opt-language",
          title: "Language Selection",
          description: "User selects content language from dropdown.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "universal-toggles",
      title: "Universal Toggle Settings",
      icon: Settings,
      items: [
        {
          id: "toggle-toc",
          title: "Table of Contents Toggle",
          description: "User can enable/disable TOC.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "toggle-meta",
          title: "Meta Title/Description Toggle",
          description: "User can enable/disable meta generation.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "toggle-faq",
          title: "FAQ Toggle",
          description: "User can enable/disable FAQ section (5 Q&As).",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "toggle-featured-img",
          title: "Featured Image Toggle",
          description: "User can enable/disable featured image.",
          value: "Default: ON",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "toggle-h2-img",
          title: "H2 Images Toggle",
          description: "User can enable/disable H2 section images.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "toggle-alt-text",
          title: "Alt Text Toggles",
          description: "Featured Image Alt Text and H2 Image Alt Text can be toggled. Depend on image being enabled.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "toggle-interlinking",
          title: "Interlinking Master Toggle",
          description: "User can enable/disable internal linking. When ON, sub-options appear based on article type.",
          value: "Default: ON",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "type-specific-toggles",
      title: "Type-Specific Toggles",
      icon: Box,
      items: [
        {
          id: "type-toggle-quick-facts",
          title: "Quick Facts Toggle",
          description: "Available for Informational type only.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "type-toggle-pro-tips",
          title: "Pro Tips Toggle",
          description: "Available for How-To type only.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "type-toggle-steps-number",
          title: "Enable Steps Number Toggle",
          description: "Available for How-To type only. Shows step numbers in H2 headings.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "type-toggle-why-choose",
          title: "Why Choose Local Toggle",
          description: "Available for Local type only.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "type-toggle-service-info",
          title: "Service Info Box Toggle",
          description: "Available for Local type only. Requires user-provided business info.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "type-toggle-nutrition",
          title: "Nutrition Facts Toggle",
          description: "Available for Recipe type only.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "type-toggle-honorable",
          title: "Honorable Mentions Toggle",
          description: "Available for Listicle type only.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "type-toggle-ranking",
          title: "Enable Listicle Ranking Toggle",
          description: "Available for Listicle type only. Shows ranking numbers. Sub-option: Ascending or Descending order.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "type-toggle-quick-verdict",
          title: "Quick Verdict Box Toggle",
          description: "Available for Comparison type only.",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "type-toggle-affiliate-closing",
          title: "Affiliate Closing Section Toggle",
          description: "Available for Affiliate type only (other types have required/not available).",
          value: "Default: OFF",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "article-type-defaults",
      title: "Article Type Defaults",
      icon: FileText,
      items: [
        {
          id: "default-affiliate",
          title: "Affiliate Default",
          description: "Tone: Persuasive | Style: Balanced — Drives purchase decisions with credibility.",
          value: "Persuasive + Balanced",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "default-commercial",
          title: "Commercial Default",
          description: "Tone: Persuasive | Style: Concise — Quick, compelling value propositions.",
          value: "Persuasive + Concise",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "default-comparison",
          title: "Comparison Default",
          description: "Tone: Objective | Style: Detailed — Fair, thorough analysis of options.",
          value: "Objective + Detailed",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "default-howto",
          title: "How-To Default",
          description: "Tone: Educational | Style: Concise — Clear, actionable instructions.",
          value: "Educational + Concise",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "default-informational",
          title: "Informational Default",
          description: "Tone: Educational | Style: Detailed — Comprehensive knowledge sharing.",
          value: "Educational + Detailed",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "default-listicle",
          title: "Listicle Default",
          description: "Tone: Conversational | Style: Concise — Easy to scan, engaging.",
          value: "Conversational + Concise",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "default-local",
          title: "Local Default",
          description: "Tone: Friendly | Style: Balanced — Approachable local business feel.",
          value: "Friendly + Balanced",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "default-recipe",
          title: "Recipe Default",
          description: "Tone: Friendly | Style: Concise — Warm, easy-to-follow cooking guidance.",
          value: "Friendly + Concise",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "default-review",
          title: "Review Default",
          description: "Tone: Authoritative | Style: Detailed — Expert, thorough product analysis.",
          value: "Authoritative + Detailed",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "system-hardcoded",
      title: "System Hardcoded Settings",
      icon: Lock,
      items: [
        {
          id: "sys-char-limits",
          title: "Character/Word Limits",
          description: "H1: 60 chars, H2: 60 chars, Standard Para: 150 words, Listicle: ODD numbers only. NOT user-configurable.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "sys-visuals",
          title: "Visual Restrictions",
          description: "Grayscale only, no emojis, specific CSS classes, scai- prefix. NOT user-configurable.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "sys-logic",
          title: "Logic Enforcement",
          description: "Header consistency rule, pipeline steps, H3 restriction (FAQ/Honorable Mentions only). NOT user-configurable.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "sys-validation",
          title: "Validation Rules",
          description: "Forbidden phrases, API requirements, duplicate checks, component validation. NOT user-configurable.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "sys-required-components",
          title: "Required Components",
          description: "Each article type has required components that cannot be toggled off (e.g., Affiliate: Product Card, Review: Features + Pros/Cons + Rating).",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "content-tiers",
      title: "Content Tiers",
      icon: Layers,
      items: [
        {
          id: "tier-primary",
          title: "Primary Tier (Pillar Content)",
          description: "Default 2000 words. Use for pillar content, competitive keywords, comprehensive guides.",
          value: "2000 words default",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "tier-secondary",
          title: "Secondary Tier (Supporting Content)",
          description: "Default 1000 words. Use for supporting content, long-tail keywords, topic clusters.",
          value: "1000 words default",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 6: PROMPT RULES (prompt_rules.md) - AI BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════════

export const PROMPT_RULES: MainCategory = {
  id: "prompt-rules",
  title: "Prompt Rules",
  description: "AI BEHAVIOR Layer: AI prompting guidelines, token management, and response validation",
  icon: Brain,
  color: "text-pink-400",
  bgColor: "bg-pink-500/10",
  subsections: [
    {
      id: "token-management",
      title: "Token Management",
      icon: Cpu,
      items: [
        {
          id: "token-h1",
          title: "H1 Generation Budget",
          description: "Max Input: 500 tokens. Max Output: 100 tokens. Total Budget: 600 tokens.",
          value: "600 tokens total",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "token-h2",
          title: "H2 Generation Budget",
          description: "Max Input: 800 tokens. Max Output: 200 tokens. Total Budget: 1000 tokens.",
          value: "1000 tokens total",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "token-paragraph",
          title: "Paragraph Generation Budget",
          description: "Max Input: 1000 tokens. Max Output: 500 tokens. Total Budget: 1500 tokens.",
          value: "1500 tokens total",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "token-section",
          title: "Full Section Budget",
          description: "Max Input: 2000 tokens. Max Output: 1000 tokens. Total Budget: 3000 tokens.",
          value: "3000 tokens total",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "token-meta",
          title: "Meta Content Budget",
          description: "Max Input: 500 tokens. Max Output: 200 tokens. Total Budget: 700 tokens.",
          value: "700 tokens total",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "token-list",
          title: "List Generation Budget",
          description: "Max Input: 800 tokens. Max Output: 400 tokens. Total Budget: 1200 tokens.",
          value: "1200 tokens total",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "token-faq",
          title: "FAQ Section Budget",
          description: "All 5 Q&As. Max Input: 1500 tokens. Max Output: 800 tokens. Total Budget: 2300 tokens.",
          value: "2300 tokens total",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "token-article",
          title: "Full Article Budget",
          description: "Max Input: 4000 tokens. Max Output: 4000 tokens. Total Budget: 8000 tokens.",
          value: "8000 tokens total",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "token-context-window",
          title: "Context Window Allocation",
          description: "System Prompt: 500 (6%). Article Context: 1000 (12.5%). Section Instructions: 500 (6%). Previous Content Summary: 500 (6%). Output Buffer: 2000 (25%). Safety Margin: 500 (6%). Available for Generation: 3000 (37.5%).",
          value: "8000 tokens total",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "prompt-engineering",
      title: "Prompt Engineering",
      icon: Send,
      items: [
        {
          id: "prompt-article-type",
          title: "Article Type Context",
          description: "Prompt must specify the article type (informational, how-to, listicle, etc.).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "prompt-title-variation",
          title: "Title Variation",
          description: "Prompt must specify title variation format (question, statement, or listicle).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "prompt-word-target",
          title: "Word Count Target",
          description: "Prompt must include target word count range.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "prompt-keyword",
          title: "Primary Keyword",
          description: "Prompt must include the primary keyword/topic for SEO focus.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "prompt-html-template",
          title: "HTML Template",
          description: "Prompt must include exact HTML structure template with scai- classes.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "prompt-forbidden-list",
          title: "Forbidden Words List",
          description: "Prompt must list forbidden words/phrases (Conclusion, Summary, etc.).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "prompt-system-role",
          title: "System Role",
          description: "System prompt must define the AI as an 'expert SEO content writer'.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "prompt-output-format",
          title: "Output Format",
          description: "System prompt must specify output as clean HTML only, no markdown, no code blocks.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "prompt-tone-style",
          title: "Tone and Style",
          description: "Prompt must include selected tone and style settings.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "response-validation",
      title: "Response Validation",
      icon: FileCheck,
      items: [
        {
          id: "resp-format-check",
          title: "Format Validation",
          description: "Output must match requested structure. Wrong format → Regenerate.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "resp-length-check",
          title: "Length Validation",
          description: "Within ±10% of target: Accept. ±20%: Review. >20% deviation: Regenerate.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "resp-keyword-check",
          title: "Keyword Presence Validation",
          description: "Required keywords must be present. Absent → Regenerate with stronger constraints.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "resp-forbidden-check",
          title: "Forbidden Content Check",
          description: "Scan for prohibited terms. Found → Regenerate with content filter.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "resp-truncation-check",
          title: "Truncation Check",
          description: "Output cut off mid-sentence → Regenerate with lower token target.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "resp-quality-score",
          title: "Quality Score Thresholds",
          description: "90-100%: Accept. 70-89%: Review, may accept. Below 70%: Regenerate.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "resp-reason-codes",
          title: "Rejection Reason Codes",
          description: "FORMAT_ERROR, LENGTH_SHORT, LENGTH_LONG, MISSING_KEYWORD, FORBIDDEN_CONTENT, OFF_TOPIC, TRUNCATED, DUPLICATE, LOW_QUALITY.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "retry-fallback",
      title: "Retry & Fallback Logic",
      icon: RefreshCw,
      items: [
        {
          id: "retry-h1-h2",
          title: "H1/H2 Retry Config",
          description: "Max Retries: 3. Delay Between: 1 second. Timeout: 30 seconds.",
          value: "3 retries, 1s delay, 30s timeout",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "retry-paragraph",
          title: "Paragraph Retry Config",
          description: "Max Retries: 3. Delay Between: 2 seconds. Timeout: 60 seconds.",
          value: "3 retries, 2s delay, 60s timeout",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "retry-section",
          title: "Full Section Retry Config",
          description: "Max Retries: 3. Delay Between: 5 seconds. Timeout: 120 seconds.",
          value: "3 retries, 5s delay, 120s timeout",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "retry-image",
          title: "Image Retry Config",
          description: "Max Retries: 5. Delay Between: 5 seconds. Timeout: 180 seconds.",
          value: "5 retries, 5s delay, 180s timeout",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "retry-article",
          title: "Full Article Retry Config",
          description: "Max Retries: 2. Delay Between: 30 seconds. Timeout: 600 seconds.",
          value: "2 retries, 30s delay, 600s timeout",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "retry-strategy",
          title: "Retry Strategy per Attempt",
          description: "1st: Original prompt. 2nd: Refined prompt with explicit constraints. 3rd: Simplified prompt. 4th: Alternative approach. 5th: Minimal prompt.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "fallback-h1",
          title: "H1 Fallback",
          description: "All retries exhausted → Use keyword as title + flag for review.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "fallback-meta",
          title: "Meta Fallback",
          description: "Meta Title → Use H1. Meta Description → Use first 160 chars of overview.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "fallback-image",
          title: "Image Fallback",
          description: "All retries exhausted → Use placeholder image + flag for manual review.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "fallback-paragraph",
          title: "Paragraph Fallback",
          description: "All retries exhausted → Skip section + flag for manual completion.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "scale-processing",
      title: "Scale Processing (Batch)",
      icon: Scale,
      items: [
        {
          id: "scale-concurrent",
          title: "Max Concurrent Articles",
          description: "Maximum 10 concurrent articles to prevent resource exhaustion.",
          value: "max 10 concurrent",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "scale-batch-size",
          title: "Max Batch Size",
          description: "Maximum 500 articles per batch for manageable quality control.",
          value: "max 500 per batch",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "scale-min-delay",
          title: "Min Delay Between Articles",
          description: "Minimum 100ms delay between articles for rate limiting.",
          value: "min 100ms delay",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "scale-max-retries",
          title: "Max Retries per Article",
          description: "Maximum 5 retries per article to prevent infinite loops.",
          value: "max 5 retries",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "scale-batch-timeout",
          title: "Batch Timeout",
          description: "Batch timeout of 4 hours to prevent stuck batches.",
          value: "4 hours timeout",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "scale-context-isolation",
          title: "Context Isolation",
          description: "Each article has separate context. No cross-contamination between articles. Article A context never affects Article B.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "scale-error-isolation",
          title: "Error Isolation",
          description: "One article failure doesn't affect the batch. Track progress per article independently.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "scale-quality-checkpoints",
          title: "Quality Checkpoints",
          description: "Sample review every 50 articles. Automated validation every article. Consistency audit every 100 articles.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "scale-performance-targets",
          title: "Performance Targets",
          description: "Success Rate: ≥95% (alert <90%). Avg Generation Time: <30s (alert >60s). Retry Rate: <10% (alert >20%). Quality Score Avg: ≥80% (alert <70%).",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "conflict-resolution",
      title: "Rule Conflict Resolution",
      icon: AlertCircle,
      items: [
        {
          id: "conflict-priority",
          title: "Priority Hierarchy",
          description: "1. Safety Rules (highest). 2. Legal/Compliance. 3. Programmatic Constraints. 4. Content Rules. 5. Style Guidelines. 6. Preferences (lowest).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "conflict-safety-vs-content",
          title: "Safety vs Content",
          description: "Safety always wins. No profanity overrides creative freedom.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "conflict-length-vs-quality",
          title: "Length vs Quality",
          description: "Quality wins. Regenerate to fit rather than padding or truncating.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "conflict-format-vs-content",
          title: "Format vs Content",
          description: "Format wins. Content must fit the expected structure.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "conflict-keyword-vs-natural",
          title: "Keyword vs Natural Language",
          description: "Natural language wins. Avoid keyword stuffing. Use semantic variations.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "conflict-user-vs-system",
          title: "User Setting vs System Constraint",
          description: "System constraint wins. Users cannot override hardcoded rules.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "context-preservation",
      title: "Context Preservation",
      icon: Database,
      items: [
        {
          id: "context-critical-vars",
          title: "Critical Variables to Persist",
          description: "Seed Keyword, User Intent, Topic Scope, Article Type, Tone, Style, Target Audience. Must be maintained across all prompt chains.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "context-stateless",
          title: "Stateless AI Call Handling",
          description: "Each AI API call is stateless. Must re-inject essential context: article type, keyword, tone, current section, previous content summary.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "context-topic-drift",
          title: "Topic Drift Prevention",
          description: "Re-inject primary keyword in each prompt. Clear topic scope per H2 section. Include article purpose in each call. Define in-scope vs out-of-scope.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "context-priority-info",
          title: "Priority Information (Never Truncate)",
          description: "Primary keyword, Article type, Current section heading, Tone/style requirements, Critical constraints.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 7: IMAGE RULES (image_rules.md) - VISUAL GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export const IMAGE_RULES: MainCategory = {
  id: "image-rules",
  title: "Image Rules",
  description: "VISUAL GENERATION Layer: Image specifications, quality thresholds, aspect ratios, regeneration logic, and content restrictions",
  icon: ImageIcon,
  color: "text-cyan-400",
  bgColor: "bg-cyan-500/10",
  subsections: [
    {
      id: "aspect-ratios",
      title: "Aspect Ratio Requirements",
      icon: LayoutGrid,
      items: [
        {
          id: "ratio-featured",
          title: "Featured Image",
          description: "Aspect Ratio: 16:9. Recommended: 1200×675 px. Used for main article image after H1.",
          value: "16:9 (1200×675 px)",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "ratio-h2",
          title: "H2 Image",
          description: "Aspect Ratio: 16:9. Recommended: 800×450 px. Used between H2 and paragraph.",
          value: "16:9 (800×450 px)",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "ratio-product",
          title: "Product Card Image",
          description: "Aspect Ratio: 1:1. Recommended: 400×400 px. Used for affiliate product displays.",
          value: "1:1 (400×400 px)",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "ratio-why-choose",
          title: "Why Choose Local Image",
          description: "Aspect Ratio: 4:3. Recommended: 400×300 px. Used in local article side layout.",
          value: "4:3 (400×300 px)",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "ratio-thumbnail",
          title: "Thumbnail",
          description: "Aspect Ratio: 1:1. Recommended: 150×150 px. Used for preview/listing images.",
          value: "1:1 (150×150 px)",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "ratio-social",
          title: "Social Share Image",
          description: "Aspect Ratio: 1.91:1. Recommended: 1200×628 px. Used for Open Graph / social media.",
          value: "1.91:1 (1200×628 px)",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "ratio-tolerance",
          title: "Aspect Ratio Tolerance",
          description: "Strict: Must be exact ratio (±1%). Never stretch or distort. Crop center-weighted if needed.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "quality-thresholds",
      title: "Quality Thresholds",
      icon: CheckCircle,
      items: [
        {
          id: "quality-resolution-featured",
          title: "Featured Image Min Resolution",
          description: "Minimum: 1200×675 px. DPI: 72.",
          value: "1200×675 px, 72 DPI",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "quality-resolution-h2",
          title: "H2 Image Min Resolution",
          description: "Minimum: 800×450 px. DPI: 72.",
          value: "800×450 px, 72 DPI",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "quality-file-format",
          title: "File Formats",
          description: "Allowed: JPEG, PNG, WebP. Preferred: WebP (best compression). PNG only when transparency needed.",
          value: "WebP preferred",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "quality-file-size",
          title: "Max File Size",
          description: "Maximum 500 KB per image.",
          value: "max 500 KB",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "quality-compression",
          title: "Compression Quality",
          description: "Minimum 80% quality for JPEG compression.",
          value: "min 80%",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "quality-visual-standards",
          title: "Visual Quality Standards",
          description: "Sharpness: Primary subject in focus. Noise: Minimal visible grain. Artifacts: None visible. Lighting: Adequate and even. Colors: Natural appearance.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "quality-scoring",
          title: "Quality Score Thresholds",
          description: "90-100: Excellent (Accept). 75-89: Good (Accept). 60-74: Acceptable (Review). Below 60: Poor (Regenerate).",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "regeneration-logic",
      title: "Regeneration Logic",
      icon: RefreshCw,
      items: [
        {
          id: "regen-quality-below",
          title: "Quality Below Threshold",
          description: "Score < 60 → Regenerate with same prompt.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "regen-wrong-ratio",
          title: "Wrong Aspect Ratio",
          description: "Outside tolerance → Regenerate with explicit dimensions.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "regen-watermark",
          title: "Watermark Detected",
          description: "Any watermark present → Regenerate with 'no watermark' instruction.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "regen-wrong-content",
          title: "Wrong Content",
          description: "Doesn't match prompt → Regenerate with refined prompt.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "regen-text-in-image",
          title: "Text in Image",
          description: "Unintended text → Regenerate with 'no text, no words, no letters' instruction.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "regen-file-too-large",
          title: "File Too Large",
          description: "Exceeds 500 KB → Compress or regenerate.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "regen-retry-attempts",
          title: "Retry Attempts",
          description: "1st: Original prompt (immediate). 2nd: Refined + constraints (2s). 3rd: Alternative approach (5s). 4th: Simpler prompt (10s). 5th: Use placeholder.",
          value: "max 5 attempts",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "image-prompts",
      title: "Image Prompt Rules",
      icon: Send,
      items: [
        {
          id: "img-prompt-no-text",
          title: "No Text in Images",
          description: "Image prompts must explicitly state: no text, no words, no letters, no numbers, no writing, no signs.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "img-prompt-no-humans",
          title: "No Humans in Images",
          description: "Image prompts must explicitly state: no humans, no people, no faces, no hands, no body parts.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "img-prompt-context",
          title: "Context from Content",
          description: "Image prompt must be derived from the nearest text context (H2 title and surrounding paragraph).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "img-prompt-structure",
          title: "Prompt Structure",
          description: "[Subject] + [Style] + [Setting] + [Composition] + [Quality Modifiers] + [Exclusions]",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "img-prompt-model",
          title: "Image Generation Model",
          description: "Use Gemini 2.0 Flash Preview Image Generation as the primary model.",
          value: "gemini-2.0-flash-preview-image-generation",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "img-prompt-resolution",
          title: "Generation Resolution",
          description: "All generated images use 2K resolution (2048px-3168px).",
          value: "2K resolution",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "style-consistency",
      title: "Style Consistency",
      icon: Palette,
      items: [
        {
          id: "style-same-visual",
          title: "Same Visual Style",
          description: "All images in an article must use the same style (photo, illustration, etc.).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "style-lock",
          title: "Per-Article Style Lock",
          description: "Once first image style is determined, all subsequent images must match. Featured Image sets the style lock.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "style-categories",
          title: "Style Categories",
          description: "Photographic (Reviews, Local, Commercial). Illustrated (How-To, Informational). Minimalist (Listicles, Comparisons). Editorial (Affiliate, Recipe).",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "style-lighting",
          title: "Consistent Lighting",
          description: "Similar lighting mood across all images in an article.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "style-color-harmony",
          title: "Color Harmony",
          description: "Colors should complement each other across all images.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
    {
      id: "content-restrictions",
      title: "Content Restrictions",
      icon: AlertTriangle,
      items: [
        {
          id: "restrict-faces",
          title: "No Identifiable Faces",
          description: "No identifiable human faces without explicit consent/licensing.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "restrict-copyright",
          title: "No Copyrighted Material",
          description: "No logos, brand imagery, trademarked content.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "restrict-offensive",
          title: "No Offensive Content",
          description: "No violence, gore, disturbing imagery.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "restrict-adult",
          title: "No Adult Content",
          description: "No sexually explicit or suggestive imagery.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "restrict-watermarks",
          title: "No Watermarks",
          description: "No watermarks of any kind.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "restrict-low-quality",
          title: "No Low Quality",
          description: "No pixelated, blurry, or artifact-heavy images.",
          type: "rule",
          enforcement: "forbidden",
        },
        {
          id: "restrict-text",
          title: "No Embedded Text",
          description: "No embedded text unless explicitly requested.",
          type: "rule",
          enforcement: "forbidden",
        },
      ],
    },
    {
      id: "image-pipeline",
      title: "Processing Pipeline",
      icon: Workflow,
      items: [
        {
          id: "pipeline-step1",
          title: "Step 1: Initial Generation",
          description: "AI generates image from prompt → Raw image file output.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "pipeline-step2",
          title: "Step 2: Quality Assessment",
          description: "Automated quality scoring → Pass/Fail + Score output.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "pipeline-step3",
          title: "Step 3: Enhancement (if needed)",
          description: "Upscaling, sharpening, noise reduction, color correction → Enhanced image.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "pipeline-step4",
          title: "Step 4: Format Optimization",
          description: "Convert to WebP, compress (min 80%) → Optimized file under 500KB.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "pipeline-step5",
          title: "Step 5: Final Validation",
          description: "Check all requirements (ratio, quality, restrictions) → Approved/Rejected.",
          type: "rule",
          enforcement: "mandatory",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// APPLICATION RULES (App-specific rules not in the 7-layer documentation)
// ═══════════════════════════════════════════════════════════════════════════════

export const APPLICATION_RULES: MainCategory = {
  id: "application-rules",
  title: "Application Rules",
  description: "App-specific: Quality standards, UX guidelines, and implementation details not in the 7-layer documentation",
  icon: Star,
  color: "text-orange-400",
  bgColor: "bg-orange-500/10",
  subsections: [
    {
      id: "content-quality",
      title: "Content Quality",
      icon: CheckCircle,
      items: [
        {
          id: "qual-paragraphs",
          title: "Paragraph Quality",
          description: "Paragraphs must be clear, complete, and end with a period. No filler content.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "qual-accuracy",
          title: "Accuracy",
          description: "LLM content must be factual. Recipes/How-Tos must be safe and executable.",
          type: "rule",
          enforcement: "mandatory",
        },
        {
          id: "qual-natural",
          title: "Natural Language",
          description: "Avoid robotic phrasing. Vary sentence structure. Sound natural, not AI-generated.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "qual-value",
          title: "Value Proposition",
          description: "Every component must address the H2 topic directly. Focus on genuine value.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "qual-actionable",
          title: "Actionable Content",
          description: "Provide concrete steps or takeaways where possible.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "qual-flow",
          title: "Logical Flow",
          description: "Content should flow logically from one section to the next.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "qual-readability",
          title: "Readability Score",
          description: "Target Flesch-Kincaid score of 60-70 for optimal readability.",
          value: "60-70 target",
          type: "guideline",
          enforcement: "recommended",
        },
      ],
    },
    {
      id: "image-quality",
      title: "Image Quality Guidelines",
      icon: Image,
      items: [
        {
          id: "img-qual-relevance",
          title: "Contextual Relevance",
          description: "Images should be highly relevant to the surrounding content context.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "img-qual-style",
          title: "Blog-Appropriate Style",
          description: "Images should look appropriate for a professional blog, not abstract art.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "img-qual-ai",
          title: "Avoid AI Appearance",
          description: "Generated images should not look obviously AI-generated.",
          type: "guideline",
          enforcement: "recommended",
        },
      ],
    },
    {
      id: "ux-quality",
      title: "User Experience Quality",
      icon: Target,
      items: [
        {
          id: "ux-realtime",
          title: "Real-time Generation",
          description: "Content should appear to be written in real-time, character by character.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "ux-smooth",
          title: "Smooth Animation",
          description: "Content generation should be smooth, not janky or jumpy.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "ux-img-loading",
          title: "Image Loading States",
          description: "Images should show loading animation before appearing, content pauses during load.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "ux-autoscroll",
          title: "Optional Auto-scroll",
          description: "Auto-scroll should not force user down, only scroll if user is at bottom.",
          type: "guideline",
          enforcement: "recommended",
        },
      ],
    },
    {
      id: "tone-guidelines",
      title: "Tone Guidelines",
      icon: Volume2,
      items: [
        {
          id: "tone-professional",
          title: "Professional Tone",
          description: "Polished, business-appropriate, and credible. Suitable for B2B content.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "tone-conversational",
          title: "Conversational Tone",
          description: "Natural speech patterns, uses 'you' directly, relaxed and approachable.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "tone-authoritative",
          title: "Authoritative Tone",
          description: "Expert voice, confident assertions, demonstrates deep knowledge.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "tone-friendly",
          title: "Friendly Tone",
          description: "Warm, approachable, and personable. Like advice from a trusted friend.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "tone-persuasive",
          title: "Persuasive Tone",
          description: "Compelling, benefit-driven, action-oriented. Encourages reader decisions.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "tone-educational",
          title: "Educational Tone",
          description: "Clear explanations, teaching voice, breaks down complex topics.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "tone-objective",
          title: "Objective Tone",
          description: "Unbiased, fact-based, balanced perspective. No emotional language.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "tone-enthusiastic",
          title: "Enthusiastic Tone",
          description: "Energetic, excited, and passionate about the topic.",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "tone-empathetic",
          title: "Empathetic Tone",
          description: "Understanding, compassionate, acknowledges reader struggles and concerns.",
          type: "guideline",
          enforcement: "recommended",
        },
      ],
    },
    {
      id: "style-guidelines",
      title: "Style Guidelines",
      icon: PenTool,
      items: [
        {
          id: "style-concise",
          title: "Concise Style",
          description: "Short, punchy sentences. Direct and to the point. Best for quick reads, scannable content.",
          value: "5-10 words/sentence",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "style-balanced",
          title: "Balanced Style",
          description: "Standard sentence length. Natural reading flow, versatile. General purpose.",
          value: "12-18 words/sentence",
          type: "guideline",
          enforcement: "recommended",
        },
        {
          id: "style-detailed",
          title: "Detailed Style",
          description: "Longer, comprehensive sentences. Thorough explanations. Best for in-depth guides, technical content.",
          value: "20-30 words/sentence",
          type: "guideline",
          enforcement: "recommended",
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALL CATEGORIES EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_CATEGORIES: MainCategory[] = [
  // === 7 DOCUMENTED LAYERS (from Rules Documentation folder) ===
  COMPONENT_RULES,        // Layer 1: STRUCTURE - Component taxonomy (blue)
  CONTENT_RULES,          // Layer 2: LOGIC - Generation logic (purple)
  GENERAL_RULES,          // Layer 3: PRESENTATION - Visual layout (emerald)
  PROGRAMMATIC_RULES,     // Layer 4: SYSTEM CONSTRAINTS - Limits & validation (red)
  USER_OPTIONS,           // Layer 5: USER CHOICES - User settings (amber)
  PROMPT_RULES,           // Layer 6: AI BEHAVIOR - AI prompting (pink)
  IMAGE_RULES,            // Layer 7: VISUAL GENERATION - Image specs (cyan)
  // === APPLICATION-SPECIFIC RULES (not in documentation) ===
  GOLDEN_RULES,           // App Override: Critical rules (rose)
  APPLICATION_RULES,      // App-specific: Quality & UX (orange)
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getStats() {
  const totalRules = ALL_CATEGORIES.reduce(
    (acc, cat) =>
      acc + cat.subsections.reduce((a, s) => a + s.items.filter((i) => i.type === "rule").length, 0),
    0
  );

  const totalGuidelines = ALL_CATEGORIES.reduce(
    (acc, cat) =>
      acc + cat.subsections.reduce((a, s) => a + s.items.filter((i) => i.type === "guideline").length, 0),
    0
  );

  const mandatory = ALL_CATEGORIES.reduce(
    (acc, cat) =>
      acc + cat.subsections.reduce((a, s) => a + s.items.filter((i) => i.enforcement === "mandatory").length, 0),
    0
  );

  const forbidden = ALL_CATEGORIES.reduce(
    (acc, cat) =>
      acc + cat.subsections.reduce((a, s) => a + s.items.filter((i) => i.enforcement === "forbidden").length, 0),
    0
  );

  return { totalRules, totalGuidelines, mandatory, forbidden, total: totalRules + totalGuidelines };
}

export function searchRules(query: string): RuleItem[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  const results: RuleItem[] = [];

  ALL_CATEGORIES.forEach((category) => {
    category.subsections.forEach((subsection) => {
      subsection.items.forEach((item) => {
        if (
          item.title.toLowerCase().includes(lowerQuery) ||
          item.description.toLowerCase().includes(lowerQuery) ||
          item.value?.toLowerCase().includes(lowerQuery)
        ) {
          results.push(item);
        }
      });
    });
  });

  return results;
}

export function filterByEnforcement(enforcement: Enforcement): RuleItem[] {
  const results: RuleItem[] = [];

  ALL_CATEGORIES.forEach((category) => {
    category.subsections.forEach((subsection) => {
      subsection.items.forEach((item) => {
        if (item.enforcement === enforcement) {
          results.push(item);
        }
      });
    });
  });

  return results;
}

export function filterByType(type: RuleType): RuleItem[] {
  const results: RuleItem[] = [];

  ALL_CATEGORIES.forEach((category) => {
    category.subsections.forEach((subsection) => {
      subsection.items.forEach((item) => {
        if (item.type === type) {
          results.push(item);
        }
      });
    });
  });

  return results;
}
