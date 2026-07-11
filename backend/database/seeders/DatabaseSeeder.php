<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Institution;
use App\Models\Company;
use App\Models\Student;
use App\Models\AttachmentPeriod;
use App\Models\AttachmentSlot;
use App\Models\CompanySupervisor;
use App\Models\InstitutionSupervisor;
use App\Models\Application;
use App\Models\Placement;
use App\Models\LogbookEntry;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles
        $roles = [
            'student', 
            'company_supervisor', 
            'institution_supervisor', 
            'institution_admin',
            'super_admin'
        ];
        
        foreach ($roles as $role) {
            DB::table('roles')->insertOrIgnore(['name' => $role, 'description' => ucfirst(str_replace('_', ' ', $role))]);
        }

        $studentRoleId = DB::table('roles')->where('name', 'student')->value('id');
        $companyRoleId = DB::table('roles')->where('name', 'company_supervisor')->value('id');
        $instSupRoleId = DB::table('roles')->where('name', 'institution_supervisor')->value('id');
        $instAdminRoleId = DB::table('roles')->where('name', 'institution_admin')->value('id');
        $superAdminRoleId = DB::table('roles')->where('name', 'super_admin')->value('id');

        // 2. Base Users
        $password = Hash::make('password123'); // Standardized password for testing

        $superAdminUser = User::create([
            'name' => 'System Super Admin',
            'email' => 'superadmin@indutrack.ke',
            'password' => $password,
            'email_verified_at' => now(),
        ]);
        DB::table('user_roles')->insert(['user_id' => $superAdminUser->id, 'role_id' => $superAdminRoleId]);

        $instAdminUser = User::create([
            'name' => 'UoN Administrator',
            'email' => 'admin@uonbi.ac.ke',
            'password' => $password,
            'email_verified_at' => now(),
        ]);
        DB::table('user_roles')->insert(['user_id' => $instAdminUser->id, 'role_id' => $instAdminRoleId]);

        $instUser = User::create([
            'name' => 'Dr. Alan (Academic Supervisor)',
            'email' => 'alan@uonbi.ac.ke',
            'password' => $password,
            'email_verified_at' => now(),
        ]);
        DB::table('user_roles')->insert(['user_id' => $instUser->id, 'role_id' => $instSupRoleId]);

        $companyUser = User::create([
            'name' => 'Jane Smith (HR Safaricom)',
            'email' => 'jane.smith@safaricom.co.ke',
            'password' => $password,
            'email_verified_at' => now(),
        ]);
        DB::table('user_roles')->insert(['user_id' => $companyUser->id, 'role_id' => $companyRoleId]);
        
        $companyUser2 = User::create([
            'name' => 'Mark (Tech Lead KCB)',
            'email' => 'mark@kcbgroup.com',
            'password' => $password,
            'email_verified_at' => now(),
        ]);
        DB::table('user_roles')->insert(['user_id' => $companyUser2->id, 'role_id' => $companyRoleId]);

        $studentUser = User::create([
            'name' => 'John Doe (Student)',
            'email' => 'john.doe@student.uonbi.ac.ke',
            'password' => $password,
            'email_verified_at' => now(),
        ]);
        DB::table('user_roles')->insert(['user_id' => $studentUser->id, 'role_id' => $studentRoleId]);
        
        $studentUser2 = User::create([
            'name' => 'Alice (Student)',
            'email' => 'alice@student.uonbi.ac.ke',
            'password' => $password,
            'email_verified_at' => now(),
        ]);
        DB::table('user_roles')->insert(['user_id' => $studentUser2->id, 'role_id' => $studentRoleId]);

        // 3. Institutions & Periods
        $institution = Institution::create([
            'name' => 'University of Nairobi',
            'domain' => 'uonbi.ac.ke',
            'contact_email' => 'info@uonbi.ac.ke',
            'is_active' => true,
        ]);
        
        Institution::create([
            'name' => 'Strathmore University',
            'domain' => 'strathmore.edu',
            'contact_email' => 'info@strathmore.edu',
            'is_active' => true,
        ]);

        $period = AttachmentPeriod::create([
            'institution_id' => $institution->id,
            'name' => 'May-August 2026 Intake',
            'start_date' => '2026-05-01',
            'end_date' => '2026-08-31',
            'required_weeks' => 12,
        ]);

        $instSupervisor = InstitutionSupervisor::create([
            'user_id' => $instUser->id,
            'institution_id' => $institution->id,
            'department' => 'Computer Science',
        ]);

        // 4. Companies & Supervisors
        $company = Company::create([
            'name' => 'Safaricom PLC',
            'email' => 'hr@safaricom.co.ke',
            'industry' => 'Telecommunications',
            'county' => 'Nairobi',
            'rating' => 4.8,
            'is_verified' => true,
        ]);

        $companySupervisor = CompanySupervisor::create([
            'user_id' => $companyUser->id,
            'company_id' => $company->id,
            'department' => 'Software Engineering',
        ]);
        
        $company2 = Company::create([
            'name' => 'KCB Group',
            'email' => 'careers@kcbgroup.com',
            'industry' => 'Banking',
            'county' => 'Nairobi',
            'rating' => 4.2,
            'is_verified' => true,
        ]);
        
        $companySupervisor2 = CompanySupervisor::create([
            'user_id' => $companyUser2->id,
            'company_id' => $company2->id,
            'department' => 'IT Infrastructure',
        ]);

        // 5. Attachment Slots
        $slot1 = AttachmentSlot::create([
            'company_id' => $company->id,
            'department' => 'Software Engineering',
            'capacity' => 5,
            'required_skills' => 'Laravel, React, Git',
            'duration' => '3 Months',
            'has_stipend' => true,
            'stipend_amount' => 15000,
            'description' => 'Join our dynamic software engineering team.',
            'status' => 'open'
        ]);

        $slot2 = AttachmentSlot::create([
            'company_id' => $company->id,
            'department' => 'Data Science',
            'capacity' => 2,
            'required_skills' => 'Python, SQL, Machine Learning',
            'duration' => '3 Months',
            'has_stipend' => true,
            'stipend_amount' => 20000,
            'description' => 'Work on big data and analytics.',
            'status' => 'open'
        ]);
        
        $slot3 = AttachmentSlot::create([
            'company_id' => $company2->id,
            'department' => 'IT Infrastructure',
            'capacity' => 3,
            'required_skills' => 'Networking, Linux, Cloud',
            'duration' => '3 Months',
            'has_stipend' => false,
            'stipend_amount' => 0,
            'description' => 'Support the core banking infrastructure.',
            'status' => 'open'
        ]);

        // 6. Students
        $student = Student::create([
            'user_id' => $studentUser->id,
            'institution_id' => $institution->id,
            'reg_number' => 'P15/1234/2026',
            'department' => 'Software Engineering',
            'program' => 'BSc. Computer Science',
            'year_of_study' => '3rd Year',
            'skills' => 'PHP, JavaScript',
        ]);
        
        $student2 = Student::create([
            'user_id' => $studentUser2->id,
            'institution_id' => $institution->id,
            'reg_number' => 'P15/5678/2026',
            'department' => 'IT',
            'program' => 'BSc. Information Technology',
            'year_of_study' => '3rd Year',
            'skills' => 'Networking, Support',
        ]);

        // 7. Applications & Placements
        $application = Application::create([
            'student_id' => $student->id,
            'slot_id' => $slot1->id,
            'status' => 'accepted',
            'cover_letter' => 'I am highly motivated to join Safaricom.',
        ]);

        $placement = Placement::create([
            'student_id' => $student->id,
            'company_id' => $company->id,
            'period_id' => $period->id,
            'company_supervisor_id' => $companySupervisor->id,
            'academic_supervisor_id' => $instUser->id,
            'status' => 'active',
        ]);
        
        // Second student applied to KCB but is pending
        Application::create([
            'student_id' => $student2->id,
            'slot_id' => $slot3->id,
            'status' => 'submitted',
            'cover_letter' => 'I would love to learn from KCB IT team.',
        ]);

        // 8. Logbooks for active placement
        $log1 = LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date' => now()->subWeeks(2)->format('Y-m-d'),
            'week_number' => 1,
            'activities' => 'Setup local dev environment. Pulled repository. Attended onboarding.',
            'lessons_learned' => 'Learned about Agile methodology used at Safaricom.',
            'challenges' => 'Git conflicts',
            'plan_next_week' => 'Start working on the frontend tickets',
            'status' => 'reviewed',
            'locked_at' => now()->subWeeks(2)->addDays(3),
        ]);

        $log1->comments()->create([
            'user_id' => $companyUser->id,
            'comment' => 'Great start! Keep it up.',
        ]);

        LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date' => now()->subWeeks(1)->format('Y-m-d'),
            'week_number' => 2,
            'activities' => 'Fixed 3 bugs in the frontend. Attended sprint planning.',
            'lessons_learned' => 'Improved my React debugging skills.',
            'challenges' => 'None',
            'plan_next_week' => 'Backend API integration',
            'status' => 'submitted',
            'locked_at' => now()->subWeeks(1)->addDays(3),
        ]);
        
        // Draft entry for this week
        LogbookEntry::create([
            'placement_id' => $placement->id,
            'entry_date' => now()->format('Y-m-d'),
            'week_number' => 3,
            'activities' => 'Working on the backend API.',
            'lessons_learned' => 'Laravel resources and collections.',
            'status' => 'draft',
            'locked_at' => null,
        ]);

        $this->command->info('Database seeded successfully with varied test data!');
        $this->command->info('Passwords are all set to: password123');
    }
}
