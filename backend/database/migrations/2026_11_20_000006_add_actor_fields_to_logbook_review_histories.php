<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add generic actor audit columns to logbook_review_histories.
     *
     * RATIONALE: The original reviewer_id column conflates academic review decisions
     * with student resubmission actions. Using reviewer_id for student actions is
     * semantically incorrect and misleading in audit trails.
     *
     * NEW COLUMNS:
     * - actor_id:   The user who performed the action (reviewer OR student).
     * - actor_role: The role in which they acted ('academic_supervisor', 'student', etc.)
     * - event_type: The semantic event ('review', 'resubmit', 'student_submit', etc.)
     *
     * BACKWARD COMPATIBILITY: reviewer_id is preserved and backfilled from actor_id
     * for existing rows where event_type is a review action.
     */
    public function up(): void
    {
        Schema::table('logbook_review_histories', function (Blueprint $table) {
            $table->unsignedBigInteger('actor_id')->nullable()->after('reviewer_id');
            $table->string('actor_role', 50)->nullable()->after('actor_id');
            $table->string('event_type', 50)->nullable()->after('actor_role');

            $table->foreign('actor_id')->references('id')->on('users')->restrictOnDelete();
            $table->index(['logbook_entry_id', 'event_type']);
        });

        // Backfill: for all existing rows treat the action as a review by the reviewer.
        DB::statement('UPDATE logbook_review_histories SET actor_id = reviewer_id, actor_role = \'academic_supervisor\', event_type = \'review\' WHERE actor_id IS NULL');
    }

    public function down(): void
    {
        Schema::table('logbook_review_histories', function (Blueprint $table) {
            $table->dropForeign(['actor_id']);
            $table->dropIndex(['logbook_entry_id', 'event_type']);
            $table->dropColumn(['actor_id', 'actor_role', 'event_type']);
        });
    }
};
