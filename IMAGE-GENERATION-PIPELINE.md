# Image Generation Pipeline

How SCAI generates photorealistic, article-aware images that don't look like AI slop.

---

## Architecture Overview

```
 USER REQUEST                    ARTICLE ENGINE                      IMAGE ENGINE
 ============                    ==============                      ============

 +------------+     +---------------------------+     +----------------------------------+
 | "Write an  | --> | Generator Orchestrator    | --> | Trigger.dev Background Tasks     |
 |  article   |     |                           |     |                                  |
 |  about..." |     | 1. Structure generation   |     |  +----------------------------+  |
 +------------+     | 2. Parallel section writes |     |  | orchestrate-generation     |  |
                    | 3. FAQ, components, etc.   |     |  |                            |  |
                    | 4. Insert PLACEHOLDERS     |     |  | Extracts placeholders from |  |
                    |    into final HTML         |     |  | assembled HTML, then batch |  |
                    +---------------------------+     |  | triggers child image tasks |  |
                               |                      |  +-------------+--------------+  |
                               v                      |                |                 |
                    +---------------------------+     |       +--------v--------+        |
                    | Article Assembler         |     |       | generate-image  |        |
                    |                           |     |       | (per image)     |        |
                    | Deterministic HTML build  |     |       |                 |        |
                    | with placeholder <img>s:  |     |       | Machine: 4 vCPU |        |
                    |                           |     |       | RAM:     8 GB   |        |
                    | placehold.co/800x400/...  |     |       | Timeout: 5 min  |        |
                    |   ?meta=base64(metadata)  |     |       +---------+-------+        |
                    +---------------------------+     |                 |                 |
                                                      |                 v                 |
                                                      |    +------------------------+    |
                                                      |    |  IMAGE PIPELINE         |    |
                                                      |    |  (imagen.ts)            |    |
                                                      |    |                         |    |
                                                      |    |  Step 1: Orchestrate    |    |
                                                      |    |  Step 2: Fact-check     |    |
                                                      |    |  Step 2.5: Product find |    |
                                                      |    |  Step 3: Build prompt   |    |
                                                      |    |  Step 4: Generate       |    |
                                                      |    +----------+-------------+    |
                                                      |               |                  |
                                                      |               v                  |
                                                      |    +------------------------+    |
                                                      |    | Upload to Cloudflare   |    |
                                                      |    | R2 -> public URL       |    |
                                                      |    +------------------------+    |
                                                      |               |                  |
                                                      +---------------+------------------+
                                                                      |
                                                                      v
                                                      +----------------------------------+
                                                      | Replace placeholders in HTML     |
                                                      | with real R2 URLs + corrected    |
                                                      | alt text -> save to DB           |
                                                      +----------------------------------+
```

---

## The 4-Step Image Pipeline

Every single image (featured, h2, product, recipe, etc.) goes through this multi-step
orchestration before a pixel is ever generated. This is the core of why our images
don't look like generic AI output.

```
  +-----------+    +-------------+    +----------------+    +-------------+
  |   STEP 1  | -> |   STEP 2    | -> |    STEP 3      | -> |   STEP 4    |
  | Orchestrate|   | Fact-Check  |    | Build Narrative |   |  Generate   |
  |   Prompt   |   | + Product   |    |    Prompt       |   |   Image     |
  |            |   |   Detect    |    |                 |   |             |
  | Flash model|   | Flash model |    |  Flash model    |   | Gemini Pro  |
  | -> JSON    |   | + Google    |    |  -> prose       |   | or Flux 2   |
  |  structure |   |   Search    |    |                 |   |             |
  +-----------+    +-------------+    +----------------+    +-------------+
       |                 |  |                |                     |
       v                 v  v                v                     v
  Detailed JSON     Verified      Rich narrative            Final image
  with 8 fields     facts +       description with          bytes (PNG)
  (scene, light,    reference     photorealistic
   color, comp...)  product img   imperfection clauses
```

### Step 1 -- Prompt Orchestration

A simple input like `"kitchen with stainless steel refrigerator"` gets expanded into
a structured JSON object by `gemini-3-flash-preview`:

