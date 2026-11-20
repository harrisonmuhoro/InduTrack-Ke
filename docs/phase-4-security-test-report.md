# Phase 4: Security Testing and Regression Report

**System:** InduTrack-Ke  
**Phase:** 4 — Security Testing and Regression  
**Date:** November 20, 2026  
**Status:** Completed & Verified  

---

## 1. Executive Summary

Phase 4 implemented a comprehensive automated security and regression testing layer verifying authorization, institutional multi-tenancy isolation, company ownership boundaries, IDOR protections, and workflow state integrity across all six canonical roles.

The automated test suite expanded from **115 tests** to **143 backend feature tests** (plus 3 frontend Vitest integration tests), achieving **100% passing results (456 backend assertions, 0 failures)**.

---

## 2. Test Architecture & Coverage

Phase 4 added dedicated security test suites under `backend/tests/Feature/Security/Phase4/`:

| Test Suite File | Workstream | Focus & Scope | Tests Added | Assertions | Status |
|---|---|---|---|---|---|
| `RoleAuthorizationTest.php` | Workstream A & B | Unauthenticated rejection (`401`), cross-role boundary enforcement (`403`), privilege escalation parameter tampering | 7 | 25 | ✅ Passed |
| `IdorProtectionTest.php` | Workstream C | IDOR prevention on documents, logbooks, resubmissions, certificates, field visits, messages | 6 | 17 | ✅ Passed |
| `CrossInstitutionIsolationTest.php` | Workstream D | Multi-tenant isolation between University of Nairobi & Strathmore University (students, placements, documents, flags, CSV exports) | 5 | 16 | ✅ Passed |
| `CompanyPlacementIsolationTest.php` | Workstream E | Isolation between Safaricom & KCB (slot spoofing, applicants, unassigned weekly logs, unassigned evaluations, company ratings) | 5 | 14 | ✅ Passed |
| `WorkflowSecurityRegressionTest.php` | Workstream F & G | Logbook locking without auto-submit, student self-review prevention, state-machine immutability, self-messaging prohibition, contact relationship enforcement | 5 | 25 | ✅ Passed |
| **Total Phase 4 Suite** | **Workstreams A–G** | **Complete authorization & security coverage** | **28** | **97** | **✅ 100% Passed** |

---

## 3. Comprehensive Role-Versus-Operation Test Matrix

| # | Endpoint / Operation | Attempting Role | Resource Owner | Institutional Relationship | Company Relationship | Expected HTTP | Actual HTTP | Database Mutated? | Test Result |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `GET /api/profile` | Unauthenticated | N/A | None | None | 401 | 401 | No | ✅ Pass |
| 2 | `GET /api/admin/dashboard` | Student | Institution | Same institution | None | 403 | 403 | No | ✅ Pass |
| 3 | `GET /api/superadmin/dashboard` | Student | System | None | None | 403 | 403 | No | ✅ Pass |
| 4 | `POST /api/companies/slots` | Student | Company | None | None | 403 | 403 | No | ✅ Pass |
| 5 | `POST /api/field-visits` | Student | Placement | Same institution | Unassigned | 403 | 403 | No | ✅ Pass |
| 6 | `POST /api/logbooks/{id}/review` | Student | Own entry | Same institution | Attached | 403 | 403 | No | ✅ Pass |
| 7 | `POST /api/supervisors/weekly-logs`| Student | Placement | Same institution | Attached | 403 | 403 | No | ✅ Pass |
| 8 | `POST /api/companies/slots` | Company Supervisor| Company | None | Assigned company | 403 | 403 | No | ✅ Pass |
| 9 | `POST /api/logbooks/{id}/review` | Company Supervisor| Placement | Different institution| Assigned company | 403 | 403 | No | ✅ Pass |
| 10| `POST /api/companies/slots` | Academic Supervisor| Company | Same institution | None | 403 | 403 | No | ✅ Pass |
| 11| `POST /api/supervisors/weekly-logs`| Academic Supervisor| Placement | Same institution | None | 403 | 403 | No | ✅ Pass |
| 12| `GET /api/superadmin/audit-logs` | Institution Admin | System | Own institution | None | 403 | 403 | No | ✅ Pass |
| 13| `PUT /api/admin/companies/{id}/verify`| Institution Admin | Company | Connected | None | 403 | 403 | No | ✅ Pass |
| 14| `PUT /api/profile` (role escalation)| Student | Own profile | Same institution | None | 200 (role ignored) | 200 | No (role unchanged)| ✅ Pass |
| 15| `PUT /api/superadmin/users/{id}/role`| Institution Admin | Other user | Same institution | None | 403 | 403 | No | ✅ Pass |
| 16| `GET /api/documents/{id}/download` | Student A | Student B | Different inst. | None | 403 | 403 | No | ✅ Pass |
| 17| `PUT /api/logbooks/{id}` (IDOR edit)| Student A | Student B | Same institution | Different company| 403 | 403 | No | ✅ Pass |
| 18| `POST /api/logbooks/{id}/resubmit` | Student A | Student B | Same institution | Different company| 403 | 403 | No | ✅ Pass |
| 19| `GET /api/.../certificate` (IDOR) | Student A | Student B | Same institution | Different company| 403 | 403 | No | ✅ Pass |
| 20| `PUT /api/field-visits/{id}` (IDOR) | Academic Sup A | Academic Sup B | Same institution | Different company| 403 | 403 | No | ✅ Pass |
| 21| `GET /api/messages/thread/{id}` | Student | Unrelated student | Different inst. | None | 403 | 403 | No | ✅ Pass |
| 22| `GET /api/admin/students` | Admin A (UoN) | Inst B (Strathmore)| Different inst. | None | 200 (scoped) | 200 (scoped) | No (B filtered out)| ✅ Pass |
| 23| `PUT /api/admin/placements/{id}/approve`| Admin B (Strathmore)| Student A (UoN) | Different inst. | Company | 403 | 403 | No | ✅ Pass |
| 24| `PUT /api/admin/documents/{id}/review` | Admin B (Strathmore)| Student A (UoN) | Different inst. | Company | 403 | 403 | No | ✅ Pass |
| 25| `PUT /api/admin/flags/{id}/resolve` | Admin B (Strathmore)| Student A (UoN) | Different inst. | Company | 403 | 403 | No | ✅ Pass |
| 26| `GET /api/admin/reports/placements` (CSV)| Admin B (Strathmore)| Inst A (UoN) records| Different inst. | Company | 200 (filtered)| 200 (filtered)| No (A excluded) | ✅ Pass |
| 27| `GET /api/companies/slots/{id}/applicants`| Company A Manager | Company B Slot | None | Different company| 404 | 404 | No | ✅ Pass |
| 28| `POST /api/companies/slots` (spoofed id)| Company A Manager | Company B ID | None | Different company| 201 (bound to A)| 201 (bound to A)| Bound strictly to A| ✅ Pass |
| 29| `POST /api/supervisors/weekly-logs` | Company Sup A | Placement at Comp B| None | Different company| 403 | 403 | No | ✅ Pass |
| 30| `POST /api/evaluations` | Company Sup A | Placement at Comp B| None | Different company| 403 | 403 | No | ✅ Pass |
| 31| `POST /api/companies/{id}/rate` | Student (unattached)| Company | None | Unplaced | 403 | 403 | No | ✅ Pass |
| 32| `POST /api/logbooks/lock` (Scheduler) | System | Draft entry > 72h | Any | Any | Command (0) | Command (0) | Locked, stays draft| ✅ Pass |
| 33| `POST /api/logbooks/{id}/review` | Academic Supervisor| Approved entry | Same institution | Attached | 422 | 422 | No | ✅ Pass |
| 34| `POST /api/messages` (Self-message) | Any User | Same user | Self | Self | 403 | 403 | No | ✅ Pass |
| 35| `POST /api/messages` (Unrelated) | Student A | Student B | Different inst. | None | 403 | 403 | No | ✅ Pass |

