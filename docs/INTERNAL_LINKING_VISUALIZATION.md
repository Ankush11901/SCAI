# Internal Linking Visualization System

## Overview

This document describes the internal linking strategy used in SCAI's bulk article generation and the visualization system for displaying link relationships between cluster articles.

---

## Table of Contents

1. [Internal Linking Architecture](#internal-linking-architecture)
2. [Data Structures](#data-structures)
3. [How Links Are Created](#how-links-are-created)
4. [API Endpoints](#api-endpoints)
5. [Visualization Component](#visualization-component)
6. [Usage Examples](#usage-examples)

---

## Internal Linking Architecture

### When Internal Linking Applies

Internal linking is **only applied in cluster/bulk mode**, not for single article generation. A cluster is a group of related articles generated together around a central topic.

### Three-Phase Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PHASE 1: PLANNING                            │
│  AI generates cluster plan with interlinking strategy               │
│  Input: Topic + Keyword + Article Count                             │
│  Output: Article definitions + Interlinking plan                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: GENERATION                            │
│  Articles generated with sibling awareness                          │
│  Each article knows about other articles in the cluster             │
│  Natural references to related content                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 3: INTERLINKING                          │
│  Links injected into final HTML                                     │
│  AI selects best anchor text from actual content                    │
│  Fallback to regex matching if AI fails                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Link Rules (SEO Best Practices)

| Rule | Value | Description |
|------|-------|-------------|
| Words per link | 150 | Maximum 1 link per 150 words |
| First link position | 200 words | First link should appear within first 200 words |
| Minimum links | 3 | Articles with <3 links get "Related Reading" section |
| Anchor variance | 20/50/30 | 20% exact, 50% semantic, 30% generic anchors |
| No orphans | Required | Every article must have incoming links |

---

## Data Structures

### Cluster Plan Structure

```typescript
interface ClusterPlan {
  topic: string;
  primaryKeyword: string;
  articles: ClusterArticle[];
  interlinkingPlan: InterlinkingPlanItem[];
}

interface ClusterArticle {
  index: number;
  articleType: string;
  title: string;
  slug: string;
  targetUrl: string;
  focusArea: string;
  keywords: string[];
  isPillar: boolean;  // One article is the main "pillar" article
}

interface InterlinkingPlanItem {
  sourceIndex: number;  // Which article contains the links
  targets: Array<{
    targetIndex: number;  // Which article to link to
    suggestedAnchorPhrases: string[];  // Natural phrases to use
  }>;
}
```

### Interlinking Result Structure

```typescript
interface InterlinkingResult {
  modifiedHtml: string;
  linksInserted: number;
  linkDetails: LinkDetail[];
  relatedReadingAdded: boolean;
}

interface LinkDetail {
  anchorText: string;
  targetUrl: string;
  position: number;  // Character position in HTML
  anchorType: 'exact' | 'semantic' | 'generic';
}
```

### Article Metadata (After Generation)

```typescript
interface ArticleMetadata {
  clusterId: string;
  slug: string;
  targetUrl: string;
  interlinkingApplied: boolean;
  internalLinksInserted: number;
  relatedReadingAdded: boolean;
}
```

---

## How Links Are Created

### Step 1: Cluster Expansion

When a bulk cluster job is created, AI expands the topic into a full cluster plan:

```typescript
// lib/services/cluster-expansion-service.ts
const clusterPlan = await expandTopicToCluster({
  topic: "Home Gym Setup",
  primaryKeyword: "home gym equipment",
  articleCount: 10,
  urlPattern: "https://example.com/fitness/{slug}"
});
```

**AI generates:**
- Article types and titles
- Keywords for each article
- Interlinking plan with anchor phrases

### Step 2: AI Anchor Selection

After content generation, AI selects the best anchor text from actual article content:

```typescript
// lib/services/ai-interlink-selector.ts
const interlinkTargets = await selectInterlinksWithAI({
  articleHtml: generatedHtml,
  siblingArticles: clusterArticles,
  provider: 'gemini-flash'
});
```

**AI rules for anchor selection:**
- Must be EXACT substring from content
- 3-8 words, descriptive
- One link per paragraph maximum
- At least one link in first 3 paragraphs
- Never generic text like "click here"

### Step 3: Link Injection

Links are inserted into the HTML:

```typescript
// lib/services/interlinking-service.ts
const result = applyInterlinking({
  html: articleHtml,
  targets: interlinkTargets,
  maxLinksPerArticle: Math.ceil(wordCount / 150)
});
```

**Output HTML:**
```html
<p>When setting up your
  <a href="/fitness/home-gym-guide" class="scai-internal-link">
    complete home gym
  </a>, consider the space requirements...
</p>
```

### Step 4: Fallback - Related Reading

If an article has fewer than 3 internal links, a Related Reading section is added:

```html
<section data-component="scai-related-reading" class="scai-related-reading">
  <h2 class="scai-related-reading-title">Related Reading</h2>
  <ul class="scai-related-reading-list">
    <li><a href="/fitness/best-dumbbells" class="scai-internal-link">Best Dumbbells for Home Gym</a></li>
    <li><a href="/fitness/workout-bench" class="scai-internal-link">Choosing a Workout Bench</a></li>
    <li><a href="/fitness/cardio-equipment" class="scai-internal-link">Home Cardio Equipment Guide</a></li>
  </ul>
</section>
```

---

## API Endpoints

### Get Bulk Job with Articles

```
GET /api/bulk/[jobId]
```

**Response:**
```json
{
  "job": {
    "id": "job_abc123",
    "mode": "cluster",
    "status": "completed",
    "totalArticles": 10,
    "completedArticles": 10
  },
  "articles": [
    {
      "id": "art_001",
      "title": "Complete Home Gym Setup Guide",
      "slug": "home-gym-guide",
      "status": "complete",
      "htmlContent": "<article>...</article>",
      "historyId": "hist_xyz",
      "metadata": {
        "isPillar": true,
        "internalLinksInserted": 5,
        "targetUrl": "/fitness/home-gym-guide"
      }
    }
  ],
  "stats": {
    "total": 10,
    "complete": 10,
    "totalWords": 15000
  }
}
```

### Get Cluster Plan

```
GET /api/bulk/cluster/[clusterId]
```

**Response:**
```json
{
  "cluster": {
    "id": "cluster_abc",
    "topic": "Home Gym Setup",
    "primaryKeyword": "home gym equipment",
    "plan": {
      "articles": [...],
      "interlinkingPlan": [
        {
          "sourceIndex": 1,
          "targets": [
            { "targetIndex": 0, "suggestedAnchorPhrases": ["home gym guide"] }
          ]
        }
      ]
    }
  }
}
```

---

## Visualization Component

### Purpose

The Internal Linking Visualization component displays:
1. **Network Graph** - Visual representation of article relationships
2. **Link Matrix** - Table showing which articles link to which
3. **Article Details** - Individual article link information
4. **Statistics** - Overall linking health metrics

### Visual Elements

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLUSTER LINK VISUALIZATION                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌─────┐         ┌─────┐         ┌─────┐                          │
│    │ A1  │◄───────►│ A2  │◄───────►│ A3  │                          │
│    │Pillar│        │     │         │     │                          │
│    └──┬──┘         └──┬──┘         └──┬──┘                          │
│       │               │               │                              │
│       ▼               ▼               ▼                              │
│    ┌─────┐         ┌─────┐         ┌─────┐                          │
│    │ A4  │         │ A5  │         │ A6  │                          │
│    └─────┘         └─────┘         └─────┘                          │
│                                                                      │
│  Legend:  ● Pillar Article   ○ Supporting Article                   │
│           ─── Outgoing Link  ◄── Incoming Link                      │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  LINK MATRIX                                                         │
│  ┌────┬────┬────┬────┬────┬────┬────┐                               │
│  │    │ A1 │ A2 │ A3 │ A4 │ A5 │ A6 │                               │
│  ├────┼────┼────┼────┼────┼────┼────┤                               │
│  │ A1 │  - │  ✓ │  ✓ │  ✓ │    │    │                               │
│  │ A2 │  ✓ │  - │    │    │  ✓ │    │                               │
│  │ A3 │  ✓ │    │  - │    │    │  ✓ │                               │
│  │ A4 │  ✓ │    │    │  - │    │    │                               │
│  │ A5 │  ✓ │  ✓ │    │    │  - │    │                               │
│  │ A6 │  ✓ │    │  ✓ │    │    │  - │                               │
│  └────┴────┴────┴────┴────┴────┴────┘                               │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  STATISTICS                                                          │
│  Total Articles: 6    Total Links: 15    Avg Links/Article: 2.5     │
│  Orphan Articles: 0   Pillar Incoming: 5  Link Density: 42%         │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Extraction

To build the visualization, extract links from article HTML:

```typescript
interface ExtractedLink {
  sourceArticleId: string;
  sourceTitle: string;
  targetUrl: string;
  targetArticleId: string;
  targetTitle: string;
  anchorText: string;
}

function extractLinksFromHtml(html: string): ExtractedLink[] {
  const linkRegex = /<a[^>]*class="scai-internal-link"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
  const links: ExtractedLink[] = [];

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    links.push({
      targetUrl: match[1],
      anchorText: match[2]
    });
  }

  return links;
}
```

### Link Map Construction

```typescript
interface LinkMap {
  nodes: ArticleNode[];
  edges: LinkEdge[];
}

interface ArticleNode {
  id: string;
  title: string;
  slug: string;
  isPillar: boolean;
  incomingCount: number;
  outgoingCount: number;
  wordCount: number;
}

interface LinkEdge {
  source: string;  // Article ID
  target: string;  // Article ID
  anchorText: string;
}

function buildLinkMap(articles: BulkJobArticle[]): LinkMap {
  const nodes: ArticleNode[] = [];
  const edges: LinkEdge[] = [];

  // Build nodes
  for (const article of articles) {
    nodes.push({
      id: article.id,
      title: article.title,
      slug: article.slug,
      isPillar: article.metadata?.isPillar || false,
      incomingCount: 0,
      outgoingCount: 0,
      wordCount: article.wordCount || 0
    });
  }

  // Build edges by parsing HTML
  for (const article of articles) {
    const links = extractLinksFromHtml(article.htmlContent);

    for (const link of links) {
      // Find target article by URL
      const targetArticle = articles.find(a =>
        a.metadata?.targetUrl === link.targetUrl ||
        link.targetUrl.includes(a.slug)
      );

      if (targetArticle) {
        edges.push({
          source: article.id,
          target: targetArticle.id,
          anchorText: link.anchorText
        });

        // Update counts
        const sourceNode = nodes.find(n => n.id === article.id);
        const targetNode = nodes.find(n => n.id === targetArticle.id);
        if (sourceNode) sourceNode.outgoingCount++;
        if (targetNode) targetNode.incomingCount++;
      }
    }
  }

  return { nodes, edges };
}
```

### Statistics Calculation

```typescript
interface LinkStatistics {
  totalArticles: number;
  totalLinks: number;
  averageLinksPerArticle: number;
  orphanArticles: number;  // Articles with no incoming links
  pillarIncomingLinks: number;
  linkDensity: number;  // Actual links / possible links
  articlesWithRelatedReading: number;
}

function calculateStatistics(linkMap: LinkMap): LinkStatistics {
  const { nodes, edges } = linkMap;

  const totalArticles = nodes.length;
  const totalLinks = edges.length;
  const possibleLinks = totalArticles * (totalArticles - 1);

  const orphanArticles = nodes.filter(n => n.incomingCount === 0 && !n.isPillar).length;
  const pillarNode = nodes.find(n => n.isPillar);
  const pillarIncomingLinks = pillarNode?.incomingCount || 0;

  return {
    totalArticles,
    totalLinks,
    averageLinksPerArticle: totalArticles > 0 ? totalLinks / totalArticles : 0,
    orphanArticles,
    pillarIncomingLinks,
    linkDensity: possibleLinks > 0 ? (totalLinks / possibleLinks) * 100 : 0,
    articlesWithRelatedReading: 0 // Count from metadata
  };
}
```

---

## Usage Examples

### Example 1: Fetch and Visualize a Bulk Job

```typescript
// 1. Fetch bulk job data
const response = await fetch(`/api/bulk/${jobId}`);
const { job, articles } = await response.json();

// 2. Build link map
const linkMap = buildLinkMap(articles);

// 3. Calculate statistics
const stats = calculateStatistics(linkMap);

// 4. Render visualization
<InternalLinkVisualization
  linkMap={linkMap}
  statistics={stats}
  jobId={jobId}
/>
```

### Example 2: Export Link Report

```typescript
function exportLinkReport(linkMap: LinkMap, stats: LinkStatistics): string {
  let report = `# Internal Linking Report\n\n`;
  report += `## Statistics\n`;
  report += `- Total Articles: ${stats.totalArticles}\n`;
  report += `- Total Internal Links: ${stats.totalLinks}\n`;
  report += `- Average Links per Article: ${stats.averageLinksPerArticle.toFixed(1)}\n`;
  report += `- Link Density: ${stats.linkDensity.toFixed(1)}%\n`;
  report += `- Orphan Articles: ${stats.orphanArticles}\n\n`;

  report += `## Article Details\n\n`;
  for (const node of linkMap.nodes) {
    report += `### ${node.title}\n`;
    report += `- Incoming Links: ${node.incomingCount}\n`;
    report += `- Outgoing Links: ${node.outgoingCount}\n`;
    report += `- Is Pillar: ${node.isPillar ? 'Yes' : 'No'}\n\n`;
  }

  return report;
}
```

---

## Component Files

| File | Description |
|------|-------------|
| `components/visualization/InternalLinkVisualization.tsx` | Main visualization component |
| `components/visualization/LinkGraph.tsx` | Network graph view (SVG/Canvas) |
| `components/visualization/LinkMatrix.tsx` | Matrix table view |
| `components/visualization/LinkStatistics.tsx` | Statistics cards |
| `lib/utils/link-extractor.ts` | HTML link extraction utilities |
| `lib/types/visualization.ts` | TypeScript interfaces |

---

## Next Steps

1. Create the visualization component
2. Add to bulk job detail page (`/history/bulk/[jobId]`)
3. Add export functionality (PNG, PDF, CSV)
4. Add filtering and search capabilities

---

## Related Documentation

- [Bulk Generation Guide](./BULK_GENERATION.md)
- [Cluster Mode API](./API_REFERENCE.md#cluster-mode)
- [SEO Best Practices](./SEO_GUIDELINES.md)
