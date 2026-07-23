import { Routes, Route } from 'react-router-dom';
import StudentLayout from './pages/student/StudentLayout';
import StudentOverview from './pages/student/StudentOverview';
import StudentApplications from './pages/student/StudentApplications';
import StudentLogbook from './pages/student/StudentLogbook';
import StudentDocuments from './pages/student/StudentDocuments';
import StudentSmartMatch from './pages/student/StudentSmartMatch';
import CompanyEvaluation from './pages/student/CompanyEvaluation';
import StudentEvaluationResults from './pages/student/StudentEvaluationResults';
import CompanyLayout from './pages/company/CompanyLayout';
import CompanyOverview from './pages/company/CompanyOverview';
import CompanyApplicants from './pages/company/CompanyApplicants';
import CompanyEvaluationForm from './pages/company/CompanyEvaluationForm';
import SupervisorLayout from './pages/supervisor/SupervisorLayout';
import SupervisorOverview from './pages/supervisor/SupervisorOverview';
import SupervisorFieldVisits from './pages/supervisor/SupervisorFieldVisits';
import InstitutionLayout from './pages/institution/InstitutionLayout';
import InstitutionOverview from './pages/institution/InstitutionOverview';
import InstitutionStudents from './pages/institution/InstitutionStudents';
import InstitutionPartners from './pages/institution/InstitutionPartners';
import InstitutionLogbooks from './pages/institution/InstitutionLogbooks';
import InstitutionPlacements from './pages/institution/InstitutionPlacements';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import OverviewPage from './pages/superadmin/OverviewPage';
import InstitutionsPage from './pages/superadmin/InstitutionsPage';
import UsersPage from './pages/superadmin/UsersPage';
import AuditLogsPage from './pages/superadmin/AuditLogsPage';
import SystemHealthPage from './pages/superadmin/SystemHealthPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<StudentOverview />} />
        <Route path="logbook" element={<StudentLogbook />} />
        <Route path="applications" element={<StudentApplications />} />
        <Route path="documents" element={<StudentDocuments />} />
        <Route path="match" element={<StudentSmartMatch />} />
        <Route path="evaluation" element={<CompanyEvaluation />} />
        <Route path="results" element={<StudentEvaluationResults />} />
      </Route>
      <Route path="/company" element={<CompanyLayout />}>
        <Route index element={<CompanyOverview />} />
        <Route path="applicants" element={<CompanyApplicants />} />
        <Route path="evaluate" element={<CompanyEvaluationForm />} />
      </Route>
      <Route path="/supervisor" element={<SupervisorLayout />}>
        <Route index element={<SupervisorOverview />} />
        <Route path="visits" element={<SupervisorFieldVisits />} />
      </Route>
      <Route path="/institution" element={<InstitutionLayout />}>
        <Route index element={<InstitutionOverview />} />
        <Route path="students" element={<InstitutionStudents />} />
        <Route path="partners" element={<InstitutionPartners />} />
        <Route path="logbooks" element={<InstitutionLogbooks />} />
        <Route path="placements" element={<InstitutionPlacements />} />
      </Route>
      <Route path="/superadmin" element={<SuperAdminLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="institutions" element={<InstitutionsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="system" element={<SystemHealthPage />} />
      </Route>
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}

export default App;