---

## 4. Key Security Findings & Remediations

1. **Company Slot IDOR Protection:**
   - *Observation:* `CompanyController::applicants($slotId)` queries slots scoped to the authenticated manager's company (`$company->attachmentSlots()->findOrFail($slotId)`). When requesting another company's slot ID, Eloquent raises `ModelNotFoundException` (HTTP 404 Not Found), preventing both information disclosure and resource enumeration.
   - *Verification:* Verified via tests in `AuthorizationTest`, `SecurityRemediationTest`, and `CompanyPlacementIsolationTest`.

2. **Institutional Isolation on CSV Exports:**
   - *Observation:* `InstitutionController::reportPlacements()` streams CSV files scoped strictly via `whereHas('student', fn($q) => $q->where('institution_id', $instId))`.
   - *Verification:* Automated tests confirm that Strathmore administrators exporting placement CSVs receive only Strathmore records with zero leakage of University of Nairobi registration numbers or student details.

3. **Privilege Escalation Immunity in Profile Updates:**
   - *Observation:* `ProfileController::update()` rejects mass assignment of role, institution, or company parameters by strictly accepting validated fields and resolving entities through authenticated relationships.
   - *Verification:* Parameter tampering payloads with `role: super_admin` and `company_id: 888` were safely ignored without modifying user roles or tenant associations.

4. **Self-Messaging & Placement Contact Enforcement:**
   - *Observation:* `MessageController` strictly enforces authorization: self-messaging is prohibited for all users (including `super_admin`), and communication between users requires an active or completed attachment relationship.
   - *Verification:* Verified via tests in `WorkflowSecurityRegressionTest`.

---

## 5. Outstanding Security Risks & Known Items

- **Process-Level MySQL Review Concurrency:** SQLite in-memory tests prove state-machine idempotency and single-decision persistence. True parallel process-level row locking with simultaneous database connections requires a multi-threaded MySQL staging environment. This remains explicitly tracked as an operational verification item for staging deployment.

---

## 6. CI Execution Evidence

- **Backend Test Suite:** `143 tests passed, 456 assertions` (`php artisan test`)
- **Frontend Test Suite:** `3 tests passed` (`npm test` via Vitest v5.1.1)
- **Frontend Production Build:** `1869 modules transformed`, 0 errors (`npm run build`)
- **All Canonical Roles Covered:** `student`, `company`, `company_supervisor`, `academic_supervisor` (with `institution_supervisor` alias), `institution_admin`, `super_admin`.
