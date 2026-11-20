<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('logbook_entries', 'correction_deadline')) {
            Schema::table('logbook_entries', function (Blueprint $table) {
                $table->timestamp('correction_deadline')->nullable()->after('reviewed_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('logbook_entries', 'correction_deadline')) {
            Schema::table('logbook_entries', function (Blueprint $table) {
                $table->dropColumn('correction_deadline');
            });
        }
    }
};
