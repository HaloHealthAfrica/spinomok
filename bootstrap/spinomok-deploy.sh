#!/usr/bin/env bash
# SpinoMok FarmOps — Render deploy script
set -e

echo "=== SpinoMok FarmOps Deployment ==="

# Install PHP dependencies
echo "→ Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# Install Node dependencies and build assets
echo "→ Building frontend assets..."
npm ci
npm run build

# Run migrations (with seed if fresh deploy)
echo "→ Running database migrations..."
php artisan migrate --force

# Cache configuration for production
echo "→ Caching routes and config..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "=== Deployment complete ==="
