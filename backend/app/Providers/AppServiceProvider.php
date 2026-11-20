<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Gate;
use App\Models\Application;
use App\Models\Placement;
use App\Models\LogbookEntry;
use App\Models\Evaluation;
use App\Models\FieldVisit;
use App\Models\Institution;
use App\Models\Document;
use App\Policies\ApplicationPolicy;
use App\Policies\PlacementPolicy;
use App\Policies\LogbookEntryPolicy;
use App\Policies\EvaluationPolicy;
use App\Policies\FieldVisitPolicy;
use App\Policies\InstitutionPolicy;
use App\Policies\DocumentPolicy;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);

        Gate::policy(Application::class, ApplicationPolicy::class);
        Gate::policy(Placement::class, PlacementPolicy::class);
        Gate::policy(LogbookEntry::class, LogbookEntryPolicy::class);
        Gate::policy(Evaluation::class, EvaluationPolicy::class);
        Gate::policy(FieldVisit::class, FieldVisitPolicy::class);
        Gate::policy(Institution::class, InstitutionPolicy::class);
        Gate::policy(Document::class, DocumentPolicy::class);

        // Superadmin bypass for general Gates
        Gate::before(function ($user, $ability) {
            if ($user->isSuperAdmin()) {
                return true;
            }
        });
    }
}
