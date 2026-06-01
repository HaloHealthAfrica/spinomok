#!/bin/sh
set -e

echo "=== SpinoMok FarmOps Starting ==="

echo "→ Running migrations..."
php artisan migrate --force

echo "→ Seeding reference data..."
php artisan db:seed --class=ProductionSeeder --force || echo "Seeder already run or skipped"

echo "→ Caching config, routes, views..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "→ Starting PHP server on port ${PORT:-8080}..."
exec php -S 0.0.0.0:${PORT:-8080} -t public public/index.php
