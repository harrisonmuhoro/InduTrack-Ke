<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Documents table — student document uploads
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // intro_letter, medical_cert, insurance_cert, acceptance_letter, cv, transcript
            $table->string('original_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->bigInteger('file_size')->nullable(); // bytes
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->text('rejection_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        // End-of-attachment evaluations
        Schema::create('evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('placement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('evaluator_id')->constrained('users')->cascadeOnDelete();
            $table->string('evaluator_type'); // company_supervisor, academic_supervisor
            // Rubric scores (1–5)
            $table->unsignedTinyInteger('score_punctuality')->nullable();
            $table->unsignedTinyInteger('score_attitude')->nullable();
            $table->unsignedTinyInteger('score_technical')->nullable();
            $table->unsignedTinyInteger('score_teamwork')->nullable();
            $table->unsignedTinyInteger('score_communication')->nullable();
            $table->decimal('total_score', 5, 2)->nullable(); // computed average
            $table->text('remarks')->nullable();
            $table->boolean('would_accept_again')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
        });

        // Field visits by academic supervisors
        Schema::create('field_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_supervisor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('placement_id')->constrained()->cascadeOnDelete();
            $table->date('visit_date');
            $table->time('visit_time')->nullable();
            $table->string('status')->default('scheduled'); // scheduled, completed, cancelled
            $table->text('company_environment_notes')->nullable();
            $table->text('student_performance_notes')->nullable();
            $table->text('recommendations')->nullable();
            $table->string('gps_latitude')->nullable();
            $table->string('gps_longitude')->nullable();
            $table->timestamps();
        });

        // Weekly performance logs by company supervisors
        Schema::create('weekly_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('placement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_supervisor_id')->constrained('company_supervisors')->cascadeOnDelete();
            $table->unsignedInteger('week_number');
            $table->text('tasks_assigned')->nullable();
            $table->text('tasks_completed')->nullable();
            $table->unsignedTinyInteger('conduct_score')->nullable(); // 1-5
            $table->unsignedTinyInteger('attendance_score')->nullable(); // 1-5
            $table->text('specific_feedback')->nullable();
            $table->boolean('has_concern')->default(false);
            $table->text('concern_details')->nullable();
            $table->timestamps();
        });

        // In-portal messaging
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('receiver_id')->constrained('users')->cascadeOnDelete();
            $table->string('context_type')->nullable(); // placement, logbook_entry
            $table->unsignedBigInteger('context_id')->nullable();
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        // Escalation flags for students
        Schema::create('student_flags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('placement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('flagged_by')->constrained('users')->cascadeOnDelete();
            $table->string('severity')->default('warning'); // warning, flag, critical
            $table->string('reason'); // missed_logbook, misconduct, early_discharge
            $table->text('details')->nullable();
            $table->boolean('resolved')->default(false);
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_flags');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('weekly_logs');
        Schema::dropIfExists('field_visits');
        Schema::dropIfExists('evaluations');
        Schema::dropIfExists('documents');
    }
};
