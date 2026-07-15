<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('placements', function (Blueprint $table) {
            $table->decimal('academic_grade', 5, 2)->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('placements', function (Blueprint $table) {
            $table->dropColumn('academic_grade');
        });
    }
};
