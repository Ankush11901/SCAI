# Cluster Mode: AI-Driven Bulk Generation with Interlinking

## Overview

Add a new "Cluster Mode" to bulk generation that uses AI to intelligently expand a topic into a cluster of interlinked articles.

**User Inputs:**
- Topic/Niche (e.g., "Home Fitness")
- Primary Keyword (e.g., "home gym equipment")
- URL Pattern (e.g., "/blog/{slug}")
- Article Count (1-9)

**Flow:**
1. AI Expansion → determines article types + titles
2. Generation → articles created with sibling awareness (AI actively references sibling topics)
3. Interlinking → post-processing finds additional matches and inserts links

---

## Interlinking Rules (from existing documentation)

- Max **1 internal link per 150 words**
- Primary link in **first 200 words**
- Anchor text variance: **20% exact, 50% semantic, 30% generic**
- **Orphan Protection**: Add "Related Reading" section with 3 links if < 3 internal links

---

## Phase 1: Foundation - Types & Utilities

### Tasks

- [ ] **1.1** Create `lib/types/cluster.ts` with cluster interfaces
  - [ ] `ClusterInput` interface (topic, primaryKeyword, urlPattern, articleCount, variation)
  - [ ] `ClusterArticle` interface (articleType, title, slug, targetUrl, focus, keywords)
  - [ ] `ClusterPlan` interface (topic, primaryKeyword, articles array)
  - [ ] `InterlinkTarget` interface (targetSlug, targetTitle, targetUrl, suggestedAnchorPhrases, anchorTextType)
  - [ ] `InterlinkingResult` interface (modifiedHtml, linksInserted, relatedReadingAdded)

- [ ] **1.2** Create `lib/utils/slug-generator.ts`
  - [ ] `generateSlugFromTitle(title: string): string` - converts title to URL-safe slug
  - [ ] `applyUrlPattern(pattern: string, slug: string): string` - replaces {slug} in pattern

---

## Phase 2: Database Schema

### Tasks

- [ ] **2.1** Add `articleClusters` table to `lib/db/schema.ts`
  ```typescript
  articleClusters = sqliteTable('article_clusters', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    bulkJobId: text('bulk_job_id'),
    topic: text('topic').notNull(),
    primaryKeyword: text('primary_keyword').notNull(),
    urlPattern: text('url_pattern').notNull(),
    articleCount: integer('article_count').notNull(),
    clusterPlan: text('cluster_plan'), // JSON stringified ClusterPlan
    status: text('status').notNull().default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  })
  ```

- [ ] **2.2** Run database migration
  - [ ] `npx drizzle-kit push`

---

## Phase 3: AI Cluster Expansion Service

### Tasks

- [ ] **3.1** Create `lib/ai/schemas/cluster-schema.ts` - Zod schemas for AI output
  - [ ] `ClusterArticleSchema` - validates individual article in plan
  - [ ] `ClusterPlanOutputSchema` - validates full AI response

- [ ] **3.2** Create `lib/ai/prompts/cluster-prompts.ts` - AI prompts
  - [ ] `buildClusterExpansionPrompt(input: ClusterInput): string`
  - [ ] System prompt explaining the 9 article types
  - [ ] Instructions to select appropriate types for the topic
  - [ ] Instructions to generate titles and focus descriptions
  - [ ] Instructions to identify interlinking keywords

- [ ] **3.3** Create `lib/services/cluster-expansion-service.ts`
  - [ ] `expandTopicToCluster(options: ClusterInput): Promise<ClusterPlan>`
  - [ ] Call AI with cluster expansion prompt
  - [ ] Parse and validate response with Zod schema
  - [ ] Generate slugs and URLs for each article
  - [ ] Return complete ClusterPlan

---

## Phase 4: Interlinking Service

### Tasks

- [ ] **4.1** Create `lib/services/interlinking-service.ts`

- [ ] **4.2** Implement anchor text finding logic
  - [ ] `extractParagraphs(html: string): Paragraph[]` - get text content from paragraphs only
  - [ ] `findPhraseMatches(text: string, phrase: string): Match[]` - find keyword matches
  - [ ] `isWithinExistingLink(html: string, position: number): boolean` - check if already linked
  - [ ] `findInsertionCandidates(html: string, targets: InterlinkTarget[]): InsertionCandidate[]`

