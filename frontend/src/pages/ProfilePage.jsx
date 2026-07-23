import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Mail, Upload, Tag, Phone, AlertCircle, CheckCircle, ArrowLeft, Shield } from 'lucide-react';
import api from '../axios';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { role, context, logout, fetchUser } = useAuth();

  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');

  // Forms
  const [personalForm, setPersonalForm] = useState({ name: '', phone: '' });
  const [companyForm, setCompanyForm] = useState({ description: '', website: '', phone: '', physical_address: '' });
  const [studentForm, setStudentForm] = useState({ skills: [], emergency_contact: { name: '', phone: '', relation: '' } });
  const [academicForm, setAcademicForm] = useState({ department: '' });

  const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [emailForm, setEmailForm] = useState({ email: '' });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const showFeedback = (msg, type = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const loadProfile = () => {
    api.get('/profile')
      .then(res => {
        const data = res.data;
        setProfile(data);
        setPersonalForm({ name: data.user?.name || '', phone: data.user?.phone || '' });
        setEmailForm({ email: data.user?.email || '' });

        if (data.student) {
          const skills = Array.isArray(data.student.skills) ? data.student.skills : (data.student.skills ? data.student.skills.split(',').map(s => s.trim()) : []);
          const ec = data.student.emergency_contact ? (typeof data.student.emergency_contact === 'string' ? JSON.parse(data.student.emergency_contact) : data.student.emergency_contact) : { name: '', phone: '', relation: '' };
          setStudentForm({ skills, emergency_contact: ec });
        }
        if (data.company) {
          setCompanyForm({ description: data.company.description || '', website: data.company.website || '', phone: data.company.phone || '', physical_address: data.company.physical_address || '' });
        }
        if (data.academic_supervisor) {
          setAcademicForm({ department: data.academic_supervisor.department || '' });
        }
      })
      .catch(() => showFeedback('Failed to load profile.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handlePersonalSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let payload = { ...personalForm };
      if (role === 'Student') payload.student = studentForm;
      if (role === 'Company') payload.company = companyForm;
      if (role === 'Academic Supervisor') payload.academic_supervisor = academicForm;

      await api.put('/profile', payload);
      showFeedback('Profile updated successfully!');
      fetchUser();
      loadProfile();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally { setSaving(false); }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/profile/password', passwordForm);
      showFeedback('Password updated successfully!');
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to update password.', 'error');
    } finally { setSaving(false); }
  };

  const handleEmailSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/profile/email', emailForm);
      showFeedback('Email updated. Please check your inbox for verification link.');
      fetchUser();
      loadProfile();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to update email.', 'error');
    } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('photo', file);
    setSaving(true);
    try {
      await api.post('/profile/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showFeedback('Photo uploaded successfully!');
      fetchUser();
      loadProfile();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const msg = errors ? Object.values(errors).flat().join(' ') : 'Upload failed. Max 2MB, JPG/PNG only.';
      showFeedback(msg, 'error');
    } finally { setSaving(false); }
  };

  const handleCvUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('cv', file);
    setSaving(true);
    try {
      await api.post('/profile/cv', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showFeedback('CV uploaded successfully!');
    } catch (err) {
      showFeedback('Upload failed. Max 5MB, PDF only.', 'error');
    } finally { setSaving(false); }
  };

  const handleTranscriptUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('transcript', file);
    setSaving(true);
    try {
      await api.post('/profile/transcript', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showFeedback('Transcript uploaded successfully!');
    } catch (err) {
      showFeedback('Upload failed. Max 5MB, PDF only.', 'error');
    } finally { setSaving(false); }
  };

  const addSkill = (skill) => {
    const trimmed = skill.trim();
    if (trimmed && !studentForm.skills.includes(trimmed) && studentForm.skills.length < 20) {
      setStudentForm(f => ({ ...f, skills: [...f.skills, trimmed] }));
    }
  };

  const removeSkill = (skill) => {
    setStudentForm(f => ({ ...f, skills: f.skills.filter(s => s !== skill) }));
  };

  const getBackLink = () => {
    if (role === 'student') return '/student';
    if (role === 'company' || role === 'company_supervisor') return '/company';
    if (role === 'institution_supervisor') return '/supervisor';
    if (role === 'institution_admin') return '/institution';
    if (role === 'super_admin') return '/superadmin';
    return '/';
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: <User size={16} /> },
    { id: 'email', label: 'Email', icon: <Mail size={16} /> },
    { id: 'password', label: 'Password', icon: <Lock size={16} /> },
    ...(role === 'student' ? [{ id: 'documents', label: 'CV & Docs', icon: <Upload size={16} /> }] : []),
  ];

  if (loading) return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
      <div className="text-[var(--color-text-secondary)]">Loading profile...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to={getBackLink()} className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition">
            <ArrowLeft size={16} /> Back
          </Link>
          <h1 className="text-xl font-bold text-[var(--color-primary-dark)]">My Profile</h1>
        </div>
        <span className="text-sm text-[var(--color-text-secondary)] capitalize">{role?.replace('_', ' ')}</span>
      </header>

      <div className="max-w-3xl mx-auto p-8">

        {/* Feedback Banner */}
        {feedback.message && (
          <div className={`mb-6 flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-medium shadow-sm animate-pulse ${feedback.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
            {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            {feedback.message}
          </div>
        )}

        {/* Profile Photo Card */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 mb-6 flex items-center gap-6 shadow-sm">
          <div className="relative group">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
              {profile?.user?.profile_photo_url ? (
                <img src={profile.user.profile_photo_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                profile?.user?.name?.charAt(0)?.toUpperCase() || '?'
              )}
            </div>
            <label className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
              <Upload size={20} className="text-white" />
              <input type="file" accept="image/jpg,image/jpeg,image/png" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{profile?.user?.name}</h2>
            <p className="text-[var(--color-text-secondary)] text-sm">{profile?.user?.email}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Hover over avatar to change photo (JPG/PNG, max 2MB)</p>
          </div>
          {profile?.user?.email_verified_at === null && (
            <div className="ml-auto flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs px-3 py-1.5 rounded-full">
              <AlertCircle size={14} /> Email unverified
            </div>
          )}
        </div>

        {/* Locked Fields Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-6 flex items-start gap-3 text-sm text-blue-700">
          <Shield size={16} className="mt-0.5 flex-shrink-0" />
          <span>Some fields like <strong>Registration Number</strong>, <strong>Institution</strong>, and <strong>Role</strong> are managed by your administrator and cannot be changed here.</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--color-border)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${activeTab === tab.id ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── PERSONAL INFO TAB ── */}
        {activeTab === 'personal' && (
          <form onSubmit={handlePersonalSave} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-[var(--color-text-primary)] text-lg">Personal Information</h3>

            {/* Name — all roles */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Full Name</label>
              <input type="text" value={personalForm.name} onChange={e => setPersonalForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                minLength={3} maxLength={100} required />
            </div>

            {/* Phone — all except super_admin */}
            {role !== 'super_admin' && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  <span className="flex items-center gap-2"><Phone size={14} /> Phone Number</span>
                </label>
                <input type="tel" value={personalForm.phone} onChange={e => setPersonalForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="+254XXXXXXXXX" pattern="\+254[0-9]{9}" />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">Format: +254XXXXXXXXX</p>
              </div>
            )}

            {/* Company-specific fields */}
            {(role === 'company' || role === 'company_supervisor') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Company Description</label>
                  <textarea value={companyForm.description} onChange={e => setCompanyForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 h-28 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Website</label>
                  <input type="url" value={companyForm.website} onChange={e => setCompanyForm(f => ({ ...f, website: e.target.value }))}
                    className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="https://example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Physical Address</label>
                  <input type="text" value={companyForm.physical_address} onChange={e => setCompanyForm(f => ({ ...f, physical_address: e.target.value }))}
                    className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                </div>
              </>
            )}

            {/* Academic Supervisor department */}
            {role === 'institution_supervisor' && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Department / Faculty</label>
                <input type="text" value={academicForm.department} onChange={e => setAcademicForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="e.g. Department of ICT" />
              </div>
            )}

            {/* Student-specific fields: Skills */}
            {role === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    <span className="flex items-center gap-2"><Tag size={14} /> Skills (max 20)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2 p-3 border border-[var(--color-border)] rounded-lg min-h-12 bg-[var(--color-bg)]">
                    {studentForm.skills.map(skill => (
                      <span key={skill} className="flex items-center gap-1 bg-[var(--color-primary)] text-white text-xs px-2.5 py-1 rounded-full">
                        {skill}
                        <button type="button" onClick={() => removeSkill(skill)} className="ml-1 hover:text-red-200 font-bold leading-none">×</button>
                      </span>
                    ))}
                  </div>
                  <input type="text" placeholder="Type a skill and press Enter (e.g. React, PHP, AutoCAD)"
                    className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(e.target.value); e.target.value = ''; } }} />
                </div>

                {/* Emergency Contact */}
                <div className="border border-[var(--color-border)] rounded-xl p-4 space-y-3 bg-[var(--color-bg)]">
                  <h4 className="font-semibold text-[var(--color-text-primary)] text-sm">Emergency Contact</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Name</label>
                      <input type="text" value={studentForm.emergency_contact.name}
                        onChange={e => setStudentForm(f => ({ ...f, emergency_contact: { ...f.emergency_contact, name: e.target.value } }))}
                        className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" maxLength={100} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Relation</label>
                      <input type="text" value={studentForm.emergency_contact.relation}
                        onChange={e => setStudentForm(f => ({ ...f, emergency_contact: { ...f.emergency_contact, relation: e.target.value } }))}
                        className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder="e.g. Father, Mother" maxLength={50} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Phone</label>
                    <input type="tel" value={studentForm.emergency_contact.phone}
                      onChange={e => setStudentForm(f => ({ ...f, emergency_contact: { ...f.emergency_contact, phone: e.target.value } }))}
                      className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      placeholder="+254XXXXXXXXX" pattern="\+254[0-9]{9}" />
                  </div>
                </div>
              </>
            )}

            <button type="submit" disabled={saving}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}

        {/* ── EMAIL TAB ── */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailSave} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-[var(--color-text-primary)] text-lg">Change Email Address</h3>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 flex gap-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>Changing your email will require re-verification. A verification link will be sent to the new address and your account will be temporarily marked as unverified.</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">New Email Address</label>
              <input type="email" value={emailForm.email} onChange={e => setEmailForm({ email: e.target.value })}
                className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" required />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
              {saving ? 'Saving...' : 'Update Email'}
            </button>
          </form>
        )}

        {/* ── PASSWORD TAB ── */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSave} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-[var(--color-text-primary)] text-lg">Change Password</h3>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Current Password</label>
              <input type="password" value={passwordForm.current_password} onChange={e => setPasswordForm(f => ({ ...f, current_password: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">New Password</label>
              <input type="password" value={passwordForm.password} onChange={e => setPasswordForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                minLength={8} required />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">Minimum 8 characters. Must differ from current password.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Confirm New Password</label>
              <input type="password" value={passwordForm.password_confirmation} onChange={e => setPasswordForm(f => ({ ...f, password_confirmation: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" required />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {/* ── CV & DOCS TAB (student only) ── */}
        {activeTab === 'documents' && role === 'student' && (
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-[var(--color-text-primary)] text-lg">CV & Transcript</h3>

            {/* CV Upload */}
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-6 text-center hover:border-[var(--color-primary)] transition">
              <Upload size={28} className="mx-auto text-[var(--color-primary)] mb-2" />
              <p className="font-semibold text-[var(--color-text-primary)] mb-1">Upload CV</p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">PDF only, max 5MB. Replaces your current CV.</p>
              {profile?.student?.cv_path && (
                <p className="text-xs text-green-600 mb-3">✓ CV on file</p>
              )}
              <label className="inline-block cursor-pointer bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white text-sm px-5 py-2 rounded-lg transition">
                Choose CV (PDF)
                <input type="file" accept="application/pdf" className="hidden" onChange={handleCvUpload} />
              </label>
            </div>

            {/* Transcript Upload */}
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-6 text-center hover:border-[var(--color-primary)] transition">
              <Upload size={28} className="mx-auto text-[var(--color-accent)] mb-2" />
              <p className="font-semibold text-[var(--color-text-primary)] mb-1">Upload Transcript</p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">PDF only, max 5MB. Replaces your current transcript.</p>
              {profile?.student?.transcript_path && (
                <p className="text-xs text-green-600 mb-3">✓ Transcript on file</p>
              )}
              <label className="inline-block cursor-pointer bg-[var(--color-accent)] hover:opacity-90 text-white text-sm px-5 py-2 rounded-lg transition">
                Choose Transcript (PDF)
                <input type="file" accept="application/pdf" className="hidden" onChange={handleTranscriptUpload} />
              </label>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
