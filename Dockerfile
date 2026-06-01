FROM php:8.4-fpm-alpine

RUN apk add --no-cache nginx nodejs npm git unzip curl postgresql-dev libzip-dev oniguruma-dev supervisor

RUN docker-php-ext-install pdo pdo_pgsql pgsql opcache zip mbstring bcmath pcntl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN printf 'opcache.enable=1\nopcache.memory_consumption=128\nopcache.max_accelerated_files=10000\nopcache.validate_timestamps=0\n' > /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

RUN composer dump-autoload --optimize

RUN chown -R www-data:www-data /app/storage /app/bootstrap/cache && chmod -R 775 /app/storage /app/bootstrap/cache

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080
CMD ["/start.sh"]