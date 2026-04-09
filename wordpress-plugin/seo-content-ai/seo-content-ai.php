<?php
/**
 * Plugin Name: SEO Content AI
 * Plugin URI:  https://seocontentai.com
 * Description: Connects your WordPress site to SEO Content AI — imports articles with consistent styling, custom design variations, and full theme isolation.
 * Version:     1.9.8
 * Author:      SEO Content AI
 * Author URI:  https://seocontent.ai
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: seo-content-ai
 * Domain Path: /languages
 * Requires at least: 5.9
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SCAI_RENDERER_VERSION', '1.9.2' );
define( 'SCAI_RENDERER_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'SCAI_RENDERER_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/* ─── Includes ─────────────────────────────────────────────────────── */

require_once SCAI_RENDERER_PLUGIN_DIR . 'includes/class-scai-rest.php';
require_once SCAI_RENDERER_PLUGIN_DIR . 'includes/class-scai-admin.php';
require_once SCAI_RENDERER_PLUGIN_DIR . 'includes/class-scai-ajax.php';
require_once SCAI_RENDERER_PLUGIN_DIR . 'includes/class-scai-editor.php';
require_once SCAI_RENDERER_PLUGIN_DIR . 'includes/class-scai-editor-ajax.php';
require_once SCAI_RENDERER_PLUGIN_DIR . 'includes/class-scai-templates.php';

/* ─── Activation / Deactivation ───────────────────────────────────── */

register_activation_hook( __FILE__, 'scai_renderer_activate' );
register_deactivation_hook( __FILE__, 'scai_renderer_deactivate' );

function scai_renderer_activate() {
	update_option( 'scai_plugin_version', SCAI_RENDERER_VERSION );
}

function scai_renderer_deactivate() {
	// Clean up transients created by handshake flow.
	global $wpdb;
	$wpdb->query(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_scai_handshake_%' OR option_name LIKE '_transient_timeout_scai_handshake_%'"
	);
}

/* ─── Register Gutenberg Block ────────────────────────────────────── */

add_action( 'init', 'scai_renderer_register_block' );

function scai_renderer_register_block() {
	register_block_type( SCAI_RENDERER_PLUGIN_DIR . 'block.json' );
}

/* ─── Helper: check if current page should use clean SCAI layout ── */

function scai_renderer_is_clean_layout( $post = null ) {
	if ( ! $post ) {
		$post = get_post();
	}

	if ( ! $post || ! has_block( 'scai/article', $post ) ) {
		return false;
	}

	$settings   = get_option( SCAI_Admin::OPTION_SETTINGS, array() );
	$full_width = isset( $settings['full_width_layout'] ) ? $settings['full_width_layout'] : 'on';

	return $full_width === 'on';
}

/* ─── Enqueue Frontend CSS + Inline Style Overrides ──────────────── */

add_action( 'wp_enqueue_scripts', 'scai_renderer_enqueue_styles' );

function scai_renderer_enqueue_styles() {
	if ( ! is_singular() ) {
		return;
	}

	$post = get_post();
	if ( ! $post || ! has_block( 'scai/article', $post ) ) {
		return;
	}

	wp_enqueue_style(
		'scai-article',
		SCAI_RENDERER_PLUGIN_URL . 'assets/scai-article.css',
		array(),
		SCAI_RENDERER_VERSION
	);

	// Inject saved styling overrides as CSS custom properties.
	$styling = get_option( SCAI_Admin::OPTION_STYLE, array() );
	$css = '';

	$overrides = array();
	if ( ! empty( $styling['text_color'] ) )    $overrides[] = '--scai-text-color: '    . esc_attr( $styling['text_color'] );
	if ( ! empty( $styling['heading_color'] ) )  $overrides[] = '--scai-heading-color: ' . esc_attr( $styling['heading_color'] );
	if ( ! empty( $styling['bg_color'] ) )       $overrides[] = '--scai-bg-color: '      . esc_attr( $styling['bg_color'] );
	if ( ! empty( $styling['link_color'] ) )     $overrides[] = '--scai-link-color: '    . esc_attr( $styling['link_color'] );
	if ( ! empty( $styling['heading_font'] ) )   $overrides[] = '--scai-heading-font: "' . esc_attr( $styling['heading_font'] ) . '", sans-serif';
	if ( ! empty( $styling['body_font'] ) )      $overrides[] = '--scai-body-font: "'    . esc_attr( $styling['body_font'] ) . '", serif';

	if ( ! empty( $overrides ) ) {
		$css = '.scai-wrapper { ' . implode( '; ', $overrides ) . '; }';
		wp_add_inline_style( 'scai-article', $css );
	}

	// Enqueue Google Fonts if custom fonts are set.
	$fonts_to_load = array();
	if ( ! empty( $styling['heading_font'] ) && $styling['heading_font'] !== 'Georgia' ) {
		$fonts_to_load[] = $styling['heading_font'];
	}
	if ( ! empty( $styling['body_font'] ) && $styling['body_font'] !== 'Georgia' ) {
		$fonts_to_load[] = $styling['body_font'];
	}
	$fonts_to_load = array_unique( $fonts_to_load );

	if ( ! empty( $fonts_to_load ) ) {
		$families = array_map( function ( $f ) {
			return str_replace( ' ', '+', $f ) . ':wght@400;500;600;700';
		}, $fonts_to_load );
		$url = 'https://fonts.googleapis.com/css2?family=' . implode( '&family=', $families ) . '&display=swap';
		wp_enqueue_style( 'scai-google-fonts', $url, array(), null );
	}
}

