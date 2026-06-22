<?php
/**
 * Plugin Name: PUNYCODEX Authenticity Shield
 * Plugin URI: https://punycodex.com/about/authenticity.html
 * Description: Warns authors before publishing punycode or visually deceptive Unicode links.
 * Version: 1.0.0
 * Author: PUNYCODEX
 * Author URI: https://punycodex.com
 * License: ISC
 * Text Domain: punycodex-authenticity
 */

if (!defined('ABSPATH')) {
    exit;
}

define('PUNYCODEX_AUTH_VERSION', '1.0.0');
define('PUNYCODEX_AUTH_API_URL', 'https://punycodex.com/api/v1/authenticity/check');

/**
 * Enqueue block-editor script for link inspection.
 */
function punycodex_auth_enqueue_assets(): void {
    $asset_file = plugin_dir_path(__FILE__) . 'build/index.asset.php';
    $dependencies = ['wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-data'];
    $version = PUNYCODEX_AUTH_VERSION;

    if (file_exists($asset_file)) {
        $asset = require $asset_file;
        $dependencies = $asset['dependencies'] ?? $dependencies;
        $version = $asset['version'] ?? $version;
    }

    wp_enqueue_script(
        'punycodex-auth-editor',
        plugin_dir_url(__FILE__) . 'build/index.js',
        $dependencies,
        $version,
        true
    );

    wp_localize_script('punycodex-auth-editor', 'PunycodexAuth', [
        'apiUrl' => PUNYCODEX_AUTH_API_URL,
        'nonce' => wp_create_nonce('punycodex_auth_nonce'),
    ]);
}
add_action('enqueue_block_editor_assets', 'punycodex_auth_enqueue_assets');

/**
 * Validate post content before it is published.
 *
 * @param string $new_status
 * @param string $old_status
 * @param WP_Post $post
 */
function punycodex_auth_validate_on_publish(string $new_status, string $old_status, WP_Post $post): void {
    if ($new_status !== 'publish' || $post->post_type !== 'post') {
        return;
    }

    $urls = punycodex_auth_extract_urls($post->post_content);
    foreach ($urls as $url) {
        $host = parse_url($url, PHP_URL_HOST);
        if (!$host) {
            continue;
        }
        if (preg_match('/^xn--/i', $host) || punycodex_auth_has_mixed_script($host)) {
            wp_die(
                esc_html(sprintf(
                    /* translators: %s: suspicious URL */
                    __('PUNYCODEX Authenticity Shield flagged a suspicious link: %s. Please review before publishing.', 'punycodex-authenticity'),
                    $url
                )),
                esc_html__('Suspicious Unicode link detected', 'punycodex-authenticity'),
                ['back_link' => true]
            );
        }
    }
}
add_action('transition_post_status', 'punycodex_auth_validate_on_publish', 10, 3);

/**
 * Extract URLs from content.
 *
 * @param string $content
 * @return string[]
 */
function punycodex_auth_extract_urls(string $content): array {
    preg_match_all('/https?:\/\/[^\s<>"\']+/i', $content, $matches);
    return $matches[0] ?? [];
}

/**
 * Basic mixed-script check: flag hostnames containing characters from
 * more than one script family (Latin + Cyrillic, Latin + Greek, etc.).
 *
 * @param string $hostname
 * @return bool
 */
function punycodex_auth_has_mixed_script(string $hostname): bool {
    $scripts = [];
    $length = mb_strlen($hostname);
    for ($i = 0; $i < $length; $i++) {
        $char = mb_substr($hostname, $i, 1);
        $scripts[] = punycodex_auth_script_family($char);
    }

    $scripts = array_values(array_unique(array_filter($scripts)));
    return count($scripts) > 1;
}

/**
 * Map a character to a coarse script family.
 *
 * @param string $char
 * @return string|null
 */
function punycodex_auth_script_family(string $char): ?string {
    $codepoint = mb_ord($char);
    if ($codepoint === false) {
        return null;
    }

    if ($codepoint >= 0x41 && $codepoint <= 0x7a) {
        return 'Latin';
    }
    if ($codepoint >= 0x0400 && $codepoint <= 0x04ff) {
        return 'Cyrillic';
    }
    if ($codepoint >= 0x0370 && $codepoint <= 0x03ff) {
        return 'Greek';
    }
    if ($codepoint >= 0x0600 && $codepoint <= 0x06ff) {
        return 'Arabic';
    }
    return null;
}

/**
 * Register settings page.
 */
function punycodex_auth_register_settings(): void {
    add_options_page(
        __('PUNYCODEX Authenticity', 'punycodex-authenticity'),
        __('PUNYCODEX Authenticity', 'punycodex-authenticity'),
        'manage_options',
        'punycodex-authenticity',
        'punycodex_auth_render_settings'
    );
}
add_action('admin_menu', 'punycodex_auth_register_settings');

/**
 * Render settings page.
 */
function punycodex_auth_render_settings(): void {
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <p><?php esc_html_e('PUNYCODEX Authenticity Shield is active. Suspicious punycode and mixed-script links will be flagged in the block editor and blocked on publish.', 'punycodex-authenticity'); ?></p>
        <p>
            <a href="https://punycodex.com/about/authenticity.html" target="_blank" rel="noopener noreferrer">
                <?php esc_html_e('Learn more about enterprise features', 'punycodex-authenticity'); ?>
            </a>
        </p>
    </div>
    <?php
}
