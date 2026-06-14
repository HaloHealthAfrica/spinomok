<?php

namespace App\Providers;

use App\Models\CalfRecord;
use App\Observers\CalfRecordObserver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        CalfRecord::observe(CalfRecordObserver::class);

        Event::listen('eloquent.creating: *', function (string $eventName, array $data): void {
            $model = $data[0] ?? null;

            if (! $model instanceof Model || $model->getIncrementing() || $model->getKeyType() !== 'string') {
                return;
            }

            if (! $model->getKey()) {
                $model->setAttribute($model->getKeyName(), (string) Str::uuid());
            }
        });

        // Force HTTPS in production — Render's load balancer terminates SSL
        // and forwards as HTTP internally, causing asset URLs to use http://
        // which browsers block as mixed content.
        if (config('app.env') === 'production') {
            URL::forceScheme('https');
        }
    }
}
