import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import api from '../axios';
import { useAuth } from '../context/AuthContext';
import AppShell, { PageHeader, Stamp, Modal } from '../components/AppShell';

export default function SuperAdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [users, setUsers] = useState({ data: [] });
  const [loading, setLoading] = useState(true);
  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [instForm, setInstForm] = useState({ name: '', domain: '', contact_email: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [userFilter, setUserFilter] = useState({ role: '', search: '' });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    fetchData();
  }, [activeTab, authLoading, user]);

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
      if (err.response?.status === 401) {
        navigate('/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
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
    } catch {
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
    } catch {
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
    } catch {
      alert('Failed to broadcast');
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'institutions', label: 'Institutions' },
    { id: 'users', label: 'Users' },
  ];

  return (
    <AppShell portal="superadmin">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-1 border-b border-[var(--rule)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                activeTab === tab.id ? 'border-[var(--copper)] font-semibold' : 'border-transparent text-[var(--ink-soft)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowBroadcastModal(true)} className="btn btn-copper">
          <Megaphone size={15} /> Broadcast
        </button>
      </div>

      {loading && <p className="text-[var(--ink-soft)]">Loading…</p>}

      {!loading && activeTab === 'dashboard' && metrics && (
        <div>
          <PageHeader kicker="National office" title="The whole ledger" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {[
              { label: 'Institutions', value: metrics.totalInstitutions },
              { label: 'Active', value: metrics.activeInstitutions },
              { label: 'Users', value: metrics.totalUsers },
              { label: 'Students', value: metrics.totalStudents },
              { label: 'Companies', value: metrics.totalCompanies },
              { label: 'Placements', value: metrics.totalPlacements },
            ].map(card => (
              <div key={card.label} className="sheet p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">{card.label}</p>
                <p className="font-display text-2xl mt-1">{card.value}</p>
              </div>
            ))}
          </div>
          {systemStats && (
            <div>
              <h3 className="font-display text-xl mb-3">Traffic on the system</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  ['Storage used', systemStats.storage_used],
                  ['Documents', systemStats.total_documents],
                  ['Logbook entries', systemStats.total_logbook_entries],
                  ['Evaluations', systemStats.total_evaluations],
                  ['Field visits', systemStats.total_field_visits],
                  ['Messages', systemStats.total_messages],
                ].map(([label, value]) => (
                  <div key={label} className="sheet p-4">
                    <p className="text-[0.65rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">{label}</p>
                    <p className="font-display text-xl mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === 'institutions' && (
        <div>
          <PageHeader title="Institutions" actions={<button type="button" className="btn btn-primary" onClick={() => setShowInstitutionModal(true)}>Add institution</button>} />
          <div className="sheet overflow-x-auto">
            <table className="table-plain">
              <thead>
                <tr><th>Name</th><th>Domain</th><th>Contact</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {institutions.map(inst => (
                  <tr key={inst.id}>
                    <td className="font-medium">{inst.name}</td>
                    <td className="text-[var(--ink-soft)]">{inst.domain || '—'}</td>
                    <td className="text-[var(--ink-soft)]">{inst.contact_email || '—'}</td>
                    <td><Stamp tone={inst.is_active ? 'active' : 'closed'}>{inst.is_active ? 'Active' : 'Disabled'}</Stamp></td>
                    <td>
                      <button type="button" onClick={() => toggleInstitution(inst.id)} className={inst.is_active ? 'btn btn-danger text-xs py-1' : 'btn btn-primary text-xs py-1'}>
                        {inst.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
                {institutions.length === 0 && <tr><td colSpan={5} className="text-center text-[var(--ink-soft)]">No institutions found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'users' && (
        <div>
          <PageHeader title="Users" actions={<button type="button" className="btn btn-primary" onClick={() => setShowUserModal(true)}>Create user</button>} />
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={userFilter.role} onChange={e => setUserFilter({ ...userFilter, role: e.target.value })} className="input w-auto">
              <option value="">All roles</option>
              <option value="student">Student</option>
              <option value="company_supervisor">Company supervisor</option>
              <option value="institution_supervisor">Academic supervisor</option>
              <option value="institution_admin">Institution admin</option>
              <option value="super_admin">Super admin</option>
            </select>
            <input type="text" placeholder="Search name or email" value={userFilter.search} onChange={e => setUserFilter({ ...userFilter, search: e.target.value })} className="input flex-1 min-w-40" />
            <button type="button" onClick={fetchData} className="btn btn-ghost">Filter</button>
          </div>
          <div className="sheet overflow-x-auto">
            <table className="table-plain">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr>
              </thead>
              <tbody>
                {(users.data || []).map(row => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.name}</td>
                    <td className="text-[var(--ink-soft)]">{row.email}</td>
                    <td className="uppercase text-xs tracking-wide">{row.roles?.[0]?.name || '—'}</td>
                    <td className="text-[var(--ink-soft)]">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td>
                      <button type="button" onClick={() => disableUser(row.id)} className="btn btn-danger text-xs py-1">Disable</button>
                    </td>
                  </tr>
                ))}
                {(users.data || []).length === 0 && <tr><td colSpan={5} className="text-center text-[var(--ink-soft)]">No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showInstitutionModal && (
        <Modal title="Add institution" onClose={() => setShowInstitutionModal(false)}>
          <form onSubmit={handleAddInstitution} className="space-y-3">
            <label className="block text-sm">Name *<input className="input mt-1" value={instForm.name} onChange={e => setInstForm({ ...instForm, name: e.target.value })} required /></label>
            <label className="block text-sm">Domain<input className="input mt-1" value={instForm.domain} onChange={e => setInstForm({ ...instForm, domain: e.target.value })} placeholder="e.g. uonbi.ac.ke" /></label>
            <label className="block text-sm">Contact email<input type="email" className="input mt-1" value={instForm.contact_email} onChange={e => setInstForm({ ...instForm, contact_email: e.target.value })} /></label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-ghost" onClick={() => setShowInstitutionModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add</button>
            </div>
          </form>
        </Modal>
      )}

      {showUserModal && (
        <Modal title="Create user" onClose={() => setShowUserModal(false)}>
          <form onSubmit={handleAddUser} className="space-y-3">
            <label className="block text-sm">Name *<input className="input mt-1" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} required /></label>
            <label className="block text-sm">Email *<input type="email" className="input mt-1" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} required /></label>
            <label className="block text-sm">Password *<input type="password" className="input mt-1" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} required /></label>
            <label className="block text-sm">Role *
              <select className="input mt-1" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                <option value="student">Student</option>
                <option value="company_supervisor">Company supervisor</option>
                <option value="institution_supervisor">Academic supervisor</option>
                <option value="institution_admin">Institution admin</option>
                <option value="super_admin">Super admin</option>
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-ghost" onClick={() => setShowUserModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </Modal>
      )}

      {showBroadcastModal && (
        <Modal title="System announcement" onClose={() => setShowBroadcastModal(false)}>
          <form onSubmit={handleBroadcast} className="space-y-3">
            <label className="block text-sm">
              Message *
              <textarea className="input mt-1 h-32 resize-none" value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} required />
            </label>
            <p className="text-xs text-[var(--ink-soft)]">Sends email and an in-app note to everyone.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-ghost" onClick={() => setShowBroadcastModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-copper">Send</button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
