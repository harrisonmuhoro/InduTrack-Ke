# Security and data integrity notes

This document records the security rules currently enforced in the backend and the
known verification limits for the final hardening pass.

## Roles and ownership

- `academic_supervisor` is the canonical role. `institution_supervisor` is a legacy
  name accepted by `User::hasRole()` and the role middleware. New seeding creates only
  the canonical role; legacy role rows and user assignments are retained.
- Company managers resolve their company through `users.company_id`. Company
  supervisors resolve theirs through `company_supervisors.user_id` and
  `company_supervisors.company_id`. Profile endpoints do not use email matching or
  caller-supplied ownership IDs.
- Institution administrators are scoped to `users.institution_id`. They may inspect
  company records only when that institution has a student placement at the company
  or an application to one of its slots. A missing institution assignment denies
  access.
- Students are scoped to their own `students.user_id` record. Policies additionally
  permit explicitly assigned supervisor and same-institution administrator access
  where the workflow requires it.
- Public company discovery is through open student slot search and matching. These
  endpoints include only verified companies and serialize an explicit set of display
  fields; company email, phone, registration number, and timestamps are omitted.

## Evaluation uniqueness and duplicate reconciliation

The business rule enforced by the database is at most one row for each
`(placement_id, evaluator_type)` pair. `evaluations_placement_evaluator_type_unique`
is the concurrency safeguard. Before adding it, the migration checks existing rows.
If duplicates exist, it logs IDs, evaluator IDs, and submission timestamps, then fails
without changing or choosing any evaluation.

An authorized database administrator must export and review every duplicate group,
consult the evaluator/coordinator, record the decision maker, date, reason, and affected
IDs in the operational audit record, preserve a complete backup of the original rows,
and then manually resolve the active rows. Re-run the migration only after every group
has been explicitly resolved. Do not select a winner based only on an ID or timestamp.
Rolling the migration back removes the unique index and does not modify or restore
evaluation rows.

### Recovery when the earlier destructive migration already ran

Do not rerun or edit the migration ledger manually as a recovery action. Before any
repair:

1. Pause deployment and take a verified, restorable backup of the whole database.
2. Check the `migrations` row for `2026_07_17_000001_add_unique_constraint_to_evaluations_table`.
3. If it is recorded as applied, preserve a separate read-only export of both
   `evaluations_archive` and `evaluations`, including every archive snapshot and its
   original ID. Record active/archive counts and duplicate keys before changing data.
4. Build a reconciliation worksheet for every archived row containing its original ID,
   placement, evaluator ID/type, submission metadata, corresponding active row (if any),
   decision maker, date, reason, and approval reference. Compare the full archived
   snapshot with the active evaluation and supporting workflow records.
5. Have an authorized academic/placement owner approve each restore or retention
   decision. Restore only rows explicitly approved and only after confirming they do
   not conflict with the composite unique key. Preserve unresolved records in the
   archive; do not auto-select or overwrite an active evaluation.
6. Reconcile on a disposable restored copy first. Validate row counts, foreign keys,
   snapshots, and the unique index before applying the recorded plan to production.
   Retain the backup, worksheet, approvals, and execution log as the audit trail.

If the archive table is missing, incomplete, or the old migration status is uncertain,
stop and recover from a verified backup with the database owner. The revised migration
does not reconstruct records removed by an earlier run.

## Authorization coverage matrix

