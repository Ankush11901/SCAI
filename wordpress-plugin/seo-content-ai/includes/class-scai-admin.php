<?php
/**
 * SCAI Admin Panel — Dark UI with horizontal tab navigation.
 *
 * Pages: Dashboard, Articles, Styling, Settings
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class SCAI_Admin {

	const MENU_SLUG    = 'scai-connector';
	const OPTION_STYLE = 'scai_styling_options';
	const OPTION_SETTINGS = 'scai_settings';

	/* ─── Register Top-Level Menu ─────────────────────────────────── */

	public static function register_menu() {
		$icon_svg = 'data:image/svg+xml;base64,' . base64_encode(
			'<svg viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">'
			. '<path d="M30.9 30.9H4.1V4.1H28V0H0V35H35V7H30.9V30.9Z" fill="#a0a5aa"/>'
			. '<path d="M30.8 0V4.1H35V0H30.8Z" fill="#a0a5aa"/>'
			. '<rect x="8" y="8" width="9" height="4" fill="#a0a5aa"/>'
			. '<rect x="8" y="15.5" width="19" height="4" fill="#a0a5aa"/>'
			. '<rect x="18" y="23" width="9" height="4" fill="#a0a5aa"/>'
			. '</svg>'
		);

		add_menu_page(
			__( 'SEO Content AI', 'seo-content-ai' ),
			__( 'SEO Content AI', 'seo-content-ai' ),
			'manage_options',
			self::MENU_SLUG,
			array( __CLASS__, 'render_page' ),
			$icon_svg,
			80
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'Dashboard', 'seo-content-ai' ),
			__( 'Dashboard', 'seo-content-ai' ),
			'manage_options',
			self::MENU_SLUG,
			array( __CLASS__, 'render_page' )
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'Articles', 'seo-content-ai' ),
			__( 'Articles', 'seo-content-ai' ),
			'manage_options',
			self::MENU_SLUG . '-articles',
			array( __CLASS__, 'render_page' )
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'Styling', 'seo-content-ai' ),
			__( 'Styling', 'seo-content-ai' ),
			'manage_options',
			self::MENU_SLUG . '-styling',
			array( __CLASS__, 'render_page' )
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'Settings', 'seo-content-ai' ),
			__( 'Settings', 'seo-content-ai' ),
			'manage_options',
			self::MENU_SLUG . '-settings',
			array( __CLASS__, 'render_page' )
		);

		// Hidden editor page (not visible in menu).
		add_submenu_page(
			null,
			__( 'Edit Article', 'seo-content-ai' ),
			__( 'Edit Article', 'seo-content-ai' ),
			'manage_options',
			'scai-editor',
			array( __CLASS__, 'render_editor_page' )
		);
	}

	public static function render_editor_page() {
		$post_id = isset( $_GET['post_id'] ) ? absint( $_GET['post_id'] ) : 0;
		SCAI_Editor::render_editor( $post_id );
	}

	/* ─── Determine active tab from ?page= ────────────────────────── */

	private static function get_active_tab() {
		$page = isset( $_GET['page'] ) ? sanitize_text_field( $_GET['page'] ) : self::MENU_SLUG;
		if ( $page === self::MENU_SLUG . '-articles' ) return 'articles';
		if ( $page === self::MENU_SLUG . '-styling' )  return 'styling';
		if ( $page === self::MENU_SLUG . '-settings' ) return 'settings';
		return 'dashboard';
	}

	/* ─── Page title + subtitle per tab ───────────────────────────── */

	private static function get_page_info( $tab ) {
		switch ( $tab ) {
			case 'articles':
				return array( 'Imported Articles', 'Manage all articles imported from SEO Content AI' );
			case 'styling':
				return array( 'Styling Settings', 'Customize how imported articles appear on your site' );
			case 'settings':
				return array( 'Settings', 'Configure your SEO Content AI plugin' );
			default:
				return array( 'Dashboard', 'Overview and site statistics' );
		}
	}

	/* ═══════════════════════════════════════════════════════════════
	   RENDER FULL PAGE — Header + Tabs + Main
	   ═══════════════════════════════════════════════════════════════ */

	public static function render_page() {
		$active_tab = self::get_active_tab();
		$styling    = get_option( self::OPTION_STYLE, array() );
		$settings   = get_option( self::OPTION_SETTINGS, array() );

		?>
		<div class="scai-app">
			<div class="scai-main">
				<div class="scai-main-header">
					<h1 class="scai-main-title">
						<svg class="scai-header-logo" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
							<defs>
								<linearGradient id="scaiGradHeader" x1="0" y1="0" x2="35" y2="35" gradientUnits="userSpaceOnUse">
									<stop stop-color="#40EDC3"/>
									<stop offset="1" stop-color="#B8F6A1"/>
								</linearGradient>
							</defs>
							<path d="M30.9 30.9H4.1V4.1H28V0H0V35H35V7H30.9V30.9Z" fill="url(#scaiGradHeader)"/>
							<path d="M30.8 0V4.1H35V0H30.8Z" fill="#40EDC3"/>
							<rect x="8" y="8" width="9" height="4" fill="url(#scaiGradHeader)"/>
							<rect x="8" y="15.5" width="19" height="4" fill="url(#scaiGradHeader)"/>
							<rect x="18" y="23" width="9" height="4" fill="url(#scaiGradHeader)"/>
						</svg>
						SEO Content AI <span class="scai-version">v<?php echo esc_html( SCAI_RENDERER_VERSION ); ?></span>
					</h1>
				</div>

				<?php self::render_tab_nav( $active_tab ); ?>

				<div class="scai-main-body">
					<?php self::render_notices(); ?>

					<?php
					switch ( $active_tab ) {
						case 'articles':
							self::render_articles();
							break;
						case 'styling':
							self::render_styling( $styling );
							break;
						case 'settings':
							self::render_settings( $settings );
							break;
						default:
							self::render_dashboard();
							break;
					}
					?>
				</div>
			</div>

			<!-- ═══ CONFIRM MODAL ═══ -->
			<div class="scai-modal-overlay" id="scai-confirm-modal" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="scai-modal-title">
				<div class="scai-modal">
					<div class="scai-modal-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
					</div>
					<h3 class="scai-modal-title" id="scai-modal-title">Confirm Action</h3>
					<p class="scai-modal-text" id="scai-modal-text">Are you sure?</p>
					<div class="scai-modal-actions">
						<button type="button" class="scai-modal-btn scai-modal-cancel">Cancel</button>
						<button type="button" class="scai-modal-btn scai-modal-confirm">Confirm</button>
					</div>
				</div>
			</div>

		</div>
		<?php
	}

	/* ─── Tab Navigation ──────────────────────────────────────────── */

	private static function render_tab_nav( $active_tab ) {
		$tabs = array(
			'dashboard' => array( 'label' => 'Dashboard', 'slug' => self::MENU_SLUG ),
			'articles'  => array( 'label' => 'Articles',  'slug' => self::MENU_SLUG . '-articles' ),
			'styling'   => array( 'label' => 'Styling',   'slug' => self::MENU_SLUG . '-styling' ),
			'settings'  => array( 'label' => 'Settings',  'slug' => self::MENU_SLUG . '-settings' ),
		);

		?>
		<nav class="scai-tab-nav">
			<?php foreach ( $tabs as $key => $tab ) : ?>
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . $tab['slug'] ) ); ?>"
				   class="scai-tab <?php echo $active_tab === $key ? 'active' : ''; ?>">
					<?php echo esc_html( $tab['label'] ); ?>
				</a>
			<?php endforeach; ?>
		</nav>
		<?php
	}

	/* ─── Flash Notices ───────────────────────────────────────────── */

	private static function render_notices() {
		$notice = get_transient( 'scai_admin_notice' );
		if ( ! $notice ) return;
		delete_transient( 'scai_admin_notice' );

		$type = isset( $notice['type'] ) ? $notice['type'] : 'success';
		$msg  = isset( $notice['message'] ) ? $notice['message'] : '';
		?>
		<div class="scai-notice scai-notice-<?php echo esc_attr( $type ); ?>">
			<?php echo esc_html( $msg ); ?>
		</div>
		<?php
	}

	/* ═══════════════════════════════════════════════════════════════
	   DASHBOARD
	   ═══════════════════════════════════════════════════════════════ */

	private static function render_dashboard() {
		$stats = self::get_article_stats();
		?>
		<div class="scai-stats">
			<div class="scai-stat">
				<div class="scai-stat-label">Total Articles</div>
				<div class="scai-stat-value gradient"><?php echo esc_html( $stats['total'] ); ?></div>
			</div>
			<div class="scai-stat">
				<div class="scai-stat-label">Published</div>
				<div class="scai-stat-value"><?php echo esc_html( $stats['published'] ); ?></div>
			</div>
			<div class="scai-stat">
				<div class="scai-stat-label">Drafts</div>
				<div class="scai-stat-value"><?php echo esc_html( $stats['drafts'] ); ?></div>
			</div>
			<div class="scai-stat">
				<div class="scai-stat-label">Total Words</div>
				<div class="scai-stat-value"><?php echo esc_html( number_format( $stats['words'] ) ); ?></div>
			</div>
		</div>

		<?php self::render_recent_imports(); ?>
		<?php
	}

	private static function get_article_stats() {
		global $wpdb;

		$published = (int) $wpdb->get_var(
			"SELECT COUNT(*) FROM {$wpdb->posts}
			 WHERE post_status = 'publish'
			   AND post_content LIKE '%wp:scai/article%'"
		);

		$drafts = (int) $wpdb->get_var(
			"SELECT COUNT(*) FROM {$wpdb->posts}
			 WHERE post_status = 'draft'
			   AND post_content LIKE '%wp:scai/article%'"
		);

		$total_words = 0;
		$contents = $wpdb->get_col(
			"SELECT post_content FROM {$wpdb->posts}
			 WHERE post_status IN ('publish','draft')
			   AND post_content LIKE '%wp:scai/article%'"
		);
		foreach ( $contents as $content ) {
			$total_words += str_word_count( wp_strip_all_tags( $content ) );
		}

		return array(
			'total'     => $published + $drafts,
			'published' => $published,
			'drafts'    => $drafts,
			'words'     => $total_words,
		);
	}

	private static function render_recent_imports() {
		global $wpdb;

		$recent = $wpdb->get_results(
			"SELECT ID, post_title, post_status, post_content, post_date
			 FROM {$wpdb->posts}
			 WHERE post_status IN ('publish','draft')
			   AND post_content LIKE '%wp:scai/article%'
			 ORDER BY post_date DESC
			 LIMIT 8"
		);

		?>
		<div class="scai-card">
			<div class="scai-card-header">
				<h2 class="scai-card-title">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;vertical-align:-3px;margin-right:8px;opacity:0.5;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
					Recent Activity
				</h2>
			</div>
			<div class="scai-table-wrap">
				<table class="scai-table">
					<thead>
						<tr>
							<th>Title</th>
							<th>Type</th>
							<th>Status</th>
							<th>Imported</th>
						</tr>
					</thead>
					<tbody>
						<?php if ( empty( $recent ) ) : ?>
							<tr>
								<td colspan="4" style="text-align:center;color:var(--scai-text-muted);padding:32px;">
									No SCAI articles found. Export articles from the app to get started.
								</td>
							</tr>
						<?php else : ?>
							<?php foreach ( $recent as $post ) : ?>
								<?php
								$type     = self::extract_article_type( $post->post_content );
								$edit_url = admin_url( 'admin.php?page=scai-editor&post_id=' . $post->ID );
								$time_ago = human_time_diff( strtotime( $post->post_date ), current_time( 'timestamp' ) ) . ' ago';
								?>
								<tr>
									<td class="scai-table-title">
										<a href="<?php echo esc_url( $edit_url ); ?>"><?php echo esc_html( $post->post_title ); ?></a>
									</td>
									<td>
										<?php if ( $type ) : ?>
											<span class="scai-badge scai-badge-<?php echo esc_attr( $type ); ?>">
												<?php echo esc_html( ucfirst( $type ) ); ?>
											</span>
										<?php else : ?>
											<span style="color:var(--scai-text-muted);">&mdash;</span>
										<?php endif; ?>
									</td>
									<td>
										<span class="scai-badge scai-badge-<?php echo esc_attr( $post->post_status === 'publish' ? 'published' : 'draft' ); ?>">
											<?php echo esc_html( $post->post_status === 'publish' ? 'Published' : 'Draft' ); ?>
										</span>
									</td>
									<td><?php echo esc_html( $time_ago ); ?></td>
								</tr>
							<?php endforeach; ?>
						<?php endif; ?>
					</tbody>
				</table>
			</div>
		</div>
		<?php
	}

	private static function extract_article_type( $content ) {
		// Try data attribute first (new exports).
		if ( preg_match( '/data-article-type="([^"]+)"/', $content, $m ) ) {
			return sanitize_key( $m[1] );
		}
		// Fallback: read from block comment JSON (e.g. <!-- wp:scai/article {"articleType":"affiliate"} -->).
		if ( preg_match( '/<!-- wp:scai\/article\s+(\{[^}]+\})\s*-->/', $content, $bm ) ) {
			$attrs = json_decode( $bm[1], true );
			if ( ! empty( $attrs['articleType'] ) ) {
				return sanitize_key( $attrs['articleType'] );
			}
		}
		return '';
	}

	/* ═══════════════════════════════════════════════════════════════
	   ARTICLES TAB
	   ═══════════════════════════════════════════════════════════════ */

	private static function render_articles() {
		$paged    = isset( $_GET['paged'] ) ? max( 1, absint( $_GET['paged'] ) ) : 1;
		$per_page = 20;
		$search   = isset( $_GET['s'] ) ? sanitize_text_field( $_GET['s'] ) : '';
		$type_filter   = isset( $_GET['article_type'] ) ? sanitize_key( $_GET['article_type'] ) : '';
		$status_filter = isset( $_GET['article_status'] ) ? sanitize_key( $_GET['article_status'] ) : '';

		global $wpdb;

		$where = "WHERE post_content LIKE '%wp:scai/article%' AND post_status IN ('publish','draft','pending')";
		$params = array();

		if ( $search ) {
			$where .= " AND post_title LIKE %s";
			$params[] = '%' . $wpdb->esc_like( $search ) . '%';
		}
		if ( $status_filter === 'published' ) {
			$where = str_replace( "IN ('publish','draft','pending')", "= 'publish'", $where );
		} elseif ( $status_filter === 'draft' ) {
			$where = str_replace( "IN ('publish','draft','pending')", "= 'draft'", $where );
		}

		$count_sql = "SELECT COUNT(*) FROM {$wpdb->posts} $where";
		$total = $params ? (int) $wpdb->get_var( $wpdb->prepare( $count_sql, $params ) ) : (int) $wpdb->get_var( $count_sql );

		$total_pages = max( 1, ceil( $total / $per_page ) );
		if ( $paged > $total_pages ) $paged = $total_pages;
		$offset = ( $paged - 1 ) * $per_page;

		$query_sql = "SELECT ID, post_title, post_status, post_content, post_date, post_name
		              FROM {$wpdb->posts} $where
		              ORDER BY post_date DESC
		              LIMIT %d OFFSET %d";
		$query_params = array_merge( $params, array( $per_page, $offset ) );
		$articles = $wpdb->get_results( $wpdb->prepare( $query_sql, $query_params ) );

		if ( $type_filter && $articles ) {
			$articles = array_filter( $articles, function( $post ) use ( $type_filter ) {
				return self::extract_article_type( $post->post_content ) === $type_filter;
			} );
		}

		$base_url = admin_url( 'admin.php?page=' . self::MENU_SLUG . '-articles' );

		$article_types = array(
			'affiliate', 'review', 'how-to', 'informational', 'comparison',
			'recipe', 'local', 'listicle', 'commercial',
		);

		$start = $offset + 1;
		$end   = min( $offset + $per_page, $total );

		?>
		<form method="get" action="<?php echo esc_url( $base_url ); ?>" class="scai-toolbar">
			<input type="hidden" name="page" value="<?php echo esc_attr( self::MENU_SLUG . '-articles' ); ?>">
			<div class="scai-toolbar-left">
				<div class="scai-search">
					<svg class="scai-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
					</svg>
					<input type="text" name="s" class="scai-search-input" placeholder="Search articles..." value="<?php echo esc_attr( $search ); ?>">
				</div>
				<select name="article_type" class="scai-filter" onchange="this.form.submit();">
					<option value="">All Types</option>
					<?php foreach ( $article_types as $t ) : ?>
						<option value="<?php echo esc_attr( $t ); ?>" <?php selected( $type_filter, $t ); ?>>
							<?php echo esc_html( ucfirst( str_replace( '-', ' ', $t ) ) ); ?>
						</option>
					<?php endforeach; ?>
				</select>
				<select name="article_status" class="scai-filter" onchange="this.form.submit();">
					<option value="">All Status</option>
					<option value="published" <?php selected( $status_filter, 'published' ); ?>>Published</option>
					<option value="draft" <?php selected( $status_filter, 'draft' ); ?>>Draft</option>
				</select>
			</div>
			<div class="scai-toolbar-right">
				<span style="color:var(--scai-text-sec);font-size:13px;"><?php echo esc_html( $total ); ?> article<?php echo $total !== 1 ? 's' : ''; ?></span>
			</div>
		</form>

		<div class="scai-bulk-bar" id="scai-bulk-bar">
			<span class="scai-bulk-count"><span id="scai-selected-count">0</span> selected</span>
			<div class="scai-bulk-actions">
				<button type="button" class="scai-btn scai-btn-secondary scai-btn-sm" data-bulk-action="publish">Publish</button>
				<button type="button" class="scai-btn scai-btn-secondary scai-btn-sm" data-bulk-action="draft">Move to Draft</button>
				<button type="button" class="scai-btn scai-btn-danger scai-btn-sm" data-bulk-action="trash">Delete</button>
			</div>
		</div>

		<div class="scai-card" style="padding:0;">
			<div class="scai-table-wrap">
				<table class="scai-table">
					<thead>
						<tr>
							<th style="width:40px;"><input type="checkbox" class="scai-table-checkbox" id="scai-select-all"></th>
							<th>Title</th>
							<th>Type</th>
							<th>Words</th>
							<th>Status</th>
							<th>Imported</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						<?php if ( empty( $articles ) ) : ?>
							<tr>
								<td colspan="7" style="text-align:center;color:var(--scai-text-muted);padding:32px;">
									<?php echo $search || $type_filter || $status_filter
										? 'No articles match your filters.'
										: 'No SCAI articles found. Export articles from the app to get started.'; ?>
								</td>
							</tr>
						<?php else : ?>
							<?php foreach ( $articles as $post ) : ?>
								<?php
								$type       = self::extract_article_type( $post->post_content );
								$words      = str_word_count( wp_strip_all_tags( $post->post_content ) );
								$edit_url   = admin_url( 'admin.php?page=scai-editor&post_id=' . $post->ID );
								$view_url   = get_permalink( $post->ID );
								$time_ago   = human_time_diff( strtotime( $post->post_date ), current_time( 'timestamp' ) ) . ' ago';
								$is_publish = $post->post_status === 'publish';
								?>
								<tr>
									<td><input type="checkbox" class="scai-table-checkbox scai-article-cb" value="<?php echo esc_attr( $post->ID ); ?>"></td>
									<td>
										<div class="scai-table-title">
											<a href="<?php echo esc_url( $edit_url ); ?>"><?php echo esc_html( $post->post_title ); ?></a>
										</div>
										<?php if ( $is_publish && $view_url ) : ?>
											<a href="<?php echo esc_url( $view_url ); ?>" class="scai-table-link" target="_blank">
												<?php echo esc_html( wp_parse_url( $view_url, PHP_URL_HOST ) . wp_parse_url( $view_url, PHP_URL_PATH ) ); ?>
											</a>
										<?php endif; ?>
									</td>
									<td>
										<?php if ( $type ) : ?>
											<span class="scai-badge scai-badge-<?php echo esc_attr( $type ); ?>">
												<?php echo esc_html( ucfirst( $type ) ); ?>
											</span>
										<?php else : ?>
											<span style="color:var(--scai-text-muted);">&mdash;</span>
										<?php endif; ?>
									</td>
									<td><?php echo esc_html( number_format( $words ) ); ?></td>
									<td>
										<span class="scai-badge scai-badge-<?php echo esc_attr( $is_publish ? 'published' : 'draft' ); ?>">
											<?php echo esc_html( $is_publish ? 'Published' : 'Draft' ); ?>
										</span>
									</td>
									<td><?php echo esc_html( $time_ago ); ?></td>
									<td>
										<div class="scai-table-actions">
											<?php if ( $is_publish && $view_url ) : ?>
												<a href="<?php echo esc_url( $view_url ); ?>" class="scai-action-btn" target="_blank">View</a>
											<?php else : ?>
												<a href="<?php echo esc_url( get_preview_post_link( $post->ID ) ); ?>" class="scai-action-btn" target="_blank">Preview</a>
												<button type="button" class="scai-action-btn publish" data-publish-id="<?php echo esc_attr( $post->ID ); ?>">Publish</button>
											<?php endif; ?>
											<a href="<?php echo esc_url( $edit_url ); ?>" class="scai-action-btn">Edit</a>
											<button type="button" class="scai-action-btn danger" data-trash-id="<?php echo esc_attr( $post->ID ); ?>">Delete</button>
										</div>
									</td>
								</tr>
							<?php endforeach; ?>
						<?php endif; ?>
					</tbody>
				</table>
			</div>
			<?php if ( $total_pages > 1 ) : ?>
				<div class="scai-pagination">
					<span>Showing <?php echo esc_html( "$start-$end of $total" ); ?> articles</span>
					<div class="scai-pagination-pages">
						<?php for ( $i = 1; $i <= $total_pages; $i++ ) : ?>
							<?php
							$page_url = add_query_arg( array(
								'page'           => self::MENU_SLUG . '-articles',
								'paged'          => $i,
								's'              => $search,
								'article_type'   => $type_filter,
								'article_status' => $status_filter,
							), admin_url( 'admin.php' ) );
							?>
							<a href="<?php echo esc_url( $page_url ); ?>" class="scai-pagination-btn <?php echo $i === $paged ? 'active' : ''; ?>">
								<?php echo esc_html( $i ); ?>
							</a>
						<?php endfor; ?>
					</div>
				</div>
			<?php endif; ?>
		</div>
		<?php
	}

	/* ═══════════════════════════════════════════════════════════════
	   STYLING TAB
	   ═══════════════════════════════════════════════════════════════ */

	private static function render_styling( $styling ) {
		$current_variation  = isset( $styling['variation'] )     ? $styling['variation']     : 'clean-studio';
		$heading_font       = isset( $styling['heading_font'] )  ? $styling['heading_font']  : '';
		$body_font          = isset( $styling['body_font'] )     ? $styling['body_font']     : '';
		$text_color         = isset( $styling['text_color'] )    ? $styling['text_color']    : '#374151';
		$heading_color      = isset( $styling['heading_color'] ) ? $styling['heading_color'] : '#1a1a1a';
		$bg_color           = isset( $styling['bg_color'] )      ? $styling['bg_color']      : '#ffffff';
		$link_color         = isset( $styling['link_color'] )    ? $styling['link_color']    : '#2563eb';

		$variations = array(
			'clean-studio'  => 'Clean Studio',
			'airy-premium'  => 'Airy Premium',
			'gradient-glow' => 'Gradient Glow',
			'soft-stone'    => 'Soft Stone',
		);

		$heading_fonts = array( '', 'Inter', 'Georgia', 'Playfair Display', 'Montserrat', 'Poppins', 'Merriweather' );
		$body_fonts    = array( '', 'Georgia', 'Inter', 'Merriweather', 'Lora', 'Source Serif Pro', 'Noto Serif' );

		?>
		<form id="scai-styling-form">
			<?php wp_nonce_field( 'scai_save_styling', 'scai_styling_nonce' ); ?>
			<input type="hidden" name="variation" id="scai-variation-input" value="<?php echo esc_attr( $current_variation ); ?>">

			<div class="scai-styling-layout">
				<nav class="scai-styling-sidebar">
					<button type="button" class="scai-styling-nav-item active" data-style-tab="components">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
						Component Styles
					</button>
					<button type="button" class="scai-styling-nav-item" data-style-tab="typography">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
						Typography
					</button>
					<button type="button" class="scai-styling-nav-item" data-style-tab="colors">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 22a9 9 0 0 0 9-9c0-5-4-12-9-12S3 8 3 13a9 9 0 0 0 9 9z"/></svg>
						Colors
					</button>
				</nav>

				<div class="scai-styling-main">
					<div class="scai-styling-section active" id="style-section-components">
						<h3 class="scai-styling-section-title">Component Design Variation</h3>
						<p class="scai-styling-section-desc">Select a visual theme for article components. This affects Table of Contents, FAQ, Product Cards, Pro Tips, Key Takeaways, and other styled elements.</p>

						<div class="scai-variation-grid">
							<?php foreach ( $variations as $slug => $label ) : ?>
								<div class="scai-variation-card <?php echo $current_variation === $slug ? 'selected' : ''; ?>" data-variation="<?php echo esc_attr( $slug ); ?>">
									<div class="scai-variation-header">
										<span class="scai-variation-name"><?php echo esc_html( $label ); ?></span>
										<span class="scai-variation-check">
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
										</span>
									</div>
									<div class="scai-variation-preview" <?php echo self::get_variation_preview_style( $slug ); ?>>
										<div style="height:10px;width:50%;background:<?php echo $slug === 'soft-stone' ? '#a8a29e' : '#e5e5e5'; ?>;border-radius:2px;margin-bottom:8px;"></div>
										<div style="height:6px;width:100%;background:<?php echo $slug === 'soft-stone' ? '#e7e5e4' : '#f5f5f5'; ?>;border-radius:2px;margin-bottom:4px;"></div>
										<div style="height:6px;width:80%;background:<?php echo $slug === 'soft-stone' ? '#e7e5e4' : '#f5f5f5'; ?>;border-radius:2px;"></div>
									</div>
								</div>
							<?php endforeach; ?>
						</div>

						<p style="color:var(--scai-text-muted);font-size:12px;margin-top:8px;">
							This variation applies to: Table of Contents, FAQ, Product Cards, Pro Tips, Key Takeaways, and other styled components.
						</p>
					</div>

					<div class="scai-styling-section" id="style-section-typography">
						<h3 class="scai-styling-section-title">Typography</h3>
						<p class="scai-styling-section-desc">Configure fonts for article headings and body text.</p>

						<div class="scai-font-row">
							<div class="scai-font-item">
								<div class="scai-font-item-label">
									<span class="scai-font-item-title">Heading Font</span>
									<span class="scai-font-item-desc">Used for H1, H2, H3 headings</span>
								</div>
								<select name="heading_font" class="scai-filter scai-font-select">
									<option value="">Theme Default</option>
									<?php foreach ( $heading_fonts as $f ) : if ( ! $f ) continue; ?>
										<option value="<?php echo esc_attr( $f ); ?>" <?php selected( $heading_font, $f ); ?>>
											<?php echo esc_html( $f ); ?>
										</option>
									<?php endforeach; ?>
								</select>
							</div>
							<div class="scai-font-item">
								<div class="scai-font-item-label">
									<span class="scai-font-item-title">Body Font</span>
									<span class="scai-font-item-desc">Used for paragraphs and general text</span>
								</div>
								<select name="body_font" class="scai-filter scai-font-select">
									<option value="">Theme Default</option>
									<?php foreach ( $body_fonts as $f ) : if ( ! $f ) continue; ?>
										<option value="<?php echo esc_attr( $f ); ?>" <?php selected( $body_font, $f ); ?>>
											<?php echo esc_html( $f ); ?>
										</option>
									<?php endforeach; ?>
								</select>
							</div>
						</div>
					</div>

					<div class="scai-styling-section" id="style-section-colors">
						<h3 class="scai-styling-section-title">Article Colors</h3>
						<p class="scai-styling-section-desc">Override text and background colors for imported articles.</p>

						<div class="scai-color-grid">
							<?php
							$colors = array(
								array( 'name' => 'text_color',    'title' => 'Text Color',       'desc' => 'Main body text color',        'value' => $text_color ),
								array( 'name' => 'heading_color', 'title' => 'Heading Color',    'desc' => 'H1, H2, H3 heading color',    'value' => $heading_color ),
								array( 'name' => 'bg_color',      'title' => 'Background Color', 'desc' => 'Article container background', 'value' => $bg_color ),
								array( 'name' => 'link_color',    'title' => 'Link Color',       'desc' => 'Hyperlink text color',         'value' => $link_color ),
							);
							foreach ( $colors as $c ) :
							?>
								<div class="scai-color-row">
									<div class="scai-color-label">
										<span class="scai-color-title"><?php echo esc_html( $c['title'] ); ?></span>
										<span class="scai-color-desc"><?php echo esc_html( $c['desc'] ); ?></span>
									</div>
									<div class="scai-color-controls">
										<input type="color" class="scai-color-swatch" value="<?php echo esc_attr( $c['value'] ); ?>" data-target="<?php echo esc_attr( $c['name'] ); ?>">
										<input type="text" class="scai-color-input" name="<?php echo esc_attr( $c['name'] ); ?>" value="<?php echo esc_attr( $c['value'] ); ?>">
									</div>
								</div>
							<?php endforeach; ?>
						</div>
					</div>

					<button type="submit" class="scai-btn scai-btn-primary" style="margin-top:24px;" id="scai-save-styling">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
						Save Styling
					</button>
				</div>
			</div>
		</form>
		<?php
	}

	private static function get_variation_preview_style( $slug ) {
		switch ( $slug ) {
			case 'airy-premium':
				return 'style="border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.05);"';
			case 'gradient-glow':
				return 'style="border:2px solid #d4d4d4;background:linear-gradient(to bottom right,#fff,#fafafa);"';
			case 'soft-stone':
				return 'style="background:#fafaf9;"';
			default:
				return '';
		}
	}

	/* ═══════════════════════════════════════════════════════════════
	   SETTINGS TAB
	   ═══════════════════════════════════════════════════════════════ */

	private static function render_settings( $settings ) {
		$default_status = isset( $settings['default_status'] ) ? $settings['default_status'] : 'draft';
		$full_width     = isset( $settings['full_width_layout'] ) ? $settings['full_width_layout'] : 'on';

		?>
		<div class="scai-card">
			<div class="scai-card-header">
				<h2 class="scai-card-title">Import Defaults</h2>
			</div>
			<div class="scai-card-body">
				<form id="scai-settings-form">
					<?php wp_nonce_field( 'scai_save_settings', 'scai_settings_nonce' ); ?>

					<div class="scai-form-row">
						<label class="scai-label">Default Post Status</label>
						<select name="default_status" class="scai-filter" style="width:auto;">
							<option value="draft"   <?php selected( $default_status, 'draft' ); ?>>Draft</option>
							<option value="publish"  <?php selected( $default_status, 'publish' ); ?>>Published</option>
							<option value="pending"  <?php selected( $default_status, 'pending' ); ?>>Pending Review</option>
						</select>
						<p class="scai-help">Default status for newly imported articles</p>
					</div>

					<div class="scai-form-row">
						<label class="scai-label">Full-Width Article Layout</label>
						<div class="scai-toggle-row" style="border:none;padding:8px 0;">
							<div>
								<div class="scai-toggle-label">Hide sidebars on article pages</div>
								<div class="scai-toggle-desc">When enabled, SCAI article pages display only the header, article, and footer — sidebars and widgets are hidden.</div>
							</div>
							<div class="scai-toggle <?php echo $full_width === 'on' ? 'active' : ''; ?>" data-field="full_width_layout"></div>
						</div>
						<input type="hidden" name="full_width_layout" value="<?php echo esc_attr( $full_width ); ?>">
					</div>

					<button type="submit" class="scai-btn scai-btn-primary" id="scai-save-settings">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
						Save Settings
					</button>
				</form>
			</div>
		</div>

		<div class="scai-card">
			<div class="scai-card-header">
				<h2 class="scai-card-title">Connection Info</h2>
			</div>
			<div class="scai-card-body">
				<p style="color:var(--scai-text-sec);font-size:14px;margin-bottom:12px;">
					This plugin is connected via the SEO Content AI app. Manage your connection from the app&rsquo;s Integrations settings.
				</p>
				<div class="scai-connection-test">
					<div class="scai-connection-status">
						<span class="scai-connection-dot connected"></span>
						<span>REST API active &mdash; v<?php echo esc_html( SCAI_RENDERER_VERSION ); ?></span>
					</div>
				</div>
			</div>
		</div>

		<div class="scai-card danger">
			<div class="scai-card-header">
				<h2 class="scai-card-title">Danger Zone</h2>
			</div>
			<div class="scai-card-body">
				<p style="color:var(--scai-text-sec);margin-bottom:16px;font-size:14px;">
					Deactivating or uninstalling this plugin will not delete imported articles, but articles may lose their custom styling.
				</p>
			</div>
		</div>
		<?php
	}
}