/* ─── Add body class for full-width SCAI article pages ───────────── */

add_filter( 'body_class', 'scai_renderer_body_class' );

function scai_renderer_body_class( $classes ) {
	if ( ! is_singular() ) {
		return $classes;
	}

	if ( ! scai_renderer_is_clean_layout() ) {
		return $classes;
	}

	$classes[] = 'scai-article-page';

	// Indicate whether the clean template is active (classic theme)
	// or we're using CSS-only fallback (FSE theme).
	$is_block_theme = function_exists( 'wp_is_block_theme' ) && wp_is_block_theme();
	if ( ! $is_block_theme ) {
		$classes[] = 'scai-template-active';
	} else {
		$classes[] = 'scai-fse-fallback';
	}

	return $classes;
}

/* ─── Custom template for classic themes (header + content + footer) ── */

add_filter( 'template_include', 'scai_renderer_template_include', 99 );

function scai_renderer_template_include( $template ) {
	if ( ! is_singular() ) {
		return $template;
	}

	if ( ! scai_renderer_is_clean_layout() ) {
		return $template;
	}

	// FSE / block themes use a different rendering pipeline —
	// get_header() / get_footer() do not produce visual output there.
	// Fall back to CSS-only approach for those themes.
	if ( function_exists( 'wp_is_block_theme' ) && wp_is_block_theme() ) {
		return $template;
	}

	$custom = SCAI_RENDERER_PLUGIN_DIR . 'templates/single-scai.php';

	if ( file_exists( $custom ) ) {
		return $custom;
	}

	return $template;
}

/* ─── Disable comments on SCAI article pages ─────────────────────── */

add_filter( 'comments_open', 'scai_renderer_disable_comments', 20, 2 );
add_filter( 'pings_open',    'scai_renderer_disable_comments', 20, 2 );

function scai_renderer_disable_comments( $open, $post_id ) {
	$post = get_post( $post_id );
	if ( scai_renderer_is_clean_layout( $post ) ) {
		return false;
	}
	return $open;
}

// Hide the comments template output entirely (belt-and-suspenders for themes
// that call comments_template() without checking comments_open()).
add_filter( 'comments_template', 'scai_renderer_blank_comments_template', 20 );

function scai_renderer_blank_comments_template( $template ) {
	if ( ! is_singular() ) {
		return $template;
	}

	if ( ! scai_renderer_is_clean_layout() ) {
		return $template;
	}

	$blank = SCAI_RENDERER_PLUGIN_DIR . 'templates/blank-comments.php';
	if ( file_exists( $blank ) ) {
		return $blank;
	}

	return $template;
}

/* ─── Hide theme-rendered featured image on SCAI posts ───────────── */

add_filter( 'post_thumbnail_html', 'scai_renderer_hide_featured_image', 20, 5 );

function scai_renderer_hide_featured_image( $html, $post_id, $post_thumbnail_id, $size, $attr ) {
	// Only on frontend singular views (not admin, not REST).
	if ( is_admin() || ! is_singular() ) {
		return $html;
	}

	$post = get_post( $post_id );
	if ( scai_renderer_is_clean_layout( $post ) ) {
		return '';
	}

	return $html;
}

