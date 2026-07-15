# InduTrack KE — Industrial Attachment Portal System Design

> **System Name:** InduTrack KE  
> **Project Type:** Personal Full-Stack Web Application  
> **Scope:** End-to-end industrial attachment management platform for Kenya  
> **Stack Recommendation:** Laravel (API) + React (Frontend) + MySQL + REST  
> **Author:** System Design Reference Document  
> **Version:** 1.0.0

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [System Goals & Non-Goals](#2-system-goals--non-goals)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Functional Requirements by Module](#4-functional-requirements-by-module)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Database Design Overview](#6-database-design-overview)
7. [API Design Overview](#7-api-design-overview)
8. [UI/UX Design Identity & Visual System](#8-uiux-design-identity--visual-system)
9. [Tech Stack Decisions](#9-tech-stack-decisions)
10. [Security Architecture](#10-security-architecture)
11. [Notification & Communication System](#11-notification--communication-system)
12. [File & Document Management](#12-file--document-management)
13. [Reporting & Analytics](#13-reporting--analytics)
14. [Automation & Smart Features](#14-automation--smart-features)
15. [Common Pitfalls to Avoid](#15-common-pitfalls-to-avoid)
16. [Development Phases (Roadmap)](#16-development-phases-roadmap)

---

## 1. Problem Statement

Industrial attachment is broken in most institutions. The specific pain points this system targets:

| Pain Point | Impact |
|---|---|
| Students don't know where to apply | Wasted time, unfair access |
| Companies get flooded with unvetted applicants | HR overhead, poor matches |
| Institutions have zero field visibility | Cannot verify if attachment is real |
| Logbooks are paper-based and easily faked | Academic fraud, zero accountability |
| Supervisors write paper reports that get lost | No performance trail |
| No feedback loop between student, company, and school | Repeating the same mistakes every cycle |

**This system exists to digitize, verify, and automate the entire attachment lifecycle — from application to certification.**

---

## 2. System Goals & Non-Goals

### ✅ Goals
- Centralized platform for students, companies, and institutions
- Verified company listings (no ghost organizations)
- Tamper-resistant digital logbook (locked after 72 hours)
- Real-time progress tracking for all stakeholders
- Automated reminders and escalation workflows
- Exportable compliance reports for accreditation

### ❌ Non-Goals (Out of Scope for v1)
- Payment/stipend processing
- Full LMS integration
- Mobile native app (responsive web is sufficient for v1)
- AI-powered smart matching (planned for v2)

---

## 3. User Roles & Permissions

### Role Overview

| Role | Description |
|---|---|
| `student` | Applies for attachment, submits logbook, views evaluations |
| `company` | Posts attachment slots, manages applicants, submits evaluations |
| `company_supervisor` | Assigned to students, submits weekly performance logs |
| `academic_supervisor` | Institution staff who conduct field visits and grade students |
| `institution_admin` | Manages students, companies, and overall attachment periods |
| `super_admin` | Full system access, manages institutions, system settings |

### Permission Matrix

| Feature | Student | Company | Co. Supervisor | Ac. Supervisor | Inst. Admin | Super Admin |
|---|---|---|---|---|---|---|
| Apply for attachment | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Post attachment slots | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Submit logbook | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Evaluate student | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Approve placements | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| View reports/analytics | ❌ | Limited | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ❌ | Limited | ✅ |
| Rate companies | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Whitelist/blacklist companies | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 4. Functional Requirements by Module

---

### 4.1 Authentication & Authorization Module

- Role-based registration flow (separate forms per role or unified with role selector)
- Email verification on signup (tokenized link, expires in 24h)
- Two-Factor Authentication (2FA) — optional for students, enforced for admins
- OAuth login (Google/Microsoft) for institutional users
- JWT or session-based auth with refresh token rotation
- Password reset via email with time-limited tokens
- Account lockout after N failed login attempts (configurable)
- Audit log: every login, logout, failed attempt — timestamped with IP

---

### 4.2 Student Module

#### Profile
- Personal info: name, reg number, phone, email, profile photo
- Academic details: institution, department, program, year of study
- Skills & interests (used for matching)
- CV/resume upload (PDF)
- Transcript upload
- Emergency contact

#### Attachment Search & Application
- Browse company listings filtered by: county, industry, department, duration, stipend availability
- View company profile (about, rating, available slots, past reviews)
- Apply to multiple companies with cover letter and custom message
- Application status tracker:
  - `Draft` → `Submitted` → `Shortlisted` → `Accepted` / `Rejected`
- Withdraw application before acceptance
- Receive offer letter, digitally accept/decline

#### Documents
- Upload required documents: intro letter, insurance, acceptance letter, medical cert
- Download institution-generated templates
- Document status: `Pending Review` | `Approved` | `Rejected` (with reason)

#### Digital Logbook
- Weekly log entry: tasks done, skills learned, challenges, plan for next week
- **Entry locks automatically after 72 hours** — no backdating
- Academic supervisor can approve, reject, or flag entries
- Progress bar: weeks completed vs. total required
- PDF export of full logbook at end of attachment

#### Dashboard
- Attachment status at a glance
- Supervisor contact info
- Upcoming deadlines
- Notifications feed
- Evaluation results (after supervisor submits)

---

### 4.3 Company Module

#### Organization Profile
- Company name, logo, industry, county, physical address
- Registration number / KRA PIN for verification
- Description, website, social links
- **Verified badge** — granted by institution admin after vetting
- Overall rating (aggregate from student reviews)

#### Slot Management
- Create attachment slot:
  - Department/unit
  - Number of students needed
  - Required skills/program
  - Duration (start date → end date)
  - Stipend: Yes/No + amount
  - Description of tasks student will do
- Open/close/pause slots
- View applicants per slot

#### Applicant Management
- Inbox: list of applicants per slot
- View full student profile + uploaded documents
- Actions: Shortlist, Accept, Reject (with reason), Send message
- Generate and send offer letter (auto-populated template)
- Assign to a company supervisor

#### Student Roster
- View all currently attached students
- Filter by department, supervisor, status
- Flag a student (concern/disciplinary note)
- Discharge student early (with reason — triggers admin notification)

#### Evaluation
- End-of-attachment evaluation form per student:
  - Punctuality, attitude, technical skills, teamwork, communication — rated 1–5
  - Written remarks
  - Would you accept this student again? (Yes/No)
- Submit after attachment period ends (locked after submission)

---

### 4.4 Company Supervisor Module

- View assigned students
- Submit **weekly performance log** per student:
  - Tasks assigned and completed
  - Conduct/attitude score
  - Attendance record
  - Specific feedback
- Flag concerns or incidents
- View student's logbook entries
- Communicate with academic supervisor via in-portal messaging
- Submit final grading input

---

### 4.5 Academic Supervisor Module

- View assigned students (across multiple companies)
- **Scheduled field visit management:**
  - Create visit record: date, company, students visited
  - Visit report form: observations, company environment, student performance in field
  - GPS check-in on visit (optional — for accountability)
- Logbook review: approve / reject / flag weekly entries with comments
- Communicate with company supervisor per student
- Submit academic grade contribution (weighted alongside company evaluation)
- View student progress dashboard

---

### 4.6 Institution Admin Module

#### Student Management
- Full student database with search and filter
- Attachment status per student per cohort/semester
- Assign academic supervisors to students
- Bulk actions: export list, send notifications, approve documents

#### Company Management
- Company directory with verification status
- Whitelist / blacklist companies with reason and date
- View company ratings and past attachment records
- Add company manually or approve company self-registration

#### Attachment Period Management
- Create attachment periods (semester-based or calendar-based)
- Set start/end dates, required logbook weeks, evaluation deadlines
- Open/close application window

#### Approval Workflows
- Review and approve student placements before they go live
- Review and approve company slot listings
- Override or escalate flagged incidents

#### Compliance Monitoring
- Dashboard: total students placed, pending, unplaced, completed
- Alert flags: students inactive for 2+ weeks, missing logbook entries, incomplete documents
- Escalation pipeline: warning → flag → admin action

---

### 4.7 Super Admin Module

- Manage institutions (multi-institution support)
- Manage all user accounts across all roles
- System configuration: attachment durations, evaluation rubrics, notification templates
- Feature toggles (enable/disable modules per institution)
- View full audit logs
- Database backup triggers
- Announcement broadcasts (system-wide or per institution)

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Page load < 2s, API response < 500ms under normal load |
| **Scalability** | Architecture should support multiple institutions without rewrite |
| **Availability** | 99.5% uptime target; graceful degradation on service failure |
| **Security** | OWASP Top 10 compliance; all inputs sanitized; HTTPS enforced |
| **Accessibility** | WCAG 2.1 AA — screen reader compatible, keyboard navigable |
| **Mobile Responsiveness** | Fully responsive — students primarily access via phone |
| **Offline Tolerance** | Logbook draft saving (localStorage) before submission |
| **Data Retention** | Attachment records stored for minimum 5 years |
| **Audit Trail** | Every state change is logged with actor + timestamp |

---

## 6. Database Design Overview

### Core Tables

```
users                   — all users, role field, status, timestamps
roles                   — role definitions
permissions             — granular permission flags
role_permissions        — pivot table
user_roles              — pivot table

institutions            — institution profile and settings
companies               — company profile, verification status, rating
company_supervisors     — link between company users and supervisor role

students                — student profile, institution_id, reg_number
attachment_periods      — period name, start_date, end_date, institution_id
attachment_slots        — company_id, period_id, department, capacity, status
applications            — student_id, slot_id, status, cover_letter, timestamps
placements              — confirmed student-company pairs, supervisor assignments
offer_letters           — placement_id, generated_at, accepted_at, file_path

documents               — student_id, type, file_path, status, reviewed_by
logbook_entries         — placement_id, week_number, content, locked_at, status
logbook_comments        — entry_id, supervisor_id, comment, action
field_visits            — academic_supervisor_id, placement_id, visit_date, report
weekly_logs             — placement_id, company_supervisor_id, week, scores, remarks
evaluations             — placement_id, evaluator_id, rubric_scores, remarks, submitted_at
ratings                 — rater_id, ratee_type, ratee_id, score, review, is_anonymous
notifications           — user_id, type, content, read_at, created_at
messages                — sender_id, receiver_id, context_type, context_id, body, read_at
audit_logs              — actor_id, action, model, model_id, old_value, new_value, ip, timestamp
```

---

## 7. API Design Overview

### Base URL
```
https://api.indutrack.ke/v1
```

### Auth Endpoints
```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /auth/password/forgot
POST   /auth/password/reset
POST   /auth/verify-email/{token}
```

### Student Endpoints
```
GET    /students/profile
PUT    /students/profile
GET    /students/applications
POST   /students/applications
DELETE /students/applications/{id}
GET    /students/placements/active
GET    /students/logbook
POST   /students/logbook/entries
PUT    /students/logbook/entries/{id}       ← only if not locked
GET    /students/evaluations
GET    /students/documents
POST   /students/documents
```

### Company Endpoints
```
GET    /companies/profile
PUT    /companies/profile
GET    /companies/slots
POST   /companies/slots
PUT    /companies/slots/{id}
GET    /companies/slots/{id}/applicants
PUT    /companies/applicants/{id}/status
GET    /companies/students                  ← active roster
POST   /companies/evaluations
```

### Supervisor Endpoints
```
GET    /supervisor/students
POST   /supervisor/weekly-logs
GET    /supervisor/logbook/{placement_id}
POST   /supervisor/logbook/{entry_id}/review
POST   /supervisor/field-visits
```

### Admin Endpoints
```
GET    /admin/dashboard
GET    /admin/students
GET    /admin/companies
PUT    /admin/companies/{id}/verify
PUT    /admin/companies/{id}/blacklist
GET    /admin/placements
PUT    /admin/placements/{id}/approve
GET    /admin/reports/placements
GET    /admin/reports/compliance
GET    /admin/audit-logs
```

---

## 8. UI/UX Design Identity & Visual System

> **Rule #1: InduTrack KE must not look generic.**  
> No Bootstrap defaults. No grey-on-white dashboards. No "just slap Tailwind on it" energy.  
> Every screen should feel like a deliberate product — not a university project.

---

### 8.1 Brand Identity

| Attribute | Decision |
|---|---|
| **System Name** | InduTrack KE |
| **Tagline** | *Connecting Students. Empowering Industry.* |
| **Personality** | Professional, trustworthy, modern, Kenyan — not corporate stiff |
| **Design Language** | Clean structure, strong color contrast, data-forward dashboards |
| **Target Feel** | Somewhere between LinkedIn and a gov-tech product — credible but approachable |

---

### 8.2 Color Palette

The palette is anchored in **deep green** (Kenya, growth, industry) and **amber/gold** (opportunity, energy, action) with carefully chosen neutrals. Every color has a defined role — no freestyle usage.

#### Primary Colors

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-primary` | InduTrack Green | `#0A6E4F` | Primary buttons, nav active state, key headings |
| `--color-primary-light` | Mint Green | `#12A37A` | Hover states, highlights, progress bars |
| `--color-primary-dark` | Forest | `#064D37` | Sidebar background, footer, deep sections |

#### Accent Colors

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-accent` | Amber | `#F59E0B` | CTAs, badges, alerts, "Apply Now" buttons |
| `--color-accent-light` | Gold Mist | `#FCD34D` | Tag highlights, hover on accent elements |
| `--color-accent-dark` | Burnt Amber | `#B45309` | Warning states, overdue indicators |

#### Neutral Colors

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-bg` | Off White | `#F8FAFC` | Page background |
| `--color-surface` | White | `#FFFFFF` | Cards, modals, panels |
| `--color-border` | Cool Grey | `#E2E8F0` | Dividers, input borders |
| `--color-text-primary` | Slate 900 | `#0F172A` | Body text, headings |
| `--color-text-secondary` | Slate 500 | `#64748B` | Labels, captions, metadata |
| `--color-text-muted` | Slate 300 | `#CBD5E1` | Placeholder text, disabled |

#### Status / Semantic Colors

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-success` | Emerald | `#10B981` | Approved, accepted, completed |
| `--color-warning` | Orange | `#F97316` | Pending, awaiting review |
| `--color-error` | Red | `#EF4444` | Rejected, failed, flagged |
| `--color-info` | Sky Blue | `#0EA5E9` | Info banners, tips, notifications |

---

### 8.3 Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| **Display / Hero** | `Inter` or `Plus Jakarta Sans` | 700–800 | 2.25rem–3rem |
| **Headings (H1–H3)** | `Inter` | 600–700 | 1.25rem–1.875rem |
| **Body Text** | `Inter` | 400 | 1rem (16px) |
| **Labels / Captions** | `Inter` | 500 | 0.75rem–0.875rem |
| **Code / Monospace** | `JetBrains Mono` | 400 | 0.875rem |

> Load fonts via Google Fonts. Fallback: `system-ui, -apple-system, sans-serif`.

---

### 8.4 Component Design Rules

**Buttons**
- Primary: `bg-[#0A6E4F]` text white, rounded-lg, px-6 py-2.5, hover → `#12A37A`
- CTA / Apply: `bg-[#F59E0B]` text white, bold — this is the action button, make it pop
- Destructive: `bg-[#EF4444]` — only for irreversible actions (reject, delete)
- Ghost: transparent with green border — secondary actions

**Cards**
- White background, `border border-[#E2E8F0]`, `rounded-xl`, subtle shadow `shadow-sm`
- Hover: `shadow-md` + slight `translate-y-[-2px]` on interactive cards

**Sidebar / Navigation**
- Background: `#064D37` (Forest Green)
- Active item: left border accent `#F59E0B` (Amber) + lighter bg tint
- Text: white at 90% opacity; active: pure white
- Icons: Lucide React — consistent, clean

**Status Badges**
- Pill-shaped, color-coded, always with an icon:
  - ✅ Accepted → Emerald bg + text
  - ⏳ Pending → Orange bg + text
  - ❌ Rejected → Red bg + text
  - 🔒 Locked → Slate bg + text (logbook entries)

**Data Tables**
- Striped rows: alternate `#F8FAFC` / `#FFFFFF`
- Header: `#0A6E4F` bg with white text
- Sticky header on scroll
- Row hover: `#F0FDF4` (light green tint)

**Forms**
- Input border: `#E2E8F0`, focus ring: `#0A6E4F`
- Error state: red border + red helper text below
- Label always above the field — never placeholder-only
- Required fields marked with `*` in amber

---

### 8.5 Layout System

- **Grid:** 12-column grid, max-width `1280px`, centered
- **Sidebar:** fixed, `240px` wide on desktop; collapses to icon-only on tablet; drawer on mobile
- **Content area:** left margin matches sidebar width; `padding: 24px 32px`
- **Spacing scale:** 4px base unit — all spacing multiples of 4 (4, 8, 12, 16, 24, 32, 48, 64)
- **Border radius:** `rounded-lg` (8px) for inputs/buttons; `rounded-xl` (12px) for cards; `rounded-2xl` for modals

---

### 8.6 Role-Based Theme Accents

Each role has a subtle visual identity beyond the base palette — applied to dashboard headers and role badges:

| Role | Accent Tint | Badge Color |
|---|---|---|
| Student | `#ECFDF5` (Mint bg) | Green |
| Company | `#EFF6FF` (Blue bg) | Blue |
| Company Supervisor | `#FFF7ED` (Orange bg) | Orange |
| Academic Supervisor | `#F5F3FF` (Purple bg) | Purple |
| Institution Admin | `#FEF2F2` (Red bg) | Red |
| Super Admin | `#0F172A` (Dark) | White on dark |

---

### 8.7 Dark Mode

- Planned for v2 — but CSS variables must be set up from day one to make it a one-day toggle, not a rewrite
- All colors defined as CSS custom properties (`var(--color-primary)`) — never hardcoded hex in components

---

## 8.8 UI/UX Screens per Role

### Student
1. Registration / Onboarding wizard
2. Profile Setup
3. Attachment Search (browse + filter)
4. Company Detail page
5. Application Form
6. My Applications (tracker)
7. My Placement Dashboard
8. Logbook (weekly entries + history)
9. Documents Vault
10. Evaluation Results
11. Certificate Download

### Company
1. Organization Registration
2. Company Dashboard
3. Slot Management (create/edit/close)
4. Applicants Inbox
5. Student Roster
6. Evaluation Forms
7. Analytics (utilization, ratings)

### Academic Supervisor
1. My Students List
2. Student Detail + Logbook Review
3. Field Visit Scheduler + Report Form
4. Grading Panel
5. Messages

### Institution Admin
1. Admin Dashboard (stats, flags, recent activity)
2. Student Management Table
3. Company Directory
4. Placement Approval Queue
5. Compliance Monitor
6. Reports & Exports
7. Attachment Period Management

### Super Admin
1. System Dashboard
2. Institution Management
3. User Management
4. Audit Logs Viewer
5. System Configuration Panel

---

## 9. Tech Stack Decisions

| Layer | Technology | Justification |
|---|---|---|
| **Backend API** | Laravel 11 | RBAC, queues, file storage, mail — all built in |
| **Frontend** | React + Vite | Dynamic dashboards, role-conditional UI |
| **Styling** | Tailwind CSS | Rapid, consistent UI without design system overhead |
| **Database** | MySQL | Relational data with complex joins (roles, placements, evaluations) |
| **Auth** | Laravel Sanctum | Token-based, lightweight, API-ready |
| **File Storage** | Local (dev) / S3 (prod) | Documents need durable, backed-up storage |
| **Email** | Mailgun / SMTP | Transactional emails — verification, notifications |
| **SMS** | Africa's Talking | Kenya-optimized SMS for mobile reminders |
| **Queue** | Laravel Queue + Redis | Async notifications, report generation |
| **PDF Generation** | Laravel DomPDF | Offer letters, certificates, logbook exports |
| **Version Control** | Git + GitHub | CI/CD integration, team collaboration |
| **Deployment** | Nginx + Ubuntu VPS | Cost-effective for personal project |

---

## 10. Security Architecture

### Authentication
- Passwords: `bcrypt` with cost factor ≥ 12
- Tokens: JWT with 15-min access token + 7-day refresh token (rotation on use)
- 2FA: TOTP (Google Authenticator compatible) enforced for admin roles

### Data Protection
- All inputs sanitized server-side (no reliance on client validation)
- SQL: Eloquent ORM (parameterized queries — no raw SQL with user input)
- XSS: Content Security Policy headers + output escaping in React
- CSRF: Laravel CSRF tokens on all state-changing requests
- HTTPS enforced — HTTP redirects to HTTPS
- Sensitive fields encrypted at rest (phone numbers, emergency contacts)

### Authorization
- Every API route checks role + specific permission
- Students cannot access other students' data — ownership checks on every resource
- Admin endpoints behind separate middleware layer

### File Uploads
- Type validation: only PDF, JPG, PNG allowed
- Size limit: 5MB per file
- Files stored outside web root (not directly URL-accessible)
- Served via signed, expiring URLs
- Virus scan on upload (ClamAV integration for production)

### Audit & Monitoring
- Every data mutation logged (actor, action, before/after values, IP, timestamp)
- Failed login attempts trigger rate limiting + alerting
- Unusual activity detection (e.g., logbook entries from different IPs within minutes)

---

## 11. Notification & Communication System

### Notification Triggers

| Event | Who Gets Notified | Channel |
|---|---|---|
| Application submitted | Company | Email |
| Application status changed | Student | Email + SMS |
| Offer letter sent | Student | Email + SMS |
| Student accepted offer | Company, Institution Admin | Email |
| Logbook entry submitted | Academic Supervisor | Email |
| Logbook not submitted (weekly) | Student | Email + SMS |
| Logbook entry approved/rejected | Student | Email |
| Field visit scheduled | Company, Student | Email |
| Evaluation submitted | Student, Institution Admin | Email |
| Document rejected | Student | Email + SMS |
| Student flagged | Institution Admin, Academic Supervisor | Email |
| Attachment period opening/closing | All students | Email |

### In-Portal Messaging
- Thread-based messaging between: Student ↔ Company Supervisor, Student ↔ Academic Supervisor, Admin ↔ Anyone
- Context tagging: messages linked to placement or logbook entry
- Read receipts
- Email digest for unread messages (daily summary)

---

## 12. File & Document Management

### Document Types

| Document | Owner | Who Reviews |
|---|---|---|
| Intro Letter | Institution → Student | Company |
| Medical Certificate | Student | Institution Admin |
| Insurance Certificate | Student | Institution Admin |
| Acceptance Letter | Company → Student | Institution Admin |
| Offer Letter | Company | Student (digital accept) |
| Logbook (exported PDF) | System-generated | Academic Supervisor |
| Completion Certificate | System-generated | Auto-issued on completion |
| Field Visit Report | Academic Supervisor | Institution Admin |
| Evaluation Form | Company Supervisor | Institution Admin |

### File Policies
- Upload allowed formats: PDF, JPG, PNG
- Max size: 5MB per document
- Version control: replacing a document creates a new version (old retained)
- Retention: 5 years minimum after attachment completion
- Expiry: generated links expire in 1 hour (re-request needed)

---

## 13. Reporting & Analytics

### Institution Admin Reports
- Total students per attachment period by status
- Placement rate (% of students successfully placed)
- Industry breakdown (which sectors absorb most students)
- County/region distribution map
- Gender breakdown
- Company partner performance summary
- Compliance status: logbook submission rates, visit completion
- Export: CSV, PDF

### Company Analytics
- Slot utilization rate
- Applicant-to-acceptance ratio
- Student performance averages
- Repeat partnership rate (how many students from same institution return)

### Student View
- Personal performance trend across weeks
- Supervisor comments history
- Skill improvement tracking (self-reported vs. supervisor-rated)

### Super Admin
- Cross-institution dashboard
- System usage stats (active users, sessions, storage used)
- Error and audit log viewer

---

## 14. Automation & Smart Features

### v1 Automations
- **Logbook lock:** auto-lock entries after 72 hours, no backdating
- **Weekly reminder:** every Monday, remind students who haven't submitted logbook
- **Escalation pipeline:** student misses 2 consecutive weeks → flag to academic supervisor; 3 weeks → flag to institution admin
- **Duplicate prevention:** student cannot hold more than one active placement
- **Offer expiry:** if student doesn't accept offer within 5 days, slot reopens
- **Auto-certificate:** on successful completion + all evaluations submitted → generate and release certificate

### v2 (Future)
- **Smart matching engine:** suggest companies to students based on skills, program, county preference, and historical match success rate
- **Sentiment analysis:** detect negative logbook entries for early intervention
- **Predictive dropout alerts:** flag students likely to abandon early based on engagement patterns

---

## 15. Common Pitfalls to Avoid

| Pitfall | Why It Kills the System | Solution |
|---|---|---|
| No company verification | Students get placed at ghost organizations | Require registration number + admin approval before listing |
| No logbook time-locking | Students fake 8 weeks of entries in one night | Hard lock after 72 hours — no exceptions |
| No escalation paths | Exploitation and harassment go unreported | Flag system with anonymous option + escalation ladder |
| No offline tolerance | Poor connectivity in field areas breaks logbook submission | Draft auto-save to localStorage before sync |
| No file size/type validation | Storage abuse, malware upload | Server-side validation, files stored outside web root |
| Shared supervisor logins | No accountability for who entered what | One account per person, audit log on every action |
| No data export | Can't prove compliance to accreditation bodies | Every report must be exportable as PDF + CSV |
| Over-engineering v1 | Never ships | Build core loop first: Apply → Accept → Log → Evaluate → Certify |

---

## 16. Development Phases (Roadmap)

### Phase 1 — Foundation (Weeks 1–3)
- [ ] Project scaffolding (Laravel API + React frontend)
- [ ] Database migrations (all core tables)
- [ ] Auth system (register, login, email verification, 2FA)
- [ ] RBAC middleware
- [ ] Basic user dashboards per role

### Phase 2 — Core Application Loop (Weeks 4–6)
- [ ] Company profile + slot management
- [ ] Student profile + attachment search
- [ ] Application flow (apply → shortlist → accept → reject)
- [ ] Offer letter generation (PDF)
- [ ] Document upload system

### Phase 3 — Logbook & Supervision (Weeks 7–9)
- [ ] Digital logbook with 72-hour lock
- [ ] Academic supervisor logbook review
- [ ] Company supervisor weekly log
- [ ] Field visit module
- [ ] In-portal messaging

### Phase 4 — Evaluation & Reporting (Weeks 10–11)
- [ ] Evaluation form submission (company + academic supervisor)
- [ ] Grading aggregation
- [ ] Institution admin reports and exports
- [ ] Compliance monitoring dashboard
- [ ] Completion certificate generation

### Phase 5 — Automation & Polish (Week 12+)
- [ ] Automated reminders (email + SMS)
- [ ] Escalation pipeline
- [ ] Rating system (students rate companies, anonymously)
- [ ] Smart matching engine (v2 feature)
- [ ] Performance optimization + security audit
- [ ] Deployment to production

---

## Summary — The Core Loop

```
Company posts slot
     ↓
Student discovers & applies
     ↓
Company shortlists → accepts → sends offer
     ↓
Institution admin approves placement
     ↓
Student submits weekly logbook (locks after 72h)
     ↓
Academic supervisor reviews & visits
     ↓
Company supervisor submits weekly performance logs
     ↓
Attachment period ends
     ↓
Both supervisors submit final evaluations
     ↓
System aggregates  grades
     ↓
Certificate auto-generated + released to student
     ↓
Student rates company (anonymous)
     ↓
Data feeds into institution analytics
```

**Build the loop first. Everything else is enhancement.**

---

*Document generated as part of the InduTrack KE personal project system design.*  
*Version 1.0.0 — Iterate as you build.*
