<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_ratings', function (Blueprint $table) {
            $table->string('rater_type')->nullable()->after('rater_id'); // student, supervisor
            $table->text('review')->nullable()->after('rater_type');     // alias for feedback (longer text)
        });
    }

    public function down(): void
    {
        Schema::table('company_ratings', function (Blueprint $table) {
            $table->dropColumn(['rater_type', 'review']);
        });
    }
};