```
  INPUT:  "kitchen with stainless steel refrigerator"
           |
           v
  +------------------------------------------------------------------+
  |  DetailedImagePrompt (JSON)                                      |
  |                                                                  |
  |  scene:       "Modern kitchen with natural morning light         |
  |                streaming through a window above the sink..."     |
  |                                                                  |
  |  subject:     "Stainless steel French-door refrigerator with     |
  |                brushed metal handles, slight fingerprint smudges" |
  |                                                                  |
  |  lighting:    { type: "natural", direction: "side",              |
  |                 intensity: "soft", color: "warm morning" }       |
  |                                                                  |
  |  composition: { style: "environmental portrait",                 |
  |                 cameraAngle: "eye-level, slightly off-center",   |
  |                 focus: "subject with background blur",           |
  |                 depthOfField: "shallow, f/2.8" }                 |
  |                                                                  |
  |  colors:      { palette: ["cool steel", "warm wood", "white"],  |
  |                 dominant: "neutral with warm accents",           |
  |                 mood: "clean and inviting" }                     |
  |                                                                  |
  |  style:       { artistic: "editorial photography",              |
  |                 quality: "magazine-grade",                       |
  |                 rendering: "photorealistic" }                    |
  |                                                                  |
  |  technical:   "Shot on Sony A7R IV, 35mm f/1.8, ISO 200"       |
  |                                                                  |
  |  negative:    ["text", "humans", "logos", "watermarks",         |
  |                "oversaturated colors", "HDR look"]              |
  +------------------------------------------------------------------+
```

The orchestrator also receives **article-type context** so it knows the visual language
for the kind of article being written (affiliate vs recipe vs review, etc.).

### Step 2 -- Fact-Checking with Google Search Grounding

Runs **in parallel** with Step 2.5. Uses `gemini-3-flash-preview` with Google Search
grounding enabled to verify factual claims in the image prompt.

```
  +--------------------------+          +---------------------------+
  |  STEP 2: Fact-Check      |          |  STEP 2.5: Product Detect |
  |                          |  (runs   |                           |
  |  "Is the Samsung         |  in      |  "Does this reference a   |
  |   Bespoke fridge         | parallel)|   real, branded product?" |
  |   actually available     |          |                           |
  |   in matte black?"       |          |  If YES (confidence > 0.7)|
  |                          |          |    -> Google Image Search |
  |  Corrects errors:        |          |    -> Vision verification |
  |  "No, it comes in        |          |    -> Reference image URL |
  |   Morning Blue, White,   |          |                           |
  |   and Sunrise Yellow"    |          |  If NO                    |
  +-----------+--------------+          |    -> text-only generation |
              |                         +-----------+---------------+
              v                                     |
  Fact-checked prompt                               v
                                        Verified product reference
                                        image (or none)
```

**Product reference image search** is a multi-step sub-pipeline:

```
  "Samsung Galaxy S24 Ultra"
           |
           v
  +-----------------------------+
  | Google Custom Search API    |
  | (image search)              |
  +-------------+---------------+
                |
                v
  +-----------------------------+
  | Score & Rank Results        |  Scoring factors:
  |                             |  - Trusted domains (+30 pts)
  | samsung.com      95 pts    |    (samsung.com, apple.com...)
  | bestbuy.com      78 pts    |  - Image dimensions
  | random-blog.com  42 pts    |  - Aspect ratio closeness
  +-------------+---------------+  - URL patterns (/product/, /dp/)
                |
                v (top 3 candidates)
  +-----------------------------+
  | Gemini 2.0 Flash Vision    |
  | Verification               |
  |                             |
  | "Is this actually a photo  |
  |  of a Samsung Galaxy S24   |
  |  Ultra and not a guitar    |
  |  or unrelated product?"    |
  +-------------+---------------+
                |
                v
  Verified reference image URL
  (or fallback to text-only)
```

### Step 3 -- Narrative Prompt Building

The structured JSON gets converted into a **flowing prose description**. This follows
the Gemini best practice that narrative descriptions produce better results than
keyword lists.

