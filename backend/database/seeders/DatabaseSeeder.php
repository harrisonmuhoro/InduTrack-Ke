<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    private string $password;

    public function run(): void
    {
        $this->password = Hash::make('password123');

        $this->command->info('🌱 Seeding InduTrack Ke database with sample data...');

        $roles        = $this->seedRoles();
        $institutions = $this->seedInstitutions();
        $companies    = $this->seedCompanies();
        $users        = $this->seedUsers($roles, $institutions, $companies);
        $periods      = $this->seedAttachmentPeriods($institutions);
        $slots        = $this->seedAttachmentSlots($companies, $periods);
        $placements   = $this->seedStudentsAndPlacements($users, $institutions, $companies, $periods, $slots, $roles);
        $this->seedLogbooks($placements, $users);
        $this->seedEvaluations($placements, $users);
        $this->seedFieldVisits($placements, $users);
        $this->seedWeeklyLogs($placements, $users);
        $this->seedDocuments($placements, $users);
        $this->seedMessages($users);
        $this->seedStudentFlags($placements, $users);
        $this->seedCompanyRatings($companies, $users);
        $this->seedNotifications($users);

        $this->command->newLine();
        $this->command->info('✅ Database seeded successfully!');
        $this->command->info('📧 All accounts use password: password123');
        $this->command->newLine();
        $this->command->table(
            ['Role', 'Email'],
            [
                ['Super Admin',             'superadmin@indutrack.ke'],
                ['Institution Admin (UoN)', 'admin@uonbi.ac.ke'],
                ['Institution Admin (Strath)', 'admin@strathmore.edu'],
                ['Academic Supervisor',     'supervisor@uonbi.ac.ke'],
                ['Academic Supervisor 2',   'wanjiku@uonbi.ac.ke'],
                ['Company Supervisor (Safaricom)', 'jane.smith@safaricom.co.ke'],
                ['Company Supervisor (KCB)',       'mark@kcbgroup.com'],
                ['Company Supervisor (Equity)',    'peter@equitybank.co.ke'],
                ['Student (active)',        'john.doe@student.uonbi.ac.ke'],
                ['Student (active)',        'alice.wanjiru@student.uonbi.ac.ke'],
                ['Student (completed)',     'brian.otieno@student.uonbi.ac.ke'],
                ['Student (flagged)',       'carol.muthoni@student.uonbi.ac.ke'],
                ['Student (pending)',       'david.kamau@student.strathmore.edu'],
                ['Student (pending)',       'emily.achieng@student.strathmore.edu'],
            ]
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 1. ROLES
    // ─────────────────────────────────────────────────────────────
    private function seedRoles(): array
    {
        $roleNames = [
            'student'                => 'Student undergoing industrial attachment',
            'company_supervisor'     => 'Supervisor from the hosting company',
            'institution_supervisor' => 'Academic supervisor from the institution',
            'institution_admin'      => 'Administrator managing institution attachment process',
            'super_admin'            => 'System-wide super administrator',
        ];

        foreach ($roleNames as $name => $description) {
            DB::table('roles')->insertOrIgnore(['name' => $name, 'description' => $description, 'created_at' => now(), 'updated_at' => now()]);
        }

        return DB::table('roles')->pluck('id', 'name')->toArray();
    }

    // ─────────────────────────────────────────────────────────────
    // 2. INSTITUTIONS
    // ─────────────────────────────────────────────────────────────
    private function seedInstitutions(): array
    {
        $data = [
            ['name' => 'University of Nairobi',    'domain' => 'uonbi.ac.ke',        'contact_email' => 'ict@uonbi.ac.ke',        'is_active' => true],
            ['name' => 'Strathmore University',    'domain' => 'strathmore.edu',      'contact_email' => 'ict@strathmore.edu',      'is_active' => true],
            ['name' => 'Jomo Kenyatta University', 'domain' => 'jkuat.ac.ke',         'contact_email' => 'industrial@jkuat.ac.ke',  'is_active' => true],
            ['name' => 'Moi University',           'domain' => 'mu.ac.ke',            'contact_email' => 'attachment@mu.ac.ke',     'is_active' => true],
            ['name' => 'Kenyatta University',      'domain' => 'ku.ac.ke',            'contact_email' => 'industry@ku.ac.ke',       'is_active' => false],
        ];

        foreach ($data as $row) {
            DB::table('institutions')->insertOrIgnore(array_merge($row, ['created_at' => now(), 'updated_at' => now()]));
        }

        return DB::table('institutions')->pluck('id', 'domain')->toArray();
    }

    // ─────────────────────────────────────────────────────────────
    // 3. COMPANIES
    // ─────────────────────────────────────────────────────────────
    private function seedCompanies(): array
    {
        $data = [
            [
                'name' => 'Safaricom PLC', 'email' => 'hr@safaricom.co.ke',
                'phone' => '+254722000000', 'industry' => 'Telecommunications',
                'county' => 'Nairobi', 'address' => 'Safaricom House, Westlands',
                'registration_number' => 'CPR/2001/KE-001', 'is_verified' => true,
                'description' => 'Kenya\'s leading telecommunications company offering mobile, broadband and financial services.',
                'website' => 'https://safaricom.co.ke', 'rating' => 4.80,
            ],
            [
                'name' => 'KCB Group', 'email' => 'careers@kcbgroup.com',
                'phone' => '+254703000000', 'industry' => 'Banking & Finance',
                'county' => 'Nairobi', 'address' => 'Kencom House, Moi Avenue',
                'registration_number' => 'CPR/1967/KE-002', 'is_verified' => true,
                'description' => 'Kenya\'s largest commercial bank with operations across East Africa.',
                'website' => 'https://kcbgroup.com', 'rating' => 4.20,
            ],
            [
                'name' => 'Equity Bank Kenya', 'email' => 'internships@equitybank.co.ke',
                'phone' => '+254763000000', 'industry' => 'Banking & Finance',
                'county' => 'Nairobi', 'address' => 'Equity Centre, Upper Hill',
                'registration_number' => 'CPR/1984/KE-003', 'is_verified' => true,
                'description' => 'A purpose-driven financial institution committed to transforming livelihoods.',
                'website' => 'https://equitybankgroup.com', 'rating' => 4.50,
            ],
            [
                'name' => 'Nation Media Group', 'email' => 'hr@nation.co.ke',
                'phone' => '+254719000000', 'industry' => 'Media & Publishing',
                'county' => 'Nairobi', 'address' => 'Nation Centre, Kimathi Street',
                'registration_number' => 'CPR/1959/KE-004', 'is_verified' => true,
                'description' => 'The largest independent media house in East and Central Africa.',
                'website' => 'https://nationmedia.com', 'rating' => 3.90,
            ],
            [
                'name' => 'Kenya Power', 'email' => 'hr@kplc.co.ke',
                'phone' => '+254722000001', 'industry' => 'Energy & Utilities',
                'county' => 'Nairobi', 'address' => 'Stima Plaza, Kolobot Road',
                'registration_number' => 'CPR/1922/KE-005', 'is_verified' => true,
                'description' => 'Responsible for distribution and retail of electricity in Kenya.',
                'website' => 'https://kplc.co.ke', 'rating' => 3.50,
            ],
            [
                'name' => 'Andela Kenya', 'email' => 'ke@andela.com',
                'phone' => '+254780000000', 'industry' => 'Information Technology',
                'county' => 'Nairobi', 'address' => 'Delta Corner, Westlands',
                'registration_number' => 'CPR/2014/KE-006', 'is_verified' => false,
                'description' => 'A global talent network connecting African software engineers with world-class opportunities.',
                'website' => 'https://andela.com', 'rating' => 4.70,
                'blacklist_reason' => null,
            ],
        ];

        foreach ($data as $row) {
            DB::table('companies')->insertOrIgnore(array_merge($row, ['created_at' => now(), 'updated_at' => now()]));
        }

        return DB::table('companies')->pluck('id', 'email')->toArray();
    }

    // ─────────────────────────────────────────────────────────────
    // 4. USERS (admins, supervisors; students done in placements)
    // ─────────────────────────────────────────────────────────────
    private function seedUsers(array $roles, array $institutions, array $companies): array
    {
        $users = [];

        // Super Admin
        $users['superadmin'] = $this->createUser('System Super Admin', 'superadmin@indutrack.ke', $roles['super_admin']);

        // Institution Admins
        $users['uon_admin']    = $this->createUser('Prof. James Mwangi', 'admin@uonbi.ac.ke', $roles['institution_admin']);
        $users['strath_admin'] = $this->createUser('Dr. Grace Njeri', 'admin@strathmore.edu', $roles['institution_admin']);

        // Institution Supervisors (Academic)
        $users['sup_alan']   = $this->createUser('Dr. Alan Odhiambo', 'supervisor@uonbi.ac.ke', $roles['institution_supervisor']);
        $users['sup_wanjiku'] = $this->createUser('Dr. Wanjiku Muriithi', 'wanjiku@uonbi.ac.ke', $roles['institution_supervisor']);

        // Link supervisors to UoN
        $uonId = $institutions['uonbi.ac.ke'];
        DB::table('institution_supervisors')->insertOrIgnore([
            ['user_id' => $users['sup_alan']->id,   'institution_id' => $uonId, 'department' => 'Computer Science', 'created_at' => now(), 'updated_at' => now()],
            ['user_id' => $users['sup_wanjiku']->id, 'institution_id' => $uonId, 'department' => 'Information Technology', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Company Supervisors
        $users['jane_safaricom'] = $this->createUser('Jane Smith', 'jane.smith@safaricom.co.ke', $roles['company_supervisor']);
        $users['mark_kcb']       = $this->createUser('Mark Kamau', 'mark@kcbgroup.com', $roles['company_supervisor']);
        $users['peter_equity']   = $this->createUser('Peter Njoroge', 'peter@equitybank.co.ke', $roles['company_supervisor']);
        $users['lucy_kplc']      = $this->createUser('Lucy Auma', 'lucy@kplc.co.ke', $roles['company_supervisor']);

        // Link company supervisors
        $companyMap = [
            'jane_safaricom' => ['email' => 'hr@safaricom.co.ke',          'dept' => 'Software Engineering'],
            'mark_kcb'       => ['email' => 'careers@kcbgroup.com',         'dept' => 'IT Infrastructure'],
            'peter_equity'   => ['email' => 'internships@equitybank.co.ke', 'dept' => 'Digital Banking'],
            'lucy_kplc'      => ['email' => 'hr@kplc.co.ke',               'dept' => 'ICT Department'],
        ];

        foreach ($companyMap as $key => $info) {
            $companyId = $companies[$info['email']];
            $existing = DB::table('company_supervisors')
                ->where('user_id', $users[$key]->id)
                ->where('company_id', $companyId)
                ->first();
            if (!$existing) {
                DB::table('company_supervisors')->insert([
                    'user_id'    => $users[$key]->id,
                    'company_id' => $companyId,
                    'department' => $info['dept'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $users['company_supervisors'] = DB::table('company_supervisors')->pluck('id', 'user_id')->toArray();

        return $users;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. ATTACHMENT PERIODS
    // ─────────────────────────────────────────────────────────────
    private function seedAttachmentPeriods(array $institutions): array
    {
        $periods = [];

        $uonId    = $institutions['uonbi.ac.ke'];
        $strathId = $institutions['strathmore.edu'];
        $jkuatId  = $institutions['jkuat.ac.ke'];

        $data = [
            // UoN — past completed period
            ['institution_id' => $uonId, 'name' => 'Jan–Apr 2026 Intake', 'start_date' => '2026-01-06', 'end_date' => '2026-04-30', 'required_weeks' => 12, 'is_active' => false],
            // UoN — current active period
            ['institution_id' => $uonId, 'name' => 'May–Aug 2026 Intake', 'start_date' => '2026-05-05', 'end_date' => '2026-08-29', 'required_weeks' => 16, 'is_active' => true],
            // Strathmore — current period
            ['institution_id' => $strathId, 'name' => 'Q2 2026 Industrial Training', 'start_date' => '2026-04-14', 'end_date' => '2026-07-31', 'required_weeks' => 12, 'is_active' => true],
            // JKUAT
            ['institution_id' => $jkuatId, 'name' => 'JKUAT Attachment 2026', 'start_date' => '2026-06-01', 'end_date' => '2026-08-31', 'required_weeks' => 12, 'is_active' => true],
        ];

        foreach ($data as $row) {
            $id = DB::table('attachment_periods')->insertGetId(array_merge($row, ['created_at' => now(), 'updated_at' => now()]));
            $periods[] = ['id' => $id] + $row;
        }

        return $periods;
    }

    // ─────────────────────────────────────────────────────────────
    // 6. ATTACHMENT SLOTS
    // ─────────────────────────────────────────────────────────────
    private function seedAttachmentSlots(array $companies, array $periods): array
    {
        $slots = [];
        $periodId = $periods[1]['id']; // UoN active period

        $data = [
            // Safaricom
            ['company_id' => $companies['hr@safaricom.co.ke'], 'period_id' => $periodId, 'department' => 'Software Engineering', 'capacity' => 5, 'required_skills' => 'Laravel, React, Git, REST APIs', 'duration' => '3 Months', 'has_stipend' => true, 'stipend_amount' => 15000.00, 'description' => 'Join our dynamic software engineering team building M-Pesa and internal platforms.', 'status' => 'open'],
            ['company_id' => $companies['hr@safaricom.co.ke'], 'period_id' => $periodId, 'department' => 'Data Science & AI', 'capacity' => 3, 'required_skills' => 'Python, SQL, TensorFlow, Data Visualization', 'duration' => '3 Months', 'has_stipend' => true, 'stipend_amount' => 20000.00, 'description' => 'Work on big data pipelines, ML models, and real-time analytics for network optimisation.', 'status' => 'open'],
            ['company_id' => $companies['hr@safaricom.co.ke'], 'period_id' => $periodId, 'department' => 'Cybersecurity', 'capacity' => 2, 'required_skills' => 'Network Security, Ethical Hacking, Linux', 'duration' => '3 Months', 'has_stipend' => true, 'stipend_amount' => 18000.00, 'description' => 'Assist our security operations centre in threat detection and vulnerability assessment.', 'status' => 'filled'],
            // KCB
            ['company_id' => $companies['careers@kcbgroup.com'], 'period_id' => $periodId, 'department' => 'IT Infrastructure', 'capacity' => 3, 'required_skills' => 'Networking, Linux, Cloud (AWS/Azure)', 'duration' => '3 Months', 'has_stipend' => false, 'stipend_amount' => null, 'description' => 'Support the core banking infrastructure team with server management and cloud migration.', 'status' => 'open'],
            ['company_id' => $companies['careers@kcbgroup.com'], 'period_id' => $periodId, 'department' => 'Software Development', 'capacity' => 4, 'required_skills' => 'Java, Spring Boot, Angular, MySQL', 'duration' => '3 Months', 'has_stipend' => false, 'stipend_amount' => null, 'description' => 'Build and test features for KCB Mobile and internet banking platforms.', 'status' => 'open'],
            // Equity Bank
            ['company_id' => $companies['internships@equitybank.co.ke'], 'period_id' => $periodId, 'department' => 'Digital Banking', 'capacity' => 4, 'required_skills' => 'Mobile Development (Flutter/React Native), APIs', 'duration' => '4 Months', 'has_stipend' => true, 'stipend_amount' => 12000.00, 'description' => 'Help build the next generation Equity Mobile Banking super-app.', 'status' => 'open'],
            // Kenya Power
            ['company_id' => $companies['hr@kplc.co.ke'], 'period_id' => $periodId, 'department' => 'ICT Department', 'capacity' => 2, 'required_skills' => 'Network Administration, SCADA, Oracle', 'duration' => '3 Months', 'has_stipend' => false, 'stipend_amount' => null, 'description' => 'Support ICT operations including SCADA systems and enterprise resource planning.', 'status' => 'open'],
            // Nation Media
            ['company_id' => $companies['hr@nation.co.ke'], 'period_id' => $periodId, 'department' => 'Digital Media', 'capacity' => 2, 'required_skills' => 'Web Development, SEO, CMS', 'duration' => '3 Months', 'has_stipend' => true, 'stipend_amount' => 8000.00, 'description' => 'Work on Nation.Africa digital platforms and content management systems.', 'status' => 'open'],
        ];

        foreach ($data as $row) {
            $id = DB::table('attachment_slots')->insertGetId(array_merge($row, ['created_at' => now(), 'updated_at' => now()]));
            $slots[] = ['id' => $id] + $row;
        }

        return $slots;
    }

    // ─────────────────────────────────────────────────────────────
    // 7. STUDENTS & PLACEMENTS (core of the demo data)
    // ─────────────────────────────────────────────────────────────
    private function seedStudentsAndPlacements(array $users, array $institutions, array $companies, array $periods, array $slots, array $roles): array
    {
        $uonId      = $institutions['uonbi.ac.ke'];
        $strathId   = $institutions['strathmore.edu'];
        $jkuatId    = $institutions['jkuat.ac.ke'];
        $periodUon  = $periods[1]['id']; // UoN active
        $periodStrath = $periods[2]['id'];
        $sfcId      = $companies['hr@safaricom.co.ke'];
        $kcbId      = $companies['careers@kcbgroup.com'];
        $equityId   = $companies['internships@equitybank.co.ke'];
        $kplcId     = $companies['hr@kplc.co.ke'];

        $sfcSupId   = DB::table('company_supervisors')->where('user_id', $users['jane_safaricom']->id)->value('id');
        $kcbSupId   = DB::table('company_supervisors')->where('user_id', $users['mark_kcb']->id)->value('id');
        $equitySupId = DB::table('company_supervisors')->where('user_id', $users['peter_equity']->id)->value('id');
        $kplcSupId  = DB::table('company_supervisors')->where('user_id', $users['lucy_kplc']->id)->value('id');
        $alanId     = $users['sup_alan']->id;
        $wanjikuId  = $users['sup_wanjiku']->id;

        $placements = [];

        // ── Student 1: John Doe — ACTIVE at Safaricom (week 10 of 16) ──────────
        $john = $this->createUser('John Mwangi Doe', 'john.doe@student.uonbi.ac.ke', $roles['student']);
        $johnStudent = $this->createStudent($john->id, $uonId, 'P15/1234/2022', 'Computer Science', 'BSc. Computer Science', '3rd Year', 'PHP, JavaScript, Laravel, React, Git, MySQL');
        $this->createApplication($johnStudent->id, $slots[0]['id'], 'accepted', 'I am passionate about building scalable systems and eager to contribute to Safaricom\'s engineering goals.');
        $p1 = $this->createPlacement($johnStudent->id, $sfcId, $periodUon, $sfcSupId, $alanId, 'active');
        $placements['john_active'] = ['placement' => $p1, 'student_user' => $john, 'sup_user' => $users['jane_safaricom'], 'acad_user' => $users['sup_alan']];

        // ── Student 2: Alice Wanjiru — ACTIVE at KCB (week 8 of 16) ─────────────
        $alice = $this->createUser('Alice Wanjiru Kamau', 'alice.wanjiru@student.uonbi.ac.ke', $roles['student']);
        $aliceStudent = $this->createStudent($alice->id, $uonId, 'P15/5678/2022', 'Information Technology', 'BSc. Information Technology', '3rd Year', 'Networking, Linux, Python, Cloud Computing, CCNA');
        $this->createApplication($aliceStudent->id, $slots[3]['id'], 'accepted', 'Networking and cloud infrastructure have been my passion since first year.');
        $p2 = $this->createPlacement($aliceStudent->id, $kcbId, $periodUon, $kcbSupId, $alanId, 'active');
        $placements['alice_active'] = ['placement' => $p2, 'student_user' => $alice, 'sup_user' => $users['mark_kcb'], 'acad_user' => $users['sup_alan']];

        // ── Student 3: Brian Otieno — COMPLETED at Equity (evaluated) ────────────
        $brian = $this->createUser('Brian Otieno Ouma', 'brian.otieno@student.uonbi.ac.ke', $roles['student']);
        $brianStudent = $this->createStudent($brian->id, $uonId, 'P15/9012/2021', 'Computer Science', 'BSc. Computer Science', '4th Year', 'Flutter, Dart, Firebase, Mobile Development, REST APIs');
        $this->createApplication($brianStudent->id, $slots[5]['id'], 'accepted', 'Mobile development is my specialty and I\'d love to contribute to Equity\'s digital transformation.');
        $p3 = $this->createPlacement($brianStudent->id, $equityId, $periodUon, $equitySupId, $wanjikuId, 'completed', 88.50);
        $placements['brian_completed'] = ['placement' => $p3, 'student_user' => $brian, 'sup_user' => $users['peter_equity'], 'acad_user' => $users['sup_wanjiku']];

        // ── Student 4: Carol Muthoni — FLAGGED at Safaricom ──────────────────────
        $carol = $this->createUser('Carol Muthoni Njagi', 'carol.muthoni@student.uonbi.ac.ke', $roles['student']);
        $carolStudent = $this->createStudent($carol->id, $uonId, 'P15/3456/2022', 'Computer Science', 'BSc. Computer Science', '3rd Year', 'Java, HTML, CSS, Basic Python');
        $this->createApplication($carolStudent->id, $slots[2]['id'], 'accepted', 'I am committed to learning cybersecurity from the ground up.');
        $p4 = $this->createPlacement($carolStudent->id, $sfcId, $periodUon, $sfcSupId, $alanId, 'flagged');
        $placements['carol_flagged'] = ['placement' => $p4, 'student_user' => $carol, 'sup_user' => $users['jane_safaricom'], 'acad_user' => $users['sup_alan']];

        // ── Student 5: David Kamau — PENDING / Applied at KPLC (not yet placed) ─
        $david = $this->createUser('David Kamau Njoroge', 'david.kamau@student.strathmore.edu', $roles['student']);
        $davidStudent = $this->createStudent($david->id, $strathId, 'STR/ICT/2022/034', 'ICT', 'BSc. Information Technology', '3rd Year', 'Oracle, Networking, Windows Server');
        $this->createApplication($davidStudent->id, $slots[6]['id'], 'submitted', 'I have strong Oracle skills and would love to support KPLC\'s ERP systems.');
        // David applied but no placement yet — also applied to KCB (shortlisted)
        $this->createApplication($davidStudent->id, $slots[4]['id'], 'shortlisted', 'Java Spring Boot is my strongest language and I am available immediately.');
        $placements['david_pending'] = null;

        // ── Student 6: Emily Achieng — DRAFT application (not submitted) ─────────
        $emily = $this->createUser('Emily Achieng Onyango', 'emily.achieng@student.strathmore.edu', $roles['student']);
        $emilyStudent = $this->createStudent($emily->id, $strathId, 'STR/CS/2022/078', 'Computer Science', 'BSc. Computer Science', '3rd Year', 'Python, Django, React, PostgreSQL');
        $this->createApplication($emilyStudent->id, $slots[1]['id'], 'draft', null);
        $placements['emily_draft'] = null;

        return $placements;
    }

    // ─────────────────────────────────────────────────────────────
    // 8. LOGBOOK ENTRIES
    // ─────────────────────────────────────────────────────────────
    private function seedLogbooks(array $placements, array $users): void
    {
        $companyUserId = $users['jane_safaricom']->id;
        $kcbUserId     = $users['mark_kcb']->id;
        $alanId        = $users['sup_alan']->id;
        $equityUserId  = $users['peter_equity']->id;
        $wanjikuId     = $users['sup_wanjiku']->id;

        // ── John's logbook (active, 10 weeks in) ─────────────────────────────────
        $johnPlacementId = $placements['john_active']['placement']->id;

        $johnEntries = [
            [1, now()->subWeeks(9), 'Onboarding and environment setup. Pulled the main repository, configured local Docker environment, attended company induction. Met the engineering team leads.', 'Agile methodology and Safaricom\'s SDLC process. Importance of documentation.', 'Docker networking issues slowed setup.', 'Begin first sprint ticket.', 'reviewed', now()->subWeeks(9)->addDays(4), $companyUserId, 'Great first week! Your documentation is already impressive.'],
            [2, now()->subWeeks(8), 'Worked on 3 frontend bug fixes in the M-Pesa merchant portal. Fixed responsive layout issues on mobile. Attended sprint planning and retrospective.', 'CSS flexbox edge cases. How to write proper bug reports and PR descriptions.', 'Understanding legacy codebase was tricky.', 'Start on the new payment history feature.', 'reviewed', now()->subWeeks(8)->addDays(4), $companyUserId, 'Good work on the PRs! Keep improving your commit messages.'],
            [3, now()->subWeeks(7), 'Implemented payment history feature (frontend). Wrote unit tests using Jest. Peer code review sessions helped understand code standards.', 'React custom hooks and memoisation for performance. Jest testing fundamentals.', 'Writing meaningful test cases took more time than expected.', 'Work on backend API for payment reconciliation.', 'reviewed', now()->subWeeks(7)->addDays(4), $alanId, 'Excellent progress John. You are adapting well to industry standards.'],
            [4, now()->subWeeks(6), 'Built REST API endpoint for payment reconciliation using Laravel. Wrote API documentation using Swagger. Participated in a cross-team standup.', 'API versioning best practices. Swagger/OpenAPI spec writing.', 'Handling edge cases in financial calculations.', 'Integration testing between frontend and backend.', 'reviewed', now()->subWeeks(6)->addDays(4), $companyUserId, 'The Swagger docs are thorough. Well done!'],
            [5, now()->subWeeks(5), 'Integration testing between frontend and backend payment flow. Fixed 2 critical bugs found during QA. Deployed feature to staging environment.', 'CI/CD pipelines using GitHub Actions. Staging vs production environment differences.', 'Pipeline configuration errors caused a failed deployment initially.', 'Prepare for production release and start next feature.', 'reviewed', now()->subWeeks(5)->addDays(4), $alanId, 'Great practical experience with deployment pipelines.'],
            [6, now()->subWeeks(4), 'Feature released to production! Monitored error logs post-release. Participated in hotfix for a minor calculation bug. Started new feature: bulk payment upload.', 'Log monitoring using ELK stack. Importance of post-release monitoring.', 'Real-time pressure of a production hotfix was stressful but educational.', 'Complete bulk payment upload module.', 'reviewed', now()->subWeeks(4)->addDays(4), $companyUserId, 'Handling the production incident was mature and professional.'],
            [7, now()->subWeeks(3), 'Completed bulk payment upload feature with CSV parsing and validation. Wrote comprehensive tests. Feature reviewed and merged.', 'CSV parsing edge cases, data validation strategies, and database transactions.', 'Handling malformed CSV files required thorough validation logic.', 'Code review session and start database optimisation task.', 'reviewed', now()->subWeeks(3)->addDays(4), $alanId, 'Your test coverage is impressive. Industry-ready code.'],
            [8, now()->subWeeks(2), 'Database query optimisation for the transaction history table. Reduced average query time from 2.3s to 0.4s using proper indexing. Attended DB performance workshop.', 'MySQL query execution plans, indexing strategies, and composite indexes.', 'Understanding explain plans took time initially.', 'Document optimisation work and start on notification service.', 'submitted', now()->subWeeks(2)->addDays(4), $companyUserId, 'Impressive results on the optimisation. 83% improvement!'],
            [9, now()->subWeeks(1), 'Built push notification service for payment alerts using Firebase Cloud Messaging. Integrated with existing event-driven architecture.', 'Event-driven architecture, pub/sub patterns, Firebase FCM integration.', 'Rate limiting on FCM required implementing a queue system.', 'Testing notification delivery reliability at scale.', 'submitted', now()->subWeeks(1)->addDays(3), null, null],
            [10, now(), 'Writing mid-attachment progress report. Conducting load testing on notification service using JMeter. Planning final-month deliverables with supervisor.', 'Load testing methodologies. How to write technical progress reports.', 'JMeter configuration for simulating concurrent users.', 'Complete load testing and finalise progress report.', 'draft', null, null, null],
        ];

        foreach ($johnEntries as [$week, $date, $activities, $lessons, $challenges, $plan, $status, $lockedAt, $commentUserId, $comment]) {
            $entry = DB::table('logbook_entries')->insertGetId([
                'placement_id'    => $johnPlacementId,
                'entry_date'      => $date->format('Y-m-d'),
                'week_number'     => $week,
                'activities'      => $activities,
                'lessons_learned' => $lessons,
                'challenges'      => $challenges,
                'plan_next_week'  => $plan,
                'status'          => $status,
                'locked_at'       => $lockedAt,
                'created_at'      => $date,
                'updated_at'      => $date->copy()->addDays(1),
            ]);

            if ($comment && $commentUserId) {
                DB::table('logbook_comments')->insert([
                    'logbook_entry_id' => $entry,
                    'user_id'          => $commentUserId,
                    'comment'          => $comment,
                    'created_at'       => $date->copy()->addDays(5),
                    'updated_at'       => $date->copy()->addDays(5),
                ]);
            }
        }

        // ── Alice's logbook (active, 8 weeks in) ─────────────────────────────────
        $alicePlacementId = $placements['alice_active']['placement']->id;
        $aliceEntries = [
            [1, now()->subWeeks(7), 'Joined KCB IT Infrastructure team. Set up monitoring dashboards on Grafana. Toured the data centre and understood the network topology.', 'Enterprise network architecture. SLA concepts for banking systems.', 'Data centre security protocols were strict — needed additional clearance.', 'Start on network monitoring scripts.', 'reviewed', now()->subWeeks(7)->addDays(4), $kcbUserId, 'Welcome aboard! Your networking background is evident.'],
            [2, now()->subWeeks(6), 'Wrote Python scripts to automate server health checks. Reduced manual monitoring time by 60%. Configured new Zabbix alerts.', 'Python scripting for automation. Zabbix alert configuration.', 'Connecting Python scripts to proprietary monitoring APIs.', 'Cloud migration planning session.', 'reviewed', now()->subWeeks(6)->addDays(4), $alanId, 'The automation work is excellent, Alice. Real business value!'],
            [3, now()->subWeeks(5), 'Assisted in AWS cloud migration planning. Mapped on-premise services to AWS equivalents. Created migration runbook for 5 services.', 'Cloud migration strategies (Lift-and-shift vs Re-architecting). AWS Well-Architected Framework.', 'Understanding regulatory compliance for banking data in the cloud.', 'Pilot migration of dev environment.', 'reviewed', now()->subWeeks(5)->addDays(4), $kcbUserId, 'Excellent runbook quality. This will be used in the actual migration.'],
            [4, now()->subWeeks(4), 'Executed pilot migration of dev environment to AWS EC2. Configured VPC, Security Groups, and IAM roles. All services running successfully.', 'VPC design, IAM least-privilege principle, and EC2 instance sizing.', 'IAM policy debugging — permissions were too restrictive initially.', 'Performance benchmarking of migrated services.', 'reviewed', now()->subWeeks(4)->addDays(4), $alanId, 'Practical cloud skills are very valuable. Great documentation.'],
            [5, now()->subWeeks(3), 'Benchmarked performance of migrated services. Cloud performance 40% better than on-premise for web services. Presented findings to IT manager.', 'How to present technical findings to non-technical management. Benchmarking methodologies.', 'Making the presentation accessible to non-technical audience.', 'Cost optimisation analysis.', 'reviewed', now()->subWeeks(3)->addDays(4), $kcbUserId, 'The management presentation was very professional. Well done!'],
            [6, now()->subWeeks(2), 'AWS cost optimisation: implemented Reserved Instances, S3 Intelligent-Tiering, and right-sized EC2 instances. Projected 35% annual cost savings.', 'Cloud cost management tools. FinOps principles and Reserved Instance economics.', 'Balancing performance vs cost trade-offs.', 'Documentation and handover plan.', 'submitted', now()->subWeeks(2)->addDays(3), $alanId, 'Outstanding financial analysis. This is real-world cloud engineering.'],
            [7, now()->subWeeks(1), 'Writing comprehensive handover documentation. Training junior staff on new monitoring dashboards. Preparing final attachment report outline.', 'Knowledge transfer techniques. Technical documentation standards.', 'Making documentation comprehensive yet easy to understand.', 'Final report writing and presentation preparation.', 'submitted', now()->subWeeks(1)->addDays(2), null, null],
            [8, now(), 'Working on final attachment report. Compiling all achievements and technical contributions. Gathering feedback from team members.', 'Self-reflection and professional growth assessment.', 'Quantifying soft skill improvements.', 'Submit final report and close out tasks.', 'draft', null, null, null],
        ];

        foreach ($aliceEntries as [$week, $date, $activities, $lessons, $challenges, $plan, $status, $lockedAt, $commentUserId, $comment]) {
            $entry = DB::table('logbook_entries')->insertGetId([
                'placement_id'    => $alicePlacementId,
                'entry_date'      => $date->format('Y-m-d'),
                'week_number'     => $week,
                'activities'      => $activities,
                'lessons_learned' => $lessons,
                'challenges'      => $challenges,
                'plan_next_week'  => $plan,
                'status'          => $status,
                'locked_at'       => $lockedAt,
                'created_at'      => $date,
                'updated_at'      => $date->copy()->addDays(1),
            ]);

            if ($comment && $commentUserId) {
                DB::table('logbook_comments')->insert([
                    'logbook_entry_id' => $entry,
                    'user_id'          => $commentUserId,
                    'comment'          => $comment,
                    'created_at'       => $date->copy()->addDays(5),
                    'updated_at'       => $date->copy()->addDays(5),
                ]);
            }
        }

        // ── Brian's logbook (completed — all 12 weeks reviewed) ──────────────────
        $brianPlacementId = $placements['brian_completed']['placement']->id;
        for ($week = 1; $week <= 12; $week++) {
            $date = now()->subWeeks(13 - $week)->subWeeks(4);
            DB::table('logbook_entries')->insert([
                'placement_id'    => $brianPlacementId,
                'entry_date'      => $date->format('Y-m-d'),
                'week_number'     => $week,
                'activities'      => "Week $week: Worked on Flutter module development, state management using BLoC pattern, and API integrations for Equity Mobile Banking.",
                'lessons_learned' => "Deepened understanding of Flutter widget lifecycle and asynchronous programming patterns.",
                'challenges'      => $week === 3 ? 'Debugging async state management issues consumed most of the week.' : ($week === 7 ? 'App crashing on older Android devices due to compatibility issues.' : 'None significant.'),
                'plan_next_week'  => $week < 12 ? "Continue with sprint $week deliverables and attend code review." : 'Submit final report and handover.',
                'status'          => 'reviewed',
                'locked_at'       => $date->copy()->addDays(4),
                'created_at'      => $date,
                'updated_at'      => $date->copy()->addDays(5),
            ]);
        }

        // ── Carol's logbook (flagged — only 3 entries, then went missing) ─────────
        $carolPlacementId = $placements['carol_flagged']['placement']->id;
        $carolEntries = [
            [1, now()->subWeeks(6), 'Attended onboarding and received laptop and access credentials. Set up development environment.', 'Company security policies and VPN setup.', 'Had trouble with VPN configuration.', 'Start on security monitoring tasks.', 'reviewed', now()->subWeeks(6)->addDays(4), $companyUserId, 'Welcome Carol! Please make sure to be on time for morning stand-ups.'],
            [2, now()->subWeeks(5), 'Worked on vulnerability scanning using Nessus. Identified 3 low-severity vulnerabilities on test servers. Attended cybersecurity workshop.', 'Common CVE categories and CVSS scoring.', 'Understanding report writing format for security findings.', 'Continue with penetration testing basics.', 'submitted', now()->subWeeks(5)->addDays(4), $companyUserId, 'Good work but arrived late twice this week. Please improve punctuality.'],
            [3, now()->subWeeks(4), 'Partial work on penetration testing documentation. Missed 2 days due to personal reasons. Supervisor noted attendance concerns.', 'Importance of communication when unable to attend.', 'Personal issues affecting work attendance.', 'Catch up on missed work.', 'submitted', now()->subWeeks(4)->addDays(5), $companyUserId, 'Carol, missing work without notice is a serious concern. Please communicate in advance.'],
        ];

        foreach ($carolEntries as [$week, $date, $activities, $lessons, $challenges, $plan, $status, $lockedAt, $commentUserId, $comment]) {
            $entry = DB::table('logbook_entries')->insertGetId([
                'placement_id'    => $carolPlacementId,
                'entry_date'      => $date->format('Y-m-d'),
                'week_number'     => $week,
                'activities'      => $activities,
                'lessons_learned' => $lessons,
                'challenges'      => $challenges,
                'plan_next_week'  => $plan,
                'status'          => $status,
                'locked_at'       => $lockedAt,
                'created_at'      => $date,
                'updated_at'      => $date->copy()->addDays(1),
            ]);

            if ($comment) {
                DB::table('logbook_comments')->insert([
                    'logbook_entry_id' => $entry,
                    'user_id'          => $commentUserId,
                    'comment'          => $comment,
                    'created_at'       => $date->copy()->addDays(5),
                    'updated_at'       => $date->copy()->addDays(5),
                ]);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 9. EVALUATIONS (for completed placement)
    // ─────────────────────────────────────────────────────────────
    private function seedEvaluations(array $placements, array $users): void
    {
        $brianPlacementId = $placements['brian_completed']['placement']->id;
        $equityUserId     = $users['peter_equity']->id;
        $wanjikuId        = $users['sup_wanjiku']->id;

        // Company supervisor evaluation
        DB::table('evaluations')->insert([
            'placement_id'         => $brianPlacementId,
            'evaluator_id'         => $equityUserId,
            'evaluator_type'       => 'company_supervisor',
            'score_punctuality'    => 4,
            'score_attitude'       => 5,
            'score_technical'      => 5,
            'score_teamwork'       => 4,
            'score_communication'  => 4,
            'total_score'          => 4.40,
            'remarks'              => 'Brian demonstrated exceptional technical skills especially in Flutter development. He independently solved complex state management challenges and consistently delivered beyond expectations. His attitude and work ethic were outstanding. We would happily have him back as a full-time employee.',
            'would_accept_again'   => true,
            'submitted_at'         => now()->subWeeks(2),
            'created_at'           => now()->subWeeks(2),
            'updated_at'           => now()->subWeeks(2),
        ]);

        // Academic supervisor evaluation
        DB::table('evaluations')->insert([
            'placement_id'         => $brianPlacementId,
            'evaluator_id'         => $wanjikuId,
            'evaluator_type'       => 'academic_supervisor',
            'score_punctuality'    => 5,
            'score_attitude'       => 5,
            'score_technical'      => 4,
            'score_teamwork'       => 5,
            'score_communication'  => 5,
            'total_score'          => 4.80,
            'remarks'              => 'Brian\'s attachment report and logbook entries were thorough and reflective. He showed remarkable growth from a student to a professional developer. His final presentation was one of the best I have supervised. I recommend him highly for any technical role.',
            'would_accept_again'   => true,
            'submitted_at'         => now()->subWeeks(1),
            'created_at'           => now()->subWeeks(1),
            'updated_at'           => now()->subWeeks(1),
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 10. FIELD VISITS
    // ─────────────────────────────────────────────────────────────
    private function seedFieldVisits(array $placements, array $users): void
    {
        $alanId    = $users['sup_alan']->id;
        $wanjikuId = $users['sup_wanjiku']->id;

        $visits = [
            // John's placement visits (2 visits — 1 completed, 1 upcoming)
            [
                'academic_supervisor_id'    => $alanId,
                'placement_id'             => $placements['john_active']['placement']->id,
                'visit_date'               => now()->subWeeks(6)->format('Y-m-d'),
                'visit_time'               => '10:00:00',
                'status'                   => 'completed',
                'company_environment_notes' => 'Safaricom engineering floor is well-equipped with modern workstations. Strong collaborative culture observed. Agile boards clearly visible. Open office encourages communication.',
                'student_performance_notes' => 'John is performing excellently. He was observed pair-programming with a senior engineer on a critical feature. His code quality is industry standard. He asks good questions and takes initiative.',
                'recommendations'          => 'Continue current trajectory. Encourage John to document his work more formally for the final report. Consider requesting involvement in a system design session.',
                'gps_latitude'             => '-1.2641',
                'gps_longitude'            => '36.7947',
            ],
            [
                'academic_supervisor_id'    => $alanId,
                'placement_id'             => $placements['john_active']['placement']->id,
                'visit_date'               => now()->addWeeks(3)->format('Y-m-d'),
                'visit_time'               => '14:00:00',
                'status'                   => 'scheduled',
                'company_environment_notes' => null,
                'student_performance_notes' => null,
                'recommendations'          => null,
                'gps_latitude'             => null,
                'gps_longitude'            => null,
            ],
            // Alice's placement visit (completed)
            [
                'academic_supervisor_id'    => $alanId,
                'placement_id'             => $placements['alice_active']['placement']->id,
                'visit_date'               => now()->subWeeks(4)->format('Y-m-d'),
                'visit_time'               => '11:00:00',
                'status'                   => 'completed',
                'company_environment_notes' => 'KCB data centre is state-of-the-art with excellent security protocols. Professional environment with clear hierarchy and structured teams. Students are given meaningful responsibilities.',
                'student_performance_notes' => 'Alice has impressed the entire IT team with her Python automation scripts. She is contributing real business value and working confidently with senior engineers. Her cloud migration work is beyond attachment-level expectations.',
                'recommendations'          => 'Alice should be encouraged to pursue cloud certifications (AWS Solutions Architect). Her potential is exceptional and she should start thinking about career placement opportunities.',
                'gps_latitude'             => '-1.2841',
                'gps_longitude'            => '36.8231',
            ],
            // Brian's visit (completed — from the past)
            [
                'academic_supervisor_id'    => $wanjikuId,
                'placement_id'             => $placements['brian_completed']['placement']->id,
                'visit_date'               => now()->subWeeks(8)->format('Y-m-d'),
                'visit_time'               => '09:30:00',
                'status'                   => 'completed',
                'company_environment_notes' => 'Equity\'s digital innovation lab is impressive. Strong startup culture within a banking institution. Engineers are working on cutting-edge mobile technology.',
                'student_performance_notes' => 'Brian is thriving. He has independently delivered two sprint features and his Flutter code is being used in production. Supervisor Peter speaks highly of him. He is clearly the standout attachment student this cycle.',
                'recommendations'          => 'Brian should be recognised as an exemplary attachment student. Consider nominating him for the university attachment award.',
                'gps_latitude'             => '-1.2996',
                'gps_longitude'            => '36.7838',
            ],
            // Carol's visit (cancelled due to attendance issues)
            [
                'academic_supervisor_id'    => $alanId,
                'placement_id'             => $placements['carol_flagged']['placement']->id,
                'visit_date'               => now()->subWeeks(3)->format('Y-m-d'),
                'visit_time'               => '10:00:00',
                'status'                   => 'cancelled',
                'company_environment_notes' => 'Visit cancelled — student was absent from the office on the day of the visit.',
                'student_performance_notes' => 'Unable to assess — student not present.',
                'recommendations'          => 'Urgent follow-up required. Student attendance is a serious concern. Rescheduled for next week pending student response.',
                'gps_latitude'             => null,
                'gps_longitude'            => null,
            ],
        ];

        foreach ($visits as $visit) {
            DB::table('field_visits')->insert(array_merge($visit, ['created_at' => now(), 'updated_at' => now()]));
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 11. WEEKLY LOGS (by company supervisors)
    // ─────────────────────────────────────────────────────────────
    private function seedWeeklyLogs(array $placements, array $users): void
    {
        $sfcSupId  = DB::table('company_supervisors')->where('user_id', $users['jane_safaricom']->id)->value('id');
        $kcbSupId  = DB::table('company_supervisors')->where('user_id', $users['mark_kcb']->id)->value('id');

        $johnPlacementId  = $placements['john_active']['placement']->id;
        $alicePlacementId = $placements['alice_active']['placement']->id;

        // John's weekly logs (weeks 1-9 by Safaricom supervisor)
        $johnWeeklyLogs = [
            [1, 'Frontend bug fixes and onboarding tasks', 'Completed 3 bug fixes, attended onboarding sessions', 5, 5, 'John is adapting quickly to our engineering culture.', false, null],
            [2, 'Payment history feature (frontend)', 'Delivered payment history UI ahead of schedule', 5, 5, 'Excellent quality of work. PR merged with minimal changes needed.', false, null],
            [3, 'Payment history feature (backend API)', 'Delivered REST API endpoint with Swagger docs', 5, 5, 'Swagger documentation is excellent. Beyond attachment expectations.', false, null],
            [4, 'Integration testing and QA', 'All integration tests passing. 2 bugs fixed during QA.', 4, 5, 'Good systematic approach to debugging.', false, null],
            [5, 'Deployment to staging and production monitoring', 'Successful deployment. Hotfix resolved quickly.', 5, 5, 'Handled production pressure maturely. Very impressed.', false, null],
            [6, 'Bulk payment upload module', 'Completed module with comprehensive test coverage', 5, 5, 'Test coverage is industry-standard. The validation logic is robust.', false, null],
            [7, 'Database query optimisation', 'Achieved 83% performance improvement on transaction table', 5, 5, 'The query optimisation results speak for themselves. Outstanding work.', false, null],
            [8, 'Push notification service', 'Firebase FCM integration complete. Queue system for rate limiting.', 5, 5, 'Understanding event-driven architecture so quickly is remarkable.', false, null],
            [9, 'Load testing and progress report', 'JMeter load tests configured. Progress report drafted.', 5, 5, 'On track for an exceptional attachment completion.', false, null],
        ];

        foreach ($johnWeeklyLogs as [$week, $tasks, $completed, $conduct, $attendance, $feedback, $concern, $concernDetails]) {
            DB::table('weekly_logs')->insert([
                'placement_id'          => $johnPlacementId,
                'company_supervisor_id' => $sfcSupId,
                'week_number'           => $week,
                'tasks_assigned'        => $tasks,
                'tasks_completed'       => $completed,
                'conduct_score'         => $conduct,
                'attendance_score'      => $attendance,
                'specific_feedback'     => $feedback,
                'has_concern'           => $concern,
                'concern_details'       => $concernDetails,
                'created_at'            => now()->subWeeks(10 - $week),
                'updated_at'            => now()->subWeeks(10 - $week),
            ]);
        }

        // Alice's weekly logs (weeks 1-7 by KCB supervisor)
        $aliceWeeklyLogs = [
            [1, 'Server monitoring setup and data centre orientation', 'Grafana dashboards configured', 5, 5, 'Alice arrived prepared and professional from day one.', false, null],
            [2, 'Automation scripts for server health checks', 'Python scripts delivered, 60% time savings', 5, 5, 'The automation scripts exceeded expectations. Will be used in production.', false, null],
            [3, 'AWS cloud migration planning', 'Migration runbook created for 5 services', 5, 5, 'Migration runbook is deployment-ready. Exceptional work.', false, null],
            [4, 'Dev environment cloud migration', 'All services migrated and running on AWS', 5, 5, 'Zero downtime migration. Professional execution.', false, null],
            [5, 'Performance benchmarking and management presentation', 'Benchmarks completed, management presentation delivered', 5, 5, 'Management was very impressed by Alice\'s presentation. Made us look good!', false, null],
            [6, 'AWS cost optimisation analysis', '35% cost savings identified and documented', 5, 5, 'The cost analysis is being used by management for budget planning.', false, null],
            [7, 'Handover documentation and training', 'Comprehensive docs written, junior staff trained', 5, 5, 'Alice is leaving us better than she found us. An exceptional attachment student.', false, null],
        ];

        foreach ($aliceWeeklyLogs as [$week, $tasks, $completed, $conduct, $attendance, $feedback, $concern, $concernDetails]) {
            DB::table('weekly_logs')->insert([
                'placement_id'          => $alicePlacementId,
                'company_supervisor_id' => $kcbSupId,
                'week_number'           => $week,
                'tasks_assigned'        => $tasks,
                'tasks_completed'       => $completed,
                'conduct_score'         => $conduct,
                'attendance_score'      => $attendance,
                'specific_feedback'     => $feedback,
                'has_concern'           => $concern,
                'concern_details'       => $concernDetails,
                'created_at'            => now()->subWeeks(8 - $week),
                'updated_at'            => now()->subWeeks(8 - $week),
            ]);
        }

        // Carol's weekly logs (showing attendance concerns)
        $carolPlacementId = $placements['carol_flagged']['placement']->id;
        DB::table('weekly_logs')->insert([
            'placement_id'          => $carolPlacementId,
            'company_supervisor_id' => $sfcSupId,
            'week_number'           => 1,
            'tasks_assigned'        => 'Vulnerability scanning using Nessus',
            'tasks_completed'       => 'Scanned 3 test servers, identified vulnerabilities',
            'conduct_score'         => 3,
            'attendance_score'      => 3,
            'specific_feedback'     => 'Carol arrived late twice this week. Technical work was acceptable.',
            'has_concern'           => true,
            'concern_details'       => 'Punctuality issues noted in week 1. Will monitor.',
            'created_at'            => now()->subWeeks(5),
            'updated_at'            => now()->subWeeks(5),
        ]);
        DB::table('weekly_logs')->insert([
            'placement_id'          => $carolPlacementId,
            'company_supervisor_id' => $sfcSupId,
            'week_number'           => 2,
            'tasks_assigned'        => 'Penetration testing documentation',
            'tasks_completed'       => 'Partial — missed 2 days without notice',
            'conduct_score'         => 2,
            'attendance_score'      => 1,
            'specific_feedback'     => 'Carol missed 2 full days without any communication. This is unacceptable in a professional environment.',
            'has_concern'           => true,
            'concern_details'       => 'Student missed work without notifying supervisor or institution. Flagging for urgent follow-up.',
            'created_at'            => now()->subWeeks(4),
            'updated_at'            => now()->subWeeks(4),
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 12. DOCUMENTS
    // ─────────────────────────────────────────────────────────────
    private function seedDocuments(array $placements, array $users): void
    {
        $alanId    = $users['sup_alan']->id;
        $wanjikuId = $users['sup_wanjiku']->id;

        $johnStudentId  = DB::table('students')->where('reg_number', 'P15/1234/2022')->value('id');
        $aliceStudentId = DB::table('students')->where('reg_number', 'P15/5678/2022')->value('id');
        $brianStudentId = DB::table('students')->where('reg_number', 'P15/9012/2021')->value('id');
        $carolStudentId = DB::table('students')->where('reg_number', 'P15/3456/2022')->value('id');

        $docs = [
            // John's documents (all approved)
            [$johnStudentId,  'intro_letter',      'UoN_Introduction_Letter_John_Mwangi.pdf',   'documents/intro_letters/john_intro.pdf',   'application/pdf', 245000, 'approved',  null,                           $alanId,    now()->subWeeks(10)],
            [$johnStudentId,  'medical_cert',      'Medical_Certificate_John_Mwangi.pdf',        'documents/medical/john_medical.pdf',        'application/pdf', 189000, 'approved',  null,                           $alanId,    now()->subWeeks(10)],
            [$johnStudentId,  'insurance_cert',    'Student_Insurance_John_Mwangi.pdf',          'documents/insurance/john_insurance.pdf',    'application/pdf', 312000, 'approved',  null,                           $alanId,    now()->subWeeks(9)],
            [$johnStudentId,  'acceptance_letter', 'Safaricom_Acceptance_Letter.pdf',            'documents/acceptance/john_acceptance.pdf',  'application/pdf', 198000, 'approved',  null,                           $alanId,    now()->subWeeks(9)],
            [$johnStudentId,  'cv',                'CV_John_Mwangi_Doe.pdf',                    'documents/cvs/john_cv.pdf',                 'application/pdf', 423000, 'approved',  null,                           $alanId,    now()->subWeeks(11)],

            // Alice's documents (all approved)
            [$aliceStudentId, 'intro_letter',      'UoN_Introduction_Letter_Alice_Wanjiru.pdf',  'documents/intro_letters/alice_intro.pdf',   'application/pdf', 245000, 'approved',  null,                           $alanId,    now()->subWeeks(8)],
            [$aliceStudentId, 'medical_cert',      'Medical_Certificate_Alice_Wanjiru.pdf',      'documents/medical/alice_medical.pdf',       'application/pdf', 201000, 'approved',  null,                           $alanId,    now()->subWeeks(8)],
            [$aliceStudentId, 'insurance_cert',    'Insurance_Alice_Wanjiru.pdf',                'documents/insurance/alice_insurance.pdf',   'application/pdf', 289000, 'approved',  null,                           $alanId,    now()->subWeeks(8)],
            [$aliceStudentId, 'acceptance_letter', 'KCB_Acceptance_Letter_Alice.pdf',            'documents/acceptance/alice_acceptance.pdf', 'application/pdf', 175000, 'approved',  null,                           $alanId,    now()->subWeeks(7)],

            // Brian's documents (all approved — completed)
            [$brianStudentId, 'intro_letter',      'UoN_Introduction_Letter_Brian_Otieno.pdf',  'documents/intro_letters/brian_intro.pdf',   'application/pdf', 245000, 'approved',  null,                           $wanjikuId, now()->subWeeks(17)],
            [$brianStudentId, 'acceptance_letter', 'Equity_Acceptance_Letter_Brian.pdf',        'documents/acceptance/brian_acceptance.pdf', 'application/pdf', 231000, 'approved',  null,                           $wanjikuId, now()->subWeeks(16)],

            // Carol's documents (intro letter rejected, others pending)
            [$carolStudentId, 'intro_letter',      'UoN_Introduction_Letter_Carol_Muthoni.pdf', 'documents/intro_letters/carol_intro.pdf',   'application/pdf', 102000, 'rejected',  'Document appears to be a draft — final signed version required.', $alanId, now()->subWeeks(7)],
            [$carolStudentId, 'medical_cert',      'Medical_Carol_Muthoni.pdf',                 'documents/medical/carol_medical.pdf',       'application/pdf', 189000, 'approved',  null,                           $alanId,    now()->subWeeks(6)],
            [$carolStudentId, 'cv',                'CV_Carol_Muthoni.pdf',                      'documents/cvs/carol_cv.pdf',                'application/pdf', 367000, 'pending',   null,                           null,       null],
        ];

        foreach ($docs as [$studentId, $type, $origName, $filePath, $mime, $size, $status, $rejectionReason, $reviewedBy, $reviewedAt]) {
            DB::table('documents')->insert([
                'student_id'       => $studentId,
                'type'             => $type,
                'original_name'    => $origName,
                'file_path'        => $filePath,
                'mime_type'        => $mime,
                'file_size'        => $size,
                'status'           => $status,
                'rejection_reason' => $rejectionReason,
                'reviewed_by'      => $reviewedBy,
                'reviewed_at'      => $reviewedAt,
                'created_at'       => now()->subWeeks(rand(5, 12)),
                'updated_at'       => now()->subWeeks(rand(1, 4)),
            ]);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 13. MESSAGES
    // ─────────────────────────────────────────────────────────────
    private function seedMessages(array $users): void
    {
        $johnUser    = \App\Models\User::where('email', 'john.doe@student.uonbi.ac.ke')->first();
        $aliceUser   = \App\Models\User::where('email', 'alice.wanjiru@student.uonbi.ac.ke')->first();
        $carolUser   = \App\Models\User::where('email', 'carol.muthoni@student.uonbi.ac.ke')->first();
        $janeUser    = $users['jane_safaricom'];
        $markUser    = $users['mark_kcb'];
        $alanUser    = $users['sup_alan'];

        $messages = [
            // John ↔ Jane (Safaricom supervisor)
            [$janeUser->id, $johnUser->id,  null, null, 'Hi John, welcome to the Safaricom Engineering team! Please make sure to set up your company email and Slack account today. The onboarding checklist is in your email.', now()->subWeeks(10), now()->subWeeks(10)],
            [$johnUser->id, $janeUser->id,  null, null, 'Thank you Jane! I have set up everything and completed the checklist. Looking forward to starting tomorrow morning.', now()->subWeeks(10)->addHours(2), now()->subWeeks(10)->addHours(2)],
            [$janeUser->id, $johnUser->id,  null, null, 'Great progress this week John! Your PR for the payment history feature was merged. The code quality is impressive for an attachment student.', now()->subWeeks(8), now()->subWeeks(8)],
            [$johnUser->id, $janeUser->id,  null, null, 'Thank you so much! I really enjoyed working on it. I have a question about the database schema for the next task — would you have 15 minutes for a quick call?', now()->subWeeks(8)->addHours(1), now()->subWeeks(8)->addHours(1)],
            [$janeUser->id, $johnUser->id,  null, null, 'Of course! Let\'s sync at 3pm today. Also, please review your logbook entry for Week 2 — add more detail about the challenges you faced.', now()->subWeeks(8)->addHours(2), null],

            // John ↔ Alan (academic supervisor)
            [$alanUser->id, $johnUser->id,  null, null, 'John, I reviewed your Week 3 logbook entry. Excellent reflection on API design. Please ensure your Week 4 entry includes more details on the testing approach.', now()->subWeeks(7), now()->subWeeks(7)],
            [$johnUser->id, $alanUser->id,  null, null, 'Good afternoon Dr. Alan. I have updated Week 3 and submitted Week 4. I have also started the draft for my mid-attachment report. Could we schedule a review session?', now()->subWeeks(7)->addHours(3), now()->subWeeks(7)->addHours(3)],
            [$alanUser->id, $johnUser->id,  null, null, 'Excellent! Let\'s meet on Friday at 2pm via Zoom. Please send me the report draft by Thursday so I can review it beforehand. Keep up the outstanding work!', now()->subWeeks(7)->addDays(1), now()->subWeeks(7)->addDays(1)],

            // Alice ↔ Mark (KCB supervisor)
            [$markUser->id, $aliceUser->id, null, null, 'Alice, the Python automation scripts you wrote have been deployed to production monitoring. The team is very impressed! Great initiative.', now()->subWeeks(6), now()->subWeeks(6)],
            [$aliceUser->id, $markUser->id, null, null, 'Thank you Mark! That means a lot. I noticed the scripts could be further optimised to handle edge cases. Shall I create a ticket for the improvements?', now()->subWeeks(6)->addHours(1), now()->subWeeks(6)->addHours(1)],
            [$markUser->id, $aliceUser->id, null, null, 'Absolutely! Please go ahead and create the ticket. Also, would you be willing to present the cloud migration findings to management on Thursday? They are very interested.', now()->subWeeks(6)->addHours(4), null],
            [$aliceUser->id, $markUser->id, null, null, 'Yes, I would be happy to! I will prepare slides by Wednesday. What level of technical detail would be appropriate for the management audience?', now()->subWeeks(6)->addHours(5), now()->subWeeks(6)->addHours(5)],

            // Carol ↔ Alan (urgent - flagging conversation)
            [$alanUser->id, $carolUser->id, null, null, 'Carol, I have received a concerning report from your supervisor at Safaricom regarding your attendance. Can you please explain the situation? This is serious.', now()->subWeeks(3), now()->subWeeks(3)],
            [$carolUser->id, $alanUser->id, null, null, 'Dr. Alan, I am very sorry. I had a family emergency and I should have communicated better. I am now back and committed to completing my attachment.', now()->subWeeks(3)->addHours(4), now()->subWeeks(3)->addHours(4)],
            [$alanUser->id, $carolUser->id, null, null, 'I understand emergencies happen, but communication is non-negotiable. Please call your supervisor immediately and submit a formal apology. I will be scheduling an urgent site visit.', now()->subWeeks(3)->addHours(5), now()->subWeeks(3)->addHours(5)],
        ];

        foreach ($messages as [$senderId, $receiverId, $contextType, $contextId, $body, $createdAt, $readAt]) {
            DB::table('messages')->insert([
                'sender_id'    => $senderId,
                'receiver_id'  => $receiverId,
                'context_type' => $contextType,
                'context_id'   => $contextId,
                'body'         => $body,
                'read_at'      => $readAt,
                'created_at'   => $createdAt,
                'updated_at'   => $createdAt,
            ]);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 14. STUDENT FLAGS
    // ─────────────────────────────────────────────────────────────
    private function seedStudentFlags(array $placements, array $users): void
    {
        $carolPlacementId = $placements['carol_flagged']['placement']->id;
        $janeId           = $users['jane_safaricom']->id;
        $alanId           = $users['sup_alan']->id;

        DB::table('student_flags')->insert([
            [
                'placement_id' => $carolPlacementId,
                'flagged_by'   => $janeId,
                'severity'     => 'warning',
                'reason'       => 'missed_logbook',
                'details'      => 'Student has not submitted logbook entries for weeks 4, 5, and 6. Repeated reminders sent via email and WhatsApp with no response.',
                'resolved'     => false,
                'resolved_at'  => null,
                'created_at'   => now()->subWeeks(3),
                'updated_at'   => now()->subWeeks(3),
            ],
            [
                'placement_id' => $carolPlacementId,
                'flagged_by'   => $janeId,
                'severity'     => 'flag',
                'reason'       => 'misconduct',
                'details'      => 'Student missed 2 full work days in week 3 without any prior notice or subsequent explanation. Attendance record shows 60% attendance for the month. This is below the company minimum of 95%.',
                'resolved'     => false,
                'resolved_at'  => null,
                'created_at'   => now()->subWeeks(3),
                'updated_at'   => now()->subWeeks(3),
            ],
            [
                'placement_id' => $carolPlacementId,
                'flagged_by'   => $alanId,
                'severity'     => 'critical',
                'reason'       => 'early_discharge',
                'details'      => 'After meeting with the company supervisor and the student, it has been agreed that if attendance does not improve to 95%+ within 2 weeks, the student will be withdrawn from the placement and required to repeat the attachment in the next cycle.',
                'resolved'     => false,
                'resolved_at'  => null,
                'created_at'   => now()->subWeeks(2),
                'updated_at'   => now()->subWeeks(2),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 15. COMPANY RATINGS
    // ─────────────────────────────────────────────────────────────
    private function seedCompanyRatings(array $companies, array $users): void
    {
        $sfcId    = $companies['hr@safaricom.co.ke'];
        $kcbId    = $companies['careers@kcbgroup.com'];
        $equityId = $companies['internships@equitybank.co.ke'];

        $johnStudentUserId  = \App\Models\User::where('email', 'john.doe@student.uonbi.ac.ke')->value('id');
        $aliceStudentUserId = \App\Models\User::where('email', 'alice.wanjiru@student.uonbi.ac.ke')->value('id');
        $brianStudentUserId = \App\Models\User::where('email', 'brian.otieno@student.uonbi.ac.ke')->value('id');
        $alanId             = $users['sup_alan']->id;

        $ratings = [
            // Safaricom ratings
            [$sfcId, $brianStudentUserId, 5, 'student',   'Exceptional learning environment. The engineering team is world-class and very supportive of attachment students. Stipend was paid on time every month. Highly recommend!'],
            [$sfcId, $alanId,             5, 'supervisor', 'Safaricom consistently provides industry-leading attachment experiences. Students return significantly more skilled. Excellent partner institution.'],
            // KCB ratings
            [$kcbId, $aliceStudentUserId, 4, 'student',   'Great exposure to enterprise-scale infrastructure. The team is professional and the work is meaningful. No stipend is the only downside.'],
            [$kcbId, $alanId,             4, 'supervisor', 'KCB offers structured attachment programmes with clear deliverables. Students are given real responsibilities which accelerates learning.'],
            // Equity ratings (from Brian's completed attachment)
            [$equityId, $brianStudentUserId, 5, 'student', 'Best attachment experience I could have asked for. Peter (supervisor) was a great mentor, the tech stack is modern, and my code is in production. Cannot recommend enough!'],
        ];

        foreach ($ratings as [$companyId, $raterId, $rating, $raterType, $review]) {
            DB::table('company_ratings')->insert([
                'company_id'  => $companyId,
                'rater_id'    => $raterId,
                'rater_type'  => $raterType,
                'rating'      => $rating,
                'review'      => $review,
                'created_at'  => now()->subWeeks(rand(1, 6)),
                'updated_at'  => now()->subWeeks(rand(1, 3)),
            ]);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 16. NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────
    private function seedNotifications(array $users): void
    {
        $johnId  = \App\Models\User::where('email', 'john.doe@student.uonbi.ac.ke')->value('id');
        $aliceId = \App\Models\User::where('email', 'alice.wanjiru@student.uonbi.ac.ke')->value('id');
        $carolId = \App\Models\User::where('email', 'carol.muthoni@student.uonbi.ac.ke')->value('id');
        $alanId  = $users['sup_alan']->id;
        $janeId  = $users['jane_safaricom']->id;

        $notifications = [
            // John's notifications
            [$johnId, 'logbook_reminder',   ['message' => 'Your Week 10 logbook entry is due by end of week. Please ensure it is submitted on time.', 'week' => 10], now()->subDays(2), null],
            [$johnId, 'comment_added',      ['message' => 'Jane Smith commented on your Week 8 logbook entry: "Impressive results on the optimisation. 83% improvement!"', 'entry_week' => 8], now()->subWeeks(2), now()->subWeeks(2)->addHours(1)],
            [$johnId, 'field_visit_scheduled', ['message' => 'Dr. Alan Odhiambo has scheduled a field visit on ' . now()->addWeeks(3)->format('M d, Y') . ' at 2:00 PM.'], now()->subDays(5), now()->subDays(4)],
            [$johnId, 'message_received',   ['message' => 'New message from Jane Smith: "Great progress this week John! Your PR for the payment history feature was merged."'], now()->subWeeks(8), now()->subWeeks(8)],

            // Alice's notifications
            [$aliceId, 'logbook_reminder',   ['message' => 'Your Week 8 logbook entry is due. You are performing exceptionally — keep it up!', 'week' => 8], now()->subDays(1), null],
            [$aliceId, 'comment_added',      ['message' => 'Dr. Alan Odhiambo commented on your Week 6 logbook entry: "Outstanding financial analysis. This is real-world cloud engineering."', 'entry_week' => 6], now()->subWeeks(2), now()->subWeeks(2)->addHours(3)],
            [$aliceId, 'message_received',   ['message' => 'New message from Mark Kamau: "The automation scripts you wrote have been deployed to production!"'], now()->subWeeks(6), now()->subWeeks(6)],

            // Carol's notifications (urgent)
            [$carolId, 'flag_raised',        ['message' => 'URGENT: A flag has been raised on your placement due to attendance concerns. Please contact your academic supervisor immediately.', 'severity' => 'critical'], now()->subWeeks(2), null],
            [$carolId, 'message_received',   ['message' => 'New message from Dr. Alan Odhiambo regarding your attendance record. Please respond immediately.'], now()->subWeeks(3), now()->subWeeks(3)->addHours(4)],
            [$carolId, 'document_rejected',  ['message' => 'Your introduction letter has been rejected. Reason: Document appears to be a draft — final signed version required.'], now()->subWeeks(7), now()->subWeeks(6)],

            // Alan's notifications (supervisor)
            [$alanId, 'logbook_submitted',   ['message' => 'John Mwangi Doe submitted Week 9 logbook entry. Review it when possible.', 'student' => 'John Mwangi Doe', 'week' => 9], now()->subWeeks(1), null],
            [$alanId, 'flag_escalated',      ['message' => 'URGENT: Carol Muthoni\'s placement has been escalated to critical. Immediate intervention required.', 'severity' => 'critical'], now()->subWeeks(2), now()->subWeeks(2)->addHours(1)],

            // Jane's notifications (company supervisor)
            [$janeId, 'logbook_submitted',   ['message' => 'John Mwangi Doe submitted Week 10 logbook entry. Please review and provide feedback.', 'student' => 'John Mwangi Doe'], now()->subDays(1), null],
            [$janeId, 'field_visit_notice',  ['message' => 'Dr. Alan Odhiambo will conduct a field visit to your office on ' . now()->addWeeks(3)->format('M d, Y') . ' at 2:00 PM. Please ensure the student is available.'], now()->subDays(5), now()->subDays(4)],
        ];

        foreach ($notifications as [$userId, $type, $data, $createdAt, $readAt]) {
            DB::table('notifications')->insert([
                'id'             => \Illuminate\Support\Str::uuid(),
                'type'           => 'App\\Notifications\\' . str_replace('_', '', ucwords($type, '_')),
                'notifiable_type' => 'App\\Models\\User',
                'notifiable_id'  => $userId,
                'data'           => json_encode($data),
                'read_at'        => $readAt,
                'created_at'     => $createdAt,
                'updated_at'     => $createdAt,
            ]);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────
    private function createUser(string $name, string $email, int $roleId): \App\Models\User
    {
        $user = \App\Models\User::firstOrCreate(
            ['email' => $email],
            ['name' => $name, 'password' => $this->password, 'email_verified_at' => now()]
        );

        DB::table('user_roles')->insertOrIgnore(['user_id' => $user->id, 'role_id' => $roleId]);

        return $user;
    }

    private function createStudent(int $userId, int $institutionId, string $regNumber, string $dept, string $program, string $year, string $skills): \App\Models\Student
    {
        return \App\Models\Student::firstOrCreate(
            ['reg_number' => $regNumber],
            ['user_id' => $userId, 'institution_id' => $institutionId, 'department' => $dept, 'program' => $program, 'year_of_study' => $year, 'skills' => $skills]
        );
    }

    private function createApplication(int $studentId, int $slotId, string $status, ?string $coverLetter): void
    {
        DB::table('applications')->insertOrIgnore([
            'student_id'   => $studentId,
            'slot_id'      => $slotId,
            'status'       => $status,
            'cover_letter' => $coverLetter,
            'created_at'   => now()->subWeeks(12),
            'updated_at'   => now()->subWeeks(11),
        ]);
    }

    private function createPlacement(int $studentId, int $companyId, int $periodId, int $companySupId, int $acadSupId, string $status, ?float $academicGrade = null): \App\Models\Placement
    {
        return \App\Models\Placement::create([
            'student_id'            => $studentId,
            'company_id'            => $companyId,
            'period_id'             => $periodId,
            'company_supervisor_id' => $companySupId,
            'academic_supervisor_id' => $acadSupId,
            'status'                => $status,
            'academic_grade'        => $academicGrade,
        ]);
    }
}
