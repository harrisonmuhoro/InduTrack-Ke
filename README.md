<div align="center">

# 🏭 InduTrack KE

### *Connecting Students. Empowering Industry.*

[![Laravel](https://img.shields.io/badge/Laravel-11-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-Proprietary-0A6E4F?style=for-the-badge)](#license)

**InduTrack KE** is a full-stack industrial attachment (internship) management portal built for the Kenyan education system. It digitizes and automates the entire attachment lifecycle — from student applications and company slot management, through weekly digital logbooks and supervisor evaluations, to automated PDF certificate generation.

[Features](#-core-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [Roles & Permissions](#-user-roles--permissions) · [API Reference](#-api-overview) · [Roadmap](#-development-roadmap)

</div>

---

## 🧩 The Problem This Solves

Industrial attachment in Kenya is broken. Here's what InduTrack KE fixes:

| Pain Point | Impact | Solution |
|---|---|---|
| Students don't know where to apply | Wasted time, unfair access | Searchable, verified company listings |
| Companies flooded with unvetted applicants | HR overhead, poor matches | Skill-based smart matching |
| Institutions have zero field visibility | Cannot verify if attachment is real | Real-time placement tracking & field visit module |
| Paper logbooks that are easily faked | Academic fraud, zero accountability | 72-hour tamper-lock on digital entries |
| Supervisor reports get lost | No performance trail | Persistent, timestamped evaluation records |
| No feedback loop between stakeholders | Repeating the same mistakes | Aggregated analytics & anonymous company ratings |

---

## ✨ Core Features

### 🔐 Authentication & Security
- Role-based registration and login (6 distinct roles)
- Email verification with expiring tokenized links
- **Opt-in Two-Factor Authentication** (Google Authenticator / TOTP)
- API rate limiting and account lockout on repeated failures
- Full audit log — every login, logout, and failed attempt with IP + timestamp

### 📋 Smart Placement Workflow
- Students browse and filter verified company listings by county, industry, program, and stipend availability
- Application status pipeline: `Draft → Submitted → Shortlisted → Accepted / Rejected`
- Auto-generated PDF offer letters; students digitally accept or decline
- Institution admin approves placements before they go live
- Duplicate prevention — no student can hold two active placements simultaneously

### 📓 Digital Logbook (Tamper-Resistant)
- Students submit weekly entries: tasks completed, skills learned, challenges, next-week plan
- **Entries auto-lock after 72 hours** — no backdating, ever
- Academic supervisors approve, reject, or flag entries with comments
- Full logbook exportable as PDF at attachment end

### 📊 Evaluations & Certificates
- End-of-attachment grading: **50% Company Supervisor + 50% Academic Supervisor**
- Rubric covers punctuality, attitude, technical skills, teamwork, and communication
- On successful completion, the system **auto-generates a PDF completion certificate**

### 🔔 Automated Escalation Pipeline
- **7 days** without a logbook entry → automated reminder to student (email + SMS)
- **2 consecutive weeks** missed → flag to academic supervisor
- **3 consecutive weeks** missed → escalate to institution admin
- All escalations logged with full audit trail

### 💬 Internal Messaging
- Thread-based in-portal messaging: Student ↔ Company Supervisor, Student ↔ Academic Supervisor
- Messages linked to specific placements or logbook entries for context
- Daily email digest for unread messages

### 📈 Reporting & Analytics
- Institution admin dashboard: placement rates, industry breakdown, compliance status, county/region maps
- Exportable reports: CSV and PDF for accreditation bodies
- Company analytics: slot utilization, applicant-to-acceptance ratios, student performance averages
- Anonymous company ratings submitted by students after attachment completion

---

## 🏗 Architecture

```
InduTrack-Ke/
├── backend/          # Laravel 11 — RESTful API
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   ├── Policies/         # RBAC authorization
│   │   └── Jobs/             # Queued reminders & escalations
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/api.php
│
└── frontend/         # React + Vite + Tailwind CSS
    ├── src/
    │   ├── pages/            # Role-specific dashboards
    │   ├── components/
    │   └── hooks/
    └── vite.config.js
```

### Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Backend API** | Laravel 11 | RBAC, queues, file storage, mail — all built-in |
| **Frontend** | React + Vite | Dynamic dashboards with role-conditional UI |
| **Styling** | Tailwind CSS | Consistent design system without overhead |
| **Database** | MySQL 8 | Relational data with complex joins across roles and placements |
| **Auth** | Laravel Sanctum + Google2FA | Token-based, lightweight, API-ready with optional 2FA |
| **PDF Generation** | Barryvdh DomPDF | Offer letters, certificates, logbook exports |
| **Email** | Resend / SMTP | Transactional emails — verification, notifications |
| **SMS** | Africa's Talking | Kenya-optimized mobile reminders |
| **Queue** | Laravel Queue + Redis | Async notifications and report generation |
| **File Storage** | Local (dev) / S3 (prod) | Durable, backed-up document storage |
| **Deployment** | Nginx + Ubuntu VPS | Cost-effective, full control |

---

## 👥 User Roles & Permissions

InduTrack KE has **6 distinct roles**, each with a dedicated dashboard and permission set.

| Role | Description |
|---|---|
| `student` | Applies for attachments, submits weekly logbook, views evaluations and certificates |
| `company` | Posts attachment slots, manages applicants, tracks attached students |
| `company_supervisor` | Assigned to students; submits weekly performance logs and final evaluation |
| `academic_supervisor` | Institution staff; conducts field visits, reviews logbooks, submits academic grade |
| `institution_admin` | Manages students, companies, attachment periods, and compliance monitoring |
| `super_admin` | Full system access — manages institutions, users, system config, and audit logs |

### Permission Matrix

| Feature | Student | Company | Co. Supervisor | Ac. Supervisor | Inst. Admin | Super Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Apply for attachment | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Post attachment slots | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Submit logbook | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Review logbook entries | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Evaluate student | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Approve placements | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Whitelist/blacklist companies | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| View reports & analytics | ❌ | Limited | ❌ | ❌ | ✅ | ✅ |
| Manage all users | ❌ | ❌ | ❌ | ❌ | Limited | ✅ |
| Rate companies (anonymous) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## ⚡ Quick Start

### Prerequisites

- PHP **8.2+** with extensions: `pdo_mysql`, `mbstring`, `openssl`, `xml`
- Composer
- Node.js **v18+** & npm
- MySQL **8.0+**
- Redis (for queue processing)

---

### 1. Clone the Repository

```bash
git clone https://github.com/harrisonmuhoro/InduTrack-Ke.git
cd InduTrack-Ke
```

---

### 2. Backend Setup

```bash
cd backend
composer install
cp .env.example .env
```

Open `.env` and configure your environment:

```env
APP_NAME="InduTrack KE"
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=indutrack_ke
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

MAIL_MAILER=smtp
MAIL_HOST=smtp.resend.com
MAIL_PORT=465
MAIL_USERNAME=resend
MAIL_PASSWORD=your_resend_api_key
MAIL_FROM_ADDRESS=noreply@yourdomain.com

QUEUE_CONNECTION=redis
```

Then run:

```bash
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

> **Backend API** is now running at `http://localhost:8000`

---

### 3. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

> **React frontend** is now accessible at `http://localhost:5173`

---

### 4. Background Scheduler

The scheduler handles automated logbook reminders and the escalation pipeline. **This must run continuously for automation to work.**

```bash
cd backend
php artisan schedule:work
```

> For production, configure this as a cron job instead:
> ```cron
> * * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
> ```

---

### 5. Queue Worker (for emails, SMS, PDF generation)

```bash
cd backend
php artisan queue:work --tries=3
```

---

## 🧪 Default Testing Accounts

After running `php artisan migrate:fresh --seed`, the following accounts are available:

| Role | Email | Password |
|---|---|---|
| Student | `student@example.com` | `password` |
| Company | `company@example.com` | `password` |
| Company Supervisor | `company_supervisor@example.com` | `password` |
| Institution Supervisor | `supervisor@example.com` | `password` |
| Institution Admin | `admin@example.com` | `password` |
| Super Admin | `superadmin@example.com` | `password` |

> ⚠️ **Never use these credentials in production.** Rotate all passwords and API keys before deployment.

---

## 🔌 API Overview

**Base URL:** `https://api.indutrack.ke/v1`

All endpoints require a Bearer token from `/auth/login` unless otherwise noted.

### Authentication

```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /auth/password/forgot
POST   /auth/password/reset
POST   /auth/verify-email/{token}
```

### Student

```
GET    /students/profile
PUT    /students/profile
GET    /students/applications
POST   /students/applications
DELETE /students/applications/{id}
GET    /students/placements/active
GET    /students/logbook
POST   /students/logbook/entries
PUT    /students/logbook/entries/{id}    ← only if entry is not locked
GET    /students/evaluations
GET    /students/documents
POST   /students/documents
```

### Company

```
GET    /companies/profile
PUT    /companies/profile
GET    /companies/slots
POST   /companies/slots
PUT    /companies/slots/{id}
GET    /companies/slots/{id}/applicants
PUT    /companies/applicants/{id}/status
GET    /companies/students
POST   /companies/evaluations
```

### Supervisors

```
GET    /supervisor/students
POST   /supervisor/weekly-logs
GET    /supervisor/logbook/{placement_id}
POST   /supervisor/logbook/{entry_id}/review
POST   /supervisor/field-visits
```

### Admin

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

## 🗄 Database Schema (Core Tables)

```
users                   — all users, role, status, timestamps
roles / permissions     — RBAC definitions and pivot tables
institutions            — institution profiles and settings
companies               — company profile, verification status, rating
students                — student profile, institution_id, reg_number
attachment_periods      — period name, start_date, end_date per institution
attachment_slots        — company_id, period_id, department, capacity, status
applications            — student_id, slot_id, status, cover_letter, timestamps
placements              — confirmed student-company pairs + supervisor assignments
offer_letters           — placement_id, generated_at, accepted_at, file_path
documents               — student_id, type, file_path, status, reviewed_by
logbook_entries         — placement_id, week_number, content, locked_at, status
logbook_comments        — entry_id, supervisor_id, comment, action
field_visits            — academic_supervisor_id, placement_id, visit_date, report
weekly_logs             — placement_id, company_supervisor_id, week, scores, remarks
evaluations             — placement_id, evaluator_id, rubric_scores, submitted_at
ratings                 — rater_id, ratee_type, ratee_id, score, review, is_anonymous
notifications           — user_id, type, content, read_at, created_at
messages                — sender_id, receiver_id, context_type, context_id, body
audit_logs              — actor_id, action, model, model_id, old/new values, ip
```

---

## 🎨 Brand & Design System

InduTrack KE has a defined visual identity — not a generic Tailwind dashboard.

| Token | Color | Hex | Usage |
|---|---|---|---|
| `--color-primary` | InduTrack Green | `#0A6E4F` | Primary buttons, nav active state, key headings |
| `--color-primary-light` | Mint Green | `#12A37A` | Hover states, progress bars |
| `--color-primary-dark` | Forest | `#064D37` | Sidebar background, footer |
| `--color-accent` | Amber | `#F59E0B` | CTAs, Apply buttons, badges |
| `--color-accent-dark` | Burnt Amber | `#B45309` | Warning states, overdue indicators |
| `--color-success` | Emerald | `#10B981` | Approved, accepted, completed |
| `--color-error` | Red | `#EF4444` | Rejected, flagged, failed |
| `--color-warning` | Orange | `#F97316` | Pending, awaiting review |

**Typography:** Inter (UI) · Plus Jakarta Sans (display) · JetBrains Mono (code)

> All colors are defined as CSS custom properties for seamless dark mode support in v2.

---

## 🗺 The Core Attachment Loop

```
Company posts an attachment slot
           ↓
Student discovers and applies
           ↓
Company shortlists → accepts → sends offer letter (PDF)
           ↓
Institution admin approves the placement
           ↓
Student submits weekly logbook  (auto-locks after 72h)
           ↓
Academic supervisor reviews entries + conducts field visit
           ↓
Company supervisor submits weekly performance logs
           ↓
Attachment period ends
           ↓
Both supervisors submit final evaluations
           ↓
System aggregates grades (50% + 50%)
           ↓
Completion certificate auto-generated and released to student
           ↓
Student rates company (anonymous)
           ↓
Data feeds institution analytics dashboard
```

---

## 🛣 Development Roadmap

### ✅ Phase 1 — Foundation
- Project scaffolding (Laravel API + React frontend)
- Database migrations and seeders
- Auth system (register, login, email verification, 2FA)
- RBAC middleware
- Basic role dashboards

### ✅ Phase 2 — Core Application Loop
- Company profile + slot management
- Student profile + attachment search and filtering
- Full application flow (apply → shortlist → accept/reject)
- PDF offer letter generation
- Document upload system

### 🔄 Phase 3 — Logbook & Supervision *(in progress)*
- Digital logbook with 72-hour lock
- Academic supervisor logbook review
- Company supervisor weekly log
- Field visit module
- In-portal messaging

### ⏳ Phase 4 — Evaluation & Reporting
- Evaluation form submission (both supervisor types)
- Grade aggregation and weighting
- Institution admin reports and CSV/PDF exports
- Compliance monitoring dashboard
- Completion certificate auto-generation

### ⏳ Phase 5 — Automation & Polish
- Automated email + SMS reminders (Africa's Talking)
- Escalation pipeline (7-day → 2-week → 3-week tiers)
- Anonymous company rating system
- Performance optimization and security audit
- Production deployment

### 🔮 v2 — Future
- AI-powered smart matching engine (skills + county + historical success rate)
- Sentiment analysis on logbook entries for early intervention
- Predictive dropout alerts
- Native mobile app (Android + iOS)
- Dark mode

---

## 🔒 Security

- **Passwords:** bcrypt (cost factor ≥ 12)
- **Tokens:** JWT — 15-minute access + 7-day refresh with rotation on use
- **2FA:** TOTP enforced for all admin roles; opt-in for students and companies
- **SQL:** Eloquent ORM with parameterized queries — no raw SQL with user input
- **XSS:** Content Security Policy headers + React output escaping
- **CSRF:** Laravel CSRF tokens on all state-changing requests
- **File uploads:** PDF/JPG/PNG only, 5MB limit, stored outside web root, served via signed expiring URLs
- **Audit trail:** Every data mutation logged with actor, action, before/after values, IP, and timestamp

**Found a vulnerability?** Please disclose responsibly by contacting the project maintainer directly rather than opening a public issue.

---

## 📄 License

**Proprietary Software. All rights reserved.**

This project is not open source. No part of this codebase may be reproduced, distributed, or used without explicit written permission from the author.

---

<div align="center">

Built with ❤️ for Kenya · by [Harrison Muhoro](https://github.com/harrisonmuhoro)

</div>
