<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Includes preflight duplicate detection and reconciliation to ensure safety on existing production data.
     */
    public function up(): void
    {
        // ── Preflight: detect existing duplicates and reconcile ─────────────────
        // If existing database contains duplicate (placement_id, evaluator_type) records,
        // retain the latest submitted record (highest ID) and remove earlier duplicates.
        $duplicates = DB::table('evaluations')
            ->select('placement_id', 'evaluator_type', DB::raw('COUNT(*) as total_count'), DB::raw('MAX(id) as keep_id'))
            ->groupBy('placement_id', 'evaluator_type')
            ->having('total_count', '>', 1)
            ->get();

        foreach ($duplicates as $duplicate) {
            DB::table('evaluations')
                ->where('placement_id', $duplicate->placement_id)
                ->where('evaluator_type', $duplicate->evaluator_type)
                ->where('id', '!=', $duplicate->keep_id)
                ->delete();
        }

        // Apply unique constraint safely
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
