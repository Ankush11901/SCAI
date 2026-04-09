<?php
/**
 * SCAI Connector — AJAX Handlers.
 *
 * Handles admin-ajax.php actions for:
 *   - Saving styling options
 *   - Saving settings (import defaults)
 *   - Bulk article actions (publish, draft, trash)
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class SCAI_Ajax {

	/**
	 * Register AJAX actions.
	 */
	public static function register() {
		add_action( 'wp_ajax_scai_save_styling',    array( __CLASS__, 'save_styling' ) );
		add_action( 'wp_ajax_scai_save_settings',   array( __CLASS__, 'save_settings' ) );
		add_action( 'wp_ajax_scai_bulk_articles',    array( __CLASS__, 'bulk_articles' ) );
	}

	/* ─── Save Styling ────────────────────────────────────────────── */

	public static function save_styling() {
		check_ajax_referer( 'scai_save_styling', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Permission denied.' ), 403 );
		}

		$allowed_variations = array( 'clean-studio', 'airy-premium', 'gradient-glow', 'soft-stone' );

		$variation = isset( $_POST['variation'] ) ? sanitize_text_field( $_POST['variation'] ) : 'clean-studio';
		if ( ! in_array( $variation, $allowed_variations, true ) ) {
			$variation = 'clean-studio';
		}

		$data = array(
			'variation'     => $variation,
			'heading_font'  => self::sanitize_font( isset( $_POST['heading_font'] ) ? $_POST['heading_font'] : '' ),
			'body_font'     => self::sanitize_font( isset( $_POST['body_font'] ) ? $_POST['body_font'] : '' ),
			'text_color'    => self::sanitize_hex( isset( $_POST['text_color'] ) ? $_POST['text_color'] : '#374151' ),
			'heading_color' => self::sanitize_hex( isset( $_POST['heading_color'] ) ? $_POST['heading_color'] : '#1a1a1a' ),
			'bg_color'      => self::sanitize_hex( isset( $_POST['bg_color'] ) ? $_POST['bg_color'] : '#ffffff' ),
			'link_color'    => self::sanitize_hex( isset( $_POST['link_color'] ) ? $_POST['link_color'] : '#2563eb' ),
		);

		update_option( SCAI_Admin::OPTION_STYLE, $data );

		wp_send_json_success( array( 'message' => 'Styling saved.' ) );
	}

	/* ─── Save Settings ───────────────────────────────────────────── */

	public static function save_settings() {
		check_ajax_referer( 'scai_save_settings', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Permission denied.' ), 403 );
		}

		$allowed_statuses = array( 'draft', 'publish', 'pending' );

		$default_status = isset( $_POST['default_status'] ) ? sanitize_text_field( $_POST['default_status'] ) : 'draft';

		if ( ! in_array( $default_status, $allowed_statuses, true ) ) {
			$default_status = 'draft';
		}

		$full_width = isset( $_POST['full_width_layout'] ) ? sanitize_text_field( $_POST['full_width_layout'] ) : 'on';
		if ( ! in_array( $full_width, array( 'on', 'off' ), true ) ) {
			$full_width = 'on';
		}

		$data = array(
			'default_status'    => $default_status,
			'full_width_layout' => $full_width,
		);

		update_option( SCAI_Admin::OPTION_SETTINGS, $data );

		wp_send_json_success( array( 'message' => 'Settings saved.' ) );
	}

	/* ─── Bulk Article Actions ────────────────────────────────────── */

	public static function bulk_articles() {
		check_ajax_referer( 'scai_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'Permission denied.' ), 403 );
		}

		$action   = isset( $_POST['bulk_action'] ) ? sanitize_key( $_POST['bulk_action'] ) : '';
		$post_ids = isset( $_POST['post_ids'] ) ? sanitize_text_field( $_POST['post_ids'] ) : '';

		$allowed_actions = array( 'publish', 'draft', 'trash' );
		if ( ! in_array( $action, $allowed_actions, true ) || empty( $post_ids ) ) {
			wp_send_json_error( array( 'message' => 'Invalid request.' ) );
		}

		$ids     = array_map( 'absint', explode( ',', $post_ids ) );
		$ids     = array_filter( $ids );
		$count   = 0;

		foreach ( $ids as $id ) {
			// Only operate on posts that contain SCAI blocks.
			$post = get_post( $id );
			if ( ! $post || strpos( $post->post_content, 'wp:scai/article' ) === false ) {
				continue;
			}

			if ( $action === 'trash' ) {
				if ( wp_trash_post( $id ) ) {
					$count++;
				}
			} else {
				$new_status = $action === 'publish' ? 'publish' : 'draft';
				$result = wp_update_post( array(
					'ID'          => $id,
					'post_status' => $new_status,
				), true );
				if ( ! is_wp_error( $result ) ) {
					$count++;
				}
			}
		}

		$labels = array(
			'publish' => 'published',
			'draft'   => 'moved to draft',
			'trash'   => 'moved to trash',
		);

		wp_send_json_success( array(
			'message' => $count . ' article(s) ' . $labels[ $action ] . '.',
			'count'   => $count,
		) );
	}

	/* ─── Helpers ─────────────────────────────────────────────────── */

	/**
	 * Sanitize a hex color value.
	 */
	private static function sanitize_hex( $color ) {
		$color = sanitize_text_field( $color );
		if ( preg_match( '/^#[0-9A-Fa-f]{6}$/', $color ) ) {
			return $color;
		}
		return '#000000';
	}

	/**
	 * Sanitize a font family name.
	 */
	private static function sanitize_font( $font ) {
		$allowed = array(
			'', 'Inter', 'Georgia', 'Playfair Display', 'Montserrat', 'Poppins',
			'Merriweather', 'Lora', 'Source Serif Pro', 'Noto Serif',
		);
		$font = sanitize_text_field( $font );
		return in_array( $font, $allowed, true ) ? $font : '';
	}
}
