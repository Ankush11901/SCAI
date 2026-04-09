=== SEO Content AI ===
Contributors: scai
Tags: article, seo, content, styling, gutenberg
Requires at least: 5.9
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.9.8
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connects your WordPress site to SEO Content AI — imports articles with consistent styling, custom design variations, and full theme isolation.

== Description ==

SCAI Connector ensures that articles exported from the SEO Content AI app look exactly the same on your WordPress site, regardless of which theme you use.

**How it works:**

1. The plugin registers a custom Gutenberg block (`SCAI Article`).
2. When you export articles from the app, they are wrapped in this block.
3. The plugin provides scoped CSS that overrides theme interference, so your articles render with the exact fonts, spacing, colors, and layout they were designed with.

**Features:**

* Consistent article rendering across all WordPress themes
* Supports all 18 design variations and 6 color themes
* Scoped CSS prevents theme style conflicts
* REST API endpoints for automated plugin setup
* Zero configuration required after activation
* Lightweight — CSS only loads on pages that contain SCAI articles

== Installation ==

= Automatic Installation (from the app) =

1. Connect your WordPress site in the app settings.
2. The app will attempt to install and activate this plugin automatically.
3. No further action needed.

= Manual Installation =

1. Download the `seo-content-ai.zip` file from the app.
2. In your WordPress admin, go to **Plugins > Add New > Upload Plugin**.
3. Upload the zip file and click **Install Now**.
4. Click **Activate Plugin**.
5. Go to **SCAI Connector** in the admin sidebar to configure settings.

== Frequently Asked Questions ==

= Do I need this plugin to export articles? =

No. Articles can be exported without the plugin, but your WordPress theme may change the article's fonts, spacing, and colors. The plugin ensures consistent styling.

= What happens if I deactivate the plugin? =

Your exported articles will still be readable, but they will be styled by your WordPress theme instead of the plugin's scoped CSS. No content is lost.

= Does this plugin slow down my site? =

No. The plugin's CSS file only loads on pages that contain an SCAI article block. It does not load on other pages.

= Is the plugin compatible with my theme? =

Yes. The plugin uses scoped CSS selectors that work independently of your theme's styles.

== Changelog ==

= 1.5.0 =
* Clean article pages — only header, article content, and footer render.
* Custom PHP template for classic themes eliminates sidebar, comments, meta, and other theme chrome.
* Disable comments on SCAI article pages via WordPress filters.
* Suppress theme-rendered featured image (SCAI articles have their own).
* Hide social share buttons injected by popular sharing plugins.
* Enhanced CSS fallback for Full Site Editing (FSE) block themes.
* New helper function for clean layout detection.

= 1.4.0 =
* Article editor with section-level editing, undo/redo, and live preview.
* Styling settings — custom fonts, colors, and design variations from the admin panel.
* Full-width layout toggle with theme-specific sidebar and post meta hiding.
* Bulk article actions (publish, draft, trash).

= 1.0.0 =
* Initial release.
* Gutenberg block registration.
* Scoped CSS for all 18 design variations and 6 color themes.
* REST API endpoints for health check and handshake.
* Admin settings page.
