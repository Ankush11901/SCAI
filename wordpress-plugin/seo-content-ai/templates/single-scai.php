<?php
/**
 * SCAI Minimal Single Template
 *
 * Renders only the theme header, article content, and theme footer.
 * Used for classic (non-FSE) themes when full_width_layout is enabled.
 *
 * @package SEO_Content_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>

<main id="scai-content" class="scai-template-main" role="main">
	<?php
	while ( have_posts() ) :
		the_post();
		the_content();
	endwhile;
	?>
</main>

<?php
get_footer();
