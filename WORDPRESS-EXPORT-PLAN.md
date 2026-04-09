# WordPress Export Feature - Implementation Plan

Export generated articles to self-hosted WordPress sites via a custom connector plugin. Uses HMAC-signed server-to-server requests, encrypted token storage, and image transfer from R2 to WP media library.

## Architecture

```
User clicks "Export to WP" → Next.js API route →
  1. Download images from R2 (public URLs, simple fetch)
  2. Upload images to WP via signed raw upload
  3. Replace R2 URLs with WP URLs in HTML
  4. Create post via signed JSON request
```

---

## Phase 1: Database & Crypto Foundation

- [ ] **1.1** Create migration `drizzle/0008_add_wordpress_connections.sql`
  - Table: `wordpress_connections` (id, user_id, site_url, site_id, encrypted_token, site_name, site_home, wp_version, created_at, updated_at)
  - Index on user_id, unique index on (user_id, site_id)
- [ ] **1.2** Update schema `lib/db/schema.ts`
  - Add `wordpressConnections` table definition
  - Add type exports: `WordPressConnection`, `NewWordPressConnection`
- [ ] **1.3** Create encryption utility `lib/utils/encryption.ts`
  - `encrypt(text)` → AES-256-GCM, returns `iv:authTag:ciphertext` hex string
  - `decrypt(encryptedText)` → reverses encryption
  - Key derived from `BETTER_AUTH_SECRET` via `scryptSync`
- [ ] **1.4** Create HMAC signing `lib/services/wordpress/crypto.ts`
  - `sha256Hex(input)` → hex hash
  - `hmacSha256Hex(secretBase64, canonical)` → hex signature
  - `makeCanonical({ method, routePath, timestamp, nonce, contentSha256 })` → canonical string
  - Format: `METHOD\nROUTE\nTIMESTAMP\nNONCE\nCONTENT_SHA256`
- [ ] **1.5** Run migration `npx drizzle-kit push`

---

## Phase 2: WordPress PHP Plugin

- [ ] **2.1** Create main plugin file `wordpress-plugin/scai-connector/scai-connector.php`
  - Plugin header, activation hook, includes
- [ ] **2.2** Create auth class `wordpress-plugin/scai-connector/includes/class-scai-auth.php`
  - HMAC-SHA256 verification with canonical string
  - Replay protection: 5-min timestamp window + nonce transients (10 min TTL)
  - Content-SHA256 body integrity check
- [ ] **2.3** Create API class `wordpress-plugin/scai-connector/includes/class-scai-api.php`
  - `POST /wp-json/scai/v1/pair` → One-time pairing (pairing code validation)
  - `POST /wp-json/scai/v1/verify` → Connection health check (HMAC auth)
  - `POST /wp-json/scai/v1/posts` → Create post from HTML (HMAC auth)
  - `POST /wp-json/scai/v1/media-raw` → Upload raw image bytes (HMAC auth)
  - `POST /wp-json/scai/v1/disconnect` → Rotate secret, invalidate connection (HMAC auth)
- [ ] **2.4** Create admin page `wordpress-plugin/scai-connector/includes/class-scai-admin.php`
  - Settings page under WP Settings menu
  - Generate pairing code button (10-char alphanumeric, 10-min expiry)
  - Show connection status
  - Disconnect button
- [ ] **2.5** Create `wordpress-plugin/scai-connector/readme.txt`
- [ ] **2.6** Package plugin as `public/downloads/scai-connector.zip` (build script)

---

## Phase 3: Next.js Services

- [ ] **3.1** Create signed fetch helpers `lib/services/wordpress/signed-fetch.ts`
  - `signedJsonFetch<T>({ siteUrl, siteId, tokenBase64, path, method, body })` → T
  - `signedRawUpload({ siteUrl, siteId, tokenBase64, path, bytes, filename, mime })` → { mediaId, sourceUrl }
  - Both build canonical string, sign with HMAC, send with auth headers
- [ ] **3.2** Create connection service `lib/services/wordpress/connection-service.ts`
  - `pairWordPressSite(userId, { siteUrl, pairingCode })` → WordPressConnection
  - `getUserConnections(userId)` → WordPressConnection[]
  - `getConnection(id, userId)` → WordPressConnection | null
  - `verifyConnection(id, userId)` → boolean
  - `disconnectSite(id, userId)` → void
- [ ] **3.3** Create export service `lib/services/wordpress/export-service.ts`
  - `exportArticleToWordPress(options)` → { postId, postUrl, editUrl }
    1. Fetch article from `getHistoryEntry()`
    2. Extract R2 image URLs via regex
    3. Download each image (public URL fetch), upload to WP
    4. Replace R2 URLs with WP URLs in HTML
    5. Set first image as featured
    6. Create WP post
  - `exportBulkToWordPress(options)` → Array<{ historyId, postId?, postUrl?, error? }>
    - Sequential export of multiple articles
    - Best-effort: collects errors without stopping
  - `fetchImageBytes(url)` → { bytes: Buffer, mime: string }

---

## Phase 4: API Routes

- [ ] **4.1** Create `app/api/wordpress/connections/route.ts`
  - `GET` → List user's connections (strips encrypted token)
  - `POST { siteUrl, pairingCode }` → Pair new site
  - `DELETE ?id=xxx` → Disconnect and delete
