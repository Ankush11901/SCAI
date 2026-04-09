<?php
/**
 * SCAI Connector — Section-Level Article Editor.
 *
 * Parses article HTML by data-component attributes,
 * renders structured form fields, and rebuilds HTML on save.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class SCAI_Editor {

	/**
	 * Full component registry with label, icon, and description.
	 */
	private static $component_registry = array(
		'scai-section'              => array( 'label' => 'Content Section',  'icon' => 'section',     'desc' => 'Heading + paragraphs' ),
		'scai-faq-section'          => array( 'label' => 'FAQ',             'icon' => 'faq',         'desc' => 'Questions & answers' ),
		'scai-closing'              => array( 'label' => 'Closing',         'icon' => 'closing',     'desc' => 'Final section' ),
		'scai-product-card'         => array( 'label' => 'Product Card',    'icon' => 'product',     'desc' => 'Product showcase' ),
		'scai-feature-section'      => array( 'label' => 'Features',        'icon' => 'features',    'desc' => 'Feature bullet list' ),
		'scai-cta-box'              => array( 'label' => 'Call to Action',   'icon' => 'cta',         'desc' => 'CTA with button' ),
		'scai-comparison-table'     => array( 'label' => 'Comparison Table', 'icon' => 'comparison',  'desc' => 'Side-by-side comparison' ),
		'scai-quick-verdict'        => array( 'label' => 'Quick Verdict',    'icon' => 'verdict',     'desc' => 'Verdict options' ),
		'scai-requirements-box'     => array( 'label' => 'Requirements',     'icon' => 'requirements','desc' => 'What you need' ),
		'scai-pro-tips-section'     => array( 'label' => 'Pro Tips',         'icon' => 'tips',        'desc' => 'Expert tips list' ),
		'scai-key-takeaways'        => array( 'label' => 'Key Takeaways',    'icon' => 'takeaways',   'desc' => 'Summary bullet points' ),
		'scai-quick-facts-section'  => array( 'label' => 'Quick Facts',      'icon' => 'facts',       'desc' => 'At-a-glance facts' ),
		'scai-honorable-mentions'   => array( 'label' => 'Honorable Mentions','icon' => 'mentions',   'desc' => 'Runner-up highlights' ),
		'scai-service-info-box'     => array( 'label' => 'Service Info',     'icon' => 'info',        'desc' => 'Key/value info rows' ),
		'scai-why-local-section'    => array( 'label' => 'Why Local',        'icon' => 'local',       'desc' => 'Local benefits list' ),
		'scai-ingredients-section'  => array( 'label' => 'Ingredients',      'icon' => 'ingredients', 'desc' => 'Ingredient list' ),
		'scai-instructions-section' => array( 'label' => 'Instructions',     'icon' => 'instructions','desc' => 'Step-by-step guide' ),
		'scai-nutrition-section'    => array( 'label' => 'Nutrition Facts',  'icon' => 'nutrition',   'desc' => 'Nutrient table' ),
		'scai-pros-cons-section'    => array( 'label' => 'Pros & Cons',      'icon' => 'proscons',    'desc' => 'Advantages & limitations' ),
		'scai-rating-section'       => array( 'label' => 'Rating',           'icon' => 'rating',      'desc' => 'Score + summary' ),
	);

	/**
	 * Get the list of addable component types for an article type.
	 *
	 * @param string $article_type The article type (e.g. 'affiliate', 'local').
	 * @return array Ordered list of component type slugs.
	 */
	public static function get_components_for_type( $article_type ) {
		$universal = array( 'scai-section', 'scai-faq-section', 'scai-closing' );
		$type_map  = array(
			'affiliate'     => array( 'scai-product-card' ),
			'commercial'    => array( 'scai-feature-section', 'scai-cta-box' ),
			'comparison'    => array( 'scai-comparison-table', 'scai-quick-verdict' ),
			'how-to'        => array( 'scai-requirements-box', 'scai-pro-tips-section' ),
			'informational' => array( 'scai-key-takeaways', 'scai-quick-facts-section' ),
			'listicle'      => array( 'scai-honorable-mentions' ),
			'local'         => array( 'scai-why-local-section', 'scai-service-info-box' ),
			'recipe'        => array( 'scai-ingredients-section', 'scai-instructions-section', 'scai-nutrition-section' ),
			'review'        => array( 'scai-feature-section', 'scai-pros-cons-section', 'scai-rating-section' ),
		);
		$specific = isset( $type_map[ $article_type ] ) ? $type_map[ $article_type ] : array();
		return array_merge( $universal, $specific );
	}

	public static function render_editor( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post || strpos( $post->post_content, 'wp:scai/article' ) === false ) {
			echo '<div class="wrap scai-wrap"><div class="scai-panel"><div class="scai-panel-content">';
			echo '<p style="color:#a3a3a3;padding:40px 24px;">Article not found or not an SCAI article.</p>';
			echo '<a href="' . esc_url( admin_url( 'admin.php?page=scai-connector-articles' ) ) . '" class="scai-btn scai-btn-secondary">&larr; Back to Articles</a>';
			echo '</div></div></div>';
			return;
		}

		$components = self::parse_article( $post->post_content );
		$article_type = self::extract_article_meta( $post->post_content, 'data-article-type' );
		$variation = self::extract_article_meta( $post->post_content, 'data-variation' );
		$word_count = str_word_count( wp_strip_all_tags( $post->post_content ) );
		$comp_count = count( $components );

		?>
		<div class="wrap scai-wrap scai-editor-wrap">

			<!-- ═══ FIXED TOP BAR ═══ -->
			<div class="sce-topbar">
				<div class="sce-topbar-left">
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=scai-connector-articles' ) ); ?>" class="sce-topbar-back" title="Back to Articles" aria-label="Back to Articles">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="15 18 9 12 15 6"/></svg>
					</a>
					<div class="sce-topbar-divider"></div>
					<div class="sce-topbar-title">
						<span class="sce-topbar-label">Editing</span>
						<span class="sce-topbar-name"><?php echo esc_html( wp_trim_words( $post->post_title, 8, '...' ) ); ?></span>
					</div>
				</div>
				<div class="sce-topbar-center">
					<div class="sce-topbar-unsaved" id="scai-unsaved-bar" style="display:none;">
						<span class="sce-unsaved-dot"></span>
						Unsaved changes
					</div>
				</div>
				<div class="sce-topbar-right">
					<div class="sce-history-btns">
						<button type="button" class="sce-btn-undo" id="sce-undo" disabled aria-label="Undo" title="Undo (Ctrl+Z)">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
						</button>
						<button type="button" class="sce-btn-redo" id="sce-redo" disabled aria-label="Redo" title="Redo (Ctrl+Y)">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
						</button>
					</div>
					<div class="sce-topbar-meta">
						<?php if ( $article_type ) : ?>
							<span class="scai-badge scai-badge-<?php echo esc_attr( $article_type ); ?>"><?php echo esc_html( ucfirst( $article_type ) ); ?></span>
						<?php endif; ?>
						<span class="scai-badge scai-badge-<?php echo esc_attr( $post->post_status === 'publish' ? 'published' : 'draft' ); ?>">
							<?php echo esc_html( $post->post_status === 'publish' ? 'Published' : 'Draft' ); ?>
						</span>
					</div>
					<button type="button" class="sce-btn-save" id="scai-save-editor">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
						Save
					</button>
				</div>
			</div>

			<!-- ═══ MAIN LAYOUT ═══ -->
			<div class="sce-layout">

				<!-- ═══ LEFT SIDEBAR — Browse / Edit Modes ═══ -->
				<aside class="sce-sidebar" id="sce-sidebar" role="complementary">

					<!-- BROWSE MODE (default) — add components + stats -->
					<div class="sce-sidebar-browse" id="sce-sidebar-browse">
						<div class="sce-sidebar-header">
							<h3 class="sce-sidebar-title">Components</h3>
							<button type="button" class="sce-sidebar-toggle" id="sce-sidebar-toggle" title="Toggle sidebar" aria-label="Toggle sidebar">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
							</button>
						</div>
						<p class="sce-sidebar-hint">Click or drag to add a section</p>
						<div class="sce-sidebar-components">
							<?php
							$addable_types = self::get_components_for_type( $article_type );
							foreach ( $addable_types as $comp_type ) :
								$meta = isset( self::$component_registry[ $comp_type ] ) ? self::$component_registry[ $comp_type ] : null;
								if ( ! $meta ) continue;
							?>
								<button type="button" class="sce-component-btn" data-add-component="<?php echo esc_attr( $comp_type ); ?>" draggable="true">
									<span class="sce-component-icon"><?php echo self::get_component_svg( $meta['icon'] ); ?></span>
									<span class="sce-component-info">
										<span class="sce-component-name"><?php echo esc_html( $meta['label'] ); ?></span>
										<span class="sce-component-desc"><?php echo esc_html( $meta['desc'] ); ?></span>
									</span>
								</button>
							<?php endforeach; ?>
						</div>
						<div class="sce-sidebar-stats">
							<div class="sce-stat-row"><span>Sections</span><span class="sce-stat-val" id="sce-stat-sections"><?php echo esc_html( $comp_count ); ?></span></div>
							<div class="sce-stat-row"><span>Words</span><span class="sce-stat-val"><?php echo esc_html( number_format( $word_count ) ); ?></span></div>
						</div>
					</div>

					<!-- EDIT MODE — form fields for selected card -->
					<div class="sce-sidebar-edit" id="sce-sidebar-edit" style="display:none;">
						<div class="sce-sidebar-header">
							<button type="button" class="sce-sidebar-back" id="sce-sidebar-back" title="Back to components" aria-label="Back to components">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
							</button>
							<h3 class="sce-sidebar-title" id="sce-sidebar-edit-title">Editing</h3>
							<button type="button" class="sce-sidebar-toggle" id="sce-sidebar-toggle-edit" title="Toggle sidebar" aria-label="Toggle sidebar">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
							</button>
						</div>
						<div class="sce-sidebar-edit-fields" id="sce-sidebar-edit-fields">
							<!-- form fields moved here by JS when a card is selected -->
						</div>
					</div>

				</aside>

				<!-- Floating expand button (visible only when sidebar is collapsed) -->
				<button type="button" class="sce-sidebar-expand" id="sce-sidebar-expand" style="display:none;" title="Show sidebar" aria-label="Show sidebar">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
				</button>

				<!-- ═══ CENTER — Editor Canvas ═══ -->
				<main class="sce-canvas" role="main">
					<form id="scai-editor-form" data-post-id="<?php echo esc_attr( $post_id ); ?>">
						<?php wp_nonce_field( 'scai_save_editor', 'scai_editor_nonce' ); ?>

						<div class="scai-editor-blocks scai-wrapper" id="scai-editor-blocks">
							<?php
							foreach ( $components as $index => $comp ) {
								self::render_component_block( $comp, $index );
							}
							?>
						</div>
					</form>
				</main>

			</div><!-- .sce-layout -->

			<!-- ═══ DELETE CONFIRMATION MODAL ═══ -->
			<div class="sce-modal-overlay" id="sce-delete-modal" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="sce-delete-title">
				<div class="sce-modal">
					<div class="sce-modal-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
					</div>
					<h3 class="sce-modal-title" id="sce-delete-title">Delete Section</h3>
					<p class="sce-modal-text">This section will be permanently removed when you save. This cannot be undone.</p>
					<div class="sce-modal-actions">
						<button type="button" class="sce-modal-btn sce-modal-cancel">Cancel</button>
						<button type="button" class="sce-modal-btn sce-modal-confirm">Delete</button>
					</div>
				</div>
			</div>

			<!-- ═══ ARIA LIVE REGION ═══ -->
			<div class="sce-live-region" id="sce-live-region" aria-live="polite" aria-atomic="true"></div>

		</div><!-- .scai-editor-wrap -->
		<?php
	}

	/* ─── HTML Parser ─────────────────────────────────────────────── */

	/**
	 * Parse article HTML into an ordered array of component descriptors.
	 */
	public static function parse_article( $post_content ) {
		// Extract the HTML from the Gutenberg block comment.
		$html = self::extract_block_html( $post_content );
		if ( ! $html ) {
			return array();
		}

		// Parse with DOMDocument.
		$doc = new DOMDocument();
		libxml_use_internal_errors( true );
		$doc->loadHTML( '<?xml encoding="UTF-8">' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );
		libxml_clear_errors();

		$components = array();
		$index = 0;

		// Find the wrapper element.
		// Export wraps in <div class="wp-block-scai-article scai-wrapper">.
		// Fallback to <article> for raw HTML (e.g. standalone previews).
		$wrapper = null;
		$xpath = new DOMXPath( $doc );

		// Try the Gutenberg wrapper div first.
		$wrappers = $xpath->query( '//div[contains(@class,"wp-block-scai-article")]' );
		if ( $wrappers->length > 0 ) {
			$wrapper = $wrappers->item( 0 );
		}

		// Fallback: try <article> tag.
		if ( ! $wrapper ) {
			$articles = $doc->getElementsByTagName( 'article' );
			if ( $articles->length > 0 ) {
				$wrapper = $articles->item( 0 );
			}
		}

		// Last resort: walk from the document root.
		if ( ! $wrapper ) {
			$wrapper = $doc->documentElement ?: $doc;
		}

		// Walk children for data-component.
		self::walk_for_components( $wrapper, $doc, $components, $index );

		return $components;
	}

	/**
	 * Walk DOM tree to find elements with data-component attribute.
	 */
	private static function walk_for_components( $parent, $doc, &$components, &$index ) {
		foreach ( $parent->childNodes as $node ) {
			if ( $node->nodeType !== XML_ELEMENT_NODE ) {
				continue;
			}

			$comp_type = $node->getAttribute( 'data-component' );

			if ( $comp_type ) {
				$content = self::extract_component_content( $comp_type, $node, $doc );
				$components[] = array(
					'type'       => $comp_type,
					'index'      => $index,
					'content'    => $content,
					'outer_html' => self::get_outer_html( $node, $doc ),
				);
				$index++;
			} else {
				// Check children (e.g. wrapper divs with class="scai-component").
				self::walk_for_components( $node, $doc, $components, $index );
			}
		}
	}

	/**
	 * Extract structured content from a component node based on its type.
	 */
	private static function extract_component_content( $type, $node, $doc ) {
		switch ( $type ) {
			case 'scai-h1':
				return self::extract_h1( $node, $doc );
			case 'scai-featured-image':
				return self::extract_featured_image( $node, $doc );
			case 'scai-overview':
				return self::extract_overview( $node, $doc );
			case 'scai-table-of-contents':
				return array( 'auto' => true );
			case 'scai-section':
				return self::extract_section( $node, $doc );
			case 'scai-faq-section':
				return self::extract_faq( $node, $doc );
			case 'scai-product-card':
				return self::extract_product_card( $node, $doc );
			case 'scai-service-info-box':
				return self::extract_service_info( $node, $doc );
			case 'scai-why-local-section':
				return self::extract_why_local( $node, $doc );
			case 'scai-closing':
				return self::extract_closing( $node, $doc );
			case 'scai-feature-section':
				return self::extract_heading_list( $node, $doc, 'h2', 'li' );
			case 'scai-key-takeaways':
				return self::extract_heading_list( $node, $doc, '.scai-takeaways-title', 'li' );
			case 'scai-quick-facts-section':
				return self::extract_heading_list( $node, $doc, '.scai-facts-title', 'li' );
			case 'scai-requirements-box':
				return self::extract_heading_list( $node, $doc, 'h2', 'li' );
			case 'scai-pro-tips-section':
				return self::extract_heading_list( $node, $doc, 'h2', 'li' );
			case 'scai-ingredients-section':
				return self::extract_heading_list( $node, $doc, 'h2', 'li' );
			case 'scai-instructions-section':
				return self::extract_heading_list( $node, $doc, 'h2', 'li' );
			case 'scai-honorable-mentions':
				return self::extract_honorable_mentions( $node, $doc );
			case 'scai-comparison-table':
				return self::extract_comparison_table( $node, $doc );
			case 'scai-cta-box':
				return self::extract_cta_box( $node, $doc );
			case 'scai-quick-verdict':
				return self::extract_quick_verdict( $node, $doc );
			case 'scai-pros-cons-section':
				return self::extract_pros_cons( $node, $doc );
			case 'scai-rating-section':
				return self::extract_rating( $node, $doc );
			case 'scai-nutrition-section':
				return self::extract_nutrition( $node, $doc );
			default:
				return self::extract_generic( $node, $doc );
		}
	}

	/* ─── Component Extractors ────────────────────────────────────── */

	private static function extract_h1( $node, $doc ) {
		$h1 = $node->getElementsByTagName( 'h1' )->item( 0 );
		return array(
			'title' => $h1 ? $h1->textContent : '',
		);
	}

	private static function extract_featured_image( $node, $doc ) {
		$img = $node->getElementsByTagName( 'img' )->item( 0 );
		$figcaption = $node->getElementsByTagName( 'figcaption' )->item( 0 );
		return array(
			'src'     => $img ? $img->getAttribute( 'src' ) : '',
			'alt'     => $img ? $img->getAttribute( 'alt' ) : '',
			'caption' => $figcaption ? $figcaption->textContent : '',
		);
	}

	private static function extract_overview( $node, $doc ) {
		$paragraphs = array();
		$ps = $node->getElementsByTagName( 'p' );
		for ( $i = 0; $i < $ps->length; $i++ ) {
			$paragraphs[] = $ps->item( $i )->textContent;
		}
		return array( 'paragraphs' => $paragraphs );
	}

	private static function extract_section( $node, $doc ) {
		$h2 = $node->getElementsByTagName( 'h2' )->item( 0 );
		$heading = $h2 ? $h2->textContent : '';
		$section_id = $node->getAttribute( 'id' );

		// Get image if present.
		$image_src = '';
		$image_alt = '';
		$image_caption = '';
		$figures = $node->getElementsByTagName( 'figure' );
		if ( $figures->length > 0 ) {
			$fig = $figures->item( 0 );
			$img = $fig->getElementsByTagName( 'img' )->item( 0 );
			$figcap = $fig->getElementsByTagName( 'figcaption' )->item( 0 );
			if ( $img ) {
				$image_src = $img->getAttribute( 'src' );
				$image_alt = $img->getAttribute( 'alt' );
			}
			if ( $figcap ) {
				$image_caption = $figcap->textContent;
			}
		}

		// Get paragraphs.
		$paragraphs = array();
		$ps = $node->getElementsByTagName( 'p' );
		for ( $i = 0; $i < $ps->length; $i++ ) {
			$p = $ps->item( $i );
			// Skip figcaption paragraph contents.
			if ( $p->parentNode && $p->parentNode->nodeName === 'figcaption' ) {
				continue;
			}
			$text = $p->textContent;
			if ( ! empty( trim( $text ) ) ) {
				$paragraphs[] = $text;
			}
		}

		return array(
			'heading'       => $heading,
			'section_id'    => $section_id,
			'image_src'     => $image_src,
			'image_alt'     => $image_alt,
			'image_caption' => $image_caption,
			'paragraphs'    => $paragraphs,
		);
	}

	private static function extract_faq( $node, $doc ) {
		$h2 = $node->getElementsByTagName( 'h2' )->item( 0 );
		$title = $h2 ? $h2->textContent : 'Frequently Asked Questions';

		$items = array();
		$h3s = $node->getElementsByTagName( 'h3' );
		for ( $i = 0; $i < $h3s->length; $i++ ) {
			$q = $h3s->item( $i )->textContent;
			// The answer is the next sibling <p>.
			$a = '';
			$sibling = $h3s->item( $i )->nextSibling;
			while ( $sibling ) {
				if ( $sibling->nodeType === XML_ELEMENT_NODE && $sibling->nodeName === 'p' ) {
					$a = $sibling->textContent;
					break;
				}
				$sibling = $sibling->nextSibling;
			}
			$items[] = array( 'q' => $q, 'a' => $a );
		}

		return array( 'title' => $title, 'items' => $items );
	}

	private static function extract_product_card( $node, $doc ) {
		$name = '';
		$rating = '';
		$price = '';
		$description = '';
		$cta_text = '';
		$cta_url = '';
		$image_src = '';
		$badge = '';

		// Name.
		$xpath = new DOMXPath( $doc );
		$titles = $xpath->query( './/*[contains(@class,"scai-pc-title")]', $node );
		if ( $titles->length > 0 ) {
			$name = $titles->item( 0 )->textContent;
		}

		// Rating.
		$rating_nums = $xpath->query( './/*[contains(@class,"scai-pc-rating-num")]', $node );
		if ( $rating_nums->length > 0 ) {
			$rating = $rating_nums->item( 0 )->textContent;
		}

		// Price.
		$prices = $xpath->query( './/*[contains(@class,"scai-pc-price")]', $node );
		if ( $prices->length > 0 ) {
			$price = $prices->item( 0 )->textContent;
		}

		// Description.
		$descs = $xpath->query( './/*[contains(@class,"scai-pc-desc")]', $node );
		if ( $descs->length > 0 ) {
			$description = $descs->item( 0 )->textContent;
		}

		// CTA.
		$ctas = $xpath->query( './/*[contains(@class,"scai-pc-cta")]', $node );
		if ( $ctas->length > 0 ) {
			$cta_text = $ctas->item( 0 )->textContent;
			$cta_url = $ctas->item( 0 )->getAttribute( 'href' );
		}

		// Image.
		$imgs = $xpath->query( './/img', $node );
		if ( $imgs->length > 0 ) {
			$image_src = $imgs->item( 0 )->getAttribute( 'src' );
		}

		// Badge.
		$badges = $xpath->query( './/*[contains(@class,"scai-pc-badge")]', $node );
		if ( $badges->length > 0 ) {
			$badge = $badges->item( 0 )->textContent;
		}

		return array(
			'name'        => $name,
			'rating'      => $rating,
			'price'       => $price,
			'description' => $description,
			'cta_text'    => $cta_text,
			'cta_url'     => $cta_url,
			'image_src'   => $image_src,
			'badge'       => $badge,
		);
	}

	private static function extract_service_info( $node, $doc ) {
		$xpath = new DOMXPath( $doc );
		$header = '';
		$headers = $xpath->query( './/*[contains(@class,"scai-svc-header")]', $node );
		if ( $headers->length > 0 ) {
			$header = $headers->item( 0 )->textContent;
		}

		$rows = array();
		$row_els = $xpath->query( './/*[contains(@class,"scai-svc-row")]', $node );
		for ( $i = 0; $i < $row_els->length; $i++ ) {
			$row = $row_els->item( $i );
			$label = '';
			$value = '';
			$labels = $xpath->query( './/*[contains(@class,"scai-svc-label")]', $row );
			$values = $xpath->query( './/*[contains(@class,"scai-svc-value")]', $row );
			if ( $labels->length > 0 ) $label = $labels->item( 0 )->textContent;
			if ( $values->length > 0 ) $value = $values->item( 0 )->textContent;
			$rows[] = array( 'label' => $label, 'value' => $value );
		}

		return array( 'header' => $header, 'rows' => $rows );
	}

	private static function extract_why_local( $node, $doc ) {
		$xpath = new DOMXPath( $doc );

		$title = '';
		$titles = $xpath->query( './/*[contains(@class,"scai-local-title")]', $node );
		if ( $titles->length > 0 ) {
			$title = $titles->item( 0 )->textContent;
		}

		$badge = '';
		$badges = $xpath->query( './/*[contains(@class,"scai-local-badge")]', $node );
		if ( $badges->length > 0 ) {
			$badge = $badges->item( 0 )->textContent;
		}

		$items = array();
		$lis = $xpath->query( './/*[contains(@class,"scai-local-list")]/li', $node );
		for ( $i = 0; $i < $lis->length; $i++ ) {
			$items[] = $lis->item( $i )->textContent;
		}

		$image_src = '';
		$imgs = $xpath->query( './/img', $node );
		if ( $imgs->length > 0 ) {
			$image_src = $imgs->item( 0 )->getAttribute( 'src' );
		}

		return array(
			'title'     => $title,
			'badge'     => $badge,
			'items'     => $items,
			'image_src' => $image_src,
		);
	}

	private static function extract_closing( $node, $doc ) {
		$h2 = $node->getElementsByTagName( 'h2' )->item( 0 );
		$heading = $h2 ? $h2->textContent : '';

		$paragraphs = array();
		$ps = $node->getElementsByTagName( 'p' );
		for ( $i = 0; $i < $ps->length; $i++ ) {
			$text = $ps->item( $i )->textContent;
			if ( ! empty( trim( $text ) ) ) {
				$paragraphs[] = $text;
			}
		}

		return array( 'heading' => $heading, 'paragraphs' => $paragraphs );
	}

	/**
	 * Generic extractor for heading + list components.
	 * Works for feature-section, key-takeaways, quick-facts, requirements-box,
	 * pro-tips, ingredients, instructions.
	 */
	private static function extract_heading_list( $node, $doc, $heading_selector, $item_tag ) {
		$xpath = new DOMXPath( $doc );
		$heading = '';

		// Try selector as CSS class first.
		if ( strpos( $heading_selector, '.' ) === 0 ) {
			$cls = substr( $heading_selector, 1 );
			$els = $xpath->query( './/*[contains(@class,"' . $cls . '")]', $node );
			if ( $els->length > 0 ) {
				$heading = $els->item( 0 )->textContent;
			}
		} else {
			$el = $node->getElementsByTagName( $heading_selector )->item( 0 );
			if ( $el ) $heading = $el->textContent;
		}

		$items = array();
		$lis = $node->getElementsByTagName( $item_tag );
		for ( $i = 0; $i < $lis->length; $i++ ) {
			$text = trim( $lis->item( $i )->textContent );
			if ( ! empty( $text ) ) {
				$items[] = $text;
			}
		}

		return array( 'heading' => $heading, 'items' => $items );
	}

	private static function extract_honorable_mentions( $node, $doc ) {
		$xpath = new DOMXPath( $doc );
		$heading = '';
		$h2 = $node->getElementsByTagName( 'h2' )->item( 0 );
		if ( $h2 ) $heading = $h2->textContent;

		$items = array();
		$h3s = $node->getElementsByTagName( 'h3' );
		for ( $i = 0; $i < $h3s->length; $i++ ) {
			$title = $h3s->item( $i )->textContent;
			$desc = '';
			$sibling = $h3s->item( $i )->nextSibling;
			while ( $sibling ) {
				if ( $sibling->nodeType === XML_ELEMENT_NODE && $sibling->nodeName === 'p' ) {
					$desc = $sibling->textContent;
					break;
				}
				$sibling = $sibling->nextSibling;
			}
			$items[] = array( 'title' => $title, 'desc' => $desc );
		}

		return array( 'heading' => $heading, 'items' => $items );
	}

	private static function extract_comparison_table( $node, $doc ) {
		$xpath = new DOMXPath( $doc );
		$heading = '';
		$titles = $xpath->query( './/*[contains(@class,"scai-comp-title")]', $node );
		if ( $titles->length > 0 ) {
			$heading = $titles->item( 0 )->textContent;
		}

		$headers = array();
		$ths = $node->getElementsByTagName( 'th' );
		for ( $i = 0; $i < $ths->length; $i++ ) {
			$headers[] = $ths->item( $i )->textContent;
		}

		$rows = array();
		$trs = $node->getElementsByTagName( 'tr' );
		for ( $i = 0; $i < $trs->length; $i++ ) {
			$tds = $trs->item( $i )->getElementsByTagName( 'td' );
			if ( $tds->length === 0 ) continue;
			$cells = array();
			for ( $j = 0; $j < $tds->length; $j++ ) {
				$cells[] = $tds->item( $j )->textContent;
			}
			$rows[] = $cells;
		}

		return array( 'heading' => $heading, 'headers' => $headers, 'rows' => $rows );
	}

	private static function extract_cta_box( $node, $doc ) {
		$xpath = new DOMXPath( $doc );
		$heading = '';
		$description = '';
		$btn_text = '';
		$btn_url = '';

		$titles = $xpath->query( './/*[contains(@class,"scai-cta-title")]', $node );
		if ( $titles->length > 0 ) $heading = $titles->item( 0 )->textContent;

		$texts = $xpath->query( './/*[contains(@class,"scai-cta-text")]', $node );
		if ( $texts->length > 0 ) $description = $texts->item( 0 )->textContent;

		$btns = $xpath->query( './/*[contains(@class,"scai-cta-button")]', $node );
		if ( $btns->length > 0 ) {
			$btn_text = $btns->item( 0 )->textContent;
			$btn_url = $btns->item( 0 )->getAttribute( 'href' );
		}

		return array( 'heading' => $heading, 'description' => $description, 'btn_text' => $btn_text, 'btn_url' => $btn_url );
	}

	private static function extract_quick_verdict( $node, $doc ) {
		$xpath = new DOMXPath( $doc );
		$heading = '';
		$titles = $xpath->query( './/*[contains(@class,"scai-verdict-title")]', $node );
		if ( $titles->length > 0 ) $heading = $titles->item( 0 )->textContent;

		$options = array();
		$opts = $xpath->query( './/*[contains(@class,"scai-verdict-option")]', $node );
		for ( $i = 0; $i < $opts->length; $i++ ) {
			$label = '';
			$text = '';
			$labels = $xpath->query( './/*[contains(@class,"scai-verdict-label")]', $opts->item( $i ) );
			$texts  = $xpath->query( './/*[contains(@class,"scai-verdict-text")]', $opts->item( $i ) );
			if ( $labels->length > 0 ) $label = $labels->item( 0 )->textContent;
			if ( $texts->length > 0 )  $text  = $texts->item( 0 )->textContent;
			$options[] = array( 'label' => $label, 'text' => $text );
		}

		return array( 'heading' => $heading, 'options' => $options );
	}

	private static function extract_pros_cons( $node, $doc ) {
		$xpath = new DOMXPath( $doc );
		$heading = '';
		$h2 = $node->getElementsByTagName( 'h2' )->item( 0 );
		if ( $h2 ) $heading = $h2->textContent;

		$pros = array();
		$cons = array();

		$pros_el = $xpath->query( './/*[contains(@class,"scai-pc-pros")]//li', $node );
		for ( $i = 0; $i < $pros_el->length; $i++ ) {
			$pros[] = $pros_el->item( $i )->textContent;
		}
		$cons_el = $xpath->query( './/*[contains(@class,"scai-pc-cons")]//li', $node );
		for ( $i = 0; $i < $cons_el->length; $i++ ) {
			$cons[] = $cons_el->item( $i )->textContent;
		}

		return array( 'heading' => $heading, 'pros' => $pros, 'cons' => $cons );
	}

	private static function extract_rating( $node, $doc ) {
		$xpath = new DOMXPath( $doc );
		$heading = '';
		$h2 = $node->getElementsByTagName( 'h2' )->item( 0 );
		if ( $h2 ) $heading = $h2->textContent;

		$score = '';
		$scores = $xpath->query( './/*[contains(@class,"scai-rt-score")]', $node );
		if ( $scores->length > 0 ) $score = $scores->item( 0 )->textContent;

		$title = '';
		$titles = $xpath->query( './/*[contains(@class,"scai-rt-title")]', $node );
		if ( $titles->length > 0 ) $title = $titles->item( 0 )->textContent;

		$summary = '';
		$ps = $xpath->query( './/*[contains(@class,"scai-rt-paragraph")]', $node );
		if ( $ps->length > 0 ) $summary = $ps->item( 0 )->textContent;

		return array( 'heading' => $heading, 'score' => $score, 'title' => $title, 'summary' => $summary );
	}

	private static function extract_nutrition( $node, $doc ) {
		$heading = '';
		$h2 = $node->getElementsByTagName( 'h2' )->item( 0 );
		if ( $h2 ) $heading = $h2->textContent;

		$rows = array();
		$trs = $node->getElementsByTagName( 'tr' );
		for ( $i = 0; $i < $trs->length; $i++ ) {
			$tds = $trs->item( $i )->getElementsByTagName( 'td' );
			if ( $tds->length >= 2 ) {
				$rows[] = array(
					'nutrient' => $tds->item( 0 )->textContent,
					'amount'   => $tds->item( 1 )->textContent,
				);
			}
		}

		return array( 'heading' => $heading, 'rows' => $rows );
	}

	private static function extract_generic( $node, $doc ) {
		return array( 'html' => self::get_inner_html( $node, $doc ) );
	}

	/* ─── Form Renderer ───────────────────────────────────────────── */

	/**
	 * Render a single component as a WYSIWYG block with hover toolbar.
	 */
	private static function render_component_block( $comp, $index ) {
		$type      = $comp['type'];
		$content   = $comp['content'];
		$label     = self::get_component_label( $type );
		$is_locked = ( $type === 'scai-h1' || $type === 'scai-table-of-contents' );

		?>
		<div class="scai-editor-block" data-component-index="<?php echo esc_attr( $index ); ?>" data-component-type="<?php echo esc_attr( $type ); ?>">

			<!-- Hover toolbar -->
			<div class="scai-block-toolbar">
				<span class="scai-block-toolbar-label">
					<?php echo self::get_card_icon( $type ); ?>
					<?php echo esc_html( $label ); ?>
				</span>
				<div class="scai-block-toolbar-actions">
					<button type="button" class="scai-block-action" data-action="edit" title="Edit" aria-label="Edit section">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
					</button>
					<?php if ( ! $is_locked ) : ?>
						<button type="button" class="scai-block-action" data-action="move-up" title="Move up" aria-label="Move section up">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="18 15 12 9 6 15"/></svg>
						</button>
						<button type="button" class="scai-block-action" data-action="move-down" title="Move down" aria-label="Move section down">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
						</button>
						<button type="button" class="scai-block-action danger" data-action="delete" title="Delete section" aria-label="Delete section">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
						</button>
					<?php endif; ?>
				</div>
			</div>

			<!-- WYSIWYG preview -->
			<div class="scai-block-preview"><?php echo $comp['outer_html']; ?></div>

			<!-- Hidden form fields (moved to sidebar on edit) -->
			<div class="scai-block-fields" style="display:none;">
				<input type="hidden" name="components[<?php echo esc_attr( $index ); ?>][type]" value="<?php echo esc_attr( $type ); ?>">
				<input type="hidden" name="components[<?php echo esc_attr( $index ); ?>][outer_html]" value="<?php echo esc_attr( $comp['outer_html'] ); ?>">
				<?php self::render_component_fields( $type, $content, $index ); ?>
			</div>

			<!-- Add-between button -->
			<div class="scai-block-add-between">
				<button type="button" class="scai-block-add-btn" data-action="add-between" title="Add section here" aria-label="Add section between blocks">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
				</button>
			</div>
		</div>
		<?php
	}

	/**
	 * Get a short preview snippet for a component (shown in collapsed card view).
	 */
	private static function get_component_snippet( $type, $content ) {
		switch ( $type ) {
			case 'scai-h1':
				return ! empty( $content['title'] ) ? $content['title'] : '(untitled)';

			case 'scai-featured-image':
				if ( ! empty( $content['alt'] ) ) return $content['alt'];
				return ! empty( $content['src'] ) ? 'Image set' : 'No image';

			case 'scai-overview':
				$first = ! empty( $content['paragraphs'][0] ) ? $content['paragraphs'][0] : '';
				return $first ? wp_trim_words( $first, 12, '...' ) : '(empty overview)';

			case 'scai-table-of-contents':
				return '(auto-generated from headings)';

			case 'scai-section':
				$heading = ! empty( $content['heading'] ) ? $content['heading'] : '(untitled)';
				$pc = is_array( $content['paragraphs'] ) ? count( $content['paragraphs'] ) : 0;
				return $heading . ' — ' . $pc . ' paragraph' . ( $pc !== 1 ? 's' : '' );

			case 'scai-faq-section':
				$title = ! empty( $content['title'] ) ? $content['title'] : 'FAQ';
				$qc = is_array( $content['items'] ) ? count( $content['items'] ) : 0;
				return $title . ' — ' . $qc . ' question' . ( $qc !== 1 ? 's' : '' );

			case 'scai-product-card':
				$parts = array_filter( array(
					! empty( $content['name'] ) ? $content['name'] : '',
					! empty( $content['badge'] ) ? $content['badge'] : '',
				) );
				return ! empty( $parts ) ? implode( ' — ', $parts ) : '(unnamed product)';

			case 'scai-service-info-box':
				$header = ! empty( $content['header'] ) ? $content['header'] : 'Service Info';
				$rc = is_array( $content['rows'] ) ? count( $content['rows'] ) : 0;
				return $header . ' — ' . $rc . ' row' . ( $rc !== 1 ? 's' : '' );

			case 'scai-why-local-section':
				$title = ! empty( $content['title'] ) ? $content['title'] : 'Why Local';
				$ic = is_array( $content['items'] ) ? count( $content['items'] ) : 0;
				return $title . ' — ' . $ic . ' item' . ( $ic !== 1 ? 's' : '' );

			case 'scai-closing':
				return ! empty( $content['heading'] ) ? $content['heading'] : '(untitled closing)';

			case 'scai-feature-section':
			case 'scai-key-takeaways':
			case 'scai-quick-facts-section':
			case 'scai-requirements-box':
			case 'scai-pro-tips-section':
			case 'scai-ingredients-section':
			case 'scai-instructions-section':
				$heading = ! empty( $content['heading'] ) ? $content['heading'] : self::get_component_label( $type );
				$ic = is_array( $content['items'] ) ? count( $content['items'] ) : 0;
				return $heading . ' — ' . $ic . ' item' . ( $ic !== 1 ? 's' : '' );

			case 'scai-honorable-mentions':
				$heading = ! empty( $content['heading'] ) ? $content['heading'] : 'Honorable Mentions';
				$ic = is_array( $content['items'] ) ? count( $content['items'] ) : 0;
				return $heading . ' — ' . $ic . ' mention' . ( $ic !== 1 ? 's' : '' );

			case 'scai-comparison-table':
				return ! empty( $content['heading'] ) ? $content['heading'] : 'Comparison Table';

			case 'scai-cta-box':
				return ! empty( $content['heading'] ) ? $content['heading'] : 'Call to Action';

			case 'scai-quick-verdict':
				return ! empty( $content['heading'] ) ? $content['heading'] : 'Quick Verdict';

			case 'scai-pros-cons-section':
				$pc = is_array( $content['pros'] ) ? count( $content['pros'] ) : 0;
				$cc = is_array( $content['cons'] ) ? count( $content['cons'] ) : 0;
				return 'Pros & Cons — ' . $pc . ' pro' . ( $pc !== 1 ? 's' : '' ) . ', ' . $cc . ' con' . ( $cc !== 1 ? 's' : '' );

			case 'scai-rating-section':
				$score = ! empty( $content['score'] ) ? $content['score'] . '/10' : '';
				return 'Rating' . ( $score ? ' — ' . $score : '' );

			case 'scai-nutrition-section':
				$rc = is_array( $content['rows'] ) ? count( $content['rows'] ) : 0;
				return 'Nutrition Facts — ' . $rc . ' nutrient' . ( $rc !== 1 ? 's' : '' );

			default:
				return 'Custom component';
		}
	}

	/**
	 * Render type-specific form fields.
	 */
	private static function render_component_fields( $type, $content, $index ) {
		$prefix = "components[{$index}]";

		switch ( $type ) {
			case 'scai-h1':
				self::render_text_field( $prefix . '[title]', 'Article Title', $content['title'], 'scai-editor-input-large' );
				break;

			case 'scai-featured-image':
				self::render_image_field( $prefix, $content );
				break;

			case 'scai-overview':
				self::render_paragraphs_field( $prefix, 'Overview Paragraphs', $content['paragraphs'] );
				break;

			case 'scai-table-of-contents':
				echo '<p class="scai-editor-info">Table of Contents is auto-generated from section headings. No editing needed.</p>';
				break;

			case 'scai-section':
				self::render_section_fields( $prefix, $content );
				break;

			case 'scai-faq-section':
				self::render_faq_fields( $prefix, $content );
				break;

			case 'scai-product-card':
				self::render_product_card_fields( $prefix, $content );
				break;

			case 'scai-service-info-box':
				self::render_service_info_fields( $prefix, $content );
				break;

			case 'scai-why-local-section':
				self::render_why_local_fields( $prefix, $content );
				break;

			case 'scai-closing':
				self::render_closing_fields( $prefix, $content );
				break;

			case 'scai-feature-section':
			case 'scai-key-takeaways':
			case 'scai-quick-facts-section':
			case 'scai-requirements-box':
			case 'scai-pro-tips-section':
			case 'scai-ingredients-section':
			case 'scai-instructions-section':
				self::render_heading_list_fields( $prefix, $content, $type );
				break;

			case 'scai-honorable-mentions':
				self::render_honorable_mentions_fields( $prefix, $content );
				break;

			case 'scai-comparison-table':
				self::render_comparison_table_fields( $prefix, $content );
				break;

			case 'scai-cta-box':
				self::render_cta_box_fields( $prefix, $content );
				break;

			case 'scai-quick-verdict':
				self::render_quick_verdict_fields( $prefix, $content );
				break;

			case 'scai-pros-cons-section':
				self::render_pros_cons_fields( $prefix, $content );
				break;

			case 'scai-rating-section':
				self::render_rating_fields( $prefix, $content );
				break;

			case 'scai-nutrition-section':
				self::render_nutrition_fields( $prefix, $content );
				break;

			default:
				self::render_generic_fields( $prefix, $content );
				break;
		}
	}

	/* ─── Field Renderers ─────────────────────────────────────────── */

	private static function render_text_field( $name, $label, $value, $class = '' ) {
		?>
		<div class="scai-editor-field">
			<label class="scai-editor-label"><?php echo esc_html( $label ); ?></label>
			<input type="text" name="<?php echo esc_attr( $name ); ?>" value="<?php echo esc_attr( $value ); ?>" class="scai-editor-input <?php echo esc_attr( $class ); ?>">
		</div>
		<?php
	}

	private static function render_textarea_field( $name, $label, $value, $rows = 4 ) {
		?>
		<div class="scai-editor-field">
			<label class="scai-editor-label"><?php echo esc_html( $label ); ?></label>
			<textarea name="<?php echo esc_attr( $name ); ?>" rows="<?php echo esc_attr( $rows ); ?>" class="scai-editor-textarea"><?php echo esc_textarea( $value ); ?></textarea>
		</div>
		<?php
	}

	/**
	 * Render an image URL field with preview thumbnail and Media Library button.
	 * Used for product cards, why-local, and any component with an image_src field.
	 */
	private static function render_image_url_field( $name, $label, $value ) {
		?>
		<div class="scai-editor-field scai-editor-image-field">
			<label class="scai-editor-label"><?php echo esc_html( $label ); ?></label>
			<div class="scai-editor-image-row">
				<?php if ( ! empty( $value ) ) : ?>
					<img src="<?php echo esc_url( $value ); ?>" alt="" class="scai-editor-image-preview" data-preview>
				<?php else : ?>
					<div class="scai-editor-image-preview scai-editor-image-empty" data-preview>No image</div>
				<?php endif; ?>
				<div class="scai-editor-image-inputs">
					<input type="text" name="<?php echo esc_attr( $name ); ?>" value="<?php echo esc_attr( $value ); ?>" class="scai-editor-input" placeholder="Image URL" data-image-url>
					<button type="button" class="sce-media-btn" data-media-target="<?php echo esc_attr( $name ); ?>" aria-label="Choose image from media library">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
						Media Library
					</button>
				</div>
			</div>
		</div>
		<?php
	}

	private static function render_image_field( $prefix, $content ) {
		?>
		<div class="scai-editor-field scai-editor-image-field">
			<label class="scai-editor-label">Image</label>
			<div class="scai-editor-image-row">
				<?php if ( ! empty( $content['src'] ) ) : ?>
					<img src="<?php echo esc_url( $content['src'] ); ?>" alt="" class="scai-editor-image-preview" data-preview>
				<?php else : ?>
					<div class="scai-editor-image-preview scai-editor-image-empty" data-preview>No image</div>
				<?php endif; ?>
				<div class="scai-editor-image-inputs">
					<input type="text" name="<?php echo esc_attr( $prefix ); ?>[src]" value="<?php echo esc_attr( $content['src'] ); ?>" class="scai-editor-input" placeholder="Image URL" data-image-url>
					<button type="button" class="sce-media-btn" data-media-target="<?php echo esc_attr( $prefix ); ?>[src]" aria-label="Choose image from media library">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
						Media Library
					</button>
					<input type="text" name="<?php echo esc_attr( $prefix ); ?>[alt]" value="<?php echo esc_attr( $content['alt'] ); ?>" class="scai-editor-input" placeholder="Alt text">
					<?php if ( isset( $content['caption'] ) ) : ?>
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[caption]" value="<?php echo esc_attr( $content['caption'] ); ?>" class="scai-editor-input" placeholder="Caption">
					<?php endif; ?>
				</div>
			</div>
		</div>
		<?php
	}

	private static function render_paragraphs_field( $prefix, $label, $paragraphs ) {
		?>
		<div class="scai-editor-field">
			<label class="scai-editor-label"><?php echo esc_html( $label ); ?></label>
			<div class="scai-editor-repeater" data-repeater="paragraphs">
				<?php foreach ( $paragraphs as $pi => $p ) : ?>
					<div class="scai-editor-repeater-item">
						<textarea name="<?php echo esc_attr( $prefix ); ?>[paragraphs][]" rows="3" class="scai-editor-textarea"><?php echo esc_textarea( $p ); ?></textarea>
						<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove">&times;</button>
					</div>
				<?php endforeach; ?>
				<button type="button" class="scai-editor-add-btn" data-action="add-paragraph" data-prefix="<?php echo esc_attr( $prefix ); ?>">+ Add Paragraph</button>
			</div>
		</div>
		<?php
	}

	private static function render_section_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[heading]', 'Section Heading', $content['heading'] );

		if ( ! empty( $content['section_id'] ) ) {
			echo '<input type="hidden" name="' . esc_attr( $prefix ) . '[section_id]" value="' . esc_attr( $content['section_id'] ) . '">';
		}

		if ( ! empty( $content['image_src'] ) ) {
			?>
			<div class="scai-editor-field scai-editor-image-field">
				<label class="scai-editor-label">Section Image</label>
				<div class="scai-editor-image-row">
					<img src="<?php echo esc_url( $content['image_src'] ); ?>" alt="" class="scai-editor-image-preview" data-preview>
					<div class="scai-editor-image-inputs">
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[image_src]" value="<?php echo esc_attr( $content['image_src'] ); ?>" class="scai-editor-input" placeholder="Image URL" data-image-url>
						<button type="button" class="sce-media-btn" data-media-target="<?php echo esc_attr( $prefix ); ?>[image_src]" aria-label="Choose image from media library">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
							Media Library
						</button>
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[image_alt]" value="<?php echo esc_attr( $content['image_alt'] ); ?>" class="scai-editor-input" placeholder="Alt text">
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[image_caption]" value="<?php echo esc_attr( $content['image_caption'] ); ?>" class="scai-editor-input" placeholder="Caption">
					</div>
				</div>
			</div>
			<?php
		}

		self::render_paragraphs_field( $prefix, 'Paragraphs', $content['paragraphs'] );
	}

	private static function render_faq_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[title]', 'FAQ Section Title', $content['title'] );
		?>
		<div class="scai-editor-field">
			<label class="scai-editor-label">Questions & Answers</label>
			<div class="scai-editor-repeater" data-repeater="faq">
				<?php foreach ( $content['items'] as $fi => $item ) : ?>
					<div class="scai-editor-repeater-item scai-editor-faq-item">
						<div class="scai-editor-faq-fields">
							<input type="text" name="<?php echo esc_attr( $prefix ); ?>[items][<?php echo esc_attr( $fi ); ?>][q]" value="<?php echo esc_attr( $item['q'] ); ?>" class="scai-editor-input" placeholder="Question">
							<textarea name="<?php echo esc_attr( $prefix ); ?>[items][<?php echo esc_attr( $fi ); ?>][a]" rows="3" class="scai-editor-textarea" placeholder="Answer"><?php echo esc_textarea( $item['a'] ); ?></textarea>
						</div>
						<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove">&times;</button>
					</div>
				<?php endforeach; ?>
				<button type="button" class="scai-editor-add-btn" data-action="add-faq" data-prefix="<?php echo esc_attr( $prefix ); ?>">+ Add Question</button>
			</div>
		</div>
		<?php
	}

	private static function render_product_card_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[badge]', 'Badge', $content['badge'] );
		self::render_text_field( $prefix . '[name]', 'Product Name', $content['name'] );
		self::render_text_field( $prefix . '[rating]', 'Rating (e.g. 4.8)', $content['rating'] );
		self::render_text_field( $prefix . '[price]', 'Price', $content['price'] );
		self::render_textarea_field( $prefix . '[description]', 'Description', $content['description'], 3 );
		self::render_text_field( $prefix . '[cta_text]', 'Button Text', $content['cta_text'] );
		self::render_text_field( $prefix . '[cta_url]', 'Button URL', $content['cta_url'] );
		self::render_image_url_field( $prefix . '[image_src]', 'Product Image', $content['image_src'] );
	}

	private static function render_service_info_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[header]', 'Section Header', $content['header'] );
		?>
		<div class="scai-editor-field">
			<label class="scai-editor-label">Info Rows</label>
			<div class="scai-editor-repeater" data-repeater="service-info">
				<?php foreach ( $content['rows'] as $ri => $row ) : ?>
					<div class="scai-editor-repeater-item scai-editor-kv-item">
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[rows][<?php echo esc_attr( $ri ); ?>][label]" value="<?php echo esc_attr( $row['label'] ); ?>" class="scai-editor-input scai-editor-input-sm" placeholder="Label">
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[rows][<?php echo esc_attr( $ri ); ?>][value]" value="<?php echo esc_attr( $row['value'] ); ?>" class="scai-editor-input" placeholder="Value">
						<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove">&times;</button>
					</div>
				<?php endforeach; ?>
				<button type="button" class="scai-editor-add-btn" data-action="add-service-row" data-prefix="<?php echo esc_attr( $prefix ); ?>">+ Add Row</button>
			</div>
		</div>
		<?php
	}

	private static function render_why_local_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[title]', 'Title', $content['title'] );
		self::render_text_field( $prefix . '[badge]', 'Badge Text', $content['badge'] );
		self::render_image_url_field( $prefix . '[image_src]', 'Image', $content['image_src'] );
		?>
		<div class="scai-editor-field">
			<label class="scai-editor-label">Benefit Items</label>
			<div class="scai-editor-repeater" data-repeater="local-items">
				<?php foreach ( $content['items'] as $li => $item ) : ?>
					<div class="scai-editor-repeater-item">
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[items][]" value="<?php echo esc_attr( $item ); ?>" class="scai-editor-input" placeholder="Benefit">
						<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove">&times;</button>
					</div>
				<?php endforeach; ?>
				<button type="button" class="scai-editor-add-btn" data-action="add-local-item" data-prefix="<?php echo esc_attr( $prefix ); ?>">+ Add Item</button>
			</div>
		</div>
		<?php
	}

	private static function render_closing_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[heading]', 'Closing Heading', $content['heading'] );
		self::render_paragraphs_field( $prefix, 'Closing Paragraphs', $content['paragraphs'] );
	}

	private static function render_heading_list_fields( $prefix, $content, $type ) {
		$heading_label = 'Heading';
		$items_label   = 'Items';
		$item_placeholder = 'Item';
		switch ( $type ) {
			case 'scai-feature-section':      $heading_label = 'Features Heading';     $items_label = 'Features';       $item_placeholder = 'Feature'; break;
			case 'scai-key-takeaways':        $heading_label = 'Takeaways Title';      $items_label = 'Takeaways';      $item_placeholder = 'Takeaway'; break;
			case 'scai-quick-facts-section':   $heading_label = 'Facts Title';          $items_label = 'Facts';          $item_placeholder = 'Fact'; break;
			case 'scai-requirements-box':      $heading_label = 'Requirements Heading'; $items_label = 'Requirements';   $item_placeholder = 'Requirement'; break;
			case 'scai-pro-tips-section':       $heading_label = 'Tips Heading';         $items_label = 'Tips';           $item_placeholder = 'Tip'; break;
			case 'scai-ingredients-section':    $heading_label = 'Ingredients Heading';  $items_label = 'Ingredients';    $item_placeholder = 'Ingredient'; break;
			case 'scai-instructions-section':   $heading_label = 'Instructions Heading'; $items_label = 'Steps';          $item_placeholder = 'Step'; break;
		}
		self::render_text_field( $prefix . '[heading]', $heading_label, isset( $content['heading'] ) ? $content['heading'] : '' );
		?>
		<div class="scai-editor-field">
			<label class="scai-editor-label"><?php echo esc_html( $items_label ); ?></label>
			<div class="scai-editor-repeater" data-repeater="list-items">
				<?php
				$items = isset( $content['items'] ) ? $content['items'] : array();
				foreach ( $items as $li => $item ) : ?>
					<div class="scai-editor-repeater-item">
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[items][]" value="<?php echo esc_attr( $item ); ?>" class="scai-editor-input" placeholder="<?php echo esc_attr( $item_placeholder ); ?>">
						<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove">&times;</button>
					</div>
				<?php endforeach; ?>
				<button type="button" class="scai-editor-add-btn" data-action="add-list-item" data-prefix="<?php echo esc_attr( $prefix ); ?>" data-placeholder="<?php echo esc_attr( $item_placeholder ); ?>">+ Add <?php echo esc_html( $item_placeholder ); ?></button>
			</div>
		</div>
		<?php
	}

	private static function render_honorable_mentions_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[heading]', 'Section Heading', isset( $content['heading'] ) ? $content['heading'] : '' );
		?>
		<div class="scai-editor-field">
			<label class="scai-editor-label">Mentions</label>
			<div class="scai-editor-repeater" data-repeater="hm-items">
				<?php
				$items = isset( $content['items'] ) ? $content['items'] : array();
				foreach ( $items as $mi => $item ) : ?>
					<div class="scai-editor-repeater-item scai-editor-hm-item">
						<div class="scai-editor-faq-fields">
							<input type="text" name="<?php echo esc_attr( $prefix ); ?>[items][<?php echo esc_attr( $mi ); ?>][title]" value="<?php echo esc_attr( $item['title'] ); ?>" class="scai-editor-input" placeholder="Title">
							<textarea name="<?php echo esc_attr( $prefix ); ?>[items][<?php echo esc_attr( $mi ); ?>][desc]" rows="3" class="scai-editor-textarea" placeholder="Description"><?php echo esc_textarea( $item['desc'] ); ?></textarea>
						</div>
						<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove">&times;</button>
					</div>
				<?php endforeach; ?>
				<button type="button" class="scai-editor-add-btn" data-action="add-hm-item" data-prefix="<?php echo esc_attr( $prefix ); ?>">+ Add Mention</button>
			</div>
		</div>
		<?php
	}

	private static function render_comparison_table_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[heading]', 'Table Title', isset( $content['heading'] ) ? $content['heading'] : '' );
		?>
		<div class="scai-editor-field">
			<label class="scai-editor-label">Column Headers</label>
			<div class="scai-editor-repeater" data-repeater="comp-headers">
				<?php
				$headers = isset( $content['headers'] ) ? $content['headers'] : array();
				foreach ( $headers as $hi => $h ) : ?>
					<div class="scai-editor-repeater-item">
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[headers][]" value="<?php echo esc_attr( $h ); ?>" class="scai-editor-input" placeholder="Column header">
						<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove">&times;</button>
					</div>
				<?php endforeach; ?>
				<button type="button" class="scai-editor-add-btn" data-action="add-list-item" data-prefix="<?php echo esc_attr( $prefix ); ?>[headers]" data-placeholder="Column header">+ Add Column</button>
			</div>
		</div>
		<div class="scai-editor-field">
			<label class="scai-editor-label">Table Rows</label>
			<div class="scai-editor-repeater" data-repeater="comp-rows">
				<?php
				$rows = isset( $content['rows'] ) ? $content['rows'] : array();
				$col_count = count( $headers );
				foreach ( $rows as $ri => $row ) : ?>
					<div class="scai-editor-repeater-item scai-editor-comp-row">
						<?php foreach ( $row as $ci => $cell ) : ?>
							<input type="text" name="<?php echo esc_attr( $prefix ); ?>[rows][<?php echo esc_attr( $ri ); ?>][]" value="<?php echo esc_attr( $cell ); ?>" class="scai-editor-input" placeholder="Cell value">
						<?php endforeach; ?>
						<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove">&times;</button>
					</div>
				<?php endforeach; ?>
				<button type="button" class="scai-editor-add-btn" data-action="add-comp-row" data-prefix="<?php echo esc_attr( $prefix ); ?>" data-cols="<?php echo esc_attr( $col_count ); ?>">+ Add Row</button>
			</div>
		</div>
		<?php
	}

	private static function render_cta_box_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[heading]', 'CTA Heading', isset( $content['heading'] ) ? $content['heading'] : '' );
		self::render_textarea_field( $prefix . '[description]', 'Description', isset( $content['description'] ) ? $content['description'] : '', 3 );
		self::render_text_field( $prefix . '[btn_text]', 'Button Text', isset( $content['btn_text'] ) ? $content['btn_text'] : '' );
		self::render_text_field( $prefix . '[btn_url]', 'Button URL', isset( $content['btn_url'] ) ? $content['btn_url'] : '' );
	}

	private static function render_quick_verdict_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[heading]', 'Verdict Title', isset( $content['heading'] ) ? $content['heading'] : '' );
		?>
		<div class="scai-editor-field">
			<label class="scai-editor-label">Verdict Options</label>
			<div class="scai-editor-repeater" data-repeater="verdict-options">
				<?php
				$options = isset( $content['options'] ) ? $content['options'] : array();
				foreach ( $options as $oi => $opt ) : ?>
					<div class="scai-editor-repeater-item scai-editor-hm-item">
						<div class="scai-editor-faq-fields">
							<input type="text" name="<?php echo esc_attr( $prefix ); ?>[options][<?php echo esc_attr( $oi ); ?>][label]" value="<?php echo esc_attr( $opt['label'] ); ?>" class="scai-editor-input" placeholder="Label (e.g. Choose Product A)">
							<textarea name="<?php echo esc_attr( $prefix ); ?>[options][<?php echo esc_attr( $oi ); ?>][text]" rows="2" class="scai-editor-textarea" placeholder="Description"><?php echo esc_textarea( $opt['text'] ); ?></textarea>
						</div>
						<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove">&times;</button>
					</div>
				<?php endforeach; ?>
				<button type="button" class="scai-editor-add-btn" data-action="add-verdict-option" data-prefix="<?php echo esc_attr( $prefix ); ?>">+ Add Option</button>
			</div>
		</div>
		<?php
	}

	private static function render_pros_cons_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[heading]', 'Section Heading', isset( $content['heading'] ) ? $content['heading'] : '' );
		?>
		<div class="scai-editor-field">
			<label class="scai-editor-label">Pros</label>
			<div class="scai-editor-repeater" data-repeater="pros-items">
				<?php
				$pros = isset( $content['pros'] ) ? $content['pros'] : array();
				foreach ( $pros as $pi => $item ) : ?>
					<div class="scai-editor-repeater-item">
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[pros][]" value="<?php echo esc_attr( $item ); ?>" class="scai-editor-input" placeholder="Pro">
						<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove">&times;</button>
					</div>
				<?php endforeach; ?>
				<button type="button" class="scai-editor-add-btn" data-action="add-list-item" data-prefix="<?php echo esc_attr( $prefix ); ?>[pros]" data-placeholder="Pro">+ Add Pro</button>
			</div>
		</div>
		<div class="scai-editor-field">
			<label class="scai-editor-label">Cons</label>
			<div class="scai-editor-repeater" data-repeater="cons-items">
				<?php
				$cons = isset( $content['cons'] ) ? $content['cons'] : array();
				foreach ( $cons as $ci => $item ) : ?>
					<div class="scai-editor-repeater-item">
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[cons][]" value="<?php echo esc_attr( $item ); ?>" class="scai-editor-input" placeholder="Con">
						<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove">&times;</button>
					</div>
				<?php endforeach; ?>
				<button type="button" class="scai-editor-add-btn" data-action="add-list-item" data-prefix="<?php echo esc_attr( $prefix ); ?>[cons]" data-placeholder="Con">+ Add Con</button>
			</div>
		</div>
		<?php
	}

	private static function render_rating_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[heading]', 'Section Heading', isset( $content['heading'] ) ? $content['heading'] : '' );
		self::render_text_field( $prefix . '[score]', 'Score (e.g. 8.5)', isset( $content['score'] ) ? $content['score'] : '' );
		self::render_text_field( $prefix . '[title]', 'Rating Label (e.g. Excellent)', isset( $content['title'] ) ? $content['title'] : '' );
		self::render_textarea_field( $prefix . '[summary]', 'Summary', isset( $content['summary'] ) ? $content['summary'] : '', 4 );
	}

	private static function render_nutrition_fields( $prefix, $content ) {
		self::render_text_field( $prefix . '[heading]', 'Section Heading', isset( $content['heading'] ) ? $content['heading'] : '' );
		?>
		<div class="scai-editor-field">
			<label class="scai-editor-label">Nutrients</label>
			<div class="scai-editor-repeater" data-repeater="nutrition-rows">
				<?php
				$rows = isset( $content['rows'] ) ? $content['rows'] : array();
				foreach ( $rows as $ri => $row ) : ?>
					<div class="scai-editor-repeater-item scai-editor-kv-item">
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[rows][<?php echo esc_attr( $ri ); ?>][nutrient]" value="<?php echo esc_attr( $row['nutrient'] ); ?>" class="scai-editor-input scai-editor-input-sm" placeholder="Nutrient">
						<input type="text" name="<?php echo esc_attr( $prefix ); ?>[rows][<?php echo esc_attr( $ri ); ?>][amount]" value="<?php echo esc_attr( $row['amount'] ); ?>" class="scai-editor-input" placeholder="Amount">
						<button type="button" class="scai-editor-remove-btn" data-action="remove-item" title="Remove">&times;</button>
					</div>
				<?php endforeach; ?>
				<button type="button" class="scai-editor-add-btn" data-action="add-nutrition-row" data-prefix="<?php echo esc_attr( $prefix ); ?>">+ Add Nutrient</button>
			</div>
		</div>
		<?php
	}

	private static function render_generic_fields( $prefix, $content ) {
		?>
		<div class="scai-editor-field">
			<p class="scai-editor-info scai-editor-info-warning">This component uses advanced editing. Edit the raw HTML below carefully.</p>
			<textarea name="<?php echo esc_attr( $prefix ); ?>[html]" rows="8" class="scai-editor-textarea scai-editor-textarea-code"><?php echo esc_textarea( $content['html'] ); ?></textarea>
		</div>
		<?php
	}

	/* ─── HTML Rebuilder ──────────────────────────────────────────── */

	/**
	 * Rebuild article HTML from edited components.
	 *
	 * @param int   $post_id    The post ID.
	 * @param array $components Edited components array from the form.
	 * @return string The full post_content with Gutenberg block wrapper.
	 */
	public static function rebuild_html( $post_id, $components ) {
		$post = get_post( $post_id );
		$original_content = $post->post_content;

		// Extract the original block comment attributes and wrapper tag.
		$block_attrs = self::extract_block_attrs( $original_content );
		$wrapper_tag = self::extract_wrapper_tag( $original_content );

		// Build new components HTML.
		$parts = array();
		$section_headings = array(); // For TOC regeneration.
		$section_index = 0;

		foreach ( $components as $comp ) {
			$type = $comp['type'];

			if ( $type === 'scai-table-of-contents' ) {
				// Placeholder — we'll replace this after collecting headings.
				$parts[] = '%%TOC_PLACEHOLDER%%';
				continue;
			}

			$html = self::rebuild_component( $comp );
			$parts[] = $html;

			// Track section headings for TOC.
			if ( $type === 'scai-section' && ! empty( $comp['heading'] ) ) {
				$section_headings[] = array(
					'id'    => ! empty( $comp['section_id'] ) ? $comp['section_id'] : 'section-' . $section_index,
					'title' => $comp['heading'],
				);
				$section_index++;
			}
		}

		// Regenerate TOC.
		$toc_html = self::build_toc_html( $section_headings, $original_content );

		$body_html = implode( "\n\n", $parts );
		$body_html = str_replace( '%%TOC_PLACEHOLDER%%', $toc_html, $body_html );

		// Reconstruct using the original wrapper format.
		$block_comment = '<!-- wp:scai/article' . ( $block_attrs ? ' ' . $block_attrs : '' ) . ' -->';
		$block_end = '<!-- /wp:scai/article -->';
		$inner_wrapper_tag = self::extract_inner_wrapper_tag( $original_content );

		// Determine closing tag from wrapper (div or article).
		$closing_tag = '</div>';
		if ( strpos( $wrapper_tag, '<article' ) === 0 ) {
			$closing_tag = '</article>';
		}

		// Include inner scai-wrapper div when using two-div structure.
		if ( $inner_wrapper_tag ) {
			$full_html = $block_comment . "\n" . $wrapper_tag . "\n" . $inner_wrapper_tag . "\n" . $body_html . "\n</div>\n" . $closing_tag . "\n" . $block_end;
		} else {
			$full_html = $block_comment . "\n" . $wrapper_tag . "\n" . $body_html . "\n" . $closing_tag . "\n" . $block_end;
		}

		return $full_html;
	}

	/**
	 * Rebuild a single component's HTML from its edited content.
	 */
	private static function rebuild_component( $comp ) {
		$type = isset( $comp['type'] ) ? $comp['type'] : '';
		$outer = isset( $comp['outer_html'] ) ? $comp['outer_html'] : '';

		switch ( $type ) {
			case 'scai-h1':
				return self::rebuild_h1( $comp );
			case 'scai-featured-image':
				return self::rebuild_featured_image( $comp );
			case 'scai-overview':
				return self::rebuild_overview( $comp );
			case 'scai-section':
				return self::rebuild_section( $comp, $outer );
			case 'scai-faq-section':
				return self::rebuild_faq( $comp, $outer );
			case 'scai-product-card':
				// Product cards have complex variation-specific HTML — use DOM manipulation.
				return self::rebuild_from_outer( $comp, $outer );
			case 'scai-service-info-box':
				return self::rebuild_service_info( $comp, $outer );
			case 'scai-why-local-section':
				return self::rebuild_why_local( $comp, $outer );
			case 'scai-closing':
				return self::rebuild_closing( $comp );
			case 'scai-feature-section':
			case 'scai-key-takeaways':
			case 'scai-quick-facts-section':
			case 'scai-requirements-box':
			case 'scai-pro-tips-section':
			case 'scai-ingredients-section':
			case 'scai-instructions-section':
				return self::rebuild_heading_list( $comp, $outer, $type );
			case 'scai-honorable-mentions':
				return self::rebuild_honorable_mentions( $comp, $outer );
			case 'scai-comparison-table':
				return self::rebuild_comparison_table( $comp, $outer );
			case 'scai-cta-box':
				return self::rebuild_cta_box( $comp, $outer );
			case 'scai-quick-verdict':
				return self::rebuild_quick_verdict( $comp, $outer );
			case 'scai-pros-cons-section':
				return self::rebuild_pros_cons( $comp, $outer );
			case 'scai-rating-section':
				return self::rebuild_rating( $comp, $outer );
			case 'scai-nutrition-section':
				return self::rebuild_nutrition( $comp, $outer );
			default:
				// Unknown component — preserve outer_html as-is to avoid
				// breaking SVGs, data-attributes, or variation-specific markup.
				if ( ! empty( $outer ) ) {
					return $outer;
				}
				return isset( $comp['html'] ) ? $comp['html'] : '';
		}
	}

	private static function rebuild_h1( $comp ) {
		$title = esc_html( $comp['title'] );
		$outer = isset( $comp['outer_html'] ) ? $comp['outer_html'] : '';

		// Regex: update text inside the h1 tag while preserving all original markup.
		if ( $outer && preg_match( '/(<h1\b[^>]*>)(.*?)(<\/h1>)/s', $outer ) ) {
			return preg_replace_callback( '/(<h1\b[^>]*>)(.*?)(<\/h1>)/s', function ( $m ) use ( $title ) {
				return $m[1] . $title . $m[3];
			}, $outer, 1 );
		}

		return "<header data-component=\"scai-h1\">\n  <h1 class=\"scai-h1\">{$title}</h1>\n</header>";
	}

	private static function rebuild_featured_image( $comp ) {
		$outer = isset( $comp['outer_html'] ) ? $comp['outer_html'] : '';

		if ( $outer ) {
			$html = $outer;
			// Update src and alt on the img tag.
			$safe_src = esc_url( $comp['src'] );
			$safe_alt = esc_attr( $comp['alt'] );
			$html = preg_replace_callback( '/(<img\b[^>]*\bsrc=")[^"]*(")/s', function ( $m ) use ( $safe_src ) {
				return $m[1] . $safe_src . $m[2];
			}, $html, 1 );
			$html = preg_replace_callback( '/(<img\b[^>]*\balt=")[^"]*(")/s', function ( $m ) use ( $safe_alt ) {
				return $m[1] . $safe_alt . $m[2];
			}, $html, 1 );
			return $html;
		}

		$src = esc_url( $comp['src'] );
		$alt = esc_attr( $comp['alt'] );
		$caption = isset( $comp['caption'] ) ? esc_html( $comp['caption'] ) : '';

		$html = "<figure data-component=\"scai-featured-image\" class=\"scai-featured-image\">\n";
		$html .= "  <img src=\"{$src}\" alt=\"{$alt}\" />\n";
		if ( $caption ) {
			$html .= "  <figcaption>{$caption}</figcaption>\n";
		}
		$html .= "</figure>";
		return $html;
	}

	private static function rebuild_overview( $comp ) {
		$outer = isset( $comp['outer_html'] ) ? $comp['outer_html'] : '';
		$paragraphs = isset( $comp['paragraphs'] ) ? $comp['paragraphs'] : array();

		if ( $outer ) {
			return self::replace_paragraphs( $outer, $paragraphs );
		}

		$html = '<section data-component="scai-overview" class="scai-overview">';
		foreach ( $paragraphs as $p ) {
			$html .= '<p class="scai-paragraph">' . esc_html( $p ) . '</p>';
		}
		$html .= '</section>';
		return $html;
	}

	private static function rebuild_section( $comp, $outer ) {
		$heading = isset( $comp['heading'] ) ? $comp['heading'] : '';
		$paragraphs = isset( $comp['paragraphs'] ) ? $comp['paragraphs'] : array();

		if ( $outer ) {
			$html = $outer;
			// Update the h2 heading text (match any <h2> tag — there's only one per section).
			$safe_heading = esc_html( $heading );
			$html = preg_replace_callback( '/(<h2\b[^>]*>)(.*?)(<\/h2>)/s', function ( $m ) use ( $safe_heading ) {
				return $m[1] . $safe_heading . $m[3];
			}, $html, 1 );
			// Update image src/alt if present.
			if ( ! empty( $comp['image_src'] ) ) {
				$safe_src = esc_url( $comp['image_src'] );
				$html = preg_replace_callback( '/(<img\b[^>]*\bsrc=")[^"]*(")/s', function ( $m ) use ( $safe_src ) {
					return $m[1] . $safe_src . $m[2];
				}, $html, 1 );
				if ( isset( $comp['image_alt'] ) ) {
					$safe_alt = esc_attr( $comp['image_alt'] );
					$html = preg_replace_callback( '/(<img\b[^>]*\balt=")[^"]*(")/s', function ( $m ) use ( $safe_alt ) {
						return $m[1] . $safe_alt . $m[2];
					}, $html, 1 );
				}
			}
			// Update paragraph text.
			$html = self::replace_paragraphs( $html, $paragraphs );
			return $html;
		}

		// Fallback for new components.
		$heading_esc = esc_html( $heading );
		$section_id = ! empty( $comp['section_id'] ) ? $comp['section_id'] : '';
		$id_attr = $section_id ? ' id="' . esc_attr( $section_id ) . '"' : '';
		$html = "<section data-component=\"scai-section\"{$id_attr} class=\"scai-section\">\n";
		$html .= "  <h2 class=\"scai-h2\">{$heading_esc}</h2>\n";
		if ( ! empty( $comp['image_src'] ) ) {
			$img_src = esc_url( $comp['image_src'] );
			$img_alt = esc_attr( isset( $comp['image_alt'] ) ? $comp['image_alt'] : '' );
			$html .= "  <figure class=\"scai-h2-image\">\n    <img src=\"{$img_src}\" alt=\"{$img_alt}\" />\n  </figure>\n";
		}
		foreach ( $paragraphs as $p ) {
			$html .= '<p class="scai-paragraph">' . esc_html( $p ) . '</p>';
		}
		$html .= '</section>';
		return $html;
	}

	private static function rebuild_faq( $comp, $outer ) {
		if ( $outer ) {
			$html = $outer;
			$title = isset( $comp['title'] ) ? $comp['title'] : '';
			$items = isset( $comp['items'] ) ? $comp['items'] : array();

			// Update FAQ title (match any <h2> — variations use scai-faq-h2, scai-faq-title, etc.).
			if ( $title ) {
				$safe_title = esc_html( $title );
				$html = preg_replace_callback( '/(<h2\b[^>]*>)(.*?)(<\/h2>)/s', function ( $m ) use ( $safe_title ) {
					return $m[1] . $safe_title . $m[3];
				}, $html, 1 );
			}

			// Update Q&A items sequentially.
			// Match <h3> tags — variations use scai-faq-h3, scai-faq-question, etc.
			$qi = 0;
			$html = preg_replace_callback( '/(<h3\b[^>]*>)(.*?)(<\/h3>)/s', function ( $m ) use ( $items, &$qi ) {
				if ( isset( $items[ $qi ] ) ) {
					$text = esc_html( $items[ $qi ]['q'] );
					$qi++;
					return $m[1] . $text . $m[3];
				}
				$qi++;
				return $m[0];
			}, $html );

			// Match answer <p> tags — try scai-faq-answer class first, then fall back to any <p>.
			$answer_pattern = '/(<p\b[^>]*class="[^"]*scai-faq-answer[^"]*"[^>]*>)(.*?)(<\/p>)/s';
			if ( preg_match( $answer_pattern, $html ) ) {
				$ai = 0;
				$html = preg_replace_callback( $answer_pattern, function ( $m ) use ( $items, &$ai ) {
					if ( isset( $items[ $ai ] ) ) {
						$text = esc_html( $items[ $ai ]['a'] );
						$ai++;
						return $m[1] . $text . $m[3];
					}
					$ai++;
					return $m[0];
				}, $html );
			} else {
				$ai = 0;
				$html = preg_replace_callback( '/(<p\b[^>]*>)(.*?)(<\/p>)/s', function ( $m ) use ( $items, &$ai ) {
					if ( isset( $items[ $ai ] ) ) {
						$text = esc_html( $items[ $ai ]['a'] );
						$ai++;
						return $m[1] . $text . $m[3];
					}
					$ai++;
					return $m[0];
				}, $html );
			}

			return $html;
		}

		// Fallback for new FAQ components.
		$title = esc_html( isset( $comp['title'] ) ? $comp['title'] : 'Frequently Asked Questions' );
		$items = isset( $comp['items'] ) ? $comp['items'] : array();
		$wrapper_class = 'scai-faq-studio';

		$html = "<div class=\"scai-component\"><div class=\"{$wrapper_class}\" data-component=\"scai-faq-section\">\n";
		$html .= "<h2 class=\"scai-faq-h2\" data-component=\"scai-faq-h2\">{$title}</h2>\n\n";
		foreach ( $items as $item ) {
			$html .= "<div class=\"scai-faq-item\">\n  <h3 class=\"scai-faq-h3\">" . esc_html( $item['q'] ) . "</h3>\n";
			$html .= "  <p class=\"scai-faq-answer\">" . esc_html( $item['a'] ) . "</p>\n</div>\n\n";
		}
		$html .= "</div></div>";
		return $html;
	}

	private static function rebuild_service_info( $comp, $outer ) {
		if ( $outer ) {
			$html = $outer;
			$header = isset( $comp['header'] ) ? $comp['header'] : '';
			$rows = isset( $comp['rows'] ) ? $comp['rows'] : array();

			if ( $header ) {
				$safe_header = esc_html( $header );
				$html = preg_replace_callback( '/(<[^>]*class="[^"]*scai-svc-header[^"]*"[^>]*>)(.*?)(<\/div>)/s', function ( $m ) use ( $safe_header ) {
					return $m[1] . $safe_header . $m[3];
				}, $html, 1 );
			}

			// Update row labels and values sequentially.
			$ri = 0;
			$html = preg_replace_callback( '/(<span\b[^>]*class="[^"]*scai-svc-label[^"]*"[^>]*>)(.*?)(<\/span>)/s', function ( $m ) use ( $rows, &$ri ) {
				if ( isset( $rows[ $ri ] ) ) {
					$text = esc_html( $rows[ $ri ]['label'] );
					$ri++;
					return $m[1] . $text . $m[3];
				}
				$ri++;
				return $m[0];
			}, $html );

			$vi = 0;
			$html = preg_replace_callback( '/(<span\b[^>]*class="[^"]*scai-svc-value[^"]*"[^>]*>)(.*?)(<\/span>)/s', function ( $m ) use ( $rows, &$vi ) {
				if ( isset( $rows[ $vi ] ) ) {
					$text = esc_html( $rows[ $vi ]['value'] );
					$vi++;
					return $m[1] . $text . $m[3];
				}
				$vi++;
				return $m[0];
			}, $html );

			return $html;
		}

		// Fallback for new components.
		$header = esc_html( isset( $comp['header'] ) ? $comp['header'] : '' );
		$rows = isset( $comp['rows'] ) ? $comp['rows'] : array();
		$wrapper_class = 'scai-svc-studio';

		$html = "<div class=\"scai-component\"><div class=\"{$wrapper_class}\" data-component=\"scai-service-info-box\">\n";
		$html .= "<div class=\"scai-svc-header\">{$header}</div>\n";
		foreach ( $rows as $row ) {
			$html .= "<div class=\"scai-svc-row\"><span class=\"scai-svc-label\">" . esc_html( $row['label'] ) . "</span><span class=\"scai-svc-value\">" . esc_html( $row['value'] ) . "</span></div>\n";
		}
		$html .= "</div></div>";
		return $html;
	}

	private static function rebuild_why_local( $comp, $outer ) {
		if ( $outer ) {
			$html = $outer;
			$title = isset( $comp['title'] ) ? $comp['title'] : '';
			$badge = isset( $comp['badge'] ) ? $comp['badge'] : '';
			$image_src = isset( $comp['image_src'] ) ? $comp['image_src'] : '';

			if ( $title ) {
				$safe_title = esc_html( $title );
				$html = preg_replace_callback( '/(<h2\b[^>]*class="[^"]*scai-local-title[^"]*"[^>]*>)(.*?)(<\/h2>)/s', function ( $m ) use ( $safe_title ) {
					return $m[1] . $safe_title . $m[3];
				}, $html, 1 );
			}
			if ( $badge ) {
				$safe_badge = esc_html( $badge );
				$html = preg_replace_callback( '/(<span\b[^>]*class="[^"]*scai-local-badge[^"]*"[^>]*>)(.*?)(<\/span>)/s', function ( $m ) use ( $safe_badge ) {
					return $m[1] . $safe_badge . $m[3];
				}, $html, 1 );
			}
			if ( $image_src ) {
				$safe_src = esc_url( $image_src );
				$html = preg_replace_callback( '/(<img\b[^>]*\bsrc=")[^"]*(")/s', function ( $m ) use ( $safe_src ) {
					return $m[1] . $safe_src . $m[2];
				}, $html, 1 );
			}

			// Update list items.
			$items = isset( $comp['items'] ) ? $comp['items'] : array();
			$li = 0;
			$html = preg_replace_callback( '/<li>(.*?)<\/li>/s', function ( $m ) use ( $items, &$li ) {
				if ( isset( $items[ $li ] ) ) {
					$text = esc_html( $items[ $li ] );
					$li++;
					return '<li>' . $text . '</li>';
				}
				$li++;
				return $m[0];
			}, $html );

			return $html;
		}

		// Fallback for new components.
		$title = esc_html( isset( $comp['title'] ) ? $comp['title'] : '' );
		$badge = esc_html( isset( $comp['badge'] ) ? $comp['badge'] : 'Local Partner' );
		$image_src = isset( $comp['image_src'] ) ? esc_url( $comp['image_src'] ) : '';
		$items = isset( $comp['items'] ) ? $comp['items'] : array();

		$wrapper_class = 'scai-why-local-a';
		$html = "<div class=\"scai-component\"><div class=\"{$wrapper_class}\" data-component=\"scai-why-local-section\">\n";
		if ( $image_src ) {
			$html .= "<div class=\"scai-local-image\">\n<img src=\"{$image_src}\" alt=\"Local Provider\" class=\"scai-local-img\">\n</div>\n";
		}
		$html .= "<div class=\"scai-local-content\">\n";
		$html .= "<span class=\"scai-local-badge\">{$badge}</span>\n";
		$html .= "<h2 class=\"scai-local-title\">{$title}</h2>\n";
		$html .= "<ul class=\"scai-local-list\">\n";
		foreach ( $items as $item ) {
			$html .= "<li>" . esc_html( $item ) . "</li>\n";
		}
		$html .= "</ul>\n</div>\n</div></div>";
		return $html;
	}

	private static function rebuild_closing( $comp ) {
		$outer = isset( $comp['outer_html'] ) ? $comp['outer_html'] : '';
		$heading = isset( $comp['heading'] ) ? $comp['heading'] : '';
		$paragraphs = isset( $comp['paragraphs'] ) ? $comp['paragraphs'] : array();

		if ( $outer ) {
			$html = $outer;
			if ( $heading ) {
				$safe_heading = esc_html( $heading );
				$html = preg_replace_callback( '/(<h2\b[^>]*>)(.*?)(<\/h2>)/s', function ( $m ) use ( $safe_heading ) {
					return $m[1] . $safe_heading . $m[3];
				}, $html, 1 );
			}
			$html = self::replace_paragraphs( $html, $paragraphs );
			return $html;
		}

		$paragraphs = isset( $comp['paragraphs'] ) ? $comp['paragraphs'] : array();
		$heading_esc = esc_html( $heading );
		$html = "<section data-component=\"scai-closing\" class=\"scai-closing\">\n";
		if ( $heading_esc ) {
			$html .= "  <h2 class=\"scai-h2\">{$heading_esc}</h2>\n";
		}
		foreach ( $paragraphs as $p ) {
			$html .= "  <p class=\"scai-paragraph\">" . esc_html( $p ) . "</p>\n";
		}
		$html .= "</section>";
		return $html;
	}

	/**
	 * Rebuild heading + list components (feature-section, key-takeaways, etc.)
	 * using regex to update heading and list items in outer_html.
	 */
	private static function rebuild_heading_list( $comp, $outer, $type ) {
		$heading = isset( $comp['heading'] ) ? $comp['heading'] : '';
		$items   = isset( $comp['items'] ) ? $comp['items'] : array();

		if ( $outer ) {
			$html = $outer;

			// Update the heading text.
			if ( $heading ) {
				$safe_heading = esc_html( $heading );
				// Try h2 first, then div/span with known title classes.
				if ( preg_match( '/(<h2\b[^>]*>)(.*?)(<\/h2>)/s', $html ) ) {
					$html = preg_replace_callback( '/(<h2\b[^>]*>)(.*?)(<\/h2>)/s', function ( $m ) use ( $safe_heading ) {
						return $m[1] . $safe_heading . $m[3];
					}, $html, 1 );
				} else {
					// For takeaways/facts that use div/span titles.
					$title_classes = array( 'scai-takeaways-title', 'scai-facts-title' );
					foreach ( $title_classes as $cls ) {
						$pattern = '/(<[^>]*class="[^"]*\b' . preg_quote( $cls, '/' ) . '\b[^"]*"[^>]*>)(.*?)(<\/[a-z]+>)/s';
						if ( preg_match( $pattern, $html ) ) {
							$html = preg_replace_callback( $pattern, function ( $m ) use ( $safe_heading ) {
								return $m[1] . $safe_heading . $m[3];
							}, $html, 1 );
							break;
						}
					}
				}
			}

			// Update list items sequentially.
			$li = 0;
			$html = preg_replace_callback( '/<li>(.*?)<\/li>/s', function ( $m ) use ( $items, &$li ) {
				if ( isset( $items[ $li ] ) ) {
					$text = esc_html( $items[ $li ] );
					$li++;
					return '<li>' . $text . '</li>';
				}
				$li++;
				return $m[0];
			}, $html );

			return $html;
		}

		// Fallback for new components.
		$heading_esc = esc_html( $heading );
		$html = '<div data-component="' . esc_attr( $type ) . '"><h2>' . $heading_esc . '</h2><ul>';
		foreach ( $items as $item ) {
			$html .= '<li>' . esc_html( $item ) . '</li>';
		}
		$html .= '</ul></div>';
		return $html;
	}

	private static function rebuild_honorable_mentions( $comp, $outer ) {
		if ( $outer ) {
			$html = $outer;
			$heading = isset( $comp['heading'] ) ? $comp['heading'] : '';
			$items   = isset( $comp['items'] ) ? $comp['items'] : array();

			if ( $heading ) {
				$safe_heading = esc_html( $heading );
				$html = preg_replace_callback( '/(<h2\b[^>]*>)(.*?)(<\/h2>)/s', function ( $m ) use ( $safe_heading ) {
					return $m[1] . $safe_heading . $m[3];
				}, $html, 1 );
			}

			// Update h3 titles.
			$ti = 0;
			$html = preg_replace_callback( '/(<h3\b[^>]*>)(.*?)(<\/h3>)/s', function ( $m ) use ( $items, &$ti ) {
				if ( isset( $items[ $ti ] ) ) {
					$text = esc_html( $items[ $ti ]['title'] );
					$ti++;
					return $m[1] . $text . $m[3];
				}
				$ti++;
				return $m[0];
			}, $html );

			// Update paragraph descriptions.
			$di = 0;
			$desc_pattern = '/(<p\b[^>]*class="[^"]*scai-hm-paragraph[^"]*"[^>]*>)(.*?)(<\/p>)/s';
			if ( preg_match( $desc_pattern, $html ) ) {
				$html = preg_replace_callback( $desc_pattern, function ( $m ) use ( $items, &$di ) {
					if ( isset( $items[ $di ] ) ) {
						$text = esc_html( $items[ $di ]['desc'] );
						$di++;
						return $m[1] . $text . $m[3];
					}
					$di++;
					return $m[0];
				}, $html );
			} else {
				$html = preg_replace_callback( '/(<p\b[^>]*>)(.*?)(<\/p>)/s', function ( $m ) use ( $items, &$di ) {
					if ( isset( $items[ $di ] ) ) {
						$text = esc_html( $items[ $di ]['desc'] );
						$di++;
						return $m[1] . $text . $m[3];
					}
					$di++;
					return $m[0];
				}, $html );
			}

			return $html;
		}

		return isset( $comp['outer_html'] ) ? $comp['outer_html'] : '';
	}

	private static function rebuild_comparison_table( $comp, $outer ) {
		if ( ! $outer ) return '';
		$html    = $outer;
		$heading = isset( $comp['heading'] ) ? $comp['heading'] : '';
		$headers = isset( $comp['headers'] ) ? $comp['headers'] : array();
		$rows    = isset( $comp['rows'] ) ? $comp['rows'] : array();

		// Update title.
		if ( $heading ) {
			$safe = esc_html( $heading );
			$html = preg_replace_callback( '/(<[^>]*class="[^"]*scai-comp-title[^"]*"[^>]*>)(.*?)(<\/[a-z0-9]+>)/s', function ( $m ) use ( $safe ) {
				return $m[1] . $safe . $m[3];
			}, $html, 1 );
		}

		// Update th cells.
		$hi = 0;
		$html = preg_replace_callback( '/(<th\b[^>]*>)(.*?)(<\/th>)/s', function ( $m ) use ( $headers, &$hi ) {
			if ( isset( $headers[ $hi ] ) ) {
				$text = esc_html( $headers[ $hi ] );
				$hi++;
				return $m[1] . $text . $m[3];
			}
			$hi++;
			return $m[0];
		}, $html );

		// Update td cells (row by row using tr blocks).
		$ri = 0;
		$html = preg_replace_callback( '/<tr>(.*?)<\/tr>/s', function ( $tr_match ) use ( $rows, &$ri ) {
			// Skip header rows (no td).
			if ( strpos( $tr_match[1], '<td' ) === false ) return $tr_match[0];
			if ( ! isset( $rows[ $ri ] ) ) { $ri++; return $tr_match[0]; }
			$cells = $rows[ $ri ];
			$ci = 0;
			$new_tr = preg_replace_callback( '/(<td\b[^>]*>)(.*?)(<\/td>)/s', function ( $m ) use ( $cells, &$ci ) {
				if ( isset( $cells[ $ci ] ) ) {
					$text = esc_html( $cells[ $ci ] );
					$ci++;
					return $m[1] . $text . $m[3];
				}
				$ci++;
				return $m[0];
			}, $tr_match[1] );
			$ri++;
			return '<tr>' . $new_tr . '</tr>';
		}, $html );

		return $html;
	}

	private static function rebuild_cta_box( $comp, $outer ) {
		if ( ! $outer ) return '';
		$html = $outer;

		$replace_text = function ( $class, $text ) use ( &$html ) {
			$safe_text = esc_html( $text );
			$html = preg_replace_callback(
				'/(<[^>]*\bclass="[^"]*\b' . preg_quote( $class, '/' ) . '\b[^"]*"[^>]*>)(.*?)(<\/[a-z0-9]+>)/s',
				function ( $m ) use ( $safe_text ) { return $m[1] . $safe_text . $m[3]; },
				$html, 1
			);
		};

		if ( isset( $comp['heading'] ) )     $replace_text( 'scai-cta-title', $comp['heading'] );
		if ( isset( $comp['description'] ) ) $replace_text( 'scai-cta-text', $comp['description'] );
		if ( isset( $comp['btn_text'] ) )    $replace_text( 'scai-cta-button', $comp['btn_text'] );
		if ( isset( $comp['btn_url'] ) ) {
			$safe_url = esc_url( $comp['btn_url'] );
			$html = preg_replace_callback(
				'/(<[^>]*\bclass="[^"]*\bscai-cta-button\b[^"]*"[^>]*\bhref=")[^"]*(")/s',
				function ( $m ) use ( $safe_url ) { return $m[1] . $safe_url . $m[2]; },
				$html, 1
			);
		}

		return $html;
	}

	private static function rebuild_quick_verdict( $comp, $outer ) {
		if ( ! $outer ) return '';
		$html    = $outer;
		$heading = isset( $comp['heading'] ) ? $comp['heading'] : '';
		$options = isset( $comp['options'] ) ? $comp['options'] : array();

		if ( $heading ) {
			$safe = esc_html( $heading );
			$html = preg_replace_callback(
				'/(<[^>]*class="[^"]*scai-verdict-title[^"]*"[^>]*>)(.*?)(<\/[a-z]+>)/s',
				function ( $m ) use ( $safe ) { return $m[1] . $safe . $m[3]; },
				$html, 1
			);
		}

		$li = 0;
		$html = preg_replace_callback(
			'/(<[^>]*class="[^"]*scai-verdict-label[^"]*"[^>]*>)(.*?)(<\/[a-z]+>)/s',
			function ( $m ) use ( $options, &$li ) {
				if ( isset( $options[ $li ] ) ) {
					$text = esc_html( $options[ $li ]['label'] );
					$li++;
					return $m[1] . $text . $m[3];
				}
				$li++;
				return $m[0];
			}, $html
		);

		$ti = 0;
		$html = preg_replace_callback(
			'/(<[^>]*class="[^"]*scai-verdict-text[^"]*"[^>]*>)(.*?)(<\/[a-z]+>)/s',
			function ( $m ) use ( $options, &$ti ) {
				if ( isset( $options[ $ti ] ) ) {
					$text = esc_html( $options[ $ti ]['text'] );
					$ti++;
					return $m[1] . $text . $m[3];
				}
				$ti++;
				return $m[0];
			}, $html
		);

		return $html;
	}

	private static function rebuild_pros_cons( $comp, $outer ) {
		if ( ! $outer ) return '';
		$html    = $outer;
		$heading = isset( $comp['heading'] ) ? $comp['heading'] : '';
		$pros    = isset( $comp['pros'] ) ? $comp['pros'] : array();
		$cons    = isset( $comp['cons'] ) ? $comp['cons'] : array();

		if ( $heading ) {
			$safe = esc_html( $heading );
			$html = preg_replace_callback( '/(<h2\b[^>]*>)(.*?)(<\/h2>)/s', function ( $m ) use ( $safe ) {
				return $m[1] . $safe . $m[3];
			}, $html, 1 );
		}

		// Update pros items in the first list, cons in the second.
		// Split on the scai-pc-cons boundary.
		$parts = preg_split( '/(class="[^"]*scai-pc-cons[^"]*")/', $html, 2, PREG_SPLIT_DELIM_CAPTURE );
		if ( count( $parts ) >= 3 ) {
			// Update pros in first part.
			$pi = 0;
			$parts[0] = preg_replace_callback( '/<li>(.*?)<\/li>/s', function ( $m ) use ( $pros, &$pi ) {
				if ( isset( $pros[ $pi ] ) ) { $text = esc_html( $pros[ $pi ] ); $pi++; return '<li>' . $text . '</li>'; }
				$pi++; return $m[0];
			}, $parts[0] );

			// Update cons in remaining part.
			$ci = 0;
			$cons_html = $parts[1] . $parts[2];
			$cons_html = preg_replace_callback( '/<li>(.*?)<\/li>/s', function ( $m ) use ( $cons, &$ci ) {
				if ( isset( $cons[ $ci ] ) ) { $text = esc_html( $cons[ $ci ] ); $ci++; return '<li>' . $text . '</li>'; }
				$ci++; return $m[0];
			}, $cons_html );
			$html = $parts[0] . $cons_html;
		}

		return $html;
	}

	private static function rebuild_rating( $comp, $outer ) {
		if ( ! $outer ) return '';
		$html = $outer;

		$replace_text = function ( $class, $text ) use ( &$html ) {
			$safe_text = esc_html( $text );
			$html = preg_replace_callback(
				'/(<[^>]*\bclass="[^"]*\b' . preg_quote( $class, '/' ) . '\b[^"]*"[^>]*>)(.*?)(<\/[a-z0-9]+>)/s',
				function ( $m ) use ( $safe_text ) { return $m[1] . $safe_text . $m[3]; },
				$html, 1
			);
		};

		$heading = isset( $comp['heading'] ) ? $comp['heading'] : '';
		if ( $heading ) {
			$safe = esc_html( $heading );
			$html = preg_replace_callback( '/(<h2\b[^>]*>)(.*?)(<\/h2>)/s', function ( $m ) use ( $safe ) {
				return $m[1] . $safe . $m[3];
			}, $html, 1 );
		}

		if ( isset( $comp['score'] ) )   $replace_text( 'scai-rt-score', $comp['score'] );
		if ( isset( $comp['title'] ) )   $replace_text( 'scai-rt-title', $comp['title'] );
		if ( isset( $comp['summary'] ) ) $replace_text( 'scai-rt-paragraph', $comp['summary'] );

		return $html;
	}

	private static function rebuild_nutrition( $comp, $outer ) {
		if ( ! $outer ) return '';
		$html    = $outer;
		$heading = isset( $comp['heading'] ) ? $comp['heading'] : '';
		$rows    = isset( $comp['rows'] ) ? $comp['rows'] : array();

		if ( $heading ) {
			$safe = esc_html( $heading );
			$html = preg_replace_callback( '/(<h2\b[^>]*>)(.*?)(<\/h2>)/s', function ( $m ) use ( $safe ) {
				return $m[1] . $safe . $m[3];
			}, $html, 1 );
		}

		// Update td cells in pairs (nutrient, amount).
		$ri = 0;
		$html = preg_replace_callback( '/<tr>(.*?)<\/tr>/s', function ( $tr ) use ( $rows, &$ri ) {
			if ( strpos( $tr[1], '<td' ) === false ) return $tr[0];
			if ( ! isset( $rows[ $ri ] ) ) { $ri++; return $tr[0]; }
			$row = $rows[ $ri ];
			$ci = 0;
			$new_tr = preg_replace_callback( '/(<td\b[^>]*>)(.*?)(<\/td>)/s', function ( $m ) use ( $row, &$ci ) {
				if ( $ci === 0 && isset( $row['nutrient'] ) ) { $ci++; return $m[1] . esc_html( $row['nutrient'] ) . $m[3]; }
				if ( $ci === 1 && isset( $row['amount'] ) )   { $ci++; return $m[1] . esc_html( $row['amount'] ) . $m[3]; }
				$ci++;
				return $m[0];
			}, $tr[1] );
			$ri++;
			return '<tr>' . $new_tr . '</tr>';
		}, $html );

		return $html;
	}

	/**
	 * Replace paragraph text in outer_html via regex.
	 * Finds each <p class="...scai-paragraph..."> and replaces its text content
	 * with the corresponding value from $paragraphs.
	 */
	private static function replace_paragraphs( $html, $paragraphs ) {
		if ( empty( $paragraphs ) ) {
			return $html;
		}

		// Try matching paragraphs with scai-paragraph class first.
		$specific = '/(<p\b[^>]*class="[^"]*scai-paragraph[^"]*"[^>]*>)(.*?)(<\/p>)/s';
		if ( preg_match( $specific, $html ) ) {
			$i = 0;
			return preg_replace_callback( $specific, function ( $m ) use ( $paragraphs, &$i ) {
				if ( isset( $paragraphs[ $i ] ) ) {
					$text = esc_html( $paragraphs[ $i ] );
					$i++;
					return $m[1] . $text . $m[3];
				}
				$i++;
				return $m[0];
			}, $html );
		}

		// Fallback: match any <p> tag (for articles without scai-paragraph class).
		$i = 0;
		return preg_replace_callback(
			'/(<p\b[^>]*>)(.*?)(<\/p>)/s',
			function ( $m ) use ( $paragraphs, &$i ) {
				if ( isset( $paragraphs[ $i ] ) ) {
					$text = esc_html( $paragraphs[ $i ] );
					$i++;
					return $m[1] . $text . $m[3];
				}
				$i++;
				return $m[0];
			},
			$html
		);
	}

	private static function rebuild_from_outer( $comp, $outer ) {
		if ( empty( $outer ) ) {
			return '';
		}

		// Use regex-based replacements to avoid DOMDocument mangling SVGs and attributes.
		$html = $outer;

		// Helper: replace text content between tags matching a class.
		// Uses preg_replace_callback to avoid $text being parsed for backreferences.
		$replace_text = function ( $class, $text ) use ( &$html ) {
			$safe_text = esc_html( $text );
			$html = preg_replace_callback(
				'/(<[^>]*\bclass="[^"]*\b' . preg_quote( $class, '/' ) . '\b[^"]*"[^>]*>)(.*?)(<\/[a-z0-9]+>)/s',
				function ( $m ) use ( $safe_text ) {
					return $m[1] . $safe_text . $m[3];
				},
				$html, 1
			);
		};

		if ( isset( $comp['name'] ) )        $replace_text( 'scai-pc-title', $comp['name'] );
		if ( isset( $comp['rating'] ) )      $replace_text( 'scai-pc-rating-num', $comp['rating'] );
		if ( isset( $comp['price'] ) )       $replace_text( 'scai-pc-price', $comp['price'] );
		if ( isset( $comp['description'] ) ) $replace_text( 'scai-pc-desc', $comp['description'] );
		if ( isset( $comp['badge'] ) )       $replace_text( 'scai-pc-badge', $comp['badge'] );

		// CTA: update text + href.
		if ( isset( $comp['cta_text'] ) ) $replace_text( 'scai-pc-cta', $comp['cta_text'] );
		if ( isset( $comp['cta_url'] ) ) {
			$safe_url = esc_url( $comp['cta_url'] );
			$html = preg_replace_callback(
				'/(<[^>]*\bclass="[^"]*\bscai-pc-cta\b[^"]*"[^>]*\bhref=")[^"]*(")/s',
				function ( $m ) use ( $safe_url ) {
					return $m[1] . $safe_url . $m[2];
				},
				$html, 1
			);
		}

		// Image src.
		if ( isset( $comp['image_src'] ) ) {
			$safe_img = esc_url( $comp['image_src'] );
			$html = preg_replace_callback( '/(<img\b[^>]*\bsrc=")[^"]*(")/s', function ( $m ) use ( $safe_img ) {
				return $m[1] . $safe_img . $m[2];
			}, $html, 1 );
		}

		return $html;
	}

	/**
	 * Build the Table of Contents HTML from section headings.
	 */
	private static function build_toc_html( $headings, $original_content ) {
		if ( empty( $headings ) ) {
			return '';
		}

		// Try to detect the TOC variation class from original.
		$toc_class = 'scai-toc-clean';
		if ( preg_match( '/class="(scai-toc-[a-z]+)"/', $original_content, $m ) ) {
			$toc_class = $m[1];
		}
		$toc_id = 'scai-q-toc-1';
		if ( preg_match( '/id="(scai-[a-z]+-toc-\d+)"/', $original_content, $m ) ) {
			$toc_id = $m[1];
		}

		$html = "<div class=\"scai-component\"><nav class=\"{$toc_class}\" data-component=\"scai-table-of-contents\" id=\"{$toc_id}\">\n";
		$html .= "<div class=\"scai-toc-title\">Table of Contents</div>\n";
		$html .= "<ul class=\"scai-toc-list\">\n";

		foreach ( $headings as $h ) {
			$id = esc_attr( $h['id'] );
			$title = esc_html( $h['title'] );
			$html .= "<li><a href=\"#{$id}\">{$title}</a></li>\n";
		}

		$html .= "</ul>\n</nav></div>";
		return $html;
	}

	/* ─── Utility Methods ─────────────────────────────────────────── */

	/**
	 * Extract the HTML from the Gutenberg block comment.
	 */
	private static function extract_block_html( $post_content ) {
		// Match content between <!-- wp:scai/article --> and <!-- /wp:scai/article -->
		if ( preg_match( '/<!-- wp:scai\/article[^>]*-->\s*(.*?)\s*<!-- \/wp:scai\/article -->/s', $post_content, $m ) ) {
			return $m[1];
		}
		// If no block comment, try using the raw content.
		if ( strpos( $post_content, 'data-component' ) !== false ) {
			return $post_content;
		}
		return '';
	}

	/**
	 * Extract a meta attribute from the article tag.
	 */
	public static function extract_article_meta( $content, $attr ) {
		// Try HTML data attribute first (new exports).
		if ( preg_match( '/' . preg_quote( $attr, '/' ) . '="([^"]*)"/', $content, $m ) ) {
			return $m[1];
		}
		// Fallback: read from block comment JSON attributes.
		$key_map = array(
			'data-article-type' => 'articleType',
			'data-variation'    => 'variation',
			'data-color-theme'  => 'colorTheme',
		);
		if ( isset( $key_map[ $attr ] ) ) {
			if ( preg_match( '/<!-- wp:scai\/article\s+(\{[^}]+\})\s*-->/', $content, $bm ) ) {
				$attrs = json_decode( $bm[1], true );
				$key = $key_map[ $attr ];
				if ( ! empty( $attrs[ $key ] ) ) {
					return $attrs[ $key ];
				}
			}
		}
		return '';
	}

	/**
	 * Extract the JSON attributes from the block comment.
	 * e.g. <!-- wp:scai/article {"variation":"clean-studio","colorTheme":"default"} -->
	 * Returns the JSON string or empty.
	 */
	private static function extract_block_attrs( $content ) {
		if ( preg_match( '/<!-- wp:scai\/article\s+(\{[^}]+\})\s*-->/', $content, $m ) ) {
			return $m[1];
		}
		return '';
	}

	/**
	 * Extract the opening wrapper tag from the block content.
	 * Export uses: <div class="wp-block-scai-article scai-wrapper" data-variation="..." ...>
	 * Fallback to <article> for raw HTML.
	 */
	private static function extract_wrapper_tag( $content ) {
		$html = self::extract_block_html( $content );
		// Try Gutenberg wrapper div.
		if ( preg_match( '/<div\s[^>]*wp-block-scai-article[^>]*>/', $html, $m ) ) {
			return $m[0];
		}
		// Fallback: article tag.
		if ( preg_match( '/<article[^>]*>/', $html, $m ) ) {
			return $m[0];
		}
		return '<div class="wp-block-scai-article scai-wrapper">';
	}

	/**
	 * Extract the inner scai-wrapper div tag from two-div wrapper structure.
	 *
	 * Current export creates two nested wrappers:
	 *   <div class="wp-block-scai-article alignfull">
	 *     <div class="scai-wrapper" data-variation="..." data-color-theme="...">
	 *
	 * If the outer wrapper already contains 'scai-wrapper' (single-div format),
	 * returns empty string. Otherwise returns the inner tag, or reconstructs it
	 * from block comment attributes as a fallback.
	 */
	private static function extract_inner_wrapper_tag( $content ) {
		$html = self::extract_block_html( $content );
		if ( ! $html ) {
			return '';
		}

		// If the outer wrapper already has scai-wrapper class, no inner needed.
		if ( preg_match( '/<div\s[^>]*wp-block-scai-article[^>]*scai-wrapper/', $html ) ) {
			return '';
		}

		// Look for the inner scai-wrapper div.
		if ( preg_match( '/<div\s[^>]*\bscai-wrapper\b[^>]*>/', $html, $m ) ) {
			return $m[0];
		}

		// Not found (e.g. article was saved before this fix) — reconstruct from block attrs.
		$block_attrs = self::extract_block_attrs( $content );
		if ( $block_attrs ) {
			$attrs = json_decode( $block_attrs, true );
			$variation   = isset( $attrs['variation'] )  ? esc_attr( $attrs['variation'] )  : '';
			$color_theme = isset( $attrs['colorTheme'] ) ? esc_attr( $attrs['colorTheme'] ) : '';

			$tag = '<div class="scai-wrapper"';
			if ( $variation ) {
				$tag .= ' data-variation="' . $variation . '"';
			}
			if ( $color_theme ) {
				$tag .= ' data-color-theme="' . $color_theme . '"';
			}
			$tag .= '>';
			return $tag;
		}

		return '';
	}

	/**
	 * Get outer HTML of a DOMNode.
	 */
	private static function get_outer_html( $node, $doc ) {
		return $doc->saveHTML( $node );
	}

	/**
	 * Get inner HTML of a DOMNode.
	 */
	private static function get_inner_html( $node, $doc ) {
		$html = '';
		foreach ( $node->childNodes as $child ) {
			$html .= $doc->saveHTML( $child );
		}
		return $html;
	}

	/**
	 * Get a human-readable label for a component type.
	 */
	private static function get_component_label( $type ) {
		$labels = array(
			'scai-h1'                   => 'Title',
			'scai-featured-image'       => 'Featured Image',
			'scai-overview'             => 'Overview',
			'scai-table-of-contents'    => 'Table of Contents',
			'scai-section'              => 'Content Section',
			'scai-faq-section'          => 'FAQ',
			'scai-product-card'         => 'Product Card',
			'scai-service-info-box'     => 'Service Info',
			'scai-why-local-section'    => 'Why Choose Local',
			'scai-closing'              => 'Closing',
			'scai-faq-h2'               => 'FAQ Title',
			'scai-cta-box'              => 'Call to Action',
			'scai-feature-section'      => 'Features',
			'scai-key-takeaways'        => 'Key Takeaways',
			'scai-quick-facts-section'  => 'Quick Facts',
			'scai-requirements-box'     => 'Requirements',
			'scai-pro-tips-section'     => 'Pro Tips',
			'scai-honorable-mentions'   => 'Honorable Mentions',
			'scai-ingredients-section'  => 'Ingredients',
			'scai-instructions-section' => 'Instructions',
			'scai-comparison-table'     => 'Comparison Table',
			'scai-quick-verdict'        => 'Quick Verdict',
			'scai-pros-cons-section'    => 'Pros & Cons',
			'scai-rating-section'       => 'Rating',
			'scai-nutrition-section'    => 'Nutrition Facts',
		);

		return isset( $labels[ $type ] ) ? $labels[ $type ] : ucwords( str_replace( array( 'scai-', '-' ), array( '', ' ' ), $type ) );
	}

	/**
	 * Get an SVG icon for the sidebar component buttons.
	 */
	private static function get_component_svg( $icon ) {
		$svgs = array(
			'section'      => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><path d="M4 6h16M4 10h16M4 14h10"/></svg>',
			'faq'          => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 015.12 2.13c0 2-3 2.5-3 4.37M12 17h.01"/></svg>',
			'product'      => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><path d="M9 14h6M9 17h4"/></svg>',
			'info'         => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>',
			'local'        => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>',
			'closing'      => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><path d="M4 6h16M4 10h16M4 14h16M4 18h8"/></svg>',
			'features'     => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
			'cta'          => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M12 8V6M8 12h8"/></svg>',
			'comparison'   => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',
			'verdict'      => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><path d="M14 9V5a3 3 0 00-6 0v4"/><rect x="2" y="9" width="20" height="11" rx="2"/><circle cx="12" cy="15" r="1"/></svg>',
			'requirements' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
			'tips'         => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><path d="M12 2a7 7 0 00-2.05 13.7A2.5 2.5 0 0112 18.5a2.5 2.5 0 012.05-2.8A7 7 0 0012 2z"/><path d="M10 21h4"/></svg>',
			'takeaways'    => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>',
			'facts'        => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
			'mentions'     => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
			'ingredients'  => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
			'instructions' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="4" y="8" font-size="8" fill="currentColor" stroke="none">1</text><text x="4" y="14" font-size="8" fill="currentColor" stroke="none">2</text><text x="4" y="20" font-size="8" fill="currentColor" stroke="none">3</text></svg>',
			'nutrition'    => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="9" x2="12" y2="21"/></svg>',
			'proscons'     => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/><line x1="18" y1="6" x2="6" y2="18" stroke-opacity="0.4"/></svg>',
			'rating'       => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
		);
		return isset( $svgs[ $icon ] ) ? $svgs[ $icon ] : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
	}

	/**
	 * Get an SVG icon for a component card header by its data-component type.
	 */
	private static function get_card_icon( $type ) {
		// All icons inherit from the sidebar SVGs but at 16px.
		$icon_key = isset( self::$component_registry[ $type ] ) ? self::$component_registry[ $type ]['icon'] : '';
		$static = array(
			'scai-h1'                => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M6 4v16M18 4v16M6 12h12"/></svg>',
			'scai-featured-image'    => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
			'scai-overview'          => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M4 6h16M4 10h16M4 14h10"/></svg>',
			'scai-table-of-contents' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
			'scai-faq-h2'            => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 015.12 2.13c0 2-3 2.5-3 4.37M12 17h.01"/></svg>',
		);
		if ( isset( $static[ $type ] ) ) return $static[ $type ];

		// For registered types, reuse the sidebar SVG at 16px.
		if ( $icon_key ) {
			$svg = self::get_component_svg( $icon_key );
			// Replace width/height 20 with 16.
			return str_replace( array( 'width="20"', 'height="20"' ), array( 'width="16"', 'height="16"' ), $svg );
		}

		return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
	}
}
