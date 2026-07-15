<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            // Optional relation to placement if we want to ensure only placed students can rate, 
            // but we keep it anonymous so we don't strictly link it to the user.
            $table->foreignId('placement_id')->nullable()->constrained()->nullOnDelete(); 
            $table->integer('rating')->comment('1 to 5 stars');
            $table->text('feedback')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_ratings');
    }
};
