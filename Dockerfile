FROM php:8.4-cli-alpine

# ── System dependencies ────────────────────────────────────────────────────────
RUN apk add --no-cache \
    postgresql-dev \
    nodejs \
    npm \
    git \
    unzip \
    curl \
    libzip-dev \
    oniguruma-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev

# ── PHP extensions (PostgreSQL, zip, opcache, gd) ─────────────────────────────
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    pgsql \
    opcache \
    zip \
    mbstring \
    bcmath \
    pcntl

# ── Composer ───────────────────────────────────────────────────────────────────
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# ── OPcache config ─────────────────────────────────────────────────────────────
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo "opcache.memory_consumption=256" >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo "opcache.max_accelerated_files=20000" >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /app

# ── Install PHP dependencies ───────────────────────────────────────────────────
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist

# ── Install Node dependencies and build assets ─────────────────────────────────
COPY package.json package-lock.json ./
RUN npm ci

# ── Copy full application ──────────────────────────────────────────────────────
COPY . .

# ── Build frontend (Vite) ─────────────────────────────────────────────────────
RUN npm run build

# ── Run composer post-install scripts ─────────────────────────────────────────
RUN composer dump-autoload --optimize

# ── Storage permissions ────────────────────────────────────────────────────────
RUN chmod -R 775 storage bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache || true

# ── Copy start script ─────────────────────────────────────────────────────────
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]
