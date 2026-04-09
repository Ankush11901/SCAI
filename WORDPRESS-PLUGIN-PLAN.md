# WordPress Plugin Approach — Complete Implementation Plan

> **Goal**: Ensure exported articles render consistently across all WordPress themes by installing a custom plugin that provides a Gutenberg block with scoped CSS.

---

## The Problem Today

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CURRENT EXPORT FLOW                              │
│                                                                         │
│  Our App                          WordPress Site                        │
│  ┌──────────┐                     ┌──────────────────────────┐          │
│  │ Article   │   REST API          │                          │          │
│  │ Generator │ ──────────────────> │  POST /wp/v2/posts       │          │
│  │           │   content: html     │  ┌────────────────────┐  │          │
│  │ HTML with │   (full document    │  │ WordPress strips   │  │          │
│  │ <style>   │    with <style>)    │  │ <style> block      │  │          │
│  │ block     │                     │  │ Theme CSS takes    │  │          │
│  └──────────┘                     │  │ over ALL styling   │  │          │
│                                    │  │                    │  │          │
│                                    │  │  ╔═══════════════╗ │  │          │
│                                    │  │  ║ BROKEN LAYOUT ║ │  │          │
│                                    │  │  ║ Wrong fonts   ║ │  │          │
│                                    │  │  ║ Wrong spacing ║ │  │          │
│                                    │  │  ║ Wrong colors  ║ │  │          │
│                                    │  │  ╚═══════════════╝ │  │          │
│                                    │  └────────────────────┘  │          │
│                                    └──────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why styling breaks:

1. **`<style>` block stripped** — WordPress `wp_kses_post()` sanitizer removes `<style>` tags for most users. Only admins on single-site installs keep `unfiltered_html` capability.
2. **Theme CSS overrides everything** — Themes style `h1`, `h2`, `p`, `img`, `table`, `figure` globally. Our `.scai-*` classes lose every specificity battle.
3. **Gutenberg sanitization** — The block editor parses and re-serializes content. Custom attributes and structures can be modified.
4. **No CSS isolation** — No Shadow DOM, no iframe, no CSS containment. Theme rules leak into article content freely.
5. **18 variations × 6 color themes** — Each article has ~400+ lines of CSS that must somehow survive in WordPress.

---

## The Solution: WordPress Plugin

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     NEW EXPORT FLOW (WITH PLUGIN)                       │
│                                                                         │
│  Our App                          WordPress Site                        │
│  ┌──────────┐                     ┌──────────────────────────┐          │
│  │ Article   │   REST API          │                          │          │
│  │ Generator │ ──────────────────> │  POST /wp/v2/posts       │          │
│  │           │   content:          │  ┌────────────────────┐  │          │
│  │ Wraps HTML│   Gutenberg block   │  │ SCAI Plugin loads  │  │          │
│  │ in block  │   markers + clean   │  │ scoped CSS file    │  │          │
│  │ comments  │   HTML in wrapper   │  │                    │  │          │
│  └──────────┘                     │  │ .scai-wrapper {    │  │          │
│                                    │  │   /* resets */      │  │          │
│                                    │  │   /* our styles */  │  │          │
│                                    │  │ }                   │  │          │
│                                    │  │                    │  │          │
│                                    │  │  ╔═══════════════╗ │  │          │
│                                    │  │  ║ PERFECT MATCH ║ │  │          │
│                                    │  │  ║ Same fonts    ║ │  │          │
│                                    │  │  ║ Same spacing  ║ │  │          │
│                                    │  │  ║ Same colors   ║ │  │          │
│                                    │  │  ╚═══════════════╝ │  │          │
│                                    │  └────────────────────┘  │          │
│                                    └──────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
```

### What the exported content looks like:

```html
<!-- wp:scai/article {"variation":"clean-studio","colorTheme":"default"} -->
<div class="wp-block-scai-article scai-wrapper"
     data-variation="clean-studio"
     data-color-theme="default">

  <header data-component="scai-h1">
    <h1 class="scai-h1">Article Title Here</h1>
  </header>

  <figure class="scai-featured-image">
    <img src="https://wp-site.com/wp-content/uploads/scai-image.webp"
         alt="Descriptive alt text" />
  </figure>

  <!-- ... rest of article HTML with .scai-* classes ... -->

