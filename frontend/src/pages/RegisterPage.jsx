import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../axios';

const focusRing =
  'outline-none focus:ring-2 focus:ring-primary-subtle focus:border-primary-container';

const meshStyle = {
  backgroundImage:
    'radial-gradient(at 0% 0%, rgba(10, 110, 79, 0.15) 0, transparent 50%), radial-gradient(at 50% 0%, rgba(245, 158, 11, 0.05) 0, transparent 50%)',
};

function BrandPanel() {
  return (
    <section className="relative hidden md:flex md:w-5/12 lg:w-1/2 bg-[#064D37] p-12 flex-col justify-between text-white overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full object-cover opacity-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAJRjE68VblmX0vcno_gwAq60-rZQRmn99OSX3Pljix6nuXQXsqbl_1aPF5ZJpagSfpCi1KgIdcjp-tbTH5q1xvAaGo_0gHvUJMU8Uiu6Cei5wPxc6eumKJfLJx9-oXiFXPNij4eoXm9rcm3XumhlSI_DNL2cdoxxy7DRJi4wbJK_z18HgPHhmIZ2sfL5GFJ4FZ7b5MajervmFjXAXAQVTtgNXQp2RGKtckxkuy9d8KV34apFe-WNUjL9n5oJw58ozlvzNE6vYY96Y7')",
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#064D37] via-[#064D37]/90 to-transparent"></div>
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-16">
          <div className="w-12 h-12 bg-[#F59E0B] rounded-lg flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-[#064D37] !text-3xl font-bold">domain</span>
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm font-extrabold tracking-tight">InduTrack KE</h1>
            <p className="font-label-caps text-label-caps text-primary-fixed opacity-80 uppercase">Institutional Portal</p>
          </div>
        </div>
        <div className="max-w-md space-y-6">
          <h2 className="font-display-lg text-display-lg leading-tight">Bridging Academia and Industrial Excellence</h2>
          <p className="text-white/80 font-body-lg">
            Join the unified platform connecting Kenya's premier institutions with leading industry partners to
            streamline student placements and professional development.
          </p>
        </div>
      </div>
      <div className="relative z-10 mt-auto">
        <div className="flex gap-8 items-center border-t border-white/10 pt-8">
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md text-[#F59E0B]">500+</span>
            <span className="font-label-caps text-label-caps opacity-60">Partnered Institutions</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md text-[#F59E0B]">12k+</span>
            <span className="font-label-caps text-label-caps opacity-60">Active Logbooks</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md text-[#F59E0B]">98%</span>
            <span className="font-label-caps text-label-caps opacity-60">Success Rate</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterMeta() {
  return (
    <div className="absolute bottom-8 text-center md:text-left w-full px-8 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
      <span className="font-label-caps text-label-caps uppercase">© 2024 InduTrack KE. All rights reserved.</span>
      <div className="flex gap-6 font-label-caps text-label-caps uppercase">
        <a className="hover:text-primary transition-colors" href="#">Support</a>
        <a className="hover:text-primary transition-colors" href="#">Contact</a>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', password_confirmation: '', role: 'student' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.get('http://localhost:8000/sanctum/csrf-cookie'); // CSRF protection
      await api.post('/auth/register', formData);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-background text-on-surface antialiased">
        <BrandPanel />
        <section className="flex-1 bg-surface flex items-center justify-center p-6 md:p-12 lg:p-24 relative" style={meshStyle}>
          <div className="w-full max-w-[440px] space-y-8 text-center">
            <span className="material-symbols-outlined text-primary !text-6xl">check_circle</span>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-background mb-2">Registration Successful!</h2>
              <p className="text-on-surface-variant font-body-md">You can now login with your credentials.</p>
            </div>
            <Link
              to="/login"
              className="w-full bg-[#F59E0B] hover:bg-accent-hover text-on-secondary-fixed font-bold py-4 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group transform active:scale-[0.98]"
            >
              Go to Login
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>
          <FooterMeta />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-background text-on-surface antialiased">
      {/* Left Side: Brand & Messaging */}
      <BrandPanel />
      {/* Right Side: Registration Form */}
      <section className="flex-1 bg-surface flex items-center justify-center p-6 md:p-12 lg:p-24 relative" style={meshStyle}>
        {/* Mobile Header Only */}
        <div className="md:hidden absolute top-8 left-8 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary !text-2xl">domain</span>
          <span className="font-bold text-primary font-headline-sm">InduTrack KE</span>
        </div>
        <div className="w-full max-w-[440px] space-y-8">
          <div className="text-center md:text-left">
            <h2 className="font-headline-md text-headline-md text-on-background mb-2">Create an Account</h2>
            <p className="text-on-surface-variant font-body-md">Register your credentials to access the portal.</p>
          </div>
          {error && <div className="font-body-sm text-error text-center md:text-left">{error}</div>}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="space-y-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="fullname">Full Name</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">person</span>
                <input
                  className={`w-full pl-10 pr-4 py-3 bg-white border border-border rounded-lg ${focusRing} transition-all placeholder:text-outline-variant font-body-md`}
                  id="fullname"
                  name="fullname"
                  placeholder="Enter your full name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>
            {/* Email */}
            <div className="space-y-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="email">Institutional Email</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">mail</span>
                <input
                  className={`w-full pl-10 pr-4 py-3 bg-white border border-border rounded-lg ${focusRing} transition-all placeholder:text-outline-variant font-body-md`}
                  id="email"
                  name="email"
                  placeholder="name@institution.ac.ke"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>
            {/* Password Grid */}
            <div className="grid grid-cols-1 gap-5">
              {/* Password */}
              <div className="space-y-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="password">Password</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">lock</span>
                  <input
                    className={`w-full pl-10 pr-12 py-3 bg-white border border-border rounded-lg ${focusRing} transition-all placeholder:text-outline-variant font-body-md`}
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="confirm_password">Confirm Password</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">shield</span>
                  <input
                    className={`w-full pl-10 pr-12 py-3 bg-white border border-border rounded-lg ${focusRing} transition-all placeholder:text-outline-variant font-body-md`}
                    id="confirm_password"
                    name="confirm_password"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.password_confirmation}
                    onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2">
              <input className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary" id="terms" type="checkbox" required />
              <label className="font-body-sm text-on-surface-variant" htmlFor="terms">
                I agree to the <a className="text-primary font-semibold hover:underline" href="#">Terms of Service</a> and{' '}
                <a className="text-primary font-semibold hover:underline" href="#">Privacy Policy</a> of InduTrack KE.
              </label>
            </div>
            {/* CTA */}
            <button
              className="w-full bg-[#F59E0B] hover:bg-accent-hover text-on-secondary-fixed font-bold py-4 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group transform active:scale-[0.98]"
              type="submit"
            >
              Register
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </form>
          <div className="pt-6 border-t border-border text-center">
            <p className="font-body-md text-on-surface-variant">
              Already have an account?
              <Link className="text-primary font-bold hover:underline ml-1" to="/login">Login here</Link>
            </p>
          </div>
        </div>
        {/* Footer Meta */}
        <FooterMeta />
      </section>
    </main>
  );
}
