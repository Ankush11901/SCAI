<?php
/**
 * SCAI REST API endpoints.
 *
 * GET  /wp-json/scai/v1/ping              – health-check (no auth)
 * POST /wp-json/scai/v1/handshake/start   – generate one-time code (admin)
 * POST /wp-json/scai/v1/handshake/complete – validate one-time code (admin)
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class SCAI_REST {

	const NAMESPACE    = 'scai/v1';
	const CODE_LENGTH  = 10;
	const CODE_TTL     = 300; // 5 minutes

	/* ─── Route Registration ──────────────────────────────────────── */

	public static function register_routes() {

		// Public health-check.
		register_rest_route( self::NAMESPACE, '/ping', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'handle_ping' ),
			'permission_callback' => '__return_true',
		) );

		// Generate one-time handshake code (admin only).
		register_rest_route( self::NAMESPACE, '/handshake/start', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'handle_handshake_start' ),
			'permission_callback' => array( __CLASS__, 'require_manage_options' ),
		) );

		// Validate one-time handshake code (admin only).
		register_rest_route( self::NAMESPACE, '/handshake/complete', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'handle_handshake_complete' ),
			'permission_callback' => array( __CLASS__, 'require_manage_options' ),
		) );
	}

	/* ─── Permission Callback ─────────────────────────────────────── */

	public static function require_manage_options() {
		return current_user_can( 'manage_options' );
	}

	/* ─── GET /ping ───────────────────────────────────────────────── */

	public static function handle_ping( WP_REST_Request $request ) {
		return new WP_REST_Response( array(
			'active'  => true,
			'version' => SCAI_RENDERER_VERSION,
			'site'    => get_site_url(),
		), 200 );
	}

	/* ─── POST /handshake/start ───────────────────────────────────── */

	public static function handle_handshake_start( WP_REST_Request $request ) {
		// Generate a cryptographically-random alphanumeric code.
		$code = self::generate_code( self::CODE_LENGTH );

		// Store as a WordPress transient (auto-expires).
		$key = 'scai_handshake_' . hash( 'sha256', $code );
		set_transient( $key, array(
			'code'       => $code,
			'user_id'    => get_current_user_id(),
			'created_at' => time(),
		), self::CODE_TTL );

		return new WP_REST_Response( array(
			'code'       => $code,
			'expires_in' => self::CODE_TTL,
		), 200 );
	}

	/* ─── POST /handshake/complete ────────────────────────────────── */

	public static function handle_handshake_complete( WP_REST_Request $request ) {
		$code = sanitize_text_field( $request->get_param( 'code' ) );

		if ( empty( $code ) ) {
			return new WP_REST_Response( array(
				'success' => false,
				'error'   => 'Missing handshake code.',
			), 400 );
		}

		$key  = 'scai_handshake_' . hash( 'sha256', $code );
		$data = get_transient( $key );

		if ( false === $data || ! is_array( $data ) || $data['code'] !== $code ) {
			return new WP_REST_Response( array(
				'success' => false,
				'error'   => 'Invalid or expired handshake code.',
			), 401 );
		}

		// Delete the transient so the code cannot be reused.
		delete_transient( $key );

		return new WP_REST_Response( array(
			'success'  => true,
			'site'     => get_site_url(),
			'verified' => true,
		), 200 );
	}

	/* ─── Helpers ─────────────────────────────────────────────────── */

	private static function generate_code( int $length ): string {
		$chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		$max    = strlen( $chars ) - 1;
		$result = '';
		for ( $i = 0; $i < $length; $i++ ) {
			$result .= $chars[ random_int( 0, $max ) ];
		}
		return $result;
	}
}