```
  JSON Structure                           Narrative Prompt
  ==============                           ================

  {                                        "A modern kitchen bathed in soft
    scene: "Modern kitchen...",     -->     morning light streaming through a
    subject: "Stainless steel...",          window above the sink. A stainless
    lighting: { type: "natural" },         steel French-door refrigerator with
    composition: { style: "..." },         brushed metal handles sits as the
    ...                                    focal point, bearing subtle
  }                                        fingerprint smudges that catch the
                                           light. Shot at eye-level, slightly
                                           off-center, with shallow depth of
                                           field (f/2.8) creating gentle
                                           background separation. Fine film
                                           grain visible in shadow areas,
                                           natural sensor noise, and subtle
                                           chromatic aberration at frame edges
                                           lend an authentic photographic
                                           quality..."
```

This step also injects the **photorealistic imperfection clauses** (see below).

### Step 4 -- Image Generation

The final prompt is routed to one of two providers:

```
                    +------------------+
                    |  Narrative Prompt |
                    |  + Reference Img  |
                    |    (if any)       |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
  +-----------------------+    +-----------------------+
  |   FLUX 2 (Default)    |    |  GEMINI 3 PRO IMAGE   |
  |   via fal.ai          |    |  via Google GenAI      |
  |                        |    |                        |
  |   Cost: ~$0.025/img   |    |   Cost: ~$0.13/img    |
  |                        |    |                        |
  |   Models:              |    |   Model:               |
  |   - flux-2-flex        |    |   gemini-3-pro-image-  |
  |     (text-to-image)    |    |   preview              |
  |   - flux-2/edit        |    |                        |
  |     (image-to-image)   |    |   Supports native      |
  |                        |    |   imageConfig for       |
  |   28 inference steps   |    |   aspect ratio +       |
  |   guidance_scale: 3.5  |    |   2K resolution        |
  |   prompt expansion: on |    |                        |
  |   safety checker: on   |    |   Response modalities:  |
  +-----------+------------+    |   TEXT + IMAGE          |
              |                 +-----------+------------+
              |                             |
              +-------------+---------------+
                            |
                            v
                  +-------------------+
                  | Base64 PNG bytes  |
                  +--------+----------+
                           |
                           v
                  +-------------------+
                  | Upload to         |
                  | Cloudflare R2     |
                  | -> public URL     |
                  +-------------------+
```

---

## The Anti-AI-Slop System

The single biggest quality differentiator is the **photorealistic imperfection system**.
AI images tend to look unnervingly perfect -- too clean, too smooth, too "glowy." We
inject deliberate imperfections that mimic real camera behavior.

### 13 Imperfection Types

```
  +-----------------------------------------------------------------------+
  |                    PHOTOREALISTIC IMPERFECTIONS                        |
  +-----------------------------------------------------------------------+
  |                                                                       |
  |  filmGrain .............. subtle fine grain like ISO 400 film          |
  |  sensorNoise ........... natural noise in shadow areas                |
  |  chromaticAberration ... slight color fringing at frame edges         |
  |  naturalVignette ....... light falloff toward edges                   |
  |  depthOfField .......... natural focus falloff, not uniform sharpness |
  |  microContrast ......... subtle tonal variation in surfaces           |
  |  colorCast ............. slight environmental color bleeding          |
  |  lensDistortion ........ mild barrel/pincushion near edges            |
  |  motionHint ............ micro blur suggesting a real shutter speed   |
  |  imperfectExposure ..... slightly over/under in highlight/shadow      |
  |  surfaceTexture ........ real-world wear, dust, fingerprints          |
  |  reflectionImperfection  imperfect reflections on glossy surfaces     |
  |  atmosphericHaze ....... subtle atmospheric scattering                |
  |                                                                       |
  +-----------------------------------------------------------------------+
```

### Per-Article-Type Realism

Different article types get different "reality flavors." A recipe photo should look
appetizing but imperfect. An affiliate product shot should look like someone actually
uses the thing in their home.

