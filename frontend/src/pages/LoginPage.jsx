import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../axios';
import { useAuth } from '../context/AuthContext';

const bgPatternStyle = {
  backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
};

const loginCardShadowStyle = {
  boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 10px 15px -3px rgba(0,0,0,0.1)',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [qrCodeSvg, setQrCodeSvg] = useState('');
  const [secret, setSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [googleNotice, setGoogleNotice] = useState(false);
  const navigate = useNavigate();

  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.get('/sanctum/csrf-cookie', { baseURL: 'http://localhost:8000' }); // Initialize CSRF cookie
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
    <div className="bg-background font-body-md text-on-background selection:bg-primary-subtle selection:text-primary min-h-screen flex">
      {/* Split Screen Container */}
      <main className="w-full min-h-screen flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Branding & Atmospheric Visuals */}
        <section className="relative md:w-[60%] bg-[#064D37] flex flex-col justify-between p-8 md:p-16 overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={bgPatternStyle}></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-container/20 blur-[120px] rounded-full -mr-48 -mt-48"></div>
          {/* Brand Logo */}
          <div className="relative z-10 flex items-center gap-2">
            <span className="font-headline-md text-headline-md text-white font-extrabold tracking-tight">InduTrack <span className="text-[#F59E0B]">KE</span></span>
          </div>
          {/* Central Visual Content */}
          <div className="relative z-10 space-y-12">
            <div className="max-w-md">
              <h1 className="font-display-lg text-display-lg text-white mb-6 leading-tight">
                Bridging the gap between education and industry.
              </h1>
              <p className="font-body-lg text-body-lg text-white/80">
                The ultimate platform for streamlining internships, industrial attachments, and workforce development across Kenya.
              </p>
            </div>
            {/* High Quality Atmospheric Image */}
            <div className="relative rounded-xl overflow-hidden aspect-[4/3] group" style={loginCardShadowStyle}>
              <div className="absolute inset-0 bg-gradient-to-t from-[#064D37]/80 via-transparent to-transparent z-10"></div>
              <img
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt="A modern Kenyan industrial lab where an engineer and a university student collaborate over a digital blueprint."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJq5CajgOEbfC1ZmcpNEZ1otnQ9eiSrkX4_gKJFZVIyzObFoSVuWYcw5pFe-TviUlIRyI5oOKSG9ONnYhvsCR8flgN5G6MO2_PRVWJF0dZJbwUU8Bvkk2MKCUsDSU_uKXSt0NeeiXkP2z28UC6_WeJmcX6o4SUC3F8SwWjWZsOJEvNx0_6Q371JCUEc57BklJ-KzHUz5fGo-Ui7kvUHA-c5Cd8QA6Q3gY_-d7cyKVrtu_QuAcq79k9TRpmemR4ezwfd8umDqjAIXOa"
              />
              <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3">
                <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg">
                  <span className="material-symbols-outlined text-white">handshake</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Industry-First Integration</p>
                  <p className="text-white/60 text-xs">Standardized by TVET &amp; University Bodies</p>
                </div>
              </div>
            </div>
          </div>
          {/* Footer Branding */}
          <div className="relative z-10 pt-8 flex items-center justify-between border-t border-white/10">
            <p className="font-label-caps text-label-caps text-white/50 uppercase tracking-widest">The Institutional Portal</p>
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-white/30 text-[20px]">verified</span>
              <span className="material-symbols-outlined text-white/30 text-[20px]">shield</span>
            </div>
          </div>
        </section>
        {/* Right Side: Login Form */}
        <section className="md:w-[40%] bg-surface flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-[440px] space-y-10">
            {step === 1 ? (
              <>
                {/* Form Header */}
                <div className="space-y-3">
                  <h2 className="font-headline-md text-headline-md text-text-main">Sign In</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">Welcome back! Please enter your details.</p>
                </div>
                {error && (
                  <div className="font-body-sm text-body-sm text-error text-center" role="alert">{error}</div>
                )}
                {/* Social Login */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setGoogleNotice(true)}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-border rounded-lg font-label-caps text-label-caps text-text-main hover:bg-surface-container-low transition-colors group"
                  >
                    <img alt="Google" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpUeGFKZiga6djncIk8RqgSlpxiM4pJg8BXOhdSSpOQBSjhWyicwuhr_ljujHRT2DV2588MgzSIHkbCKmM7qUWm7dE_cNoTycvx6yCOi1EG53tH5D0m9s27hSIcko_cWn9zMhLHdZrUELCgrFPWOAeHUkNHP5fP0QvTNpuEHTsIhFRnTRPOm3_o_xSaBH1qx6C4yclk5mZH7bcLeLE4Kx_IXlNzU3AlSnbI6ynzIFfGVq98TI8EIvz8yArmgax5LtppG9gBrQZVDfL" />
                    Sign in with Google
                  </button>
                  {googleNotice && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant text-center">Coming soon</p>
                  )}
                </div>
                <div className="relative flex items-center">
                  <div className="flex-grow border-t border-border"></div>
                  <span className="flex-shrink mx-4 font-label-caps text-label-caps text-outline-variant uppercase">Or with email</span>
                  <div className="flex-grow border-t border-border"></div>
                </div>
                {/* Form */}
                <form className="space-y-6" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <label className="block font-label-caps text-label-caps text-on-surface-variant" htmlFor="email">Email Address</label>
                    <div className="relative group">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">mail</span>
                      <input
                        className="w-full pl-10 pr-4 py-3 bg-white border border-border rounded-lg text-body-md focus:ring-2 focus:ring-primary-subtle focus:border-primary-container outline-none transition-all placeholder:text-outline-variant"
                        id="email"
                        placeholder="name@institution.ac.ke"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block font-label-caps text-label-caps text-on-surface-variant" htmlFor="password">Password</label>
                    <div className="relative group">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">lock</span>
                      <input
                        className="w-full pl-10 pr-10 py-3 bg-white border border-border rounded-lg text-body-md focus:ring-2 focus:ring-primary-subtle focus:border-primary-container outline-none transition-all placeholder:text-outline-variant"
                        id="password"
                        placeholder="••••••••"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline hover:text-text-main transition-colors"
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center w-5 h-5">
                        <input
                          className="peer appearance-none w-5 h-5 border border-border rounded focus:ring-2 focus:ring-primary-subtle checked:bg-primary-container checked:border-primary-container transition-all"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span className="material-symbols-outlined text-white text-[16px] absolute scale-0 peer-checked:scale-100 transition-transform pointer-events-none">check</span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-text-main transition-colors">Remember me</span>
                    </label>
                    <a className="font-label-caps text-label-caps text-primary-container hover:text-primary-hover transition-colors" href="#">Forgot password?</a>
                  </div>
                  {/* CTA */}
                  <button className="w-full py-4 bg-[#F59E0B] hover:bg-[#D97706] text-[#064D37] font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2" type="submit">
                    <span className="font-label-caps text-label-caps text-[14px]">Sign In</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                </form>
                {/* Form Footer */}
                <div className="pt-6 border-t border-border text-center">
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Don't have an account?{' '}
                    <Link className="font-bold text-[#064D37] hover:underline" to="/register">Register here.</Link>
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* 2FA Header */}
                <div className="space-y-3">
                  <h2 className="font-headline-md text-headline-md text-text-main">Two-Factor Authentication</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {setupRequired
                      ? 'Scan the QR code with Google Authenticator, then enter the 6-digit code.'
                      : 'Enter the 6-digit code from your authenticator app.'}
                  </p>
                </div>
                {error && (
                  <div className="font-body-sm text-body-sm text-error text-center" role="alert">{error}</div>
                )}
                <form className="space-y-6" onSubmit={handleVerify2FA}>
                  {setupRequired && (
                    <div className="p-6 bg-surface-container-low border border-border rounded-xl text-center space-y-4">
                      <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Set up 2FA</p>
                      <div className="flex justify-center">
                        <div className="bg-white p-2 rounded-lg border border-border" dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Or enter secret manually:<br />
                        <strong className="font-mono text-sm tracking-widest text-text-main">{secret}</strong>
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="block font-label-caps text-label-caps text-on-surface-variant" htmlFor="otp">Enter OTP</label>
                    <div className="relative group">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">pin</span>
                      <input
                        className="w-full pl-10 pr-4 py-3 bg-white border border-border rounded-lg text-body-md text-center tracking-[0.5em] font-mono focus:ring-2 focus:ring-primary-subtle focus:border-primary-container outline-none transition-all placeholder:text-outline-variant"
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>
                  <button className="w-full py-4 bg-[#F59E0B] hover:bg-[#D97706] text-[#064D37] font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2" type="submit">
                    <span className="font-label-caps text-label-caps text-[14px]">Verify &amp; Login</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setOtp(''); setTempToken(''); setError(''); }}
                    className="w-full font-body-sm text-body-sm text-on-surface-variant hover:text-text-main transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
