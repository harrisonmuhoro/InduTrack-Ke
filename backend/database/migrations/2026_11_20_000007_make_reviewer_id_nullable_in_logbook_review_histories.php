<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Make reviewer_id nullable in logbook_review_histories.
     *
     * RATIONALE: The original migration created reviewer_id as NOT NULL, which was
     * correct when only formal academic review decisions were stored. Now that student
     * resubmission actions are also recorded in this table (with actor_id/actor_role/
     * event_type), reviewer_id must be nullable — it only applies to formal reviews,
     * not to student-initiated events.
     */
    public function up(): void
    {
        Schema::table('logbook_review_histories', function (Blueprint $table) {
            $table->unsignedBigInteger('reviewer_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        // NOTE: Reverting this requires all existing rows to have a non-null reviewer_id.
        // If student resubmit rows exist, manually backfill them before rolling back.
        Schema::table('logbook_review_histories', function (Blueprint $table) {
            $table->unsignedBigInteger('reviewer_id')->nullable(false)->change();
        });
    }
};
