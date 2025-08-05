<?php

namespace App\Providers;

use App\Infrastructure\Persistence\InMemory\InMemory;
use App\Infrastructure\Persistence\UserRepository;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(UserRepository::class, InMemory::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void {}
}
