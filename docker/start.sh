#!/bin/sh
set -e

echo '=== SpinoMok FarmOps ==='

if [ -n "$DATABASE_URL" ]; then
    STRIPPED=$(echo "$DATABASE_URL" | sed 's|^postgresql://||' | sed 's|^postgres://||')
    USERINFO=$(echo "$STRIPPED" | cut -d'@' -f1)
    HOSTINFO=$(echo "$STRIPPED" | cut -d'@' -f2 | cut -d'?' -f1)
    export DB_USERNAME=$(echo "$USERINFO" | cut -d':' -f1)
    export DB_PASSWORD=$(echo "$USERINFO" | cut -d':' -f2)
    export DB_HOST=$(echo "$HOSTINFO" | cut -d'/' -f1 | cut -d':' -f1)
    export DB_DATABASE=$(echo "$HOSTINFO" | cut -d'/' -f2)
    export DB_CONNECTION=pgsql
    export DB_PORT=5432
    export DB_SSLMODE=require
    echo "DB_HOST=$DB_HOST DB_DATABASE=$DB_DATABASE"
fi

if [ -z "$DB_HOST" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
    echo "ERROR: DATABASE_URL not set"; exit 1
fi

echo "Waiting for DB..."
for i in $(seq 1 10); do
    php -r "new PDO('pgsql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE};sslmode=require','${DB_USERNAME}','${DB_PASSWORD}');" 2>/dev/null && break
    echo "  attempt $i/10..."; sleep 3
done

echo "Running migrations..."
php artisan migrate --force

php artisan db:seed --class=ProductionSeeder --force 2>/dev/null || true

echo "Caching..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Starting nginx + php-fpm..."
exec /usr/bin/supervisord -c /etc/supervisord.conf
