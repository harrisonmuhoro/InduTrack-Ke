# Phase 4: Initial Security & Authorization Repository Audit

**System:** InduTrack-Ke (Industrial Attachment & Internship Tracking Management System)  
**Date:** November 20, 2026  
**Auditor / Engineering Agent:** Antigravity AI  
**Scope:** Architecture, routes, middleware, policies, role hierarchies, institutional/company boundaries, existing tests, and security verification plan.

---

## 1. Security Architecture Overview

InduTrack-Ke is a multi-tenant, role-governed web application built on Laravel 11 (backend REST API) and React 19 (SPA frontend). It orchestrates industrial attachments across universities/institutions, host companies, academic faculty, company workplace mentors, and students.

### 1.1 Authentication & Session Management
- **Bearer Tokens:** Handled via Laravel Sanctum (`auth:sanctum`). Personal access tokens are validated on every authenticated API request.
- **Two-Factor Authentication (2FA):** Implemented using TOTP (`pragmarx/google2fa`). Enforces two-step verification during login for users with 2FA enabled, with session challenge protection (`throttle:10,1`).
- **Rate Limiting:** Public auth endpoints are throttled to 60 req/min (login/register) and 10 req/min (2FA verification).

### 1.2 Role & Permission Subsystem
- **Canonical Roles:**
  1. `student`
  2. `company` (Company Manager)
  3. `company_supervisor` (Industry Workplace Mentor)
  4. `academic_supervisor` (University Faculty Supervisor)
  5. `institution_admin` (University Industrial Attachment Coordinator)
  6. `super_admin` (Global System Administrator)
- **Role Aliases & Normalization:**
  - `User::canonicalRoleName()` normalizes names (case-insensitive, trims, underscores).
  - The legacy role `institution_supervisor` is aliased directly to `academic_supervisor` in `User::hasRole()`, ensuring backward compatibility without permission drift.
- **Middleware:**
  - `RoleMiddleware` (`role:role1,role2`): Evaluates role membership, supporting spread and comma-separated arguments.
  - `PermissionMiddleware` (`permission:perm1,perm2`): Evaluates granular permissions via `user_roles` -> `role_permissions` -> `permissions`.

### 1.3 Authorization Policies & Gates
- Model-level policies registered in `AppServiceProvider`:
  - `ApplicationPolicy` (governs viewing, status decisions, offer letters)
  - `CompanyPolicy` (governs protected company view, management, slot creation)
  - `DocumentPolicy` (governs viewing, download, admin verification)
  - `EvaluationPolicy` (governs supervisor evaluation creation and retrieval)
  - `FieldVisitPolicy` (governs academic supervisor field visit lifecycle)
  - `InstitutionPolicy` (governs institutional view and configuration)
  - `LogbookEntryPolicy` (governs student entry creation, editing, submission, resubmission, supervisor review)
  - `PlacementPolicy` (governs placement access, institutional approval/rejection, grading, completion certificates)
  - `StudentPolicy` (governs student profile access and updates)
- Global Gate Filter: `Gate::before()` grants `super_admin` bypass for general Gates, but endpoint-specific business rules (such as self-messaging prevention and certificate eligibility requirements) take precedence where enforced.

---

## 2. Route and Middleware Inventory

### 2.1 Public Endpoints (`throttle:60,1` / `throttle:10,1`)
| Method | Route | Controller@Action | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | `AuthController@register` | Self-registration (student/company) |
| POST | `/api/auth/login` | `AuthController@login` | Primary credential authentication |
| POST | `/api/auth/2fa/setup` | `AuthController@setup2fa` | TOTP secret generation |
| POST | `/api/auth/2fa/verify` | `AuthController@verify2fa` | TOTP challenge verification |
| GET | `/api/email/verify/{id}/{hash}` | `VerificationController@verify` | Email verification handler |

