<?php
/**
 * SCAI Connector — Skeleton Templates for New Components.
 *
 * Returns variation-aware skeleton HTML for each addable component type.
 * Used when adding new components via the editor sidebar so they
 * inherit the article's design variation from the start.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class SCAI_Templates {

	/**
	 * Variation suffix map.
	 * Maps the data-variation attribute to CSS class suffixes.
	 */
	private static $suffix_map = array(
		'clean-studio'   => 'studio',
		'airy-premium'   => 'airy',
		'gradient-glow'  => 'glow',
		'soft-stone'     => 'stone',
	);

	/**
	 * Get all skeleton templates for a given variation.
	 *
	 * @param string $variation The variation slug (e.g. 'clean-studio').
	 * @return array Associative array of component-type => skeleton HTML.
	 */
	public static function get_all_skeletons( $variation ) {
		$skeletons = array();
		$types = array(
			'scai-section',
			'scai-faq-section',
			'scai-product-card',
			'scai-service-info-box',
			'scai-why-local-section',
			'scai-closing',
			'scai-feature-section',
			'scai-key-takeaways',
			'scai-quick-facts-section',
			'scai-requirements-box',
			'scai-pro-tips-section',
			'scai-honorable-mentions',
			'scai-ingredients-section',
			'scai-instructions-section',
			'scai-comparison-table',
			'scai-cta-box',
			'scai-quick-verdict',
			'scai-pros-cons-section',
			'scai-rating-section',
			'scai-nutrition-section',
		);
		foreach ( $types as $type ) {
			$skeletons[ $type ] = self::get_skeleton( $type, $variation );
		}
		return $skeletons;
	}

	/**
	 * Get a skeleton HTML template for a component type + variation.
	 *
	 * @param string $type      Component type (e.g. 'scai-feature-section').
	 * @param string $variation Variation slug (e.g. 'clean-studio').
	 * @return string Skeleton HTML.
	 */
	public static function get_skeleton( $type, $variation ) {
		$s = isset( self::$suffix_map[ $variation ] ) ? self::$suffix_map[ $variation ] : 'studio';

		switch ( $type ) {
			case 'scai-section':
				return '<section data-component="scai-section" class="scai-section"><h2 class="scai-h2">New Section</h2><p class="scai-paragraph">Start writing here...</p></section>';

			case 'scai-faq-section':
				return '<div class="scai-faq-' . $s . '" data-component="scai-faq-section"><h2 class="scai-faq-h2">Frequently Asked Questions</h2><div class="scai-faq-item"><h3 class="scai-faq-h3">Question?</h3><p class="scai-faq-answer">Answer here.</p></div></div>';

			case 'scai-product-card':
				return '<div class="scai-pc-' . $s . '" data-component="scai-product-card"><div class="scai-pc-badge">Editor\'s Pick</div><h3 class="scai-pc-title">Product Name</h3><span class="scai-pc-rating-num">4.5</span><span class="scai-pc-price">$0.00</span><p class="scai-pc-desc">Product description here.</p><a href="#" class="scai-pc-cta">View Details</a></div>';

			case 'scai-service-info-box':
				return '<div class="scai-svc-' . $s . '" data-component="scai-service-info-box"><div class="scai-svc-header">Service Information</div><div class="scai-svc-row"><span class="scai-svc-label">Label</span><span class="scai-svc-value">Value</span></div></div>';

			case 'scai-why-local-section':
				return '<div class="scai-why-local-' . ( $s === 'studio' ? 'a' : $s ) . '" data-component="scai-why-local-section"><span class="scai-local-badge">Local Partner</span><h2 class="scai-local-title">Why Choose Local</h2><ul class="scai-local-list"><li>Benefit item here</li></ul></div>';

			case 'scai-closing':
				return '<section data-component="scai-closing" class="scai-closing"><h2 class="scai-h2">Conclusion</h2><p class="scai-paragraph">Closing paragraph here.</p></section>';

			case 'scai-feature-section':
				return '<div class="scai-feature-' . ( $s === 'studio' ? 'clean' : $s ) . '" data-component="scai-feature-section"><h2 class="scai-feature-h2">Key Features</h2><ul class="scai-feature-list"><li>Feature item here</li></ul></div>';

			case 'scai-key-takeaways':
				return '<div class="scai-takeaways-' . $s . '" data-component="scai-key-takeaways"><div class="scai-takeaways-title">Key Takeaways</div><ul class="scai-takeaways-list"><li>Takeaway item here</li></ul></div>';

			case 'scai-quick-facts-section':
				return '<div class="scai-facts-' . $s . '" data-component="scai-quick-facts-section"><span class="scai-facts-title">Quick Facts</span><ul class="scai-facts-list"><li>Fact item here</li></ul></div>';

			case 'scai-requirements-box':
				return '<div class="scai-req-' . $s . '" data-component="scai-requirements-box"><h2 class="scai-requirements-h2">What You Will Need</h2><ul class="scai-requirements-list"><li>Requirement item here</li></ul></div>';

			case 'scai-pro-tips-section':
				return '<div class="scai-tips-' . $s . '" data-component="scai-pro-tips-section"><h2 class="scai-tips-h2">Pro Tips</h2><ol class="scai-tips-list"><li>Tip item here</li></ol></div>';

			case 'scai-honorable-mentions':
				return '<div class="scai-hm-' . $s . '" data-component="scai-honorable-mentions"><h2 class="scai-hm-h2">Honorable Mentions</h2><div class="scai-hm-list"><div class="scai-hm-item"><h3 class="scai-hm-h3">Mention Title</h3><p class="scai-hm-paragraph">Description here.</p></div></div></div>';

			case 'scai-ingredients-section':
				return '<div class="scai-ing-' . $s . '" data-component="scai-ingredients-section"><h2 class="scai-ing-h2">Ingredients</h2><ul class="scai-ing-list"><li>Ingredient item here</li></ul></div>';

			case 'scai-instructions-section':
				return '<div class="scai-inst-' . $s . '" data-component="scai-instructions-section"><h2 class="scai-instructions-h2">Step-by-Step Instructions</h2><ol class="scai-instructions-list"><li>Step instruction here</li></ol></div>';

			case 'scai-comparison-table':
				return '<div class="scai-comp-' . $s . '" data-component="scai-comparison-table"><h3 class="scai-comp-title">Product Comparison</h3><table class="scai-comp-table"><thead><tr><th>Feature</th><th>Product A</th><th>Product B</th></tr></thead><tbody><tr><td>Price</td><td>$0</td><td>$0</td></tr></tbody></table></div>';

			case 'scai-cta-box':
				return '<div class="scai-cta-' . $s . '" data-component="scai-cta-box"><div class="scai-cta-inner"><h3 class="scai-cta-title">Call to Action</h3><p class="scai-cta-text">Description here.</p></div><a href="#" class="scai-cta-button">Get Started</a></div>';

			case 'scai-quick-verdict':
				return '<div class="scai-verdict-' . $s . '" data-component="scai-quick-verdict"><div class="scai-verdict-title">Quick Verdict</div><div class="scai-verdict-options"><div class="scai-verdict-option"><div class="scai-verdict-label">Choose Option A</div><p class="scai-verdict-text">Best for...</p></div><div class="scai-verdict-option"><div class="scai-verdict-label">Choose Option B</div><p class="scai-verdict-text">Best for...</p></div></div></div>';

			case 'scai-pros-cons-section':
				return '<div class="scai-pc-' . $s . '" data-component="scai-pros-cons-section"><h2 class="scai-pc-h2">Pros and Cons</h2><div class="scai-pc-grid"><div class="scai-pc-pros"><div class="scai-pc-header">Advantages</div><ul class="scai-pc-list"><li>Pro item here</li></ul></div><div class="scai-pc-cons"><div class="scai-pc-header">Limitations</div><ul class="scai-pc-list"><li>Con item here</li></ul></div></div></div>';

			case 'scai-rating-section':
				return '<div class="scai-rt-' . $s . '" data-component="scai-rating-section"><h2 class="scai-rt-h2">Our Verdict</h2><div class="scai-rt-body"><div class="scai-rt-score-wrap"><span class="scai-rt-score">0</span><span class="scai-rt-label">out of 10</span></div><div class="scai-rt-content"><h3 class="scai-rt-title">Rating</h3><p class="scai-rt-paragraph">Rating summary here.</p></div></div></div>';

			case 'scai-nutrition-section':
				return '<div class="scai-nutr-' . $s . '" data-component="scai-nutrition-section"><h2 class="scai-nutr-h2">Nutrition Facts</h2><table class="scai-nutr-table"><tbody><tr><td>Calories</td><td>0</td></tr></tbody></table></div>';

			default:
				return '';
		}
	}
}