</div>
<!-- /wp:scai/article -->
```

### What the plugin provides:

```
wordpress-plugin/scai-renderer/
├── scai-renderer.php              ← Main plugin file
├── block.json                     ← Gutenberg block metadata
├── includes/
│   ├── class-scai-rest.php        ← REST API endpoints (ping, handshake)
│   └── class-scai-admin.php       ← Admin settings page
├── assets/
│   └── scai-article.css           ← ALL article styles, scoped under .scai-wrapper
└── readme.txt                     ← WordPress plugin directory format
```

---

## Plugin Install Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                    PLUGIN INSTALL DECISION TREE                       │
│                                                                       │
│              User connects WordPress site (OAuth)                     │
│                            │                                          │
│                            ▼                                          │
│              ┌─────────────────────────────┐                          │
│              │ Check: Is plugin already     │                          │
│              │ installed? (GET /scai/v1/ping│                          │
│              └─────────────┬───────────────┘                          │
│                    ┌───────┴───────┐                                  │
│                    │               │                                   │
│                 200 OK          404/Error                              │
│                    │               │                                   │
│                    ▼               ▼                                   │
│              ┌──────────┐  ┌─────────────────────────┐                │
│              │ DONE!    │  │ Check: Can we install    │                │
│              │ Plugin   │  │ via REST API?            │                │
│              │ is active│  │ (GET /wp/v2/plugins)     │                │
│              └──────────┘  └────────────┬────────────┘                │
│                                ┌────────┴────────┐                    │
│                                │                 │                     │
│                             200 OK          401/403/404               │
│                                │                 │                     │
│                                ▼                 ▼                     │
│                    ┌────────────────┐  ┌─────────────────┐            │
│                    │  PATH A        │  │  PATH B          │            │
│                    │  REST Install  │  │  Manual Install  │            │
│                    │  (automatic)   │  │  (wp-admin)      │            │
│                    └───────┬────────┘  └────────┬────────┘            │
│                            │                    │                      │
│                            ▼                    ▼                      │
│              ┌──────────────────┐  ┌──────────────────────┐           │
│              │ POST /wp/v2/     │  │ Redirect user to     │           │
│              │   plugins        │  │ wp-admin upload page  │           │
│              │ (install + active│  │ User uploads zip      │           │
│              │  ate plugin)     │  │ Activates plugin      │           │
│              └────────┬─────────┘  │ Plugin shows "Return  │           │
│                       │            │ to App" button        │           │
│                       ▼            └──────────┬───────────┘           │
│              ┌──────────────────┐             │                       │
│              │ Verify: ping     │◄────────────┘                       │
│              │ GET /scai/v1/ping│                                      │
│              └────────┬─────────┘                                      │
│                       │                                                │
│                       ▼                                                │
│              ┌──────────────────┐                                      │
│              │ Handshake:       │                                      │
│              │ Exchange one-time│                                      │
│              │ setup code       │                                      │
│              └────────┬─────────┘                                      │
│                       │                                                │
│                       ▼                                                │
│              ┌──────────────────┐                                      │
│              │ ✅ CONNECTED     │                                      │
│              │ Plugin active    │                                      │
│              │ Ready to export  │                                      │
│              └──────────────────┘                                      │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐       │
│  │ PATH C: Plugin can't be installed at all                    │       │
│  │ (WordPress.com free, locked hosting, not admin)             │       │
│  │                                                             │       │
│  │ → Show warning: "Styling may differ from preview"           │       │
│  │ → Export as raw HTML (current behavior, graceful fallback)  │       │
│  └────────────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Data Model Changes

```
┌─────────────────────────────────────────────────────┐
│              wordpress_connections table              │
├─────────────────────────────────────────────────────┤
│ id                    TEXT (PK)                       │
│ user_id               TEXT (indexed)                  │
│ site_url              TEXT                            │
│ username              TEXT                            │
│ encrypted_credentials TEXT (AES-256-GCM)              │
│ site_name             TEXT (nullable)                 │
│ site_home             TEXT (nullable)                 │
│ wp_version            TEXT (nullable)                 │
│ created_at            INTEGER (timestamp)             │
│ updated_at            INTEGER (timestamp)             │
│─────────────────── NEW FIELDS ──────────────────────│
│ plugin_status         TEXT (default: 'not_checked')   │
│                       Values: not_checked │           │
│                               not_installed │         │
│                               installing │            │
│                               active │                │
│                               blocked                 │
│ install_method        TEXT (nullable)                 │
│                       Values: rest │ wp_admin │ none  │
│ plugin_version        TEXT (nullable)                 │
└─────────────────────────────────────────────────────┘
```

---

## Graceful Degradation Matrix

```
┌──────────────────────────┬─────────────────────────────────────────┐
│ Scenario                 │ Behavior                                │
├──────────────────────────┼─────────────────────────────────────────┤
│ Plugin active            │ Gutenberg block + scoped CSS            │
│                          │ ✅ Perfect rendering across all themes  │
├──────────────────────────┼─────────────────────────────────────────┤
│ Plugin installed but     │ Block HTML shows as-is (no plugin CSS)  │
│ deactivated              │ ⚠️  Readable but unstyled               │
├──────────────────────────┼─────────────────────────────────────────┤
│ Plugin not installed     │ Raw HTML export (current behavior)      │
│                          │ ⚠️  Theme-dependent rendering           │
├──────────────────────────┼─────────────────────────────────────────┤
│ Can't install plugin     │ Raw HTML export + warning in dialog     │
│ (WP.com free, etc.)      │ ❌ No styling consistency guarantee     │
└──────────────────────────┴─────────────────────────────────────────┘
```

---

## CSS Scoping Strategy

```css
/* ═══════════════════════════════════════════════════════════════════ */
/* scai-article.css — loaded by the WordPress plugin                  */
/* All rules scoped under .scai-wrapper to prevent theme interference */
/* ═══════════════════════════════════════════════════════════════════ */