```
  ARTICLE TYPE        REALISM APPROACH
  ============        =================

  +-- Affiliate ----  "Lifestyle authenticity - products look
  |                    used/loved, not factory-fresh. Natural home
  |                    environments with real clutter and wear."
  |
  +-- Recipe -------  "Appetizing but authentic - natural food
  |                    textures, not plastic-perfect. Sauce drips,
  |                    crumb trails, steam wisps."
  |
  +-- Review -------  "Hands-on authenticity - products look
  |                    examined and tested. Fingerprints on screens,
  |                    slightly rumpled packaging."
  |
  +-- How-To ------   "Workshop/workspace realism - tools show use,
  |                    work surfaces have marks, background is
  |                    organized but lived-in."
  |
  +-- Listicle -----  "Editorial variety - each image feels like
  |                    a different photographer's style."
  |
  +-- Local --------  "Community authenticity - warm, real-world
  |                    feel like local business photography. Golden
  |                    hour lighting, genuine storefronts."
  |
  +-- Informational   "Textbook clarity with photographic warmth.
  |                    Clean but not sterile."
  |
  +-- News ---------  "Photojournalistic - documentary feel with
  |                    urgency. Available light, candid angles."
  |
  +-- Comparison ---  "Neutral testing environment - products
                       under identical lighting for fair visual
                       comparison."
```

---

## Image Type Configurations

Each placement slot in an article has its own image type with specific generation rules:

```
  IMAGE TYPE              ASPECT    USE CASE
  ==========              ======    ========

  featured / featured-hero  16:9    Hero banner after the H1
  h2                        16:9    Section header images
  product                   16:9    Product lifestyle shots
  ingredient-flat-lay       16:9    Recipe ingredient spreads
  dish-hero                 16:9    Finished dish glamour shots
  step-process              16:9    How-to step illustrations
  comparison-neutral        16:9    Side-by-side comparisons
  local-service              1:1    Local business images
  review-detail             16:9    Product close-up details
```

### Featured Image: Special Treatment

Featured images get stricter rules because they're the most visible element
(social shares, Google Discover, article hero):

```
  FEATURED IMAGE vs STANDARD IMAGE
  =================================

  Setting               Featured        Standard
  --------              --------        --------
  Max retries:          4               2
  Fast mode allowed:    No              Yes
  Negative prompts:     11 specific     Standard set
                        restrictions
  Composition:          Center-weighted  Flexible
                        for cross-crop
                        (16:9, 1.91:1,
                        1:1 safe)
```

---

## Product Image Pipeline

For affiliate articles referencing real products (from Amazon or other sources),
there's a dedicated sub-pipeline that transforms source product photos into clean,
contextual lifestyle images.

```
  Amazon Product Photo              Lifestyle Product Image
  (white background,         -->    (in-context, realistic
   clinical, boring)                 environment, editorial)

  +------------------+              +------------------+
  |                  |              |                  |
  |   [PRODUCT]     |    Flux 2    |   [PRODUCT on    |
  |   on white      |    Edit or   |    a kitchen     |
  |   background    |    Gemini    |    counter with   |
  |                  |   -------->  |    morning light  |
  |                  |              |    and coffee]    |
  |                  |              |                  |
  +------------------+              +------------------+

  The prompt includes:
  - Product identity preservation instructions
  - Environmental context from the article
  - Lighting + composition from the article type style
  - "Do not alter the product's appearance" constraint
```

---

## Fallback & Retry Strategy

The system is designed to never leave a broken image in the article. Every level
has fallbacks:

```
  ATTEMPT 1:  Generate normally
       |
       | (fails: NSFW detected / generation error / timeout)
       v
  ATTEMPT 2:  Regenerate with reinforced constraints
              "IMPORTANT: Previous attempt included text or humans.
               Ensure ABSOLUTELY NO TEXT AND NO HUMANS."
       |
       | (fails again)
       v
  ATTEMPT 3:  (featured images get up to 4 attempts)
       |
       | (all retries exhausted)
       v
  FALLBACK:   placehold.co placeholder URL
              (gray box with topic text -- at least the
               article isn't broken)


  PROVIDER-LEVEL FALLBACKS:
  +-----------------+------------------------------+
  | FAL_KEY missing | Flux returns placeholder     |
  | GOOGLE_KEY miss | Gemini returns placeholder   |
  | Product search  | Falls back to text-only      |
  |   fails         |   generation (no reference)  |
  | Product image   | Falls back to standard       |
  |   transform     |   generateImage() with       |
  |   fails         |   'product' type             |
  +-----------------+------------------------------+
```

