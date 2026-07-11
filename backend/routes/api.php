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

// ─── Public Auth Routes ──────────────────────────────────────────────────────
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login',    [AuthController::class, 'login']);
});
Route::get('/email/verify/{id}/{hash}', [\App\Http\Controllers\VerificationController::class, 'verify'])->name('verification.verify');

// ─── Authenticated Routes ────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::post('/email/verification-notification', [\App\Http\Controllers\VerificationController::class, 'resend'])->name('verification.send');

    // Auth
    Route::post('/auth/logout',  [AuthController::class, 'logout']);
    
    // ── Profile (Unified) ────────────────────────────────────────────────────
    Route::get('/profile',            [ProfileController::class, 'show']);
    Route::put('/profile',            [ProfileController::class, 'update']);
    Route::put('/profile/password',   [ProfileController::class, 'updatePassword']);
    Route::put('/profile/email',      [ProfileController::class, 'updateEmail']);
    Route::post('/profile/photo',     [ProfileController::class, 'uploadPhoto']);
    Route::post('/profile/cv',        [ProfileController::class, 'uploadCv']);
    Route::post('/profile/transcript',[ProfileController::class, 'uploadTranscript']);
    Route::post('/auth/2fa/setup', [AuthController::class, 'setup2fa']);
    Route::post('/auth/2fa/verify', [AuthController::class, 'verify2fa']);
    Route::post('/auth/2fa/toggle', [AuthController::class, 'toggle2fa']);

    // ── Notifications ────────────────────────────────────────────────────────
    Route::get('/notifications',       [InstitutionController::class, 'notifications']);
    Route::post('/notifications/read', [InstitutionController::class, 'markNotificationsRead']);

    // ── Messages ─────────────────────────────────────────────────────────────
    Route::get('/messages/conversations',          [MessageController::class, 'conversations']);
    Route::get('/messages/thread/{partnerId}',     [MessageController::class, 'thread']);
    Route::post('/messages',                       [MessageController::class, 'send']);
    Route::get('/messages/unread',                 [MessageController::class, 'unreadCount']);

    // ── Student Routes ───────────────────────────────────────────────────────
    Route::get('/students/slots',      [StudentController::class, 'searchSlots']);
    Route::get('/students/applications', [StudentController::class, 'myApplications']);
    Route::get('/students/match',      [StudentController::class, 'smartMatch']);
    Route::get('/students/placement',  [StudentController::class, 'activePlacement']);
    Route::get('/students/evaluations', [EvaluationController::class, 'forStudent']);
    Route::get('/students/placements/{placementId}/certificate', [\App\Http\Controllers\CertificateController::class, 'generate']);

    // ── Applications ─────────────────────────────────────────────────────────
    Route::post('/applications',                    [ApplicationController::class, 'apply']);
    Route::put('/applications/{id}/status',         [ApplicationController::class, 'updateStatus']);
    Route::get('/applications/{id}/offer',          [ApplicationController::class, 'generateOfferLetter']);

    // ── Documents ────────────────────────────────────────────────────────────
    Route::post('/documents',           [DocumentController::class, 'upload']);
    Route::get('/documents',            [DocumentController::class, 'list']);
    Route::get('/documents/{id}/download', [DocumentController::class, 'download']);

    // ── Logbook (Student) ─────────────────────────────────────────────────────
    Route::get('/logbooks',                        [LogbookController::class, 'index']);
    Route::post('/logbooks',                       [LogbookController::class, 'store']);
    Route::put('/logbooks/{id}',                   [LogbookController::class, 'update']);
    Route::post('/logbooks/{entryId}/comments',    [LogbookController::class, 'addComment']);
    Route::post('/logbooks/{entryId}/review',      [LogbookController::class, 'reviewEntry']);
    Route::post('/placements/{placementId}/grade', [LogbookController::class, 'grade']);

    // ── Company Routes ────────────────────────────────────────────────────────
    Route::get('/companies/slots',                        [CompanyController::class, 'slots']);
    Route::post('/companies/slots',                       [CompanyController::class, 'createSlot']);
    Route::get('/companies/applicants',                   [CompanyController::class, 'allApplicants']);
    Route::get('/companies/slots/{slotId}/applicants',    [CompanyController::class, 'applicants']);
    Route::post('/companies/{companyId}/rate',            [EvaluationController::class, 'rateCompany']);

    // ── Evaluations ───────────────────────────────────────────────────────────
    Route::post('/evaluations',                          [EvaluationController::class, 'store']);
    Route::get('/evaluations/placement/{placementId}',   [EvaluationController::class, 'forPlacement']);

    // ── Supervisor Routes ─────────────────────────────────────────────────────
    Route::get('/supervisors/students',                              [SupervisorController::class, 'assignedStudents']);
    Route::get('/supervisors/placements/{placementId}/logbook',      [SupervisorController::class, 'viewLogbook']);
    Route::post('/supervisors/weekly-logs',                          [SupervisorController::class, 'submitWeeklyLog']);
    Route::get('/supervisors/placements/{placementId}/weekly-logs',  [SupervisorController::class, 'weeklyLogs']);
    Route::post('/supervisors/flag',                                 [SupervisorController::class, 'flagStudent']);

    // ── Field Visits ──────────────────────────────────────────────────────────
    Route::get('/field-visits',          [FieldVisitController::class, 'index']);
    Route::post('/field-visits',         [FieldVisitController::class, 'store']);
    Route::put('/field-visits/{id}',     [FieldVisitController::class, 'update']);
    Route::get('/field-visits/{id}',     [FieldVisitController::class, 'show']);

    // ── Institution Admin Routes ──────────────────────────────────────────────
    Route::get('/admin/dashboard',                   [InstitutionController::class, 'analytics']);
    Route::get('/admin/students',                    [InstitutionController::class, 'students']);
    Route::get('/admin/students/{id}',               [InstitutionController::class, 'studentDetail']);
    Route::get('/admin/companies',                   [InstitutionController::class, 'companies']);
    Route::put('/admin/companies/{id}/verify',       [InstitutionController::class, 'verifyCompany']);
    Route::put('/admin/companies/{id}/blacklist',    [InstitutionController::class, 'blacklistCompany']);
    Route::get('/admin/placements',                  [InstitutionController::class, 'placements']);
    Route::put('/admin/placements/{id}/approve',     [InstitutionController::class, 'approvePlacement']);
    Route::put('/admin/placements/{id}/reject',      [InstitutionController::class, 'rejectPlacement']);
    Route::get('/admin/compliance',                  [InstitutionController::class, 'compliance']);
    Route::put('/admin/flags/{id}/resolve',          [InstitutionController::class, 'resolveFlag']);
    Route::get('/admin/reports/placements',          [InstitutionController::class, 'reportPlacements']);
    Route::get('/admin/reports/compliance',          [InstitutionController::class, 'reportCompliance']);
    Route::put('/admin/documents/{id}/review',       [InstitutionController::class, 'reviewDocument']);

    // Legacy analytics endpoint (keep for backward compat)
    Route::get('/institutions/analytics',            [InstitutionController::class, 'analytics']);

    // ── Super Admin Routes ────────────────────────────────────────────────────
    Route::prefix('superadmin')->group(function () {
        Route::get('/dashboard',                      [\App\Http\Controllers\SuperAdminController::class, 'dashboard']);
        Route::get('/institutions',                   [\App\Http\Controllers\SuperAdminController::class, 'institutions']);
        Route::post('/institutions',                  [\App\Http\Controllers\SuperAdminController::class, 'storeInstitution']);
        Route::put('/institutions/{id}',              [\App\Http\Controllers\SuperAdminController::class, 'updateInstitution']);
        Route::put('/institutions/{id}/toggle',       [\App\Http\Controllers\SuperAdminController::class, 'toggleInstitution']);
        Route::get('/users',                          [\App\Http\Controllers\SuperAdminController::class, 'users']);
        Route::post('/users',                         [\App\Http\Controllers\SuperAdminController::class, 'createUser']);
        Route::put('/users/{id}/role',                [\App\Http\Controllers\SuperAdminController::class, 'updateUserRole']);
        Route::delete('/users/{id}',                  [\App\Http\Controllers\SuperAdminController::class, 'disableUser']);
        Route::get('/audit-logs',                     [\App\Http\Controllers\SuperAdminController::class, 'auditLogs']);
        Route::get('/system-stats',                   [\App\Http\Controllers\SuperAdminController::class, 'systemStats']);
        Route::post('/broadcast',                     [\App\Http\Controllers\SuperAdminController::class, 'broadcast']);
    });
});
