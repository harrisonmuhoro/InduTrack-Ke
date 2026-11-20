<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\LogbookController;
use App\Http\Controllers\SupervisorController;
use App\Http\Controllers\InstitutionController;
use App\Http\Controllers\EvaluationController;
use App\Http\Controllers\FieldVisitController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\VerificationController;

// ─── Public Auth Routes ──────────────────────────────────────────────────────
Route::middleware('throttle:60,1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login',    [AuthController::class, 'login']);
});
// Password-authenticated but not yet signed-in 2FA session challenge.
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/auth/2fa/setup',  [AuthController::class, 'setup2fa']);
    Route::post('/auth/2fa/verify', [AuthController::class, 'verify2fa']);
});
Route::get('/email/verify/{id}/{hash}', [\App\Http\Controllers\VerificationController::class, 'verify'])->name('verification.verify');

// ─── Authenticated Base Routes ────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::post('/email/verification-notification', [\App\Http\Controllers\VerificationController::class, 'resend'])->name('verification.send');

    // Auth & Session
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // ── Profile (Unified) ────────────────────────────────────────────────────
    Route::get('/profile',             [ProfileController::class, 'show']);
    Route::put('/profile',             [ProfileController::class, 'update']);
    Route::put('/profile/password',    [ProfileController::class, 'updatePassword']);
    Route::put('/profile/email',       [ProfileController::class, 'updateEmail']);
    Route::post('/profile/photo',      [ProfileController::class, 'uploadPhoto']);
    Route::post('/profile/cv',         [ProfileController::class, 'uploadCv']);
    Route::post('/profile/transcript', [ProfileController::class, 'uploadTranscript']);
    Route::post('/auth/2fa/toggle',    [AuthController::class, 'toggle2fa']);

    // Policy controls student, same-institution admin, and super-admin downloads.
    Route::get('/documents/{id}/download', [DocumentController::class, 'download']);

    // ── Notifications ────────────────────────────────────────────────────────
    Route::get('/notifications',       [InstitutionController::class, 'notifications']);
    Route::post('/notifications/read', [InstitutionController::class, 'markNotificationsRead']);

    // ── Internal Messaging ────────────────────────────────────────────────────
    Route::get('/messages/conversations',      [MessageController::class, 'conversations']);
    Route::get('/messages/thread/{partnerId}', [MessageController::class, 'thread']);
    Route::post('/messages',                   [MessageController::class, 'send']);
    Route::get('/messages/unread',             [MessageController::class, 'unreadCount']);

    // ── Offer Letters (Students, Companies, Admins) ───────────────────────────
    Route::get('/applications/{id}/offer',     [ApplicationController::class, 'generateOfferLetter']);

    // ── Application Status Decisions (Company Manager, Admin) ───────────────
    Route::put('/applications/{id}/status',    [ApplicationController::class, 'updateStatus'])
        ->middleware('role:company,institution_admin,super_admin');

    // ── Completion Certificate (Student, Institution Admin, Super Admin) ─────
    Route::get('/students/placements/{placementId}/certificate', [\App\Http\Controllers\CertificateController::class, 'generate'])
        ->middleware('role:student,institution_admin,super_admin');

    // ── Student Role Routes ───────────────────────────────────────────────────
    Route::middleware('role:student,super_admin')->group(function () {
        Route::get('/students/slots',        [StudentController::class, 'searchSlots']);
        Route::get('/students/applications', [StudentController::class, 'myApplications']);
        Route::get('/students/match',        [StudentController::class, 'smartMatch']);
        Route::get('/students/placement',    [StudentController::class, 'activePlacement']);
        Route::get('/students/evaluations',  [EvaluationController::class, 'forStudent']);

        // Applications & Documents
        Route::post('/applications',          [ApplicationController::class, 'apply']);
        Route::post('/documents',             [DocumentController::class, 'upload']);
        Route::get('/documents',              [DocumentController::class, 'list']);

        // Student Logbook
        Route::get('/logbooks',               [LogbookController::class, 'index']);
        Route::post('/logbooks',              [LogbookController::class, 'store']);
        Route::put('/logbooks/{id}',          [LogbookController::class, 'update']);
        Route::post('/logbooks/{id}/submit',  [LogbookController::class, 'submit']);

        // Company Rating (Student submits review for their completed attachment)
        Route::post('/companies/{companyId}/rate', [EvaluationController::class, 'rateCompany']);
    });

    // ── Company Role Routes ───────────────────────────────────────────────────
    // Slot creation is restricted to company managers and super_admin only.
    // company_supervisors may view slots and applicants, but cannot create slots.
    Route::middleware('role:company,company_supervisor,super_admin')->group(function () {
        Route::get('/companies/slots',                     [CompanyController::class, 'slots']);
        Route::get('/companies/applicants',                [CompanyController::class, 'allApplicants']);
        Route::get('/companies/slots/{slotId}/applicants', [CompanyController::class, 'applicants']);
    });

    // Slot creation: company manager and super_admin ONLY (not company_supervisor)
    Route::middleware('role:company,super_admin')->group(function () {
        Route::post('/companies/slots', [CompanyController::class, 'createSlot']);
    });

    // ── Supervisor Routes (Academic & Company Supervisors) ─────────────────────
    // Field visits are restricted to academic supervisors only (not company supervisors).
    Route::middleware('role:academic_supervisor,institution_supervisor,company_supervisor,super_admin')->group(function () {
        Route::get('/supervisors/students',                             [SupervisorController::class, 'assignedStudents']);
        Route::get('/supervisors/placements/{placementId}/logbook',     [SupervisorController::class, 'viewLogbook']);
        Route::post('/supervisors/weekly-logs',                         [SupervisorController::class, 'submitWeeklyLog']);
        Route::get('/supervisors/placements/{placementId}/weekly-logs', [SupervisorController::class, 'weeklyLogs']);
        Route::post('/supervisors/flag',                                [SupervisorController::class, 'flagStudent']);

        // Logbook Review & Academic Grading
        Route::post('/logbooks/{entryId}/comments',    [LogbookController::class, 'addComment']);
        Route::post('/logbooks/{entryId}/review',      [LogbookController::class, 'reviewEntry']);
        Route::post('/placements/{placementId}/grade', [LogbookController::class, 'grade']);

        // Final Evaluations
        Route::post('/evaluations',                         [EvaluationController::class, 'store']);
        Route::get('/evaluations/placement/{placementId}',  [EvaluationController::class, 'forPlacement']);
    });

    // Field Visits: academic supervisors only (and super_admin)
    Route::middleware('role:academic_supervisor,institution_supervisor,super_admin')->group(function () {
        Route::get('/field-visits',         [FieldVisitController::class, 'index']);
        Route::post('/field-visits',        [FieldVisitController::class, 'store']);
        Route::put('/field-visits/{id}',    [FieldVisitController::class, 'update']);
        Route::get('/field-visits/{id}',    [FieldVisitController::class, 'show']);
    });

    // ── Institution Admin Routes ──────────────────────────────────────────────
    Route::middleware('role:institution_admin,super_admin')->prefix('admin')->group(function () {
        Route::get('/dashboard',                   [InstitutionController::class, 'analytics']);
        Route::get('/students',                    [InstitutionController::class, 'students']);
        Route::get('/students/{id}',               [InstitutionController::class, 'studentDetail']);
        Route::get('/companies',                   [InstitutionController::class, 'companies']);
        Route::put('/companies/{id}/verify',       [InstitutionController::class, 'verifyCompany']);
        Route::put('/companies/{id}/blacklist',    [InstitutionController::class, 'blacklistCompany']);
        Route::get('/placements',                  [InstitutionController::class, 'placements']);
        Route::put('/placements/{id}/approve',     [InstitutionController::class, 'approvePlacement']);
        Route::put('/placements/{id}/reject',      [InstitutionController::class, 'rejectPlacement']);
        Route::get('/compliance',                  [InstitutionController::class, 'compliance']);
        Route::put('/flags/{id}/resolve',          [InstitutionController::class, 'resolveFlag']);
        Route::get('/reports/placements',          [InstitutionController::class, 'reportPlacements']);
        Route::get('/reports/compliance',          [InstitutionController::class, 'reportCompliance']);
        Route::put('/documents/{id}/review',       [InstitutionController::class, 'reviewDocument']);
    });

    // Legacy analytics endpoint (backward compat)
    Route::get('/institutions/analytics', [InstitutionController::class, 'analytics'])
        ->middleware('role:institution_admin,super_admin');

    // ── Super Admin Routes (Strictly Restricted to super_admin) ───────────────
    Route::middleware('role:super_admin')->prefix('superadmin')->group(function () {
        Route::get('/dashboard',                [SuperAdminController::class, 'dashboard']);
        Route::get('/institutions',             [SuperAdminController::class, 'institutions']);
        Route::post('/institutions',            [SuperAdminController::class, 'storeInstitution']);
        Route::put('/institutions/{id}',        [SuperAdminController::class, 'updateInstitution']);
        Route::put('/institutions/{id}/toggle', [SuperAdminController::class, 'toggleInstitution']);
        Route::get('/users',                    [SuperAdminController::class, 'users']);
        Route::post('/users',                   [SuperAdminController::class, 'createUser']);
        Route::put('/users/{id}/role',          [SuperAdminController::class, 'updateUserRole']);
        Route::delete('/users/{id}',            [SuperAdminController::class, 'disableUser']);
        Route::get('/audit-logs',               [SuperAdminController::class, 'auditLogs']);
        Route::get('/system-stats',             [SuperAdminController::class, 'systemStats']);
        Route::post('/broadcast',               [SuperAdminController::class, 'broadcast']);
    });
});