---

## Caching Strategy

Multiple cache layers prevent redundant API calls and reduce costs:

```
  +------------------------------------+----------+
  |  CACHE LAYER                       |  TTL     |
  +------------------------------------+----------+
  |  Prompt orchestration results      |  1 hour  |
  |  Product detection results         |  24 hours|
  |  Google Image Search results       |  24 hours|
  |  Product name cleaning (AI parse)  |  In-mem  |
  +------------------------------------+----------+

  Same prompt in same session? Cache hit.
  Same product across articles?  Cache hit.
```

---

## Hard Constraints (Every Image, Every Time)

Two rules are injected into **every single prompt** regardless of provider, article
type, or image type:

```
  +============================================================+
  ||                                                          ||
  ||   ABSOLUTELY NO HUMANS in any generated image.           ||
  ||                                                          ||
  ||   ABSOLUTELY NO TEXT, words, letters, numbers,           ||
  ||   signs, labels, logos, watermarks, or typography.       ||
  ||                                                          ||
  +============================================================+
```

These constraints are enforced at multiple levels:
1. Orchestration prompt instructions
2. Narrative prompt suffix
3. Flux-specific `CRITICAL CONSTRAINTS` block
4. Retry prompt reinforcement (on failure)
5. Flux safety checker (`enable_safety_checker: true`)

---

## Cost Comparison

```
               Flux 2 (Default)          Gemini 3 Pro
               ================          ============

  Cost/image:     ~$0.025                   ~$0.13
  Quality:        Great                     Excellent
  Speed:          ~5-8 seconds              ~10-15 seconds
  Strengths:      Fast, cheap, good         Best photorealism,
                  prompt adherence          native 2K resolution
  Reference img:  flux-2/edit endpoint      Built-in image editing
  Provider:       fal.ai                    Google GenAI

  For a 6-image article:
    Flux:   6 x $0.025 = ~$0.15
    Gemini: 6 x $0.13  = ~$0.78
```

---

## End-to-End Timeline

```
  t=0s      Article generation begins
  t=15-30s  Article HTML assembled with placeholders
  t=30s     Trigger.dev orchestration task fires
  t=31s     All image tasks triggered in parallel (batch)
            |
            +-- Image 1: Orchestrate(2s) + Fact-check(3s) + Build(1s) + Generate(6s) + Upload(1s)
            +-- Image 2: Orchestrate(2s) + Fact-check(3s) + Build(1s) + Generate(6s) + Upload(1s)
            +-- Image 3: Orchestrate(2s) + Fact-check(3s) + Build(1s) + Generate(6s) + Upload(1s)
            +-- Image 4: ... (all in parallel)
            +-- Image 5: ...
            +-- Image 6: ...
            |
  t=45-55s  All images complete (parallel execution)
  t=55-60s  Placeholders replaced, alt text corrected, HTML saved
            |
            v
         DONE -- User sees real images via Pusher real-time updates
```

---

## Key Files Reference

| File | Role |
|------|------|
| `lib/services/imagen.ts` | Core pipeline: orchestration, fact-checking, prompt building, generation |
| `lib/services/flux-image-generator.ts` | Flux 2 provider (default) via fal.ai |
| `lib/services/product-image-generator.ts` | Product photo transformation (Amazon -> lifestyle) |
| `lib/services/google-image-search.ts` | Product reference image search + vision verification |
| `lib/services/r2-storage.ts` | Cloudflare R2 upload |
| `lib/jobs/generate-images.ts` | Trigger.dev task: single image generation + upload |
| `lib/jobs/orchestrate-generation.ts` | Trigger.dev parent task: batch image orchestration |
| `lib/services/article-assembler.ts` | HTML assembly with placeholder insertion |
| `lib/services/content-corrector.ts` | Post-generation alt text validation |