/* Typography Reset — blocks theme fonts from leaking in */
.scai-wrapper,
.scai-wrapper * {
  font-family: inherit;
  line-height: inherit;
}

.scai-wrapper {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.7;
  color: #1a1a1a;
  max-width: 768px;
  margin: 0 auto;
}

/* Base styles */
.scai-wrapper .scai-h1 { font-size: 2.5rem; font-weight: 700; ... }
.scai-wrapper .scai-h2 { font-size: 1.75rem; font-weight: 600; ... }
.scai-wrapper .scai-paragraph { margin: 1rem 0; color: #333; ... }

/* Variation styles via data attribute */
.scai-wrapper[data-variation="neo-brutalist"] .scai-h1 { ... }
.scai-wrapper[data-variation="dark-elegance"] .scai-h1 { ... }
.scai-wrapper[data-variation="eco-paper"] .scai-h1 { ... }
/* ... 18 variations total ... */

/* Color theme overrides via data attribute */
.scai-wrapper[data-color-theme="blue"] .scai-product-cta { ... }
.scai-wrapper[data-color-theme="green"] .scai-product-cta { ... }
/* ... 6 color themes total ... */
```

---

## Implementation Phases

---

### Phase 1: WordPress PHP Plugin
> Build the plugin independently, test on a WordPress site before touching our app.

- [x] **1.1** Create `wordpress-plugin/scai-renderer/scai-renderer.php`
  - Plugin header (Name: "SCAI Article Renderer", Version: 1.0.0)
  - Activation hook: store `scai_plugin_version` in WP options
  - Deactivation hook: cleanup
  - `init` action: register Gutenberg block via `register_block_type()`
  - `wp_enqueue_scripts` action: conditionally load `scai-article.css` on single posts

- [x] **1.2** Create `wordpress-plugin/scai-renderer/block.json`
  - Block name: `scai/article`
  - Attributes: `variation` (string), `colorTheme` (string)
  - Style: `file:./assets/scai-article.css`
  - Supports: `{ html: true, className: false }`

- [x] **1.3** Create `wordpress-plugin/scai-renderer/includes/class-scai-rest.php`
  - `GET /wp-json/scai/v1/ping`
    - No auth required
    - Returns `{ active: true, version: "1.0.0" }`
  - `POST /wp-json/scai/v1/handshake/start`
    - Requires `manage_options` permission
    - Generates 10-char alphanumeric code
    - Stores as WP transient with 5-minute expiry
    - Returns `{ code: "abc1234567" }`
  - `POST /wp-json/scai/v1/handshake/complete`
    - Accepts `{ code: "abc1234567" }`
    - Validates against stored transient
    - Deletes transient (single use)
    - Returns `{ success: true }`

- [x] **1.4** Create `wordpress-plugin/scai-renderer/includes/class-scai-admin.php`
  - Register settings page under WP Settings menu
  - Display: Plugin version, connection status
  - "Return to Our App" link/button
  - Generate + display one-time setup code (for manual flow)

- [x] **1.5** Create `wordpress-plugin/scai-renderer/readme.txt`
  - WordPress plugin directory format
  - Installation instructions
  - FAQ section

- [ ] **1.6** Test plugin independently
  - Install on local/staging WordPress
  - Verify Gutenberg block registration
  - Verify REST endpoints respond correctly
  - Verify CSS loads on frontend

---

### Phase 2: Port CSS to Plugin
> Extract ALL styles from article-assembler.ts and create the scoped CSS file.

- [x] **2.1** Extract base styles from `getArticleStyles()` in `lib/services/article-assembler.ts`
  - Typography (h1, h2, h3, paragraph)
  - Images (featured, h2-image, captions)
  - Table of Contents
  - FAQ section
  - Service info boxes
  - Product cards
  - Tables
  - Lists
  - Responsive breakpoints

- [x] **2.2** Extract all 18 variation styles
  - Clean Studio, Neo-Brutalist, Dark Elegance, Swiss Grid, Eco Paper...
  - Each variation's unique overrides for every component

- [x] **2.3** Extract all 6 color theme overrides
  - Default, Blue, Green, Amber, Red, Purple
  - CTA buttons, badges, borders, accents

- [x] **2.4** Write `wordpress-plugin/scai-renderer/assets/scai-article.css`
  - Scope ALL rules under `.scai-wrapper`
  - Use `[data-variation="..."]` selectors for variations
  - Use `[data-color-theme="..."]` selectors for color themes
  - Add typography reset to block theme font leakage
  - Add `!important` on critical properties as defense

- [ ] **2.5** Visual comparison testing
  - Render same article in our preview vs WordPress (3+ themes)
  - Fix any discrepancies
  - Test all article types (affiliate, recipe, review, local, etc.)

---

### Phase 3: Database Migration
> Add plugin tracking fields to the connections table.

- [x] **3.1** Create migration `drizzle/0010_add_plugin_status.sql`
  ```sql
  ALTER TABLE wordpress_connections ADD COLUMN plugin_status TEXT DEFAULT 'not_checked';
  ALTER TABLE wordpress_connections ADD COLUMN install_method TEXT;
  ALTER TABLE wordpress_connections ADD COLUMN plugin_version TEXT;
  ```

- [x] **3.2** Update schema in `lib/db/schema.ts`
  - Add `pluginStatus`, `installMethod`, `pluginVersion` columns
  - Update type exports

- [x] **3.3** Run migration
  - `npx drizzle-kit push`
  - Verify on Turso dashboard

---

### Phase 4: Plugin Install Service (Next.js)
> Build the server-side logic for detecting, installing, and verifying the plugin.

- [x] **4.1** Create `lib/services/wordpress/plugin-service.ts`
  - `checkPluginReadiness(siteUrl, username, password)`
    - Ping `/scai/v1/ping` → already installed?
    - Probe `GET /wp/v2/plugins` → can REST install?
    - Returns `{ pluginInstalled, pluginVersion?, canRestInstall }`
  - `installPluginViaRest(siteUrl, username, password)`
    - `POST /wp/v2/plugins` with slug or zip URL
    - Activate: `POST /wp/v2/plugins/{file}` with `status: active`
    - Verify via ping
    - Returns `{ success, version?, error? }`
  - `verifyPluginInstallation(siteUrl, username, password)`
    - `GET /scai/v1/ping`
    - Returns `{ installed, version? }`
  - `performHandshake(siteUrl, username, password)`
    - `POST /scai/v1/handshake/start` → get code
    - `POST /scai/v1/handshake/complete` → validate
    - Returns `{ success }`
  - `getWpAdminInstallUrl(siteUrl)`
    - Returns wp-admin plugin upload URL

- [x] **4.2** Create `app/api/wordpress/plugin/route.ts`
  - `POST { connectionId, action: 'check' }` → run readiness check, update DB
  - `POST { connectionId, action: 'install' }` → attempt REST install, update DB
  - `POST { connectionId, action: 'verify' }` → verify after manual install, update DB

- [x] **4.3** Create `app/api/wordpress/plugin-callback/route.ts`
  - `GET ?connection_id=...&user_id=...` → handle redirect from wp-admin after manual install
  - Validates connection, pings plugin to verify active
  - Updates plugin_status in DB
  - Shows status page with postMessage to opener window

- [x] **4.4** Update OAuth callback to auto-check plugin after connection
  - After `saveConnection()`, non-blocking `checkPluginReadiness()` call
  - Updates plugin_status in DB automatically

---

### Phase 5: Updated Export Service
> Modify the export to wrap HTML in Gutenberg block markers when plugin is active.

- [x] **5.1** Add `extractArticleBody(html)` function
  - Parse full HTML document
  - Extract content between `<article>` tags
  - Strip `<style>` blocks (plugin provides CSS externally)
  - Strip `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` wrappers
  - Return clean article body HTML

- [x] **5.2** Add `wrapInGutenbergBlock(html, opts)` function
  - Accepts `{ variation, colorTheme }` from article metadata
  - Wraps in `<!-- wp:scai/article {...} -->` block comments
  - Wraps in `<div class="wp-block-scai-article scai-wrapper" data-variation="..." data-color-theme="...">`
  - Returns complete block markup

- [x] **5.3** Update `exportToWordPress()` in `lib/services/wordpress/export-service.ts`
  - Check `pluginStatus` on the connection record
  - If `'active'` → extract variation + colorTheme from metadata → wrap in Gutenberg block
  - If NOT active → send raw HTML as today (graceful degradation)

- [x] **5.4** Ensure article metadata stores `variation` and `colorTheme`
  - Note: Parsed directly from `data-variation` and `data-color-theme` attributes on the `<article>` tag in the stored HTML, so no metadata schema change needed
  - Check `generation_history.metadata` JSON structure
  - Ensure assembler saves these values during generation
  - Add defaults if not present

---

### Phase 6: UI Updates
> Show plugin status in settings and export dialogs.

- [x] **6.1** Add hooks to `lib/hooks/queries.ts`
  - `useCheckPlugin(connectionId)` — mutation → `POST /api/wordpress/plugin { action: 'check' }`
  - `useInstallPlugin(connectionId)` — mutation → `POST /api/wordpress/plugin { action: 'install' }`
  - `useVerifyPlugin(connectionId)` — mutation → `POST /api/wordpress/plugin { action: 'verify' }`

- [x] **6.2** Update `components/wordpress/WordPressSettings.tsx`
  - Show plugin status badge next to each connected site:
    - Green "Plugin Active v1.0.0" badge
    - Yellow "Plugin Not Installed" badge + "Install Plugin" button
    - Red "Install Failed" badge + "Manual Install" instructions link
    - Spinner "Checking..." during capability check
  - "Install Plugin" button triggers REST install attempt
  - If REST install fails: show manual install instructions (download zip + wp-admin upload link)
  - "Re-check Plugin" button to re-verify

- [x] **6.3** Update `components/wordpress/WordPressExportDialog.tsx`
  - Show plugin status indicator next to selected site name
  - If plugin NOT active: show warning banner
    - "Plugin not installed on this site. Article styling may differ from preview."
    - Link to settings page to install plugin
  - Still allow export regardless (graceful degradation)

- [x] **6.4** Plugin download/instructions component
  - Download button for plugin zip file (`/api/wordpress/plugin-download`)
  - Step-by-step manual install instructions (`PluginInstallGuide` component)
  - Link to wp-admin upload page for the connected site
  - "I've installed it — Verify" button triggers plugin verification

---

### Phase 7: Plugin Distribution
> Package and host the plugin for installation.

- [x] **7.1** Create build script
  - Packages `wordpress-plugin/scai-renderer/` into `scai-renderer.zip`
  - Can be a simple shell script or npm script

- [ ] **7.2** Host plugin zip
  - Upload to R2 bucket or static hosting
  - Public URL for REST install: `https://{domain}/downloads/scai-renderer.zip`
  - Download link for manual install

- [ ] **7.3** (Future) Submit to wordpress.org plugin directory
  - Official listing enables install-by-slug
  - Review process: 2-8 weeks
  - Run in parallel with self-hosted approach

---

### Phase 8: Integration Testing
> End-to-end testing of the complete flow.

- [ ] **8.1** Test plugin install via REST API
  - Connect test site → auto-detect → REST install → verify ping → handshake

- [ ] **8.2** Test manual plugin install
  - Download zip → upload in wp-admin → activate → "Return to App" → callback

- [ ] **8.3** Test export with plugin active
  - Export article → verify Gutenberg block markup → verify CSS rendering
  - Test across 3+ themes: Twenty Twenty-Four, Astra, GeneratePress

- [ ] **8.4** Test export without plugin (graceful degradation)
  - Export article → verify raw HTML sent → verify warning shown in UI

- [ ] **8.5** Test all article types
  - Affiliate (product cards, Amazon CTA)
  - Recipe (ingredients, instructions, nutrition)
  - Review (pros/cons, ratings, specs)
  - Local (service info, "why choose local")
  - Comparison (comparison tables, verdict)
  - How-To, Listicle, Informational, Commercial

- [ ] **8.6** Test all 18 variations × 6 color themes (spot check)
  - Clean Studio + default
  - Neo-Brutalist + blue
  - Dark Elegance + purple
  - Eco Paper + green
  - (sample others)

- [ ] **8.7** Test edge cases
  - Plugin deactivated after export → verify content still readable
  - Plugin updated → verify backward compatibility
  - WordPress.com free site → verify fallback messaging
  - Site behind security plugin → verify manual install fallback

---

## Phase 9: Admin Panel Upgrade (Boss Mockup)

> Adopted features from `wordpress-plugin/scai-admin-mockup.html` to match SCAI brand identity.
> 4 tabs implemented: Dashboard, Articles, Styling, Settings. Affiliate tab deferred.

- [x] **9.1** Rename plugin from "SCAI Article Renderer" → "SCAI Connector"
  - Updated: `scai-renderer.php` header, `readme.txt`, `class-scai-admin.php` menu
- [x] **9.2** Create dark-themed admin CSS — `assets/scai-admin.css`
  - Ported SCAI brand vars, panel shell, tabs, cards, stats, tables, forms, toggles, buttons, variation cards, color pickers, API box, connection test UI
- [x] **9.3** Rewrite `class-scai-admin.php` — full 4-tab admin panel
  - Dashboard: stats cards (WP_Query) + recent imports table
  - Articles: search, type/status filters, bulk actions (publish/draft/trash), pagination, view/edit/delete per row
  - Styling: variation picker (4 cards), typography (font dropdowns), color overrides (swatch+hex)
  - Settings: API key (masked display, show/copy), connection test, default post status, danger zone
- [x] **9.4** Create `includes/class-scai-ajax.php` — AJAX handlers
  - Actions: save_styling, save_settings, test_connection, disconnect, bulk_articles
- [x] **9.5** Create `assets/scai-admin.js` — admin JavaScript
  - Tab/sub-tab switching, variation cards, color sync, API key toggle, AJAX submissions
- [x] **9.6** Update `scai-renderer.php` — include AJAX class, enqueue admin assets, inject frontend CSS overrides
- [x] **9.7** Add CSS custom property fallbacks to `scai-article.css`
  - `--scai-text-color`, `--scai-heading-color`, `--scai-bg-color`, `--scai-link-color`, `--scai-heading-font`, `--scai-body-font`
- [x] **9.8** Rebuild plugin zip — 9 files, verified
- [ ] **9.9** Test admin panel on live WordPress site

---

## What Cannot Be Done / Limitations

```
┌──────────────────────────────────────────────────────────────────┐
│                         LIMITATIONS                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ❌  Cannot auto-install on WordPress.com free/personal/premium  │
│      → These plans do not allow custom plugins at all             │
│      → WordPress.com Business+ plans DO allow plugins             │
│      → Fallback: raw HTML export with warning                     │
│                                                                   │
│  ❌  Cannot guarantee REST install works everywhere               │
│      → Security plugins (Wordfence, iThemes) may block it         │
│      → Some hosts restrict plugin REST API                        │
│      → Fallback: manual wp-admin install (Path B)                 │
│                                                                   │
│  ❌  Cannot achieve 100% pixel-perfect rendering                  │
│      → Aggressive themes with * { ... !important } rules          │
│      → CSS custom properties from themes can leak in              │
│      → But we achieve ~95% consistency (vs ~0% today)             │
│                                                                   │
│  ❌  Cannot prevent users from deactivating the plugin            │
│      → If deactivated: block content shows as raw HTML            │
│      → Readable but unstyled — acceptable degradation             │
│                                                                   │
│  ❌  Cannot use Shadow DOM for perfect isolation                  │
│      → WordPress Gutenberg doesn't support Shadow DOM in blocks   │
│      → Scoped CSS with high specificity is the next best thing    │
│                                                                   │
│  ❌  Cannot instantly list on wordpress.org plugin directory       │
│      → Review process takes 2-8 weeks                             │
│      → Start with self-hosted zip, submit in parallel             │
│                                                                   │
│  ❌  Cannot support :hover, ::before, ::after in no-plugin mode   │
│      → These require CSS rules (not inline styles)                │
│      → Only available when plugin is installed                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Security Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SECURITY CONSIDERATIONS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ✅  One-time setup codes are short-lived (5 minutes) & single-use  │
│  ✅  Handshake codes stored as WP transients (auto-expire)           │
│  ✅  Plugin REST endpoints that change state require admin auth      │
│  ✅  Ping endpoint is read-only (no auth needed, safe to expose)     │
│  ✅  No long-lived secrets in URLs                                   │
│  ✅  Site URL validation prevents cross-site attacks                 │
│  ✅  Existing AES-256-GCM credential encryption unchanged            │
│  ✅  Existing OAuth flow (Application Passwords) unchanged           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Summary

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `wordpress-plugin/scai-renderer/scai-renderer.php` | Main plugin file |
| 2 | `wordpress-plugin/scai-renderer/block.json` | Gutenberg block metadata |
| 3 | `wordpress-plugin/scai-renderer/includes/class-scai-rest.php` | REST API endpoints |
| 4 | `wordpress-plugin/scai-renderer/includes/class-scai-admin.php` | Admin panel (4 tabs: Dashboard, Articles, Styling, Settings) |
| 5 | `wordpress-plugin/scai-renderer/includes/class-scai-ajax.php` | AJAX handlers for admin forms |
| 6 | `wordpress-plugin/scai-renderer/assets/scai-article.css` | Scoped article CSS |
| 7 | `wordpress-plugin/scai-renderer/assets/scai-admin.css` | Dark-themed admin panel styles |
| 8 | `wordpress-plugin/scai-renderer/assets/scai-admin.js` | Admin JS (tabs, AJAX, UI) |
| 9 | `wordpress-plugin/scai-renderer/readme.txt` | Plugin readme |
| 7 | `lib/services/wordpress/plugin-service.ts` | Plugin install/verify logic |
| 8 | `app/api/wordpress/plugin/route.ts` | Plugin management API |
| 9 | `app/api/wordpress/plugin-callback/route.ts` | Manual install callback |
| 10 | `drizzle/XXXX_add_plugin_status.sql` | DB migration |

### Modified Files

| # | File | Change |
|---|------|--------|
| 1 | `lib/db/schema.ts` | Add pluginStatus, installMethod, pluginVersion columns |
| 2 | `lib/services/wordpress/export-service.ts` | Gutenberg block wrapping logic |
| 3 | `lib/services/wordpress/connection-service.ts` | Auto-check plugin after OAuth |
| 4 | `components/wordpress/WordPressSettings.tsx` | Plugin status UI + install buttons |
| 5 | `components/wordpress/WordPressExportDialog.tsx` | Plugin status warning |
| 6 | `lib/hooks/queries.ts` | New plugin management hooks |

---

## Current vs New: Side-by-Side

```
╔══════════════════════╦═══════════════════════╦═══════════════════════════╗
║ Aspect               ║ Current               ║ With Plugin               ║
╠══════════════════════╬═══════════════════════╬═══════════════════════════╣
║ Auth method          ║ Application Passwords ║ Same (unchanged)          ║
║ Plugin needed?       ║ No                    ║ Yes (with fallback)       ║
║ Export format        ║ Raw HTML + <style>    ║ Gutenberg block + wrapper ║
║ CSS delivery         ║ In post content       ║ Plugin CSS file           ║
║ CSS isolation        ║ None                  ║ .scai-wrapper scoping     ║
║ Theme interference   ║ Total (0% control)    ║ Minimal (~95% control)    ║
║ Hover/pseudo styles  ║ Lost                  ║ Preserved                 ║
║ Responsive design    ║ Lost                  ║ Preserved                 ║
║ Variation rendering  ║ Broken                ║ Correct                   ║
║ WP.com free support  ║ Yes (broken styling)  ║ Yes (same broken styling) ║
║ Connection flow      ║ OAuth only            ║ OAuth + plugin install    ║
║ Image handling       ║ R2 → WP media library ║ Same (unchanged)          ║
║ Bulk export          ║ Sequential            ║ Same (unchanged)          ║
║ Content ownership    ║ In WordPress          ║ Same (in WordPress)       ║
║ Runtime dependency   ║ None                  ║ None (self-contained)     ║
╚══════════════════════╩═══════════════════════╩═══════════════════════════╝
```