/* ─── Enqueue Admin CSS + JS ──────────────────────────────────────── */

add_action( 'admin_enqueue_scripts', 'scai_renderer_enqueue_admin' );

function scai_renderer_enqueue_admin( $hook ) {
	// Detect our pages by the ?page= query param (reliable regardless of hook names).
	$page = isset( $_GET['page'] ) ? sanitize_text_field( $_GET['page'] ) : '';
	$our_slugs = array( 'scai-connector', 'scai-connector-articles', 'scai-connector-styling', 'scai-connector-settings', 'scai-editor' );

	if ( ! in_array( $page, $our_slugs, true ) ) {
		return;
	}

	// Load Inter font
	wp_enqueue_style(
		'scai-admin-font',
		'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
		array(),
		null
	);

	wp_enqueue_style(
		'scai-admin',
		SCAI_RENDERER_PLUGIN_URL . 'assets/scai-admin.css',
		array( 'scai-admin-font' ),
		SCAI_RENDERER_VERSION
	);

	wp_enqueue_script(
		'scai-admin',
		SCAI_RENDERER_PLUGIN_URL . 'assets/scai-admin.js',
		array(),
		SCAI_RENDERER_VERSION,
		true
	);

	wp_localize_script( 'scai-admin', 'scaiAdmin', array(
		'ajaxUrl' => admin_url( 'admin-ajax.php' ),
		'nonce'   => wp_create_nonce( 'scai_admin_nonce' ),
	) );

	// Editor-specific assets.
	if ( $page === 'scai-editor' ) {
		wp_enqueue_media();

		// Load article stylesheet so WYSIWYG preview renders product cards, FAQ, etc.
		wp_enqueue_style(
			'scai-article',
			SCAI_RENDERER_PLUGIN_URL . 'assets/scai-article.css',
			array(),
			SCAI_RENDERER_VERSION
		);

		wp_enqueue_style(
			'scai-editor',
			SCAI_RENDERER_PLUGIN_URL . 'assets/scai-editor.css',
			array( 'scai-admin', 'scai-article' ),
			SCAI_RENDERER_VERSION
		);

		wp_enqueue_script(
			'scai-editor',
			SCAI_RENDERER_PLUGIN_URL . 'assets/scai-editor.js',
			array(),
			SCAI_RENDERER_VERSION,
			true
		);

		$post_id = isset( $_GET['post_id'] ) ? absint( $_GET['post_id'] ) : 0;

		// Extract article metadata for JS.
		$article_type = '';
		$variation    = '';
		$post_obj     = $post_id ? get_post( $post_id ) : null;
		if ( $post_obj && $post_obj->post_content ) {
			$article_type = SCAI_Editor::extract_article_meta( $post_obj->post_content, 'data-article-type' );
			$variation    = SCAI_Editor::extract_article_meta( $post_obj->post_content, 'data-variation' );
		}

		$components_for_type = SCAI_Editor::get_components_for_type( $article_type );
		$skeletons           = SCAI_Templates::get_all_skeletons( $variation );

		wp_localize_script( 'scai-editor', 'scaiEditor', array(
			'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
			'nonce'       => wp_create_nonce( 'scai_save_editor' ),
			'postId'      => $post_id,
			'articleType' => $article_type,
			'variation'   => $variation,
			'components'  => $components_for_type,
			'skeletons'   => $skeletons,
		) );
	}
}

/* ─── Admin body classes for SCAI pages ───────────────────────────── */

add_filter( 'admin_body_class', 'scai_admin_body_class' );

function scai_admin_body_class( $classes ) {
	$page = isset( $_GET['page'] ) ? sanitize_text_field( $_GET['page'] ) : '';
	$our_slugs = array( 'scai-connector', 'scai-connector-articles', 'scai-connector-styling', 'scai-connector-settings', 'scai-editor' );

	if ( in_array( $page, $our_slugs, true ) ) {
		$classes .= ' scai-page-active';
	}
	if ( $page === 'scai-editor' ) {
		$classes .= ' scai-editor-active';
	}
	return $classes;
}

/* ─── "Edit with SCAI" buttons — admin bar, edit screen ──────────── */

add_action( 'edit_form_after_title', 'scai_renderer_edit_button_classic' );
add_action( 'enqueue_block_editor_assets', 'scai_renderer_edit_button_gutenberg' );
add_action( 'admin_bar_menu', 'scai_renderer_admin_bar_button', 90 );

