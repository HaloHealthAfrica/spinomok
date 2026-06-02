@echo off
REM Run migrations against Neon PostgreSQL
REM Run this from the farmops directory

set DB_CONNECTION=pgsql
set DB_HOST=ep-solitary-firefly-aq12pofq-pooler.c-8.us-east-1.aws.neon.tech
set DB_PORT=5432
set DB_DATABASE=neondb
set DB_USERNAME=neondb_owner
set DB_PASSWORD=npg_wy0Mo3BOSRfu
set DB_SSLMODE=require

echo Running migrations on Neon...
php artisan migrate --force

echo Seeding reference data...
php artisan db:seed --class=ProductionSeeder --force

echo Seeding demo farm...
php artisan db:seed --class=DatabaseSeeder --force

echo Done!
pause
