FROM php:8.4-fpm-alpine

# System packages
RUN apk add --no-cache \
    nginx \
    nodejs \
    npm \
    git \
    unzip \
    curl \
    postgresql-dev \
    libzip-dev \
    oniguruma-dev \
    supervisor

# PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    pgsql \
    opcache \
    zip \
    mbstring \
    bcmath \
    pcntl

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# OPcache
RUN echo "opcache.enable=1" > /usr/local/etc/php/conf.d/opcache.ini \
 && echo "opcache.memory_consumption=128" >> /usr/local/etc/php/conf.d/opcache.ini \
 && echo "opcache.max_accelerated_files=10000" >> /usr/local/etc/php/conf.d/opcache.ini \
 && echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /app

# PHP dependencies
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist

# Node dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Application code
COPY . .

# Build Vite assets
RUN npm run build

# Composer post-install
RUN composer dump-autoload --optimize

# Permissions
RUN chown -R www-data:www-data /app/storage /app/bootstrap/cache \
 && chmod -R 775 /app/storage /app/bootstrap/cache

# nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf

# php-fpm config
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf

# supervisord config
COPY docker/supervisord.conf /etc/supervisord.conf

# startup script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]
