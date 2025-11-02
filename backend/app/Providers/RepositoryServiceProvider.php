<?php

namespace App\Providers;

use App\Repositories\BattleRepository;
use App\Repositories\CharacterRepository;
use App\Repositories\CharacterUserRepository;
use App\Services\BattleService;
use App\Services\CharacterService;
use App\Services\Contracts\BattleServiceInterface;
use App\Services\Contracts\CharacterServiceInterface;
use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Register repositories
        $this->app->singleton(CharacterRepository::class, CharacterRepository::class);
        $this->app->singleton(BattleRepository::class, BattleRepository::class);
        $this->app->singleton(CharacterUserRepository::class, CharacterUserRepository::class);

        // Register service interfaces to their implementations
        $this->app->singleton(
            CharacterServiceInterface::class,
            CharacterService::class
        );

        $this->app->singleton(
            BattleServiceInterface::class,
            BattleService::class
        );
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
