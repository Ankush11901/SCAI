# Flux Dev Image Generation Integration Plan

> **Provider:** fal.ai (`fal-ai/flux/dev`)
> **Default:** Flux Dev (replaces Gemini as default image provider)
> **Orchestration:** Reuse existing Gemini prompt orchestration pipeline, swap only the final generation call

---

## Phase 1: Foundation — Package, Service & Cost Infrastructure

- [x] **1.1** Install `@fal-ai/client` package (fal.ai SDK for calling Flux Dev)
- [x] **1.2** Create `lib/services/flux-image-generator.ts` — Flux image generation service
  - `generateFluxImage()` function returning `ImageGenerationResult`
  - Map `ValidAspectRatio` → fal.ai `image_size` parameter
  - Download fal.ai result URL → base64 (matching existing pipeline for R2 upload)
  - Retry logic with exponential backoff
  - Cost tracking via `logAiUsageAsync()` with `provider: 'flux'`, `modelId: 'flux-dev'`
  - Read `FAL_KEY` from `process.env.FAL_KEY`
- [x] **1.3** Add `ImageProvider` type (`'gemini' | 'flux'`) to `lib/services/imagen.ts`
- [x] **1.4** Add `'flux-dev'` entry to `IMAGE_PRICING` in `lib/ai/models.ts`
- [x] **1.5** Extend `AIProvider` type in `lib/services/cost-tracking-service.ts` to include `'flux'`
- [x] **1.6** Add `fluxCostUsd` column to `generationCostSummaries` in `drizzle/schema.ts`
- [x] **1.7** Create Drizzle migration `0009_add_flux_cost_tracking.sql`
- [x] **1.8** Update `updateGenerationCostSummary()` and `GenerationCostDisplay` to include Flux cost bucket

## Phase 2: Core Image Generation — Provider Branching in imagen.ts

- [x] **2.1** Add `imageProvider` parameter to `generateImage()` (default `'flux'`)
- [x] **2.2** Branch at Step 4 (image generation call):
  - `'gemini'` → existing `genai.models.generateContent()` path
  - `'flux'` → call `generateFluxImage()` from new service
- [x] **2.3** Update `generateImageWithOptions()` to accept and pass `imageProvider`
- [x] **2.4** Handle product reference mode for Flux (text-only enrichment, no image-to-image)

## Phase 3: Trigger Jobs — Pass `imageProvider` Through Pipeline

- [x] **3.1** Add `imageProvider` to `ImageGenerationPayload` in `lib/jobs/generate-images.ts`
- [x] **3.2** Pass `imageProvider` to `generateImage()` calls in the generate-image task
- [x] **3.3** Add `imageProvider` to `OrchestrationPayload` in `lib/jobs/orchestrate-generation.ts`
- [x] **3.4** Include `imageProvider` in child task payloads when batch-triggering images
- [x] **3.5** Add `imageProvider` to `BulkGenerationPayload.settings` in `lib/jobs/bulk-generate.ts`
- [x] **3.6** Pass `imageProvider` through bulk generation to child image task payloads

## Phase 4: API Routes — Accept `imageProvider` from Frontend

- [x] **4.1** Update `app/api/generate/trigger/route.ts` — extract `imageProvider` from body, include in `OrchestrationPayload`
- [x] **4.2** Update `app/api/generate/route.ts` — extract `imageProvider` from body, pass to inline image generation
- [x] **4.3** Update bulk generation API routes (`start`, `cluster`, `queue/start-next`, `[jobId]/retry`) to accept `imageProvider`

## Phase 5: UI — Image Provider Dropdown