- [ ] **4.3** Implement link insertion logic
  - [ ] `calculateMaxLinks(wordCount: number): number` - 1 per 150 words
  - [ ] `selectLinksWithVariance(candidates: InsertionCandidate[], maxLinks: number)` - apply 20/50/30 split
  - [ ] `prioritizeEarlyLinks(links: LinkToInsert[])` - first link in first 200 words
  - [ ] `insertAnchorTag(html: string, link: LinkToInsert): string` - insert `<a>` tag

- [ ] **4.4** Implement Related Reading fallback
  - [ ] `addRelatedReadingSection(html: string, siblingArticles: ClusterArticle[], existingLinks: LinkDetail[]): string`
  - [ ] Only add if < 3 internal links inserted
  - [ ] Include up to 3 unlinked sibling articles
  - [ ] Place before FAQ section or at end of article

- [ ] **4.5** Implement main function
  - [ ] `applyInterlinking(options: InterlinkingOptions): InterlinkingResult`
  - [ ] Orchestrate all the above functions
  - [ ] Return modified HTML + stats

---

## Phase 5: Unified Orchestrator Updates

### Tasks

- [ ] **5.1** Modify `lib/services/unified-orchestrator.ts`
  - [ ] Add `clusterContext` to `UnifiedGenerationParams` interface
    ```typescript
    clusterContext?: {
      siblingArticles: Array<{ title: string; url: string; focus: string }>;
      interlinkKeywords: string[];
    }
    ```
  - [ ] Pass cluster context to content generation prompts
  - [ ] Instruct AI to naturally reference sibling topics in content

- [ ] **5.2** Update content generation prompts to include sibling awareness
  - [ ] Add sibling titles to system prompt
  - [ ] Add instruction: "Where relevant, naturally mention these related topics: [titles]"

---

## Phase 6: Bulk Generation Integration

### Tasks

- [ ] **6.1** Modify `lib/jobs/bulk-generate.ts`
  - [ ] Add cluster mode fields to `BulkGenerationPayload`
    ```typescript
    clusterMode?: boolean;
    clusterPlan?: ClusterPlan;
    clusterId?: string;
    ```
  - [ ] Add cluster mode detection at start of `bulkGenerateTask`

- [ ] **6.2** Implement cluster generation loop
  - [ ] Pass `clusterContext` to each article generation
  - [ ] Store completed articles in memory for interlinking phase
  - [ ] Track sibling article metadata (title, url, html)

- [ ] **6.3** Implement interlinking phase
  - [ ] After ALL articles generated, loop through each
  - [ ] Build interlink targets from sibling articles
  - [ ] Call `applyInterlinking()` for each article
  - [ ] Update `bulkJobArticles` with modified HTML
  - [ ] Store interlinking stats in metadata

- [ ] **6.4** Update article metadata storage
  - [ ] Add `clusterId`, `slug`, `targetUrl` to metadata
  - [ ] Add `interlinkingApplied`, `internalLinksInserted`, `relatedReadingAdded`

---

## Phase 7: API Endpoints

### Tasks

- [ ] **7.1** Create `app/api/bulk/cluster/route.ts` (POST)
  - [ ] Authenticate user session
  - [ ] Validate input (topic, primaryKeyword, urlPattern, articleCount)
  - [ ] Check user quota for articleCount articles
  - [ ] Call `expandTopicToCluster()` to generate plan
  - [ ] Create `articleClusters` record
  - [ ] Create `bulkJobs` record with `clusterMode: true`
  - [ ] Create `bulkJobArticles` records for each planned article
  - [ ] Trigger `bulkGenerateTask` with cluster payload
  - [ ] Return cluster ID and job ID

- [ ] **7.2** Create `app/api/bulk/cluster/[id]/route.ts` (GET)
  - [ ] Authenticate user session
  - [ ] Fetch cluster record by ID
  - [ ] Fetch associated bulk job and articles
  - [ ] Return cluster plan, status, and interlinking stats

---

## Phase 8: Frontend - Cluster Mode Form

### Tasks

- [ ] **8.1** Create `components/bulk/ClusterModeForm.tsx`
  - [ ] Topic/Niche textarea input
  - [ ] Primary Keyword textarea input
  - [ ] URL Pattern text input (default: `/blog/{slug}`)
  - [ ] Article Count slider (1-9)
  - [ ] Title Variation radio buttons (question/statement/listicle)
  - [ ] Submit button triggers cluster generation

