<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logbook_review_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('logbook_entry_id')->constrained('logbook_entries')->cascadeOnDelete();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('previous_status');
            $table->string('new_status');
            $table->text('comment')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('reviewed_at');
            $table->timestamps();

            $table->index(['logbook_entry_id', 'reviewed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logbook_review_histories');
    }
};