// Admin bar: "Edit with SCAI" button on frontend and admin when viewing an SCAI post.
function scai_renderer_admin_bar_button( $wp_admin_bar ) {
	if ( ! is_singular() || ! is_admin_bar_showing() ) {
		return;
	}

	$post = get_post();
	if ( ! $post || ! has_block( 'scai/article', $post ) ) {
		return;
	}

	$edit_url = admin_url( 'admin.php?page=scai-editor&post_id=' . $post->ID );

	$wp_admin_bar->add_node( array(
		'id'    => 'scai-edit-button',
		'title' => '<span style="display:inline-flex;align-items:center;gap:5px;">'
			. '<svg viewBox="0 0 24 24" fill="none" stroke="#40EDC3" stroke-width="2" width="16" height="16"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'
			. 'Edit with SCAI</span>',
		'href'  => $edit_url,
		'meta'  => array(
			'title' => 'Edit this article with SEO Content AI',
		),
	) );
}

add_action( 'wp_head', 'scai_renderer_admin_bar_style' );
add_action( 'admin_head', 'scai_renderer_admin_bar_style' );

function scai_renderer_admin_bar_style() {
	if ( ! is_admin_bar_showing() ) {
		return;
	}
	?>
	<style>
		#wp-admin-bar-scai-edit-button > a {
			background: #0A0A0A !important;
			color: #40EDC3 !important;
			font-weight: 600 !important;
		}
		#wp-admin-bar-scai-edit-button > a:hover {
			background: #1a1a1a !important;
			color: #7FFBA9 !important;
		}
	</style>
	<?php
}

// Classic editor: renders button directly after the title.
function scai_renderer_edit_button_classic( $post ) {
	if ( ! $post || ! has_block( 'scai/article', $post ) ) {
		return;
	}

	$edit_url = admin_url( 'admin.php?page=scai-editor&post_id=' . $post->ID );
	?>
	<div id="scai-edit-button-wrap" style="margin:12px 0 0;">
		<a href="<?php echo esc_url( $edit_url ); ?>" class="button button-primary button-hero" style="display:inline-flex;align-items:center;gap:8px;background:#0A0A0A;border-color:#0A0A0A;color:#40EDC3;font-weight:600;">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
			<?php esc_html_e( 'Edit with SEO Content AI', 'seo-content-ai' ); ?>
		</a>
	</div>
	<?php
}

// Gutenberg / block editor: inject button via inline JS into the header toolbar.
function scai_renderer_edit_button_gutenberg() {
	$screen = get_current_screen();
	if ( ! $screen || $screen->base !== 'post' ) {
		return;
	}

	$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
	if ( ! $post_id ) {
		return;
	}

	$post = get_post( $post_id );
	if ( ! $post || ! has_block( 'scai/article', $post ) ) {
		return;
	}

	$edit_url = admin_url( 'admin.php?page=scai-editor&post_id=' . $post_id );

	wp_add_inline_script( 'wp-blocks', '
		( function() {
			var attempts = 0;
			var timer = setInterval( function() {
				attempts++;
				if ( attempts > 30 ) { clearInterval( timer ); return; }
				var toolbar = document.querySelector( ".edit-post-header__toolbar" )
					|| document.querySelector( ".editor-header__toolbar" );
				if ( ! toolbar || document.getElementById( "scai-gutenberg-edit-btn" ) ) return;
				clearInterval( timer );
				var btn = document.createElement( "a" );
				btn.id = "scai-gutenberg-edit-btn";
				btn.href = ' . wp_json_encode( $edit_url ) . ';
				btn.className = "components-button is-primary";
				btn.style.cssText = "display:inline-flex;align-items:center;gap:6px;margin-left:12px;background:#0A0A0A;border-color:#0A0A0A;color:#40EDC3;font-weight:600;height:32px;padding:0 12px;border-radius:4px;text-decoration:none;";
				btn.innerHTML = \'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Edit with SCAI\';
				toolbar.appendChild( btn );
			}, 500 );
		} )();
	' );
}

/* ─── Initialise REST + Admin + AJAX ─────────────────────────────── */

add_action( 'rest_api_init', array( 'SCAI_REST', 'register_routes' ) );
add_action( 'admin_menu',    array( 'SCAI_Admin', 'register_menu' ) );

SCAI_Ajax::register();
SCAI_Editor_Ajax::register();