- [ ] **8.2** Add `useClusterGeneration` hook to `lib/hooks/`
  - [ ] `startClusterGeneration(input: ClusterInput)` - calls POST /api/bulk/cluster
  - [ ] `fetchClusterStatus(clusterId: string)` - calls GET /api/bulk/cluster/[id]
  - [ ] Handle loading/error states
  - [ ] Subscribe to Pusher events for real-time updates

---

## Phase 9: Frontend - UI Integration

### Tasks

- [ ] **9.1** Modify `components/bulk/BulkGeneratorForm.tsx`
  - [ ] Add third mode tab: "Cluster Mode"
  - [ ] Render `ClusterModeForm` when cluster mode selected
  - [ ] Update mode state to include 'cluster'

- [ ] **9.2** Modify `app/(protected)/bulk/page.tsx`
  - [ ] Import and use cluster generation hook
  - [ ] Handle cluster mode submission
  - [ ] Show cluster-specific progress info

- [ ] **9.3** Update progress display for cluster mode
  - [ ] Show "AI Planning Cluster..." during expansion phase
  - [ ] Show article generation progress as before
  - [ ] Show "Applying Interlinking..." phase
  - [ ] Display interlinking stats on completion

---

## Phase 10: Testing & Verification

### Tasks

- [ ] **10.1** Test AI expansion
  - [ ] Verify AI selects appropriate article types for topic
  - [ ] Verify titles are unique and SEO-optimized
  - [ ] Verify slugs are generated correctly

- [ ] **10.2** Test content generation with sibling awareness
  - [ ] Verify AI references sibling topics in content
  - [ ] Verify references are natural and contextual

- [ ] **10.3** Test interlinking service
  - [ ] Verify links inserted at correct positions
  - [ ] Verify 1 per 150 words max is respected
  - [ ] Verify first link is in first 200 words
  - [ ] Verify anchor text variance (20/50/30)
  - [ ] Verify no double-linking same URL
  - [ ] Verify links not inserted in headings or existing links

- [ ] **10.4** Test Related Reading fallback
  - [ ] Verify section added when < 3 internal links
  - [ ] Verify correct articles listed
  - [ ] Verify correct placement in HTML

- [ ] **10.5** End-to-end test
  - [ ] Enter topic "Home Fitness", keyword "home gym equipment", count 5
  - [ ] Verify cluster plan generated with 5 appropriate articles
  - [ ] Verify all articles generate successfully
  - [ ] Verify interlinks present in final HTML
  - [ ] Verify interlinking stats returned in API

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `lib/types/cluster.ts` | CREATE | Cluster types and interfaces |
| `lib/utils/slug-generator.ts` | CREATE | URL slug utilities |
| `lib/db/schema.ts` | MODIFY | Add `articleClusters` table |
| `lib/ai/schemas/cluster-schema.ts` | CREATE | Zod schemas for AI output |
| `lib/ai/prompts/cluster-prompts.ts` | CREATE | AI prompts for cluster expansion |
| `lib/services/cluster-expansion-service.ts` | CREATE | AI expansion logic |
| `lib/services/interlinking-service.ts` | CREATE | Post-gen link insertion |
| `lib/services/unified-orchestrator.ts` | MODIFY | Add cluster context to generation |
| `lib/jobs/bulk-generate.ts` | MODIFY | Cluster mode handling |
| `app/api/bulk/cluster/route.ts` | CREATE | Cluster API endpoint (POST) |
| `app/api/bulk/cluster/[id]/route.ts` | CREATE | Cluster status endpoint (GET) |
| `lib/hooks/useClusterGeneration.ts` | CREATE | Frontend hook for cluster mode |
| `components/bulk/ClusterModeForm.tsx` | CREATE | Cluster input form |
| `components/bulk/BulkGeneratorForm.tsx` | MODIFY | Add cluster tab |
| `app/(protected)/bulk/page.tsx` | MODIFY | Integrate cluster mode |

---

## Progress Tracking

| Phase | Status |
|-------|--------|
| Phase 1: Foundation | ✅ Complete |
| Phase 2: Database | ✅ Complete |
| Phase 3: AI Expansion | ✅ Complete |
| Phase 4: Interlinking | ✅ Complete |
| Phase 5: Orchestrator | ✅ Complete |
| Phase 6: Bulk Integration | ✅ Complete |
| Phase 7: API Endpoints | ✅ Complete |
| Phase 8: Frontend Form | ✅ Complete |
| Phase 9: UI Integration | ✅ Complete |
| Phase 10: Testing | ⬜ Ready for Testing |
