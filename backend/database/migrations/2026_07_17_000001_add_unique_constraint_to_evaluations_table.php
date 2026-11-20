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
     * Includes preflight duplicate detection and auditable reconciliation to ensure production safety.
     */
    public function up(): void
    {
        // ── 1. Preflight: detect existing duplicate (placement_id, evaluator_type) groups ──
        $duplicates = DB::table('evaluations')
            ->select(
                'placement_id',
                'evaluator_type',
                DB::raw('COUNT(*) as total_count'),
                DB::raw('MAX(id) as keep_id')
            )
            ->groupBy('placement_id', 'evaluator_type')
            ->having('total_count', '>', 1)
            ->get();

        if ($duplicates->isNotEmpty()) {
            // Auditable reconciliation: create an archive table so no data is ever silently lost or deleted.
            if (!Schema::hasTable('evaluations_archive')) {
                Schema::create('evaluations_archive', function (Blueprint $table) {
                    $table->id('archive_id');
                    $table->unsignedBigInteger('original_evaluation_id');
                    $table->unsignedBigInteger('placement_id');
                    $table->unsignedBigInteger('evaluator_id');
                    $table->string('evaluator_type');
                    $table->json('evaluation_snapshot');
                    $table->string('reconciliation_notes');
                    $table->timestamps();
                });
            }

            foreach ($duplicates as $group) {
                $duplicateRows = DB::table('evaluations')
                    ->where('placement_id', $group->placement_id)
                    ->where('evaluator_type', $group->evaluator_type)
                    ->where('id', '!=', $group->keep_id)
                    ->get();

                foreach ($duplicateRows as $row) {
                    DB::table('evaluations_archive')->insert([
                        'original_evaluation_id' => $row->id,
                        'placement_id'           => $row->placement_id,
                        'evaluator_id'           => $row->evaluator_id,
                        'evaluator_type'         => $row->evaluator_type,
                        'evaluation_snapshot'    => json_encode($row),
                        'reconciliation_notes'   => "Audited duplicate reconciled during 2026_07_17 unique constraint migration. Retained active record ID {$group->keep_id}.",
                        'created_at'             => now(),
                        'updated_at'             => now(),
                    ]);

                    DB::table('evaluations')->where('id', $row->id)->delete();
                }

                Log::info("Reconciled duplicate evaluations for placement #{$group->placement_id} ({$group->evaluator_type}): Retained ID {$group->keep_id}, archived older records to evaluations_archive.");
            }
        }

        // ── 2. Add unique constraint to prevent race conditions & duplicate submissions ──
        Schema::table('evaluations', function (Blueprint $table) {
            $table->unique(['placement_id', 'evaluator_type'], 'evaluations_placement_evaluator_type_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluations', function (Blueprint $table) {
            $table->dropUnique('evaluations_placement_evaluator_type_unique');
        });
    }
};
