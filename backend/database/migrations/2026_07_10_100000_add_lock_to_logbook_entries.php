<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('logbook_entries', function (Blueprint $table) {
            $table->timestamp('locked_at')->nullable()->after('lessons_learned');
            $table->string('status')->default('draft')->after('locked_at'); // draft, submitted, approved, rejected, flagged
            $table->text('challenges')->nullable()->after('lessons_learned');
            $table->text('plan_next_week')->nullable()->after('challenges');
        });
    }

    public function down(): void
    {
        Schema::table('logbook_entries', function (Blueprint $table) {
            $table->dropColumn(['locked_at', 'status', 'challenges', 'plan_next_week']);
        });
    }
};
