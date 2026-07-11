import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Settings, Megaphone, BarChart, Building, Users, MessageSquare } from 'lucide-react';
import api from '../axios';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [users, setUsers] = useState({ data: [] });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [instForm, setInstForm] = useState({ name: '', domain: '', contact_email: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [userFilter, setUserFilter] = useState({ role: '', search: '' });

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const [dashRes, statsRes] = await Promise.all([
          api.get('/superadmin/dashboard'),
          api.get('/superadmin/system-stats'),
        ]);
        setMetrics(dashRes.data);
        setSystemStats(statsRes.data);
      } else if (activeTab === 'institutions') {
        const res = await api.get('/superadmin/institutions');
        setInstitutions(res.data);
      } else if (activeTab === 'users') {
        const params = {};
        if (userFilter.role) params.role = userFilter.role;
        if (userFilter.search) params.search = userFilter.search;
        const res = await api.get('/superadmin/users', { params });
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const handleAddInstitution = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/institutions', instForm);
      setShowInstitutionModal(false);
      setInstForm({ name: '', domain: '', contact_email: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add institution');
    }
  };

  const toggleInstitution = async (id) => {
    try {
      await api.put(`/superadmin/institutions/${id}/toggle`);
      fetchData();
    } catch (err) {
      alert('Failed to toggle institution');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/users', userForm);
      setShowUserModal(false);
      setUserForm({ name: '', email: '', password: '', role: 'student' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user');
    }
  };

  const disableUser = async (id) => {
    if (!window.confirm('Disable this user? Their sessions will be revoked.')) return;
    try {
      await api.delete(`/superadmin/users/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to disable user');
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/superadmin/broadcast', { message: broadcastMsg });
      alert(res.data.message);
      setShowBroadcastModal(false);
      setBroadcastMsg('');
    } catch (err) {
      alert('Failed to broadcast');
    }
  };

  const tabs = [
    { id: 'dashboard', label: <span className="flex items-center gap-2"><BarChart size={16} /> Dashboard</span> },
    { id: 'institutions', label: <span className="flex items-center gap-2"><Building size={16} /> Institutions</span> },
    { id: 'users', label: <span className="flex items-center gap-2"><Users size={16} /> Users</span> },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col text-white">
      {/* Header */}
      <header className="bg-[#1E293B] border-b border-gray-700 h-16 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings size={24} /> Super Admin
          </h1>
          <nav className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.id ? 'bg-white text-[#0F172A]' : 'text-gray-300 hover:bg-gray-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-400">{localStorage.getItem('context')}</span>
          <Link to="/messages" className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1">
            <MessageSquare size={16} /> Messages
          </Link>
          <button onClick={() => setShowBroadcastModal(true)} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1.5 rounded-lg text-sm font-bold transition">
            <Megaphone size={16} /> Broadcast
          </button>
          <button onClick={handleLogout} className="text-sm font-medium text-red-400 hover:text-red-300">Logout</button>
        </div>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        {loading && <p className="text-gray-400">Loading...</p>}

        {/* ─── Dashboard Tab ──────────────────────────────────────────────── */}
        {!loading && activeTab === 'dashboard' && metrics && (
          <div>
            <h2 className="text-2xl font-bold mb-6">System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { label: 'Institutions', value: metrics.totalInstitutions, color: '#818CF8' },
                { label: 'Active', value: metrics.activeInstitutions, color: '#34D399' },
                { label: 'Total Users', value: metrics.totalUsers, color: '#60A5FA' },
                { label: 'Students', value: metrics.totalStudents, color: '#F472B6' },
                { label: 'Companies', value: metrics.totalCompanies, color: '#FBBF24' },
                { label: 'Placements', value: metrics.totalPlacements, color: '#A78BFA' },
              ].map(card => (
                <div key={card.label} className="bg-[#1E293B] p-5 rounded-xl border border-gray-700">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{card.label}</p>
                  <p className="text-3xl font-extrabold mt-2" style={{ color: card.color }}>{card.value}</p>
                </div>
              ))}
            </div>

            {systemStats && (
              <div>
                <h3 className="text-lg font-bold mb-4 text-gray-300">System Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#1E293B] p-5 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase">Storage Used</p>
                    <p className="text-xl font-bold text-blue-400 mt-1">{systemStats.storage_used}</p>
                  </div>
                  <div className="bg-[#1E293B] p-5 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase">Total Documents</p>
                    <p className="text-xl font-bold text-green-400 mt-1">{systemStats.total_documents}</p>
                  </div>
                  <div className="bg-[#1E293B] p-5 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase">Total Logbook Entries</p>
                    <p className="text-xl font-bold text-purple-400 mt-1">{systemStats.total_logbook_entries}</p>
                  </div>
                  <div className="bg-[#1E293B] p-5 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase">Total Evaluations</p>
                    <p className="text-xl font-bold text-yellow-400 mt-1">{systemStats.total_evaluations}</p>
                  </div>
                  <div className="bg-[#1E293B] p-5 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase">Field Visits</p>
                    <p className="text-xl font-bold text-pink-400 mt-1">{systemStats.total_field_visits}</p>
                  </div>
                  <div className="bg-[#1E293B] p-5 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase">Messages</p>
                    <p className="text-xl font-bold text-indigo-400 mt-1">{systemStats.total_messages}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Institutions Tab ───────────────────────────────────────────── */}
        {!loading && activeTab === 'institutions' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Institutions</h2>
              <button onClick={() => setShowInstitutionModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">+ Add Institution</button>
            </div>
            <div className="bg-[#1E293B] rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#334155] border-b border-gray-600">
                  <tr><th className="p-4">Name</th><th className="p-4">Domain</th><th className="p-4">Contact</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr>
                </thead>
                <tbody>
                  {institutions.map(inst => (
                    <tr key={inst.id} className="border-b border-gray-700">
                      <td className="p-4 font-medium">{inst.name}</td>
                      <td className="p-4 text-gray-400">{inst.domain || '—'}</td>
                      <td className="p-4 text-gray-400">{inst.contact_email || '—'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${inst.is_active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                          {inst.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button onClick={() => toggleInstitution(inst.id)} className={`px-3 py-1 rounded text-xs font-medium ${inst.is_active ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'}`}>
                          {inst.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {institutions.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">No institutions found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Users Tab ──────────────────────────────────────────────────── */}
        {!loading && activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">User Management</h2>
              <button onClick={() => setShowUserModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">+ Create User</button>
            </div>

            <div className="flex gap-3 mb-4">
              <select value={userFilter.role} onChange={e => setUserFilter({...userFilter, role: e.target.value})} className="bg-[#1E293B] text-white border border-gray-600 rounded-lg px-3 py-2 text-sm">
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="company_supervisor">Company Supervisor</option>
                <option value="institution_supervisor">Academic Supervisor</option>
                <option value="institution_admin">Institution Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <input type="text" placeholder="Search by name or email..." value={userFilter.search} onChange={e => setUserFilter({...userFilter, search: e.target.value})} className="bg-[#1E293B] text-white border border-gray-600 rounded-lg px-3 py-2 text-sm flex-1" />
              <button onClick={fetchData} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg text-sm font-medium">Filter</button>
            </div>

            <div className="bg-[#1E293B] rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#334155] border-b border-gray-600">
                  <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Joined</th><th className="p-4">Actions</th></tr>
                </thead>
                <tbody>
                  {(users.data || []).map(user => (
                    <tr key={user.id} className="border-b border-gray-700">
                      <td className="p-4 font-medium">{user.name}</td>
                      <td className="p-4 text-gray-400">{user.email}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-indigo-900/50 text-indigo-300 rounded-full text-xs font-bold uppercase">
                          {user.roles?.[0]?.name || '—'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        <button onClick={() => disableUser(user.id)} className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-xs font-medium">Disable</button>
                      </td>
                    </tr>
                  ))}
                  {(users.data || []).length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">No users found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Add Institution Modal ─────────────────────────────────────────── */}
      {showInstitutionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1E293B] rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-600">
            <h3 className="text-xl font-bold mb-4">Add Institution</h3>
            <form onSubmit={handleAddInstitution} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                <input type="text" className="w-full bg-[#334155] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" value={instForm.name} onChange={e => setInstForm({...instForm, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Domain</label>
                <input type="text" className="w-full bg-[#334155] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" value={instForm.domain} onChange={e => setInstForm({...instForm, domain: e.target.value})} placeholder="e.g. uonbi.ac.ke" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contact Email</label>
                <input type="email" className="w-full bg-[#334155] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" value={instForm.contact_email} onChange={e => setInstForm({...instForm, contact_email: e.target.value})} />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowInstitutionModal(false)} className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Create User Modal ─────────────────────────────────────────────── */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1E293B] rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-600">
            <h3 className="text-xl font-bold mb-4">Create User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                <input type="text" className="w-full bg-[#334155] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                <input type="email" className="w-full bg-[#334155] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password *</label>
                <input type="password" className="w-full bg-[#334155] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Role *</label>
                <select className="w-full bg-[#334155] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                  <option value="student">Student</option>
                  <option value="company_supervisor">Company Supervisor</option>
                  <option value="institution_supervisor">Academic Supervisor</option>
                  <option value="institution_admin">Institution Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Broadcast Modal ───────────────────────────────────────────────── */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1E293B] rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-600">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Megaphone size={20} /> System Announcement
            </h3>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Message *</label>
                <textarea className="w-full bg-[#334155] border border-gray-600 rounded-lg px-3 py-2 text-sm text-white h-32 resize-none" value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Type your announcement..." required />
              </div>
              <p className="text-xs text-gray-400">This will send an email and in-app notification to all users.</p>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowBroadcastModal(false)} className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-bold">Send Broadcast</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
