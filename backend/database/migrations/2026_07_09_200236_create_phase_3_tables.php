<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('institution_supervisors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('department')->nullable();
            $table->timestamps();
        });

        Schema::create('logbook_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('placement_id')->constrained()->cascadeOnDelete();
            $table->date('entry_date');
            $table->integer('week_number');
            $table->text('activities');
            $table->text('lessons_learned')->nullable();
            $table->timestamps();
        });

        Schema::create('logbook_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('logbook_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // The supervisor/author
            $table->text('comment');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logbook_comments');
        Schema::dropIfExists('logbook_entries');
        Schema::dropIfExists('institution_supervisors');
    }
};
