# API Reference

> Internal API endpoints for SCAI Article Generator

---

## 1. Overview

All API routes are server-side only (Next.js API Routes).
Base URL: `/api`

### Authentication
Most endpoints require a valid session cookie set by `/api/auth`.

### Rate Limiting
- Auth endpoint: 5 requests/minute per IP
- Generate endpoint: 10 requests/day per session

---

## 2. Endpoints

### 2.1 POST /api/auth

Authenticate with application password.

#### Request

```http
POST /api/auth
Content-Type: application/json

{
  "password": "string"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Authenticated successfully"
}
```

Sets HTTP-only cookie: `scai_session`

#### Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Invalid password"
}
```

#### Response (429 Too Many Requests)

```json
{
  "success": false,
  "error": "Too many attempts. Try again in 60 seconds."
}
```

---

### 2.2 GET /api/auth/check

Verify current session validity.

#### Request

```http
GET /api/auth/check
Cookie: scai_session=...
```

#### Response (200 OK)

```json
{
  "authenticated": true
}
```

#### Response (401 Unauthorized)

```json
{
  "authenticated": false
}
```

---

### 2.3 POST /api/auth/logout

Clear session and logout.

#### Request

```http
POST /api/auth/logout
Cookie: scai_session=...
```

#### Response (200 OK)

```json
{
  "success": true
}
```

Clears `scai_session` cookie.

---

### 2.4 POST /api/generate

Generate article content with streaming response.

#### Request

```http
POST /api/generate
Content-Type: application/json
Cookie: scai_session=...

