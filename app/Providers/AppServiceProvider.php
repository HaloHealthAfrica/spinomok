<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Force HTTPS in production — Render's load balancer terminates SSL
        // and forwards as HTTP internally, causing asset URLs to use http://
        // which browsers block as mixed content.
        if (config('app.env') === 'production') {
            URL::forceScheme('https');
        }
    }
}