### 2.2 Authenticated Base Routes (`auth:sanctum`, `throttle:60,1`)
| Method | Route | Controller@Action | Authorization Control |
|---|---|---|---|
| POST | `/api/auth/logout` | `AuthController@logout` | Revokes current token |
| GET | `/api/profile` | `ProfileController@show` | Current user profile |
| PUT | `/api/profile` | `ProfileController@update` | Strict relationship-based update |
| PUT | `/api/profile/password` | `ProfileController@updatePassword` | Current password verification |
| PUT | `/api/profile/email` | `ProfileController@updateEmail` | Email update & re-verify |
| POST | `/api/profile/photo` | `ProfileController@uploadPhoto` | Profile photo / company logo |
| POST | `/api/profile/cv` | `ProfileController@uploadCv` | Student-only CV upload |
| POST | `/api/profile/transcript` | `ProfileController@uploadTranscript` | Student-only transcript upload |
| POST | `/api/auth/2fa/toggle` | `AuthController@toggle2fa` | Enable/disable 2FA |
| GET | `/api/documents/{id}/download` | `DocumentController@download` | `DocumentPolicy::download` |
| GET | `/api/notifications` | `InstitutionController@notifications` | User's notifications |
| POST | `/api/notifications/read` | `InstitutionController@markNotificationsRead` | Mark read |
| GET | `/api/messages/conversations` | `MessageController@conversations` | Active authorized threads |
| GET | `/api/messages/thread/{partnerId}` | `MessageController@thread` | `canCommunicate` check |
| POST | `/api/messages` | `MessageController@send` | `canCommunicate` check |
| GET | `/api/messages/unread` | `MessageController@unreadCount` | Unread message count |
| GET | `/api/applications/{id}/offer` | `ApplicationController@generateOfferLetter` | `ApplicationPolicy::generateOffer` |
| PUT | `/api/applications/{id}/status` | `ApplicationController@updateStatus` | `role:company,institution_admin,super_admin` + `ApplicationPolicy` |
| GET | `/api/students/placements/{id}/certificate` | `CertificateController@generate` | `role:student,institution_admin,super_admin` + `PlacementPolicy::certificate` |

### 2.3 Student Routes (`role:student,super_admin`)
| Method | Route | Controller@Action | Authorization Control |
|---|---|---|---|
| GET | `/api/students/slots` | `StudentController@searchSlots` | Public verified slot discovery |
| GET | `/api/students/applications` | `StudentController@myApplications` | Student's own applications |
| GET | `/api/students/match` | `StudentController@smartMatch` | Department-matched slots |
| GET | `/api/students/placement` | `StudentController@activePlacement` | Student's active placement |
| GET | `/api/students/evaluations` | `EvaluationController@forStudent` | Completed evaluations |
| POST | `/api/applications` | `ApplicationController@apply` | Apply to open slot |
| POST | `/api/documents` | `DocumentController@upload` | Upload supporting document |
| GET | `/api/documents` | `DocumentController@list` | Student's own documents |
| GET | `/api/logbooks` | `LogbookController@index` | Active placement logbook entries |
| POST | `/api/logbooks` | `LogbookController@store` | Draft logbook creation (active placement) |
| PUT | `/api/logbooks/{id}` | `LogbookController@update` | `LogbookEntryPolicy::update` (72h limit) |
| POST | `/api/logbooks/{id}/submit` | `LogbookController@submit` | Explicit submission to supervisor |
| POST | `/api/logbooks/{id}/resubmit` | `LogbookController@resubmit` | `LogbookEntryPolicy::resubmit` (deadline) |
| POST | `/api/companies/{id}/rate` | `EvaluationController@rateCompany` | Rate company attended |

### 2.4 Company Routes (`role:company,company_supervisor,super_admin` / `role:company,super_admin`)
| Method | Route | Controller@Action | Authorization Control |
|---|---|---|---|
| GET | `/api/companies/slots` | `CompanyController@slots` | `CompanyPolicy::view` |
| GET | `/api/companies/applicants` | `CompanyController@allApplicants` | `CompanyPolicy::view` |
| GET | `/api/companies/slots/{id}/applicants` | `CompanyController@applicants` | `CompanyPolicy::view` |
| POST | `/api/companies/slots` | `CompanyController@createSlot` | `role:company,super_admin` + `CompanyPolicy::createSlot` |

