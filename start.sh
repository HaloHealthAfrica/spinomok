#!/bin/sh
set -e

echo "=== SpinoMok FarmOps Starting ==="

# ── Parse DATABASE_URL into individual DB_* vars ──────────────────────────────
# Neon provides: postgresql://user:pass@host/db?sslmode=require&channel_binding=require
# PHP PDO doesn't understand channel_binding, so we parse the URL manually.

if [ -n "$DATABASE_URL" ]; then
    echo "→ Parsing DATABASE_URL..."

    # Strip protocol
    STRIPPED=$(echo "$DATABASE_URL" | sed 's|^postgresql://||' | sed 's|^postgres://||')

    # Extract user:pass@host:port/db
    USERINFO=$(echo "$STRIPPED" | cut -d'@' -f1)
    HOSTINFO=$(echo "$STRIPPED" | cut -d'@' -f2 | cut -d'?' -f1)

    export DB_USERNAME=$(echo "$USERINFO" | cut -d':' -f1)
    export DB_PASSWORD=$(echo "$USERINFO" | cut -d':' -f2)
    export DB_HOST=$(echo "$HOSTINFO" | cut -d'/' -f1 | cut -d':' -f1)
    export DB_PORT=$(echo "$HOSTINFO" | cut -d':' -f2 | cut -d'/' -f1)
    export DB_DATABASE=$(echo "$HOSTINFO" | cut -d'/' -f2)
    export DB_CONNECTION=pgsql
    export DB_SSLMODE=require

    # Default port if not in URL
    if [ "$DB_PORT" = "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
        export DB_PORT=5432
    fi

    echo "→ DB_HOST=$DB_HOST"
    echo "→ DB_PORT=$DB_PORT"
    echo "→ DB_DATABASE=$DB_DATABASE"
    echo "→ DB_USERNAME=$DB_USERNAME"
    echo "→ DB_SSLMODE=$DB_SSLMODE"
fi

# ── Verify DB vars are set ─────────────────────────────────────────────────────
if [ -z "$DB_HOST" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
    echo "ERROR: DB_HOST is not set or is localhost."
    echo "Set DATABASE_URL in Render environment variables."
    exit 1
fi

# ── Wait for DB to be reachable ───────────────────────────────────────────────
echo "→ Waiting for database connection..."
RETRIES=10
until php -r "
    try {
        \$dsn = 'pgsql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE};sslmode=require';
        new PDO(\$dsn, '${DB_USERNAME}', '${DB_PASSWORD}');
        echo 'connected';
    } catch (Exception \$e) {
        exit(1);
    }
" 2>/dev/null; do
    RETRIES=$((RETRIES-1))
    if [ $RETRIES -le 0 ]; then
        echo "ERROR: Could not connect to database after 10 attempts"
        exit 1
    fi
    echo "  Waiting for database... ($RETRIES attempts left)"
    sleep 3
done
echo "→ Database connected ✓"

# ── Database migrations ───────────────────────────────────────────────────────
echo "→ Running migrations..."
php artisan migrate --force

echo "→ Seeding reference data..."
php artisan db:seed --class=ProductionSeeder --force || echo "  Seeder skipped (already run)"

# ── Cache optimisations ───────────────────────────────────────────────────────
echo "→ Caching config, routes, views..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# ── Start server ──────────────────────────────────────────────────────────────
PORT=${PORT:-8080}
echo "→ Starting PHP server on port $PORT..."
exec php -S 0.0.0.0:$PORT -t public public/router.php