- [x] **5.1** Add `ImageProvider` type and `IMAGE_PROVIDERS` constant to `components/generate/GeneratorForm.tsx`
- [x] **5.2** Add `imageProvider` / `onImageProviderChange` to `GeneratorFormProps`
- [x] **5.3** Add Image Provider dropdown in settings section (after AI Provider selector)
- [x] **5.4** Add `imageProvider` state to `app/(protected)/generate/page.tsx` (default `'flux'`)
- [x] **5.5** Pass `imageProvider` to `GeneratorForm` and include in API calls (`/api/generate` and `/api/generate/trigger`)
- [x] **5.6** Add `imageProvider: 'flux'` default to bulk generation page settings
- [x] **5.7** Update `useBulkGeneration` hook `BulkGenerationSettings` interface with `imageProvider` field

## Phase 6: Environment & Config

- [x] **6.1** Update `env.example.txt` — add `FAL_KEY` entry with description
- [x] **6.2** No `trigger.config.ts` changes needed (fal.ai SDK works without externalization)
- [x] **6.3** `FAL_KEY` documented in `env.example.txt`

## Phase 7: Verification

- [ ] **7.1** Generate article with `imageProvider: 'flux'` — images appear with R2 URLs
- [ ] **7.2** Generate article with `imageProvider: 'gemini'` — existing pipeline unaffected
- [ ] **7.3** Cost tracking: Flux image costs appear in costs dashboard
- [ ] **7.4** Bulk generation works with both providers
- [ ] **7.5** Product card images with Flux fall back to text-only prompt gracefully
- [x] **7.6** `pnpm build` passes with no type errors
- [x] **7.7** `tsc --noEmit` passes with no type errors

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Flux API host | **fal.ai** | Serverless GPU inference, good DX, official Flux support |
| Prompt pipeline | **Reuse Gemini orchestration** | Keeps prompt quality consistent, only swaps generation call |
| Default provider | **Flux Dev** | User preference — cheaper ($0.025 vs $0.13), fast |
| Product reference mode | **Text-only enrichment for Flux** | Flux Dev lacks image-to-image; degrade gracefully |
| Cost tracking | **New `fluxCostUsd` column** | Matches existing per-provider pattern |

## Files Modified

| File | Change |
|---|---|
| `package.json` | Add `@fal-ai/client` |
| `lib/services/flux-image-generator.ts` | **NEW** — Flux generation service |
| `lib/services/imagen.ts` | Add `ImageProvider` type, `imageProvider` param, provider branching |
| `lib/ai/models.ts` | Add `flux-dev` to `IMAGE_PRICING` |
| `lib/services/cost-tracking-service.ts` | Extend `AIProvider`, add Flux cost bucket |
| `drizzle/schema.ts` | Add `fluxCostUsd` column |
| `lib/db/schema.ts` | Add `fluxCostUsd` column (app schema) |
| `drizzle/0009_add_flux_cost_tracking.sql` | **NEW** — migration |
| `lib/jobs/generate-images.ts` | Add `imageProvider` to payload, pass through |
| `lib/jobs/orchestrate-generation.ts` | Add `imageProvider` to payload, pass to children |
| `lib/jobs/bulk-generate.ts` | Add `imageProvider` to settings, pass through |
| `app/api/generate/trigger/route.ts` | Extract and forward `imageProvider` |
| `app/api/generate/route.ts` | Extract and forward `imageProvider` |
| `components/generate/GeneratorForm.tsx` | Add Image Provider dropdown |
| `app/(protected)/generate/page.tsx` | Add `imageProvider` state, pass to form & API |
| `components/generate/index.ts` | Export `IMAGE_PROVIDERS` and `ImageProvider` type |
| `app/(protected)/bulk/page.tsx` | Add `imageProvider: 'flux'` to settings defaults |
| `app/api/bulk/start/route.ts` | Extract and forward `imageProvider` |
| `app/api/bulk/cluster/route.ts` | Extract and forward `imageProvider` |
| `app/api/bulk/queue/start-next/route.ts` | Forward `imageProvider` from settings |
| `app/api/bulk/[jobId]/retry/route.ts` | Forward `imageProvider` from settings |
| `lib/hooks/useBulkGeneration.ts` | Add `imageProvider` to `BulkGenerationSettings` |
| `env.example.txt` | Add `FAL_KEY` entry |