### 2.5 Supervisor Routes (`role:academic_supervisor,company_supervisor,super_admin`)
| Method | Route | Controller@Action | Authorization Control |
|---|---|---|---|
| GET | `/api/supervisors/students` | `SupervisorController@assignedStudents` | Scoped to supervisor assignments |
| GET | `/api/supervisors/placements/{id}/logbook` | `SupervisorController@viewLogbook` | `PlacementPolicy::view` |
| POST | `/api/supervisors/weekly-logs` | `SupervisorController@submitWeeklyLog` | Assigned company supervisor only |
| GET | `/api/supervisors/placements/{id}/weekly-logs` | `SupervisorController@weeklyLogs` | `PlacementPolicy::view` |
| POST | `/api/supervisors/flag` | `SupervisorController@flagStudent` | Assigned supervisor or inst admin |
| POST | `/api/logbooks/{id}/comments` | `LogbookController@addComment` | `LogbookEntryPolicy::addComment` |
| POST | `/api/evaluations` | `EvaluationController@store` | `EvaluationPolicy::create` |
| GET | `/api/evaluations/placement/{id}` | `EvaluationController@forPlacement` | `PlacementPolicy::view` |
| POST | `/api/logbooks/{id}/review` | `LogbookController@reviewEntry` | `role:academic_supervisor,super_admin` + `LogbookEntryPolicy::review` |
| POST | `/api/placements/{id}/grade` | `LogbookController@grade` | `role:academic_supervisor,super_admin` + `PlacementPolicy::grade` |
| GET | `/api/field-visits` | `FieldVisitController@index` | `role:academic_supervisor,super_admin` |
| POST | `/api/field-visits` | `FieldVisitController@store` | `FieldVisitPolicy::create` |
| PUT | `/api/field-visits/{id}` | `FieldVisitController@update` | `FieldVisitPolicy::update` |
| GET | `/api/field-visits/{id}` | `FieldVisitController@show` | `FieldVisitPolicy::view` |

### 2.6 Institution Admin Routes (`role:institution_admin,super_admin` / prefix `admin`)
| Method | Route | Controller@Action | Authorization Control |
|---|---|---|---|
| GET | `/api/admin/dashboard` | `InstitutionController@analytics` | Scoped to `user.institution_id` |
| GET | `/api/admin/students` | `InstitutionController@students` | Scoped to `user.institution_id` |
| GET | `/api/admin/students/{id}` | `InstitutionController@studentDetail` | `StudentPolicy::view` |
| GET | `/api/admin/companies` | `InstitutionController@companies` | Connected companies only |
| PUT | `/api/admin/companies/{id}/verify` | `InstitutionController@verifyCompany` | `super_admin` only |
| PUT | `/api/admin/companies/{id}/blacklist` | `InstitutionController@blacklistCompany` | `super_admin` only |
| GET | `/api/admin/placements` | `InstitutionController@placements` | Scoped to `user.institution_id` |
| GET | `/api/admin/placements/{id}/logbook` | `SupervisorController@viewLogbook` | `PlacementPolicy::view` |
| PUT | `/api/admin/placements/{id}/approve` | `InstitutionController@approvePlacement` | `PlacementPolicy::approve` |
| PUT | `/api/admin/placements/{id}/reject` | `InstitutionController@rejectPlacement` | `PlacementPolicy::approve` |
| GET | `/api/admin/compliance` | `InstitutionController@compliance` | Scoped to `user.institution_id` |
| PUT | `/api/admin/flags/{id}/resolve` | `InstitutionController@resolveFlag` | Scoped to `user.institution_id` |
| GET | `/api/admin/reports/placements` | `InstitutionController@reportPlacements` | Scoped to `user.institution_id` |
| GET | `/api/admin/reports/compliance` | `InstitutionController@reportCompliance` | Scoped to `user.institution_id` |
| PUT | `/api/admin/documents/{id}/review` | `InstitutionController@reviewDocument` | Scoped to `user.institution_id` |

### 2.7 Super Admin Routes (`role:super_admin` / prefix `superadmin`)
| Method | Route | Controller@Action | Authorization Control |
|---|---|---|---|
| GET | `/api/superadmin/dashboard` | `SuperAdminController@dashboard` | Global metrics |
| GET | `/api/superadmin/institutions` | `SuperAdminController@institutions` | List all universities |
| POST | `/api/superadmin/institutions` | `SuperAdminController@storeInstitution` | Register institution |
| PUT | `/api/superadmin/institutions/{id}` | `SuperAdminController@updateInstitution` | Modify institution |
| PUT | `/api/superadmin/institutions/{id}/toggle` | `SuperAdminController@toggleInstitution` | Activate/deactivate |
| GET | `/api/superadmin/users` | `SuperAdminController@users` | Search/filter all users |
| POST | `/api/superadmin/users` | `SuperAdminController@createUser` | Create staff/admin accounts |
| PUT | `/api/superadmin/users/{id}/role` | `SuperAdminController@updateUserRole` | Reassign user roles |
| DELETE | `/api/superadmin/users/{id}` | `SuperAdminController@disableUser` | Revoke user sessions |
| GET | `/api/superadmin/audit-logs` | `SuperAdminController@auditLogs` | View audit trail |
| GET | `/api/superadmin/system-stats` | `SuperAdminController@systemStats` | System storage & counts |
| POST | `/api/superadmin/broadcast` | `SuperAdminController@broadcast` | Broadcast announcement |