- [ ] **4.2** Create `app/api/wordpress/connections/verify/route.ts`
  - `POST { connectionId }` → Verify connection health
- [ ] **4.3** Create `app/api/wordpress/export/route.ts`
  - `POST { historyId, connectionId, status, categories, tags }` → Export single article
  - Rate limit: 10 exports/hour/user
- [ ] **4.4** Create `app/api/wordpress/export/bulk/route.ts`
  - `POST { historyIds[], connectionId, status, categories, tags }` → Bulk export
  - Rate limit: 50 articles/hour/user

---

## Phase 5: TanStack Query Hooks

- [ ] **5.1** Create `lib/hooks/wordpress-queries.ts`
  - `useWordPressConnections()` → query `['wordpress', 'connections']`
  - `useConnectWordPress()` → mutation + invalidate connections
  - `useDisconnectWordPress()` → mutation + invalidate connections
  - `useVerifyWordPress()` → mutation
  - `useExportToWordPress()` → mutation
  - `useBulkExportToWordPress()` → mutation

---

## Phase 6: UI Components

- [ ] **6.1** Create WordPress icon `components/icons/WordPressIcon.tsx`
  - SVG component (lucide-react doesn't have WordPress icon)
- [ ] **6.2** Create settings component `components/wordpress/WordPressSettings.tsx`
  - Connected sites list (name, URL, WP version, visit/disconnect buttons)
  - "Connect WordPress Site" button
  - Multi-step connect dialog:
    - Step 1: Download plugin + enter site URL
    - Step 2: Enter pairing code + connect
- [ ] **6.3** Create single export dialog `components/wordpress/WordPressExportDialog.tsx`
  - No-connections state: message + link to settings
  - Export form: site selection, post status (draft/publish), categories, tags
  - Loading state with progress text
  - Success toast with WP link
- [ ] **6.4** Create bulk export dialog `components/wordpress/WordPressBulkExportDialog.tsx`
  - Shows count of selected articles
  - Same options as single: site, status, categories, tags
  - Progress: "Exporting 3 of 10..."
  - Results summary: X succeeded, Y failed (expandable errors)

---

## Phase 7: Integration

- [ ] **7.1** Update settings page `app/(protected)/settings/page.tsx`
  - Add WordPress `SettingsCard` in left column after Affiliate Settings
  - Import `WordPressSettings` component
- [ ] **7.2** Update history page `app/(protected)/history/page.tsx`
  - Add checkbox column to table for multi-select
  - Add "Export to WordPress" bulk action button (visible when selected)
  - Add WP export button in preview modal header, next to Download
  - Add `WordPressExportDialog` + `WordPressBulkExportDialog` components
  - New state: `selectedIds`, `showWpExport`, `showBulkWpExport`

---

## Files Summary

### New Files (15)
| # | File | Purpose |
|---|------|---------|
| 1 | `drizzle/0008_add_wordpress_connections.sql` | Migration |
| 2 | `lib/utils/encryption.ts` | AES-256-GCM encrypt/decrypt |
| 3 | `lib/services/wordpress/crypto.ts` | HMAC signing helpers |
| 4 | `lib/services/wordpress/signed-fetch.ts` | Signed HTTP client for WP |
| 5 | `lib/services/wordpress/connection-service.ts` | Connection CRUD + pairing |
| 6 | `lib/services/wordpress/export-service.ts` | Export orchestration (single + bulk) |
| 7 | `lib/hooks/wordpress-queries.ts` | TanStack Query hooks |
| 8 | `app/api/wordpress/connections/route.ts` | Connections API |
| 9 | `app/api/wordpress/connections/verify/route.ts` | Verify API |
| 10 | `app/api/wordpress/export/route.ts` | Single export API |
| 11 | `app/api/wordpress/export/bulk/route.ts` | Bulk export API |
| 12 | `components/icons/WordPressIcon.tsx` | WP SVG icon |
| 13 | `components/wordpress/WordPressSettings.tsx` | Settings UI |
| 14 | `components/wordpress/WordPressExportDialog.tsx` | Single export dialog |
| 15 | `components/wordpress/WordPressBulkExportDialog.tsx` | Bulk export dialog |

### Modified Files (3)
| File | Change |
|------|--------|
| `lib/db/schema.ts` | Add `wordpressConnections` table + types |
| `app/(protected)/settings/page.tsx` | Add WordPress SettingsCard |
| `app/(protected)/history/page.tsx` | Add WP export button + bulk select + dialogs |

### WordPress Plugin (4 files in `wordpress-plugin/scai-connector/`)
| File | Purpose |
|------|---------|
| `scai-connector.php` | Main plugin file |
| `includes/class-scai-auth.php` | Auth/HMAC verification |
| `includes/class-scai-api.php` | REST endpoints |
| `includes/class-scai-admin.php` | Admin settings page |

---

## Verification

- [ ] Encrypt/decrypt round-trip works correctly
- [ ] HMAC signing produces matching signatures between Next.js and PHP
- [ ] Migration runs without errors (`npx drizzle-kit push`)
- [ ] API routes return correct auth errors for unauthenticated requests
- [ ] Plugin installs and activates on WordPress without errors
- [ ] Pairing flow completes: generate code → enter in app → connection stored
- [ ] Single article export: images uploaded, URLs replaced, post created
- [ ] Bulk export: multiple articles exported with progress tracking
- [ ] All UI states work: no connections, connecting, connected, exporting, success, error
