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
     *
     * SAFETY POLICY: This migration will NOT automatically reconcile duplicate evaluation
     * records. If duplicates exist, it will halt immediately, report all affected groups
     * with diagnostic information, and require manual administrator review before
     * re-running. No evaluation record is ever automatically chosen, archived, or deleted.
     *
     * RATIONALE: Selecting the highest ID as a winner does not establish correctness.
     * The older record may contain the authoritative assessment. Manual review and an
     * explicit reconciliation decision by an authorised administrator is required.
     *
     * MANUAL RECONCILIATION PROCEDURE (when duplicates are found):
     * 1. Review the diagnostic output logged to storage/logs/laravel.log.
     * 2. For each duplicate group, inspect the affected evaluations in the database.
     * 3. Consult the evaluator and placement coordinator to determine which record
     *    is authoritative.
     * 4. Soft-archive or delete the non-authoritative records manually, documenting the
     *    reconciliation decision (who decided, when, and why) in an audit log or comment.
     * 5. After all groups are resolved, re-run this migration.
     *
     * ROLLBACK: The down() method removes the unique constraint only. It does NOT
     * restore any manually reconciled records. Document all manual changes separately.
     */
    public function up(): void
    {
        // ── 1. Preflight duplicate detection ────────────────────────────────────
        $duplicates = DB::table('evaluations')
            ->select(
                'placement_id',
                'evaluator_type',
                DB::raw('COUNT(*) as total_count')
            )
            ->groupBy('placement_id', 'evaluator_type')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        if ($duplicates->isNotEmpty()) {
            // Build a human-readable diagnostic without exposing evaluation content.
            $report = [];
            foreach ($duplicates as $group) {
                // Collect status/submission metadata without full content
                $rows = DB::table('evaluations')
                    ->where('placement_id', $group->placement_id)
                    ->where('evaluator_type', $group->evaluator_type)
                    ->select('id', 'evaluator_id', 'evaluator_type', 'submitted_at', 'created_at', 'updated_at')
                    ->orderBy('id')
                    ->get();

                $report[] = [
                    'placement_id'   => $group->placement_id,
                    'evaluator_type' => $group->evaluator_type,
                    'count'          => $group->total_count,
                    'records'        => $rows->map(fn ($r) => [
                        'id'           => $r->id,
                        'evaluator_id' => $r->evaluator_id,
                        'submitted_at' => $r->submitted_at,
                        'created_at'   => $r->created_at,
                    ])->toArray(),
                ];
            }

            $summary = json_encode($report, JSON_PRETTY_PRINT);

            Log::error(
                "MIGRATION HALTED: evaluations table contains duplicate (placement_id, evaluator_type) groups.\n" .
                "The unique constraint cannot be added until all duplicates are manually resolved.\n" .
                "Duplicate groups:\n{$summary}\n" .
                "See MANUAL RECONCILIATION PROCEDURE in the migration file for resolution steps.\n" .
                "Migration: 2026_07_17_000001_add_unique_constraint_to_evaluations_table"
            );

            throw new \RuntimeException(
                "Migration halted: " . count($report) . " duplicate evaluation group(s) detected. " .
                "Review the diagnostic output in storage/logs/laravel.log and manually reconcile " .
                "all duplicate evaluation records before re-running this migration. " .
                "No evaluation records have been modified. " .
                "Affected placements: " . implode(', ', array_column($report, 'placement_id'))
            );
        }

        // ── 2. No duplicates confirmed — safely add unique constraint ────────────
        // Only reached when the preflight confirms all (placement_id, evaluator_type)
        // combinations are already unique in the active evaluations table.
        Schema::table('evaluations', function (Blueprint $table) {
            $table->unique(
                ['placement_id', 'evaluator_type'],
                'evaluations_placement_evaluator_type_unique'
            );
        });

        Log::info('Migration 2026_07_17_000001: unique constraint evaluations_placement_evaluator_type_unique added successfully. No duplicate records were found or modified.');
    }

    /**
     * Reverse the migrations.
     *
     * ROLLBACK LIMITATION: This only removes the unique constraint. Any evaluation
     * records that were manually reconciled during the administrator review process
     * are NOT automatically restored. Manual reconciliation decisions must be
     * tracked separately via the administrator's audit documentation.
     */
    public function down(): void
    {
        Schema::table('evaluations', function (Blueprint $table) {
            $table->dropUnique('evaluations_placement_evaluator_type_unique');
        });

        Log::info('Migration 2026_07_17_000001 rolled back: unique constraint evaluations_placement_evaluator_type_unique removed. No evaluation data was modified.');
    }
};
