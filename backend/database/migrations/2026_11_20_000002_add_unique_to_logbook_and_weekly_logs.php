<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Enforces uniqueness for logbook entries and weekly logs per placement and week number,
     * as well as optimized query indexes for in-portal messaging.
     */
    public function up(): void
    {
        // ── 1. Preflight check for duplicate (placement_id, week_number) on logbook_entries ──
        $duplicateEntries = DB::table('logbook_entries')
            ->select('placement_id', 'week_number', DB::raw('COUNT(*) as total_count'))
            ->groupBy('placement_id', 'week_number')
            ->having('total_count', '>', 1)
            ->get();

        if ($duplicateEntries->isNotEmpty()) {
            throw new \RuntimeException(
                "Migration halted: logbook_entries table contains duplicate (placement_id, week_number) records. " .
                "Manual reconciliation required before adding unique constraint."
            );
        }

        // ── 2. Preflight check for duplicate (placement_id, week_number) on weekly_logs ──
        $duplicateWeeklyLogs = DB::table('weekly_logs')
            ->select('placement_id', 'week_number', DB::raw('COUNT(*) as total_count'))
            ->groupBy('placement_id', 'week_number')
            ->having('total_count', '>', 1)
            ->get();

        if ($duplicateWeeklyLogs->isNotEmpty()) {
            throw new \RuntimeException(
                "Migration halted: weekly_logs table contains duplicate (placement_id, week_number) records. " .
                "Manual reconciliation required before adding unique constraint."
            );
        }

        // ── 3. Apply unique constraints ──
        Schema::table('logbook_entries', function (Blueprint $table) {
            $table->unique(['placement_id', 'week_number'], 'logbook_entries_placement_week_unique');
            if (!Schema::hasColumn('logbook_entries', 'submitted_at')) {
                $table->timestamp('submitted_at')->nullable()->after('status');
            }
            if (!Schema::hasColumn('logbook_entries', 'lock_reason')) {
                $table->string('lock_reason')->nullable()->after('locked_at');
            }
        });

        Schema::table('weekly_logs', function (Blueprint $table) {
            $table->unique(['placement_id', 'week_number'], 'weekly_logs_placement_week_unique');
        });

        // ── 4. Apply messaging indexes for conversation querying and unread counts ──
        Schema::table('messages', function (Blueprint $table) {
            $table->index(['receiver_id', 'read_at'], 'messages_receiver_read_idx');
            $table->index(['sender_id', 'receiver_id', 'created_at'], 'messages_conversation_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex('messages_receiver_read_idx');
            $table->dropIndex('messages_conversation_idx');
        });

        Schema::table('weekly_logs', function (Blueprint $table) {
            $table->dropUnique('weekly_logs_placement_week_unique');
        });

        Schema::table('logbook_entries', function (Blueprint $table) {
            $table->dropUnique('logbook_entries_placement_week_unique');
            $table->dropColumn(['submitted_at', 'lock_reason']);
        });
    }
};