---

## 3. Role-Permission Matrix

| Resource / Action | Student | Company Manager | Company Supervisor | Academic Supervisor | Institution Admin | Super Admin |
|---|---|---|---|---|---|---|
| View public slots | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create slot | ❌ | ✅ (own company) | ❌ | ❌ | ❌ | ✅ |
| Apply to slot | ✅ (active student) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Shortlist/Accept/Reject applicant | ❌ | ✅ (own slots) | ❌ | ❌ | ✅ (own inst) | ✅ |
| Upload student document | ✅ (own profile) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Download student document | ✅ (own document)| ❌ | ❌ | ❌ | ✅ (own inst) | ✅ |
| Review/Approve document | ❌ | ❌ | ❌ | ❌ | ✅ (own inst) | ✅ |
| Create logbook draft | ✅ (own active) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update logbook draft (within 72h) | ✅ (own draft) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Submit logbook entry | ✅ (own draft) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Resubmit rejected logbook (active deadline) | ✅ (own entry) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Comment on logbook entry | ❌ | ❌ | ✅ (assigned) | ✅ (assigned) | ✅ (own inst) | ✅ |
| Formal academic review (approve/reject/flag) | ❌ | ❌ | ❌ | ✅ (assigned) | ❌ | ✅ |
| Submit weekly supervisor log | ❌ | ❌ | ✅ (assigned) | ❌ | ❌ | ✅ (assigned) |
| Academic grading of placement | ❌ | ❌ | ❌ | ✅ (assigned) | ✅ (own inst) | ✅ |
| Create/Update field visit | ❌ | ❌ | ❌ | ✅ (assigned) | ❌ | ✅ |
| Submit final evaluation | ❌ | ❌ | ✅ (assigned) | ✅ (assigned) | ❌ | ✅ |
| Approve/Reject placement | ❌ | ❌ | ❌ | ❌ | ✅ (own inst) | ✅ |
| Resolve student flag | ❌ | ❌ | ❌ | ❌ | ✅ (own inst) | ✅ |
| Institution analytics & reports | ❌ | ❌ | ❌ | ❌ | ✅ (own inst) | ✅ (global) |
| Manage institutions & system users | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 4. Institutional and Company Ownership Boundaries

