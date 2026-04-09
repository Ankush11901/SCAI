# CMS Integration Guide

Complete documentation for CMS integrations in SCAI Article Generator.

---

## Table of Contents

1. [Supported Platforms](#supported-platforms)
2. [User Interface](#user-interface)
3. [Architecture](#architecture)
4. [Platform-Specific Details](#platform-specific-details)
5. [API Reference](#api-reference)
6. [React Query Hooks](#react-query-hooks)
7. [Security](#security)
8. [Adding a New Platform](#adding-a-new-platform)
9. [Troubleshooting](#troubleshooting)

---

## Supported Platforms

| Platform | Auth Type | Content Format | Features |
|----------|-----------|----------------|----------|
| **WordPress** | OAuth/App Password | HTML | Full integration with plugin, taxonomy suggestions, bulk export |
| **Medium** | Integration Token | Markdown | Up to 5 tags |
| **Dev.to** | API Key | Markdown | Up to 4 tags |
| **Ghost** | Admin API Key (JWT) | HTML | Tags & categories |
| **Hashnode** | Personal Access Token | Markdown | GraphQL API |
| **Shopify** | Admin API Token | HTML | Blog articles |
| **Webflow** | API Token | HTML | CMS collections |

---

## User Interface

### Settings Page - Integrations Tab

Navigate to **Settings → Integrations** to connect your CMS platforms.

**Location:** `/app/(protected)/settings/page.tsx`

```
Settings Page
└── Integrations Tab (IntegrationsSettings component)
    ├── WordPress (Full Integration)
    │   └── OAuth-based connection with SCAI Renderer plugin
    │   └── Uses: components/wordpress/WordPressSettings.tsx
    │
    ├── Medium
    │   └── Enter Integration Token from Medium settings
    │
    ├── Dev.to
    │   └── Enter API Key from Dev.to settings
    │
    ├── Ghost
    │   └── Enter Site URL + Admin API Key
    │
    ├── Hashnode
    │   └── Enter Personal Access Token
    │
    ├── Shopify
    │   └── Enter Shop Domain + Admin API Token
    │
    └── Webflow
        └── Enter API Token
```

### History Page - Export Functionality

**Location:** `/app/(protected)/history/page.tsx`

The History page supports selecting and exporting articles to any connected CMS platform.

**Features:**
- Checkboxes appear when ANY CMS platform is connected
- Single article export → Uses unified `CMSExportDialog` (all platforms)
- Bulk article export → Uses `WordPressExportDialog` (WordPress only)
- Floating toolbar appears when articles are selected

**User Flow:**
```
History Page
├── Single Articles Tab
│   ├── Filter by type/status
│   ├── Select articles via checkboxes
│   ├── Single Export → CMSExportDialog → Choose any platform
│   └── Bulk Export → WordPressExportDialog → WordPress with taxonomy
│
└── Bulk Articles Tab
    └── View bulk generation jobs
```

### Export Dialogs

**CMSExportDialog** (`components/cms/CMSExportDialog.tsx`)
- Used for single article exports
- Shows all connected platforms (WordPress + others)
- For WordPress, delegates to WordPressExportDialog
- For other platforms, handles export directly

**WordPressExportDialog** (`components/wordpress/WordPressExportDialog.tsx`)
- Used for bulk exports (2+ articles)
- Advanced features: AI taxonomy suggestions, category/tag picker
- Supports batch processing with progress tracking

---

## Architecture

### Database Schema

```sql
-- cms_connections table (lib/db/schema.ts)
CREATE TABLE cms_connections (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  platform              TEXT NOT NULL,  -- 'medium' | 'devto' | 'ghost' | 'hashnode' | 'shopify' | 'webflow'
  name                  TEXT NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  metadata              TEXT,           -- JSON for platform-specific data
  status                TEXT DEFAULT 'active',  -- 'active' | 'invalid' | 'expired'
  created_at            TIMESTAMP,
  updated_at            TIMESTAMP
);

-- wordpress_connections table (existing, separate)
CREATE TABLE wordpress_connections (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  site_url              TEXT NOT NULL,
  username              TEXT NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  site_name             TEXT,
  plugin_status         TEXT,
  plugin_version        TEXT,
  created_at            TIMESTAMP,
  updated_at            TIMESTAMP
);
```

### File Structure

```
lib/
├── db/
│   ├── schema.ts              # SQLite schema with cmsConnections table
│   ├── schema-postgres.ts     # PostgreSQL schema
│   └── index.ts               # Exports all tables
│
├── services/
│   ├── cms/
│   │   ├── index.ts                  # Re-exports all services
│   │   ├── types.ts                  # Platform configs, types, interfaces
│   │   ├── connection-service.ts     # CRUD operations with encryption
│   │   ├── html-to-markdown.ts       # HTML to Markdown converter
│   │   └── platforms.ts              # Verify & export functions for all platforms
│   │
│   └── wordpress/                    # Existing WordPress integration
│       ├── connection-service.ts
│       ├── export-service.ts
│       ├── plugin-service.ts
│       └── wp-fetch.ts
│
└── hooks/
    ├── useCMSConnections.ts          # React Query hooks for CMS
    └── queries.ts                    # WordPress hooks (existing)

components/
├── cms/
│   ├── index.ts                      # Re-exports all components
│   ├── CMSIcons.tsx                  # SVG icons for each platform
│   ├── IntegrationsSettings.tsx      # Settings page UI
│   └── CMSExportDialog.tsx           # Unified export dialog
│
└── wordpress/
    ├── WordPressSettings.tsx
    ├── WordPressExportDialog.tsx
    ├── TaxonomyPicker.tsx
    └── WordPressIcon.tsx

app/
├── (protected)/
│   ├── settings/page.tsx             # Settings with Integrations tab
│   └── history/page.tsx              # History with export functionality
│
└── api/
    ├── cms/
    │   ├── connections/route.ts      # GET/POST/DELETE connections
    │   ├── verify/route.ts           # Verify connection credentials
    │   └── export/route.ts           # Export article to platform
    │
    └── wordpress/                    # Existing WordPress API routes
        ├── connections/route.ts
        ├── export/route.ts
        └── taxonomy/route.ts
```

---

## Platform-Specific Details

### Medium

**Authentication:**
- Integration Token from https://medium.com/me/settings/security

**API Endpoint:**
- `https://api.medium.com/v1`

**Export Process:**
1. Get user ID via `/me` endpoint
2. Convert HTML to Markdown
3. POST to `/users/{userId}/posts`

**Metadata Stored:**
- `authorId`, `authorName`, `authorUsername`, `authorImageUrl`

**Limits:**
- Maximum 5 tags per article

---

### Dev.to

**Authentication:**
- API Key from https://dev.to/settings/extensions

**API Endpoint:**
- `https://dev.to/api`

**Export Process:**
1. Verify API key via `/users/me`
2. Convert HTML to Markdown
3. POST to `/articles`

**Limits:**
- Maximum 4 tags per article

---

### Ghost

**Authentication:**
- Admin API Key from Ghost Admin → Integrations
- Format: `{id}:{secret}` (hex-encoded secret)
- Uses JWT token authentication (HS256)

**API Endpoint:**
- `https://yoursite.ghost.io/ghost/api/admin`

**Export Process:**
1. Generate JWT token using key ID and secret
2. POST HTML content to `/posts`

**Metadata Stored:**
- `siteUrl`, `siteName`

**JWT Implementation:**
```typescript
// lib/services/cms/platforms.ts
function createGhostJWT(apiKey: string): string {
  const [id, secret] = apiKey.split(':');
  const header = { alg: 'HS256', typ: 'JWT', kid: id };
  const payload = { iat, exp: iat + 300, aud: '/admin/' };
  // Sign with HMAC-SHA256
}
```

---

### Hashnode

**Authentication:**
- Personal Access Token from https://hashnode.com/settings/developer

**API Endpoint:**
- `https://gql.hashnode.com` (GraphQL)

**Export Process:**
1. Query `me` to get publication ID
2. Convert HTML to Markdown
3. Mutation `publishPost` with content

**Metadata Stored:**
- `publicationId`, `publicationName`, `publicationUrl`

**GraphQL Queries:**
```graphql
# Verify & get publication
query Me {
  me {
    id
    username
    publications(first: 1) {
      edges {
        node {
          id
          title
          url
        }
      }
    }
  }
}

# Publish article
mutation PublishPost($input: PublishPostInput!) {
  publishPost(input: $input) {
    post {
      id
      url
    }
  }
}
```

---

### Shopify

**Authentication:**
- Admin API Access Token from Shopify Admin → Apps → Develop Apps

**API Endpoint:**
- `https://{shop}.myshopify.com/admin/api/2024-01`

**Export Process:**
1. Get shop info via `/shop.json`
2. Get first blog via `/blogs.json`
3. POST article to `/blogs/{blogId}/articles.json`

**Metadata Stored:**
- `shopDomain`, `shopName`, `blogId`, `blogTitle`

---

### Webflow

**Authentication:**
- API Token from https://webflow.com/dashboard/account/integrations

**API Endpoint:**
- `https://api.webflow.com/v2`

**Export Process:**
1. Get sites via `/sites`
2. Get CMS collections via `/sites/{siteId}/collections`
3. Find collection with "blog" or "post" in name
4. POST item to `/collections/{collectionId}/items`

**Metadata Stored:**
- `siteId`, `webflowSiteName`, `collectionId`, `collectionName`

**Note:** Webflow requires a CMS collection with fields for title, slug, and body content.

---

## API Reference

### GET /api/cms/connections

Returns all CMS connections for the authenticated user.

**Response:**
```json
{
  "data": [
    {
      "id": "conn_abc123",
      "platform": "medium",
      "name": "My Medium Account",
      "status": "active",
      "metadata": { "authorName": "John Doe" },
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### POST /api/cms/connections

Create a new CMS connection.

**Request:**
```json
{
  "platform": "medium",
  "credentials": "your-integration-token",
  "name": "My Medium Account",
  "siteUrl": "https://example.ghost.io"
}
```

**Note:** `siteUrl` is required for Ghost and Shopify only.

**Response:**
```json
{
  "data": {
    "id": "conn_abc123",
    "platform": "medium",
    "name": "My Medium Account",
    "status": "active"
  }
}
```

### DELETE /api/cms/connections

Delete a CMS connection.

**Request:**
```json
{
  "connectionId": "conn_abc123"
}
```

### POST /api/cms/verify

Verify a connection's credentials are still valid.

**Request:**
```json
{
  "connectionId": "conn_abc123"
}
```

**Response:**
```json
{
  "valid": true,
  "name": "Updated Account Name"
}
```

### POST /api/cms/export

Export an article to a CMS platform.

**Request:**
```json
{
  "connectionId": "conn_abc123",
  "historyId": "hist_xyz789",
  "status": "draft",
  "tags": ["tech", "ai"],
  "categories": ["tutorials"]
}
```

**Response:**
```json
{
  "success": true,
  "postId": "post_123",
  "postUrl": "https://medium.com/@user/my-article",
  "editUrl": "https://medium.com/p/123/edit"
}
```

---

## React Query Hooks

### CMS Hooks (`lib/hooks/useCMSConnections.ts`)

```typescript
import {
  useCMSConnections,
  useCreateCMSConnection,
  useDeleteCMSConnection,
  useVerifyCMSConnection,
  useCMSExport,
} from '@/lib/hooks/useCMSConnections';

// Fetch all CMS connections
const { data: connections, isLoading } = useCMSConnections();

// Create new connection
const createMutation = useCreateCMSConnection();
await createMutation.mutateAsync({
  platform: 'medium',
  credentials: 'token',
  name: 'My Account',
});

// Delete connection
const deleteMutation = useDeleteCMSConnection();
await deleteMutation.mutateAsync('conn_123');

// Verify connection
const verifyMutation = useVerifyCMSConnection();
const result = await verifyMutation.mutateAsync('conn_123');

// Export article
const exportMutation = useCMSExport();
const result = await exportMutation.mutateAsync({
  connectionId: 'conn_123',
  historyId: 'hist_456',
  status: 'draft',
});
```

### WordPress Hooks (`lib/hooks/queries.ts`)

```typescript
import {
  useWordPressConnections,
  useWordPressTaxonomy,
  useSuggestTaxonomy,
} from '@/lib/hooks/queries';

// Fetch WordPress connections
const { data: wpConnections } = useWordPressConnections();

// Get taxonomy (categories/tags) for a site
const { data: taxonomy } = useWordPressTaxonomy(connectionId);

// AI suggest taxonomy for articles
const suggestMutation = useSuggestTaxonomy();
const suggestions = await suggestMutation.mutateAsync({
  connectionId,
  historyIds: ['hist_1', 'hist_2'],
});
```

---

## HTML to Markdown Conversion

The `html-to-markdown.ts` utility converts SCAI article HTML to Markdown for platforms that require it (Medium, Dev.to, Hashnode).

**Location:** `lib/services/cms/html-to-markdown.ts`

**Functions:**
```typescript
import {
  htmlToMarkdown,
  extractTitle,
  htmlToPlainText
} from '@/lib/services/cms/html-to-markdown';

// Convert full HTML to Markdown
const markdown = htmlToMarkdown(article.htmlContent);

// Extract title from HTML
const title = extractTitle(article.htmlContent);

// Get plain text (for excerpts)
const plainText = htmlToPlainText(article.htmlContent);
```

**Features:**
- Preserves heading hierarchy (h1-h6)
- Converts code blocks with language hints
- Handles ordered and unordered lists
- Extracts and formats links
- Preserves bold and italic formatting
- Removes SCAI-specific styling wrappers

---

## Security

### Credential Encryption

All CMS credentials are encrypted at rest using AES-256-GCM.

**Location:** `lib/services/cms/connection-service.ts`

```typescript
function encryptCredentials(credentials: string): string {
  const key = Buffer.from(process.env.CMS_ENCRYPTION_KEY!, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(credentials, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}
```

**Required Environment Variable:**
```env
# Generate with: openssl rand -hex 32
CMS_ENCRYPTION_KEY=your-64-character-hex-string
```

### Authentication

All API routes verify user authentication before processing:

```typescript
async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('better-auth.session_token');
  if (!session?.value) return null;

  const authSession = await auth.api.getSession({
    headers: new Headers({
      cookie: `better-auth.session_token=${session.value}`,
    }),
  });
  return authSession?.user?.id || null;
}
```

---

## Adding a New Platform

### Step 1: Add Platform to Types

**File:** `lib/services/cms/types.ts`

```typescript
// Add to CMS_PLATFORMS array
export const CMS_PLATFORMS = [
  'medium', 'devto', 'ghost', 'hashnode', 'shopify', 'webflow',
  'newplatform'  // Add here
] as const;

// Add config
export const CMS_PLATFORM_CONFIGS: Record<CMSPlatform, CMSPlatformConfig> = {
  // ... existing configs
  newplatform: {
    id: 'newplatform',
    name: 'New Platform',
    description: 'Publish to New Platform',
    icon: 'newplatform',
    authType: 'api_key',
    authLabel: 'API Key',
    authPlaceholder: 'Enter your API key',
    authHelpUrl: 'https://newplatform.com/settings/api',
    supportsCategories: false,
    supportsTags: true,
    contentFormat: 'markdown',
  },
};
```

### Step 2: Implement Verify and Export Functions

**File:** `lib/services/cms/platforms.ts`

```typescript
// Verify credentials
export async function verifyNewPlatform(credentials: string): Promise<CMSVerifyResult> {
  try {
    const res = await fetch('https://api.newplatform.com/me', {
      headers: { 'Authorization': `Bearer ${credentials}` },
    });

    if (!res.ok) {
      return { valid: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      valid: true,
      name: data.username,
      metadata: { userId: data.id },
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Export article
export async function exportToNewPlatform(options: CMSExportOptions): Promise<CMSExportResult> {
  const connection = await getCMSConnectionWithCredentials(options.connectionId);
  const article = await getHistoryEntry(options.historyId, options.userId);

  const markdown = htmlToMarkdown(article.htmlContent);
  const title = extractTitle(article.htmlContent);

  const res = await fetch('https://api.newplatform.com/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      content: markdown,
      published: options.status === 'publish',
    }),
  });

  const data = await res.json();
  return {
    success: true,
    postId: data.id,
    postUrl: data.url,
  };
}
```

### Step 3: Add to Unified Functions

**File:** `lib/services/cms/platforms.ts`

```typescript
export async function verifyCMSCredentials(
  platform: CMSPlatform,
  credentials: string,
  siteUrl?: string
): Promise<CMSVerifyResult> {
  switch (platform) {
    // ... existing cases
    case 'newplatform':
      return verifyNewPlatform(credentials);
    default:
      return { valid: false, error: 'Unsupported platform' };
  }
}

export async function exportToCMS(
  platform: CMSPlatform,
  options: CMSExportOptions
): Promise<CMSExportResult> {
  switch (platform) {
    // ... existing cases
    case 'newplatform':
      return exportToNewPlatform(options);
    default:
      return { success: false, error: 'Unsupported platform' };
  }
}
```

### Step 4: Add Icon

**File:** `components/cms/CMSIcons.tsx`

```typescript
// Add icon component
export function NewPlatformIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      {/* SVG path data */}
    </svg>
  );
}

// Add to icon map
export const CMS_ICON_MAP: Record<CMSPlatform, React.FC<IconProps>> = {
  // ... existing icons
  newplatform: NewPlatformIcon,
};

// Add colors
export const CMS_COLORS: Record<CMSPlatform, { bg: string; text: string; border: string }> = {
  // ... existing colors
  newplatform: {
    bg: 'bg-[#brandcolor]/10',
    text: 'text-[#brandcolor]',
    border: 'border-[#brandcolor]/20',
  },
};
```

---

## Troubleshooting

### Connection Failed

1. **Verify credentials are correct** - Copy-paste carefully
2. **Check platform API status** - Some platforms have rate limits
3. **Ensure site URL is correct** - For Ghost/Shopify, include https://

### Export Failed

1. **Check connection status** - Must be "active"
2. **Verify article exists** - Check history entry is complete
3. **Check platform limits** - Tags, content length, etc.
4. **Review error message** - API errors are passed through

### JWT Errors (Ghost)

1. **Verify API key format** - Must be `{id}:{secret}`
2. **Check secret is hex** - 64 character hex string
3. **Server time sync** - JWT expires in 5 minutes

### Selection Not Appearing (History Page)

1. **Connect at least one CMS** - Go to Settings → Integrations
2. **Check connection status** - Must be "active"
3. **Refresh the page** - React Query cache may be stale

### Bulk Export Issues

1. **Bulk export is WordPress only** - Other platforms support single export
2. **Check WordPress plugin** - Install SCAI Renderer for best results
3. **Verify taxonomy sync** - Categories/tags must exist or be creatable

---

## Environment Variables

```env
# Required for CMS credential encryption
CMS_ENCRYPTION_KEY=your-64-character-hex-key

# Database (choose one)
DATABASE_URL=file:./data/app.db          # SQLite
DATABASE_URL=postgresql://...             # PostgreSQL

# Authentication
BETTER_AUTH_SECRET=your-auth-secret
BETTER_AUTH_URL=http://localhost:3000

# Optional: For specific platforms
# (Most platforms use user-provided credentials)
```

---

## Migration Notes

If upgrading from WordPress-only to full CMS support:

1. **Run database migrations** - New `cms_connections` table
2. **Add encryption key** - Set `CMS_ENCRYPTION_KEY` env var
3. **Update imports** - Use new hooks/components where needed
4. **Test connections** - Verify existing WordPress still works

Existing WordPress connections are unaffected - they use a separate table and integration.
