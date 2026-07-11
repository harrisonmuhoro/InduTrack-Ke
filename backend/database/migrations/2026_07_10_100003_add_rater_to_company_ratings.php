<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_ratings', function (Blueprint $table) {
            $table->foreignId('rater_id')->nullable()->constrained('users')->nullOnDelete()->after('company_id');
            $table->boolean('is_anonymous')->default(false)->after('feedback');
        });
    }

    public function down(): void
    {
        Schema::table('company_ratings', function (Blueprint $table) {
            $table->dropForeign(['rater_id']);
            $table->dropColumn(['rater_id', 'is_anonymous']);
        });
    }
};