### 4.1 Multi-Institution Isolation
- **Tenant Boundary Anchor:** `users.institution_id` for administrators and staff; `students.institution_id` for students.
- **Rules Enforced:**
  1. An `institution_admin` belonging to Institution A (`institution_id = 1`) must receive `403 Forbidden` or empty results when attempting to read, update, or export records (students, placements, compliance, flags, documents) belonging to Institution B (`institution_id = 2`).
  2. An `institution_admin` with `institution_id = null` must be denied access to all institutional administrative endpoints.
  3. `academic_supervisor` users can only view and evaluate students whose active placements are explicitly assigned to them.
  4. Cross-institutional data reassignment (e.g. attempting to update a student's `institution_id` via profile or placement endpoints) is rejected.

### 4.2 Multi-Company Isolation
- **Tenant Boundary Anchor:** `users.company_id` for Company Managers; `company_supervisors.company_id` for Company Supervisors; `placements.company_id` for Placements.
- **Rules Enforced:**
  1. Company Manager A cannot view applicants, slots, or placements belonging to Company B.
  2. Company Supervisor A cannot view logbooks, submit weekly logs, or evaluate placements belonging to Company B (or placements at Company A assigned to Supervisor B).
  3. Company Manager cannot create slots for another company by manipulating `company_id` in request payloads.
  4. Company Supervisors are forbidden from creating slots or changing applicant status.

### 4.3 Student Ownership Boundary
- **Tenant Boundary Anchor:** `students.user_id = authenticated_user.id`.
- **Rules Enforced:**
  1. Student A cannot view or download Student B's documents, applications, logbook entries, or completion certificates.
  2. Student A cannot edit, submit, or resubmit Student B's logbook entries.
  3. Student A cannot message arbitrary students or supervisors without an active, authorized placement relationship.

---

## 5. Existing Security Test Coverage Review

The repository currently contains:
- `backend/tests/Feature/Security/AuthorizationTest.php` (630 lines): Tests baseline roles, superadmin gate, institution admin boundary on student detail, company supervisor placement restriction, academic supervisor review assignment.
- `backend/tests/Feature/Security/SecurityRemediationTest.php` (929 lines): Tests company policy institution scoping, profile update atomicity, evaluation duplicate handling, and certificate eligibility.
- `backend/tests/Feature/Security/TwoFactorAuthenticationTest.php`: Tests 2FA setup, challenge validation, and session isolation.
- `backend/tests/Feature/Phase3/Phase3LogbookTest.php`, `Phase3ActorRoleTest.php`, `Phase3MigrationRepairTest.php`, `Phase3MessagingTest.php`, `Phase3SupervisionTest.php`: Comprehensive coverage of Phase 3 workflow mechanics.

---

## 6. Identified Authorization & Security Gaps to Cover in Phase 4

While the existing suite verifies several core paths, Phase 4 requires establishing reproducible, automated proof across the entire attack surface:

1. **Workstream A (Role-Based Authorization):** Systematic negative authorization tests ensuring every canonical role is rejected with `403` on endpoints meant for other roles (e.g., student calling supervisor or admin endpoints, company supervisor calling company manager endpoints, academic supervisor calling company endpoints).
2. **Workstream B (Privilege Escalation & Unauthorized Access):** Testing parameter tampering (`institution_id`, `company_id`, `role_id`, `status`), unauthenticated requests (`401`), and forged requests.
3. **Workstream C (IDOR & Record Ownership):** Direct object reference tests across all endpoints accepting an ID parameter (`/documents/{id}/download`, `/applications/{id}/status`, `/logbooks/{id}`, `/field-visits/{id}`, `/admin/students/{id}`, `/evaluations/placement/{id}`, `/students/placements/{id}/certificate`).
4. **Workstream D (Cross-Institution Isolation):** Comprehensive fixtures for two separate universities (e.g. UoN and Strathmore) testing student lists, detail views, placement approvals, compliance monitors, document reviews, and CSV report exports.
5. **Workstream E (Company & Placement Isolation):** Multi-company fixtures testing slot creation tampering, applicant list isolation, weekly performance log assignment isolation, and evaluation assignment checks.
6. **Workstream F (Phase 3 Workflow Authorization Regression):** Boundary tests for logbook locking, student self-approval prevention, company supervisor attempting academic decisions, and messaging boundary enforcement.
7. **Workstream G (Security Regression Tests):** Verifying previously identified audit findings (draft locking without submit, 72h correction window, audit attribution, evaluation uniqueness).

---

## 7. Proposed Phase 4 Test Implementation Plan

We will create a structured test suite under `backend/tests/Feature/Security/Phase4/`:

1. `RoleAuthorizationTest.php` (Workstream A & B)
   - Unauthenticated rejection (`401`) on all route groups.
   - Comprehensive matrix testing every canonical role against forbidden routes (`403`).
   - Privilege escalation and parameter spoofing tests.

2. `IdorProtectionTest.php` (Workstream C)
   - Student profile IDOR tests.
   - Document download IDOR tests.
   - Placement & Certificate IDOR tests.
   - Logbook update & resubmit IDOR tests.
   - Field visit view & update IDOR tests.
   - Message thread IDOR tests.

3. `CrossInstitutionIsolationTest.php` (Workstream D)
   - Admin A vs Admin B on student lists, details, placements, compliance, flags, documents, and CSV exports.
   - Academic Supervisor A vs Supervisor B cross-institution isolation.
   - Prevention of institution reassignment.

4. `CompanyPlacementIsolationTest.php` (Workstream E)
   - Company A vs Company B applicant and slot isolation.
   - Company supervisor assignment validation.
   - Prevention of company slot creation by supervisors or students.
   - Prevention of forged `company_id` on slot creation.

5. `WorkflowSecurityRegressionTest.php` (Workstreams F & G)
   - Logbook draft lock immutability (locks without auto-submitting).
   - Reopen rejected entry strictly within correction window.
   - Resubmission blocked once deadline passes.
   - Prevention of students approving their own entries.
   - Prevention of company supervisors making academic decisions.
   - Messaging conversation membership and read-receipt isolation.

---
*Audit completed. Ready to proceed with systematic test implementation.*
