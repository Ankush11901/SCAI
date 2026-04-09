<?php
/**
 * SCAI Connector — Editor AJAX Handler.
 *
 * Handles saving the section-level editor form.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class SCAI_Editor_Ajax {

	/**
	 * Register AJAX actions.
	 */
	public static function register() {
		add_action( 'wp_ajax_scai_save_editor', array( __CLASS__, 'save_editor' ) );
	}

	/**
	 * Save the editor form data.
	 */
	public static function save_editor() {
		check_ajax_referer( 'scai_save_editor', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Permission denied.' ), 403 );
		}

		$post_id = isset( $_POST['post_id'] ) ? absint( $_POST['post_id'] ) : 0;
		if ( ! $post_id ) {
			wp_send_json_error( array( 'message' => 'Missing post ID.' ) );
		}

		$post = get_post( $post_id );
		if ( ! $post || strpos( $post->post_content, 'wp:scai/article' ) === false ) {
			wp_send_json_error( array( 'message' => 'Post not found or not an SCAI article.' ) );
		}

		// Parse the components from the form data.
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- We sanitize each field individually below.
		$raw_components = isset( $_POST['components'] ) ? $_POST['components'] : array();

		if ( empty( $raw_components ) || ! is_array( $raw_components ) ) {
			wp_send_json_error( array( 'message' => 'No components to save.' ) );
		}

		// Sanitize each component.
		$components = array();
		foreach ( $raw_components as $index => $comp ) {
			$components[] = self::sanitize_component( $comp );
		}

		// Rebuild the HTML.
		$new_content = SCAI_Editor::rebuild_html( $post_id, $components );

		// Update the post.
		$result = wp_update_post( array(
			'ID'           => $post_id,
			'post_content' => $new_content,
		), true );

		if ( is_wp_error( $result ) ) {
			wp_send_json_error( array( 'message' => 'Failed to save: ' . $result->get_error_message() ) );
		}

		// Only update the post title if the h1 actually changed.
		foreach ( $components as $comp ) {
			if ( $comp['type'] === 'scai-h1' && ! empty( $comp['title'] ) ) {
				$current_title = get_the_title( $post_id );
				if ( $comp['title'] !== $current_title ) {
					wp_update_post( array(
						'ID'         => $post_id,
						'post_title' => sanitize_text_field( $comp['title'] ),
					) );
				}
				break;
			}
		}

		wp_send_json_success( array( 'message' => 'Article saved successfully.' ) );
	}

	/**
	 * Sanitize a single component's data.
	 */
	private static function sanitize_component( $comp ) {
		$sanitized = array(
			'type'       => isset( $comp['type'] ) ? sanitize_key( $comp['type'] ) : '',
			'outer_html' => isset( $comp['outer_html'] ) ? $comp['outer_html'] : '',
		);

		$type = $sanitized['type'];

		switch ( $type ) {
			case 'scai-h1':
				$sanitized['title'] = isset( $comp['title'] ) ? sanitize_text_field( $comp['title'] ) : '';
				break;

			case 'scai-featured-image':
				$sanitized['src'] = isset( $comp['src'] ) ? esc_url_raw( $comp['src'] ) : '';
				$sanitized['alt'] = isset( $comp['alt'] ) ? sanitize_text_field( $comp['alt'] ) : '';
				$sanitized['caption'] = isset( $comp['caption'] ) ? sanitize_text_field( $comp['caption'] ) : '';
				break;

			case 'scai-overview':
				$sanitized['paragraphs'] = self::sanitize_paragraphs( isset( $comp['paragraphs'] ) ? $comp['paragraphs'] : array() );
				break;

			case 'scai-table-of-contents':
				$sanitized['auto'] = true;
				break;

			case 'scai-section':
				$sanitized['heading'] = isset( $comp['heading'] ) ? sanitize_text_field( $comp['heading'] ) : '';
				$sanitized['section_id'] = isset( $comp['section_id'] ) ? sanitize_key( $comp['section_id'] ) : '';
				$sanitized['image_src'] = isset( $comp['image_src'] ) ? esc_url_raw( $comp['image_src'] ) : '';
				$sanitized['image_alt'] = isset( $comp['image_alt'] ) ? sanitize_text_field( $comp['image_alt'] ) : '';
				$sanitized['image_caption'] = isset( $comp['image_caption'] ) ? sanitize_text_field( $comp['image_caption'] ) : '';
				$sanitized['paragraphs'] = self::sanitize_paragraphs( isset( $comp['paragraphs'] ) ? $comp['paragraphs'] : array() );
				break;

			case 'scai-faq-section':
				$sanitized['title'] = isset( $comp['title'] ) ? sanitize_text_field( $comp['title'] ) : '';
				$sanitized['items'] = array();
				if ( isset( $comp['items'] ) && is_array( $comp['items'] ) ) {
					foreach ( $comp['items'] as $item ) {
						if ( ! empty( $item['q'] ) || ! empty( $item['a'] ) ) {
							$sanitized['items'][] = array(
								'q' => sanitize_text_field( $item['q'] ),
								'a' => sanitize_textarea_field( $item['a'] ),
							);
						}
					}
				}
				break;

			case 'scai-product-card':
				$sanitized['name'] = isset( $comp['name'] ) ? sanitize_text_field( $comp['name'] ) : '';
				$sanitized['rating'] = isset( $comp['rating'] ) ? sanitize_text_field( $comp['rating'] ) : '';
				$sanitized['price'] = isset( $comp['price'] ) ? sanitize_text_field( $comp['price'] ) : '';
				$sanitized['description'] = isset( $comp['description'] ) ? sanitize_textarea_field( $comp['description'] ) : '';
				$sanitized['cta_text'] = isset( $comp['cta_text'] ) ? sanitize_text_field( $comp['cta_text'] ) : '';
				$sanitized['cta_url'] = isset( $comp['cta_url'] ) ? esc_url_raw( $comp['cta_url'] ) : '';
				$sanitized['image_src'] = isset( $comp['image_src'] ) ? esc_url_raw( $comp['image_src'] ) : '';
				$sanitized['badge'] = isset( $comp['badge'] ) ? sanitize_text_field( $comp['badge'] ) : '';
				break;

			case 'scai-service-info-box':
				$sanitized['header'] = isset( $comp['header'] ) ? sanitize_text_field( $comp['header'] ) : '';
				$sanitized['rows'] = array();
				if ( isset( $comp['rows'] ) && is_array( $comp['rows'] ) ) {
					foreach ( $comp['rows'] as $row ) {
						if ( ! empty( $row['label'] ) || ! empty( $row['value'] ) ) {
							$sanitized['rows'][] = array(
								'label' => sanitize_text_field( $row['label'] ),
								'value' => sanitize_text_field( $row['value'] ),
							);
						}
					}
				}
				break;

			case 'scai-why-local-section':
				$sanitized['title'] = isset( $comp['title'] ) ? sanitize_text_field( $comp['title'] ) : '';
				$sanitized['badge'] = isset( $comp['badge'] ) ? sanitize_text_field( $comp['badge'] ) : '';
				$sanitized['image_src'] = isset( $comp['image_src'] ) ? esc_url_raw( $comp['image_src'] ) : '';
				$sanitized['items'] = array();
				if ( isset( $comp['items'] ) && is_array( $comp['items'] ) ) {
					foreach ( $comp['items'] as $item ) {
						$text = sanitize_text_field( $item );
						if ( ! empty( $text ) ) {
							$sanitized['items'][] = $text;
						}
					}
				}
				break;

			case 'scai-closing':
				$sanitized['heading'] = isset( $comp['heading'] ) ? sanitize_text_field( $comp['heading'] ) : '';
				$sanitized['paragraphs'] = self::sanitize_paragraphs( isset( $comp['paragraphs'] ) ? $comp['paragraphs'] : array() );
				break;

			case 'scai-feature-section':
			case 'scai-key-takeaways':
			case 'scai-quick-facts-section':
			case 'scai-requirements-box':
			case 'scai-pro-tips-section':
			case 'scai-ingredients-section':
			case 'scai-instructions-section':
				$sanitized['heading'] = isset( $comp['heading'] ) ? sanitize_text_field( $comp['heading'] ) : '';
				$sanitized['items'] = array();
				if ( isset( $comp['items'] ) && is_array( $comp['items'] ) ) {
					foreach ( $comp['items'] as $item ) {
						$text = sanitize_text_field( $item );
						if ( ! empty( $text ) ) {
							$sanitized['items'][] = $text;
						}
					}
				}
				break;

			case 'scai-honorable-mentions':
				$sanitized['heading'] = isset( $comp['heading'] ) ? sanitize_text_field( $comp['heading'] ) : '';
				$sanitized['items'] = array();
				if ( isset( $comp['items'] ) && is_array( $comp['items'] ) ) {
					foreach ( $comp['items'] as $item ) {
						if ( ! empty( $item['title'] ) || ! empty( $item['desc'] ) ) {
							$sanitized['items'][] = array(
								'title' => sanitize_text_field( $item['title'] ),
								'desc'  => sanitize_textarea_field( $item['desc'] ),
							);
						}
					}
				}
				break;

			case 'scai-comparison-table':
				$sanitized['heading'] = isset( $comp['heading'] ) ? sanitize_text_field( $comp['heading'] ) : '';
				$sanitized['headers'] = array();
				if ( isset( $comp['headers'] ) && is_array( $comp['headers'] ) ) {
					foreach ( $comp['headers'] as $h ) {
						$sanitized['headers'][] = sanitize_text_field( $h );
					}
				}
				$sanitized['rows'] = array();
				if ( isset( $comp['rows'] ) && is_array( $comp['rows'] ) ) {
					foreach ( $comp['rows'] as $row ) {
						if ( is_array( $row ) ) {
							$sanitized_row = array();
							foreach ( $row as $cell ) {
								$sanitized_row[] = sanitize_text_field( $cell );
							}
							$sanitized['rows'][] = $sanitized_row;
						}
					}
				}
				break;

			case 'scai-cta-box':
				$sanitized['heading']     = isset( $comp['heading'] ) ? sanitize_text_field( $comp['heading'] ) : '';
				$sanitized['description'] = isset( $comp['description'] ) ? sanitize_textarea_field( $comp['description'] ) : '';
				$sanitized['btn_text']    = isset( $comp['btn_text'] ) ? sanitize_text_field( $comp['btn_text'] ) : '';
				$sanitized['btn_url']     = isset( $comp['btn_url'] ) ? esc_url_raw( $comp['btn_url'] ) : '';
				break;

			case 'scai-quick-verdict':
				$sanitized['heading'] = isset( $comp['heading'] ) ? sanitize_text_field( $comp['heading'] ) : '';
				$sanitized['options'] = array();
				if ( isset( $comp['options'] ) && is_array( $comp['options'] ) ) {
					foreach ( $comp['options'] as $opt ) {
						if ( ! empty( $opt['label'] ) || ! empty( $opt['text'] ) ) {
							$sanitized['options'][] = array(
								'label' => sanitize_text_field( $opt['label'] ),
								'text'  => sanitize_textarea_field( $opt['text'] ),
							);
						}
					}
				}
				break;

			case 'scai-pros-cons-section':
				$sanitized['heading'] = isset( $comp['heading'] ) ? sanitize_text_field( $comp['heading'] ) : '';
				$sanitized['pros'] = array();
				$sanitized['cons'] = array();
				if ( isset( $comp['pros'] ) && is_array( $comp['pros'] ) ) {
					foreach ( $comp['pros'] as $item ) {
						$text = sanitize_text_field( $item );
						if ( ! empty( $text ) ) $sanitized['pros'][] = $text;
					}
				}
				if ( isset( $comp['cons'] ) && is_array( $comp['cons'] ) ) {
					foreach ( $comp['cons'] as $item ) {
						$text = sanitize_text_field( $item );
						if ( ! empty( $text ) ) $sanitized['cons'][] = $text;
					}
				}
				break;

			case 'scai-rating-section':
				$sanitized['heading'] = isset( $comp['heading'] ) ? sanitize_text_field( $comp['heading'] ) : '';
				$sanitized['score']   = isset( $comp['score'] ) ? sanitize_text_field( $comp['score'] ) : '';
				$sanitized['title']   = isset( $comp['title'] ) ? sanitize_text_field( $comp['title'] ) : '';
				$sanitized['summary'] = isset( $comp['summary'] ) ? sanitize_textarea_field( $comp['summary'] ) : '';
				break;

			case 'scai-nutrition-section':
				$sanitized['heading'] = isset( $comp['heading'] ) ? sanitize_text_field( $comp['heading'] ) : '';
				$sanitized['rows'] = array();
				if ( isset( $comp['rows'] ) && is_array( $comp['rows'] ) ) {
					foreach ( $comp['rows'] as $row ) {
						if ( ! empty( $row['nutrient'] ) || ! empty( $row['amount'] ) ) {
							$sanitized['rows'][] = array(
								'nutrient' => sanitize_text_field( $row['nutrient'] ),
								'amount'   => sanitize_text_field( $row['amount'] ),
							);
						}
					}
				}
				break;

			default:
				// Unknown component — outer_html is already preserved at the top.
				// Do NOT run wp_kses_post here: it strips SVGs, data-* attributes,
				// and other variation-specific markup that must be kept intact.
				break;
		}

		return $sanitized;
	}

	/**
	 * Sanitize an array of paragraphs.
	 */
	private static function sanitize_paragraphs( $paragraphs ) {
		if ( ! is_array( $paragraphs ) ) {
			return array();
		}
		$clean = array();
		foreach ( $paragraphs as $p ) {
			$text = sanitize_textarea_field( $p );
			if ( ! empty( trim( $text ) ) ) {
				$clean[] = $text;
			}
		}
		return $clean;
	}
}
