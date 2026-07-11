import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import api from './axios';
import StudentDashboard from './pages/StudentDashboard';
import StudentLogbook from './pages/StudentLogbook';
import StudentSmartMatch from './pages/StudentSmartMatch';
import StudentApplications from './pages/StudentApplications';
import StudentDocuments from './pages/StudentDocuments';
import StudentEvaluationResults from './pages/StudentEvaluationResults';
import CompanyEvaluation from './pages/CompanyEvaluation';
import CompanyEvaluationForm from './pages/CompanyEvaluationForm';
import CompanyDashboard from './pages/CompanyDashboard';
import CompanyApplicants from './pages/CompanyApplicants';
import SupervisorDashboard from './pages/SupervisorDashboard';
import SupervisorFieldVisits from './pages/SupervisorFieldVisits';
import InstitutionDashboard from './pages/InstitutionDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';

// --- Stub Components for Phase 1 ---

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [qrCodeSvg, setQrCodeSvg] = useState('');
  const [secret, setSecret] = useState('');
  const navigate = useNavigate();

  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.get('/sanctum/csrf-cookie'); // Initialize CSRF cookie
      const res = await api.post('/auth/login', { email, password });
      
      if (res.data['2fa_required']) {
        setTempToken(res.data.temp_token);
        setSetupRequired(res.data.setup_required);
        setStep(2);
        
        if (res.data.setup_required) {
          const setupRes = await api.post('/auth/2fa/setup', {}, {
            headers: { Authorization: `Bearer ${res.data.temp_token}` }
          });
          setQrCodeSvg(setupRes.data.qr_code_svg);
          setSecret(setupRes.data.secret);
        }
        return;
      }
      
      finishLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/2fa/verify', { otp }, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      finishLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    }
  };

  const finishLogin = (data) => {
    login(data);
    
    let route = '/student';
    if (data.role === 'company_supervisor' || data.role === 'company') route = '/company';
    if (data.role === 'institution_supervisor') route = '/supervisor';
    if (data.role === 'institution_admin') route = '/institution';
    if (data.role === 'super_admin') route = '/superadmin';
    
    navigate(route);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="bg-[var(--color-surface)] p-8 rounded-xl shadow-md border border-[var(--color-border)] w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-[var(--color-primary)]">
          {step === 1 ? 'Welcome to InduTrack KE' : 'Two-Factor Authentication'}
        </h2>
        
        {error && <div className="mb-4 text-red-500 text-sm text-center">{error}</div>}
        
        {step === 1 && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[var(--color-text-secondary)] text-sm font-medium mb-1">Email</label>
              <input 
                type="email" 
                className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[var(--color-text-secondary)] text-sm font-medium mb-1">Password</label>
              <input 
                type="password" 
                className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white font-medium py-2.5 rounded-lg transition-colors">
              Login
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerify2FA} className="space-y-4">
            {setupRequired && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-sm font-bold text-blue-800 mb-2">Set up 2FA</p>
                <p className="text-xs text-blue-600 mb-4">Scan this QR code with Google Authenticator.</p>
                <div className="flex justify-center mb-4 bg-white p-2 rounded inline-block" dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                <p className="text-xs text-gray-500">Or enter secret manually: <br/><strong className="font-mono text-sm tracking-widest">{secret}</strong></p>
              </div>
            )}
            <div>
              <label className="block text-[var(--color-text-secondary)] text-sm font-medium mb-1">Enter OTP</label>
              <input 
                type="text" 
                className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-center tracking-[0.5em] font-mono text-lg"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                required
              />
            </div>
            <button type="submit" className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white font-medium py-2.5 rounded-lg transition-colors">
              Verify & Login
            </button>
            <button type="button" onClick={() => { setStep(1); setOtp(''); setTempToken(''); }} className="w-full mt-2 text-sm text-[var(--color-text-secondary)] hover:text-gray-800">
              Cancel
            </button>
          </form>
        )}

        {step === 1 && (
          <p className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
            Don't have an account? <Link to="/register" className="text-[var(--color-accent)] hover:underline">Register here</Link>
          </p>
        )}
      </div>
    </div>
  );
}

function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', password_confirmation: '', role: 'student' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.get('/sanctum/csrf-cookie'); // CSRF protection
      await api.post('/auth/register', formData);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="bg-[var(--color-surface)] p-8 rounded-xl shadow-md border border-[var(--color-border)] w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-[var(--color-success)]">Registration Successful!</h2>
          <p className="mb-6 text-[var(--color-text-secondary)]">You can now login with your credentials.</p>
          <Link to="/login" className="inline-block bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="bg-[var(--color-surface)] p-8 rounded-xl shadow-md border border-[var(--color-border)] w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-[var(--color-primary)]">Create an Account</h2>
        {error && <div className="mb-4 text-red-500 text-sm text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[var(--color-text-secondary)] text-sm font-medium mb-1">Full Name</label>
            <input 
              type="text" 
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-[var(--color-text-secondary)] text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-[var(--color-text-secondary)] text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-[var(--color-text-secondary)] text-sm font-medium mb-1">Confirm Password</label>
            <input 
              type="password" 
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2"
              value={formData.password_confirmation}
              onChange={e => setFormData({...formData, password_confirmation: e.target.value})}
              required
            />
          </div>
          <button type="submit" className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white font-medium py-2.5 rounded-lg transition-colors">
            Register
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
          Already have an account? <Link to="/login" className="text-[var(--color-accent)] hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      {/* Sidebar Placeholder */}
      <div className="w-64 bg-[var(--color-primary-dark)] text-white p-6 flex flex-col">
        <h1 className="text-xl font-bold mb-8">InduTrack KE</h1>
        <nav className="flex-1 space-y-2">
          <a href="#" className="block px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white">Dashboard</a>
          <a href="#" className="block px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90">Profile</a>
          <a href="#" className="block px-4 py-2 rounded-lg hover:bg-[var(--color-primary)] text-white/90">Settings</a>
        </nav>
        <Link to="/login" className="block px-4 py-2 rounded-lg text-white/90 hover:bg-red-500/20 text-red-300">Logout</Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">Student Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Applications</h3>
            <p className="text-3xl font-bold text-[var(--color-primary)]">3</p>
          </div>
          <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Active Placement</h3>
            <p className="text-[var(--color-text-secondary)]">None</p>
          </div>
          <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Logbook Status</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Locked
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/student/logbook" element={<StudentLogbook />} />
      <Route path="/student/applications" element={<StudentApplications />} />
      <Route path="/student/documents" element={<StudentDocuments />} />
      <Route path="/student/match" element={<StudentSmartMatch />} />
      <Route path="/student/evaluation" element={<CompanyEvaluation />} />
      <Route path="/student/results" element={<StudentEvaluationResults />} />
      <Route path="/student/*" element={<StudentDashboard />} />
      <Route path="/company/evaluate" element={<CompanyEvaluationForm />} />
      <Route path="/company/applicants" element={<CompanyApplicants />} />
      <Route path="/company/*" element={<CompanyDashboard />} />
      <Route path="/supervisor/visits" element={<SupervisorFieldVisits />} />
      <Route path="/supervisor/*" element={<SupervisorDashboard />} />
      <Route path="/institution/*" element={<InstitutionDashboard />} />
      <Route path="/superadmin/*" element={<SuperAdminDashboard />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}

export default App;
