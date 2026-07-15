# InduTrack KE

InduTrack KE is a comprehensive, modern platform designed to streamline the industrial attachment (internship) process for students, universities, and companies in Kenya. It connects students with relevant attachment slots, tracks their progress via digital logbooks, allows supervisors to evaluate performance, and automatically generates final completion certificates.

## Architecture
- **Backend:** Laravel 11 (RESTful API)
- **Frontend:** React (Vite, Tailwind CSS, Lucide React Icons)
- **Database:** MySQL
- **Authentication:** Laravel Sanctum with Opt-in Two-Factor Authentication (Google2FA)
- **PDF Generation:** Barryvdh DOMPDF

## Core Features
- **Role-based Dashboards:** Dedicated, interactive portals for Students, Company Supervisors, Institution Supervisors, Institution Admins, and Super Admins.
- **Smart Placement Matching:** System to match students to available company attachment slots based on their course and skills.
- **Digital Logbooks:** Weekly activity tracking featuring automated 72-hour locking, supervisor reviews, comments, and grading.
- **Automated Escalations:** Scheduled background jobs to notify students of missing logbook entries (7 days) and escalate to administrators if entries are missed for multiple weeks.
- **Evaluations & Certificates:** Aggregated end-of-attachment grading (50% Company Supervisor, 50% Academic Supervisor) and automated PDF certificate generation.
- **Internal Messaging:** Built-in communication system connecting students and their assigned supervisors.
- **Security:** API Rate limiting and opt-in Two-Factor Authentication for all users.

## Setup & Installation

### Prerequisites
- PHP 8.2+
- Composer
- Node.js (v18+) & npm
- MySQL server

### 1. Backend Setup
```bash
cd backend
composer install
cp .env.example .env
```
Update your `.env` file with your local database credentials (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).

```bash
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```
The backend API will run at `http://localhost:8000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The React frontend will be accessible at `http://localhost:5173`.

### 3. Background Scheduler
To ensure automated logbook reminders and escalations fire properly, run the Laravel scheduler worker in the background:
```bash
cd backend
php artisan schedule:work
```

## Default Testing Accounts
*(Assuming you have run the database seeders)*
- **Student:** `student@example.com`
- **Company Supervisor:** `company@example.com` 
- **Institution Supervisor:** `supervisor@example.com`
- **Institution Admin:** `admin@example.com`
- **Super Admin:** `superadmin@example.com`
- **Password:** `password` (for all accounts)

## Security
If you discover any security-related issues, please reach out to the project administrator. Two-Factor Authentication can be toggled by users within their respective dashboard settings.

## License
Proprietary Software. All rights reserved.