| Endpoint/action | Role scope | Runtime enforcement | Coverage / limitation |
|---|---|---|---|
| `GET /students/slots`, `/students/match` | Student, verified public company card fields | Student role middleware; verified-company query | Authorization regression tests cover public discovery; field allowlist requires endpoint assertion |
| `GET /companies/slots`, `/companies/applicants` | Assigned company manager or supervisor | Role middleware, relationship resolution, `CompanyPolicy::view`, slot scoped to company | `AuthorizationTest`; company isolation checks |
| `POST /companies/slots` | Assigned company manager | Role middleware and `CompanyPolicy::createSlot` | Company supervisor denied; authorization regression test |
| `PUT /applications/{id}/status` | Owning company manager, same-institution admin, super admin | Role middleware and `ApplicationPolicy::updateStatus` | Authorization tests; decision policy checks slot/student relationship |
| `GET /applications/{id}/offer` | Application student, owning company, same-institution admin, super admin | `ApplicationPolicy::generateOffer` | Authorization tests |
| `GET /documents/{id}/download` | Document student, same-institution admin, super admin | Authenticated route; `DocumentPolicy::download` through Gate | Student and cross-institution tests plus same-institution download test |
| `PUT /admin/documents/{id}/review` | Same-institution admin or super admin | Institution route middleware and explicit institution ownership check | Controller boundary check |
| `GET/POST/PUT /field-visits` | Assigned academic supervisor, same-institution admin for view, super admin | Role middleware and `FieldVisitPolicy` | Assigned-supervisor policy coverage; company supervisors excluded from routes |
| `POST /evaluations` | Assigned academic/company supervisor, super admin | Supervisor role middleware and assignment/status checks in controller | Duplicate and unrelated DB exception integration cases remain driver-dependent |
| `GET /evaluations/placement/{id}` | Student owner, assigned supervisors, same-institution admin, super admin | Explicit relationship checks | Cross-tenant endpoint tests required |
| `GET /admin/companies` | Connected institution admin; super admin | Institution relationship query | Tenant filter added; API integration test required |
| `PUT /admin/companies/{id}/verify|blacklist` | Super admin | Explicit role check in controller | Institution admins denied |
| Profile mutation/upload routes | Authenticated user's own profile and related entity | Ownership resolved before validation/storage; validated fields only; DB transaction / file cleanup | Atomicity and upload failure tests required |
| `POST /auth/2fa/setup`, `/auth/2fa/verify` | Authenticated enrollee or short-lived password-verified pending session | Throttled routes; pending session is not logged in; OTP required before completing login/enabling 2FA | Feature tests cover pending login, enrollment repair, secret serialization, and unauthenticated rejection |
| `POST /auth/2fa/toggle` | Authenticated account owner, disable only | Current password and OTP required to disable; enabling uses setup then OTP verification | Disable path test required |

Registered policies also cover applications, placements, logbook entries, evaluations,
field visits, institutions, documents, students, and companies. A registered policy is
not evidence that every action invokes it; the controller paths above have been
reviewed, but this matrix does not claim exhaustive endpoint-level test coverage.

## Database and operational limits

## Logbook review integrity

- Formal logbook decisions use an explicit state machine: `submitted` may become
  `approved`, `rejected`, or `flagged`; a `flagged` entry may become `approved` or
  `rejected`; finalized entries cannot be changed arbitrarily.
- Only the assigned academic supervisor (or super admin) may approve, reject, or
  flag an entry. Company supervisors may still provide comments and weekly
  performance feedback, but cannot make the academic decision.
- Every decision and rejected-entry reopening creates an immutable
  `logbook_review_histories` row containing the prior/new status, actor, comment,
  timestamp, and request metadata. The current entry fields are a convenient
  summary, not the audit trail.
- `logbooks:lock` delegates to `LogbookLockService`; the scheduler invokes the
  command hourly. Production must run Laravel's scheduler worker/cron for that
  schedule to execute.

Before deploying the review-history migration, take the normal database backup and
confirm the migration ledger. The migration adds history only; it does not infer or
reconstruct decisions that occurred before deployment.

- Role compatibility is application-level alias resolution. Existing legacy role rows
  are intentionally not deleted or merged, preserving role IDs and assignments. Their
  permissions continue to be evaluated from the assigned role row.
- The evaluation migration diagnostic currently uses standard grouped SQL and fetches
  rows for each duplicate group. MySQL is the configured runtime driver; test config
  uses SQLite, so migration behavior must still be exercised under both drivers before
  deployment.
- The audited `608edae` version of migration `2026_07_17_000001` archived non-winning
  duplicate evaluations and deleted them from the active table. Editing that migration
  does not rerun it where Laravel already recorded it as applied. Before rollout,
  inspect `evaluations_archive`, the migration ledger, and backups; reconcile archived
  snapshots under explicit human review. No automatic restore is safe because an
  archived row may conflict with an active evaluation.
- The new nullable `users.phone` column aligns profile input with database persistence.
  Rolling back that migration drops the column and any phone values added after rollout;
  export or otherwise preserve those values first if they must survive rollback.
- Database rollback removes the index only. Manual duplicate reconciliation requires
  a separate, auditable backup and decision record.
- Local focused verification: 38 tests passed, 130 assertions. Frontend `npm run
  lint` and `npm run build` both complete successfully; lint currently reports
  pre-existing warnings. The GitHub workflow now runs both backend tests and frontend
  lint/build, but branch protection and required-check enforcement remain repository
  settings that must be enabled by an authorized GitHub administrator.
