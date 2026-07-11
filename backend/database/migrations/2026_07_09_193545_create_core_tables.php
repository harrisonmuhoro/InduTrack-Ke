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
        // Core User/RBAC Tables
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
        });

        Schema::create('user_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
        });

        // Entities
        Schema::create('institutions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('domain')->unique()->nullable();
            $table->string('contact_email')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('industry')->nullable();
            $table->string('county')->nullable();
            $table->string('address')->nullable();
            $table->string('registration_number')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->text('description')->nullable();
            $table->string('website')->nullable();
            $table->string('logo_path')->nullable();
            $table->decimal('rating', 3, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('company_supervisors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('department')->nullable();
            $table->timestamps();
        });

        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('reg_number')->unique();
            $table->string('department')->nullable();
            $table->string('program')->nullable();
            $table->string('year_of_study')->nullable();
            $table->text('skills')->nullable();
            $table->string('cv_path')->nullable();
            $table->string('transcript_path')->nullable();
            $table->string('emergency_contact')->nullable();
            $table->timestamps();
        });

        // Attachment Process
        Schema::create('attachment_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('required_weeks')->default(8);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('attachment_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('period_id')->nullable()->constrained('attachment_periods')->nullOnDelete();
            $table->string('department');
            $table->integer('capacity');
            $table->string('required_skills')->nullable();
            $table->string('duration')->nullable();
            $table->boolean('has_stipend')->default(false);
            $table->decimal('stipend_amount', 10, 2)->nullable();
            $table->text('description')->nullable();
            $table->string('status')->default('open');
            $table->timestamps();
        });

        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('slot_id')->constrained('attachment_slots')->cascadeOnDelete();
            $table->string('status')->default('draft'); // draft, submitted, shortlisted, accepted, rejected
            $table->text('cover_letter')->nullable();
            $table->timestamps();
        });

        Schema::create('placements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('period_id')->nullable()->constrained('attachment_periods')->nullOnDelete();
            $table->foreignId('company_supervisor_id')->nullable()->constrained('company_supervisors')->nullOnDelete();
            $table->foreignId('academic_supervisor_id')->nullable()->constrained('users')->nullOnDelete(); // Assuming academic supervisor is just a user
            $table->string('status')->default('pending'); // pending, active, completed, flagged
            $table->timestamps();
        });

        // Simplified other tables just to get Phase 1 migrations done
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('placements');
        Schema::dropIfExists('applications');
        Schema::dropIfExists('attachment_slots');
        Schema::dropIfExists('attachment_periods');
        Schema::dropIfExists('students');
        Schema::dropIfExists('company_supervisors');
        Schema::dropIfExists('companies');
        Schema::dropIfExists('institutions');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