{
  "articleType": "affiliate" | "commercial" | "comparison" | "how-to" | "informational" | "listicle" | "local" | "recipe" | "review",
  "topic": "string (required, max 200 chars)",
  "variation": "question" | "statement" | "listicle",
  "enabledComponents": ["string"] | null,
  "additionalInstructions": "string (optional, max 500 chars)"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `articleType` | enum | Yes | One of 9 article types |
| `topic` | string | Yes | Article topic/subject |
| `variation` | enum | No | Title variation style (default: question) |
| `enabledComponents` | string[] | No | Components to include (null = all required + defaults) |
| `additionalInstructions` | string | No | Extra context for generation |

#### Response (200 OK - Server-Sent Events)

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

Event stream format:

```
event: status
data: {"phase": "initializing", "message": "Starting article generation..."}

event: component
data: {"id": "h1", "status": "streaming", "content": "Best Wireless Head"}

event: component
data: {"id": "h1", "status": "streaming", "content": "Best Wireless Headphones for 2024"}

event: component
data: {"id": "h1", "status": "complete", "content": "Best Wireless Headphones for 2024"}

event: component
data: {"id": "paragraph-intro", "status": "streaming", "content": "Looking for..."}

event: image
data: {"id": "featured-image", "status": "pending", "prompt": "Professional product photo..."}

event: image
data: {"id": "featured-image", "status": "generating"}

event: image
data: {"id": "featured-image", "status": "complete", "url": "data:image/png;base64,..."}

event: progress
data: {"completed": 5, "total": 12, "percentage": 42}

event: complete
data: {"success": true, "html": "<!DOCTYPE html>...", "wordCount": 1250}

event: error
data: {"error": "Image generation failed", "recoverable": true}
```

#### Event Types

| Event | Description |
|-------|-------------|
| `status` | Generation phase updates |
| `component` | Text component streaming |
| `image` | Image generation progress |
| `progress` | Overall completion percentage |
| `complete` | Final HTML and statistics |
| `error` | Error with recovery info |

#### Response (400 Bad Request)

```json
{
  "error": "Invalid article type",
  "details": "Must be one of: affiliate, commercial, ..."
}
```

#### Response (401 Unauthorized)

```json
{
  "error": "Authentication required"
}
```

#### Response (429 Too Many Requests)

```json
{
  "error": "Daily quota exceeded",
  "quota": {
    "used": 10,
    "limit": 10,
    "resetsAt": "2024-12-25T00:00:00Z"
  }
}
```

---

### 2.5 POST /api/image

Generate a single image (standalone endpoint for retries).

#### Request

```http
POST /api/image
Content-Type: application/json
Cookie: scai_session=...

{
  "prompt": "string (required)",
  "aspectRatio": "16:9" | "4:3" | "1:1" | "3:4",
  "style": "photo" | "illustration",
  "negativePrompt": "string (optional)"
}
```

#### Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | Image description |
| `aspectRatio` | enum | No | "16:9" | Image dimensions |
| `style` | enum | No | "photo" | Visual style |
| `negativePrompt` | string | No | "humans, text, words" | What to avoid |

#### Response (200 OK)

```json
{
  "success": true,
  "url": "data:image/png;base64,...",
  "prompt": "...",
  "provider": "imagen" | "flux"
}
```

#### Response (500 Internal Server Error)

```json
{
  "success": false,
  "error": "Image generation failed",
  "provider": "imagen",
  "fallbackAttempted": true
}
```

---

### 2.6 GET /api/quota

Check remaining daily quota.

#### Request

```http
GET /api/quota
Cookie: scai_session=...
```

#### Response (200 OK)

```json
{
  "used": 3,
  "limit": 10,
  "remaining": 7,
  "resetsAt": "2024-12-25T00:00:00Z"
}
```

---

### 2.7 GET /api/article-types

Get all available article types and their configurations.

#### Request

```http
GET /api/article-types
```

No authentication required (public reference data).

#### Response (200 OK)

```json
{
  "articleTypes": [
    {
      "id": "affiliate",
      "name": "Affiliate",
      "description": "Product-focused articles with purchase CTAs",
      "icon": "shopping-cart",
      "variations": ["question", "statement", "listicle"],
      "components": {
        "required": ["h1", "featured-image", "paragraph", "product-card", "faq", "closing"],
        "optional": ["h2-image", "price-comparison", "cta-button"]
      }
    }
  ]
}
```

---

### 2.8 GET /api/components

Get all component definitions.

#### Request

```http
GET /api/components
```

No authentication required.

#### Response (200 OK)

```json
{
  "universal": [
    {
      "id": "h1",
      "name": "Title (H1)",
      "required": true,
      "constraints": { "maxLength": 60 },
      "variations": 3
    }
  ],
  "unique": [
    {
      "id": "product-card",
      "name": "Product Card",
      "articleTypes": ["affiliate"],
      "required": true,
      "variations": 3
    }
  ]
}
```

---

### 2.9 GET /api/components/[id]/variations

Get HTML variations for a specific component.

#### Request

```http
GET /api/components/product-card/variations
```

#### Response (200 OK)

```json
{
  "componentId": "product-card",
  "variations": [
    {
      "id": "horizontal",
      "name": "Horizontal Card",
      "description": "Full-width product card with side-by-side layout",
      "html": "<div class=\"scai-product-card scai-product-card--horizontal\">...",
      "css": ".scai-product-card--horizontal { display: flex; ... }"
    },
    {
      "id": "vertical",
      "name": "Vertical Card",
      "description": "Stacked layout for grid displays",
      "html": "...",
      "css": "..."
    },
    {
      "id": "compact",
      "name": "Compact Row",
      "description": "Minimal inline product reference",
      "html": "...",
      "css": "..."
    }
  ]
}
```

---

## 3. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | No valid session |
| `AUTH_INVALID` | 401 | Wrong password |
| `RATE_LIMITED` | 429 | Too many requests |
| `QUOTA_EXCEEDED` | 429 | Daily limit reached |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `INVALID_ARTICLE_TYPE` | 400 | Unknown article type |
| `GENERATION_FAILED` | 500 | AI generation error |
| `IMAGE_FAILED` | 500 | Image generation error |

---

## 4. TypeScript Types

```typescript
// Request types
interface GenerateRequest {
  articleType: ArticleType;
  topic: string;
  variation?: 'question' | 'statement' | 'listicle';
  enabledComponents?: string[] | null;
  additionalInstructions?: string;
}

interface ImageRequest {
  prompt: string;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:4';
  style?: 'photo' | 'illustration';
  negativePrompt?: string;
}

// Response types
interface QuotaResponse {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
}

// SSE Event types
interface ComponentEvent {
  id: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  content?: string;
}

interface ImageEvent {
  id: string;
  status: 'pending' | 'generating' | 'complete' | 'error';
  prompt?: string;
  url?: string;
}

interface ProgressEvent {
  completed: number;
  total: number;
  percentage: number;
}

interface CompleteEvent {
  success: true;
  html: string;
  wordCount: number;
}

interface ErrorEvent {
  error: string;
  recoverable: boolean;
  code?: string;
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-24 | SCAI Team | Initial API specification |

