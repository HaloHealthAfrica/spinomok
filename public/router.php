<?php
/**
 * PHP built-in server router for production.
 * Serves static files (JS, CSS, images, fonts) directly.
 * Routes all other requests through Laravel's index.php.
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Serve existing static files directly (JS, CSS, images, fonts, etc.)
// Return false tells PHP to serve the file without the router
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false;
}

// Everything else goes through Laravel
require __DIR__ . '/index.php';
