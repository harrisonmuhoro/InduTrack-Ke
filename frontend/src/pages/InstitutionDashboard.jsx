import { useState, useEffect } from 'react';
import { BarChart, GraduationCap, Building, MapPin, AlertTriangle, FileText } from 'lucide-react';
import api from '../axios';
import AppShell, { PageHeader, Stamp } from '../components/AppShell';

export default function InstitutionDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await api.get('/admin/dashboard');
        setMetrics(res.data);
      } else if (activeTab === 'students') {
        const res = await api.get('/admin/students');
        setStudents(res.data.data);
      } else if (activeTab === 'companies') {
        const res = await api.get('/admin/companies');
        setCompanies(res.data.data);
      } else if (activeTab === 'placements') {
        const res = await api.get('/admin/placements');
        setPlacements(res.data.data);
      } else if (activeTab === 'compliance') {
        const res = await api.get('/admin/compliance');
        setCompliance(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verifyCompany = async (id) => {
    if (!window.confirm('Verify this company?')) return;
    try {
      await api.put(`/admin/companies/${id}/verify`);
      fetchData();
    } catch {
      alert('Error verifying company');
    }
  };

  const approvePlacement = async (id) => {
    if (!window.confirm('Approve this placement?')) return;
    try {
      await api.put(`/admin/placements/${id}/approve`);
      fetchData();
    } catch {
      alert('Error approving placement');
    }
  };

  const resolveFlag = async (id) => {
    if (!window.confirm('Resolve this flag?')) return;
    try {
      await api.put(`/admin/flags/${id}/resolve`);
      fetchData();
    } catch {
      alert('Error resolving flag');
    }
  };

  const reviewDocument = async (id, status) => {
    try {
      await api.put(`/admin/documents/${id}/review`, { status, rejection_reason: status === 'rejected' ? 'Invalid document' : null });
      fetchData();
    } catch {
      alert('Error reviewing document');
    }
  };

  const handleDownload = async (type) => {
    try {
      const res = await api.get(`/admin/reports/${type}?format=csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      alert(`Failed to download ${type} report.`);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: BarChart },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'companies', label: 'Companies', icon: Building },
    { id: 'placements', label: 'Placements', icon: MapPin },
    { id: 'compliance', label: 'Compliance', icon: AlertTriangle },
  ];

  return (
    <AppShell portal="institution">
      <div className="flex flex-wrap gap-1 mb-6 border-b border-[var(--rule)]">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-[var(--copper)] font-semibold'
                  : 'border-transparent text-[var(--ink-soft)]'
              }`}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-[var(--ink-soft)]">Loading…</p>}

      {!loading && activeTab === 'dashboard' && metrics && (
        <div>
          <PageHeader kicker="Liaison office" title="How the season looks" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Students', value: metrics.totalStudents },
              { label: 'On attachment', value: metrics.activePlacements },
              { label: 'Placement rate', value: `${metrics.placementRate}%` },
              { label: 'Flagged', value: metrics.flaggedStudents },
            ].map(card => (
              <div key={card.label} className="sheet p-5">
                <p className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">{card.label}</p>
                <p className="font-display text-3xl mt-1">{card.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => handleDownload('placements')} className="btn btn-ghost">Download placements CSV</button>
            <button type="button" onClick={() => handleDownload('compliance')} className="btn btn-ghost">Download compliance CSV</button>
          </div>
        </div>
      )}

      {!loading && activeTab === 'students' && (
        <div>
          <PageHeader title="Students" />
          <div className="sheet overflow-x-auto">
            <table className="table-plain">
              <thead>
                <tr><th>Name</th><th>Reg No</th><th>Department</th><th>Status</th></tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.user?.name}</td>
                    <td className="text-[var(--ink-soft)]">{s.reg_number}</td>
                    <td className="text-[var(--ink-soft)]">{s.department}</td>
                    <td>
                      <Stamp tone={s.placements?.length > 0 ? 'accepted' : 'draft'}>
                        {s.placements?.length > 0 ? 'Placed' : 'Unplaced'}
                      </Stamp>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'companies' && (
        <div>
          <PageHeader title="Companies" />
          <div className="sheet overflow-x-auto">
            <table className="table-plain">
              <thead>
                <tr><th>Company</th><th>Email</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td className="text-[var(--ink-soft)]">{c.email}</td>
                    <td>
                      <Stamp tone={c.is_verified ? 'accepted' : 'pending'}>{c.is_verified ? 'Verified' : 'Pending'}</Stamp>
                    </td>
                    <td>
                      {!c.is_verified && (
                        <button type="button" onClick={() => verifyCompany(c.id)} className="btn btn-primary text-xs py-1">Verify</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'placements' && (
        <div>
          <PageHeader title="Placement approvals" />
          <div className="sheet overflow-x-auto">
            <table className="table-plain">
              <thead>
                <tr><th>Student</th><th>Company</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {placements.map(p => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.student?.user?.name}</td>
                    <td className="text-[var(--ink-soft)]">{p.company?.name}</td>
                    <td><Stamp tone={p.status === 'pending' ? 'pending' : 'accepted'}>{p.status}</Stamp></td>
                    <td>
                      {p.status === 'pending' && (
                        <button type="button" onClick={() => approvePlacement(p.id)} className="btn btn-primary text-xs py-1">Approve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'compliance' && compliance && (
        <div className="space-y-8">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl mb-4">
              <AlertTriangle size={20} /> Open flags
            </h2>
            {compliance.flagged_students?.length === 0 ? (
              <p className="text-[var(--ink-soft)]">No active flags.</p>
            ) : (
              <div className="space-y-3">
                {compliance.flagged_students.map(f => (
                  <div key={f.id} className="sheet p-4 flex justify-between items-center gap-4">
                    <div>
                      <p className="font-semibold">{f.placement?.student?.user?.name} at {f.placement?.company?.name}</p>
                      <p className="text-sm text-[var(--ink-soft)]">{f.reason} — {f.details}</p>
                      <p className="text-xs text-[var(--ink-soft)] mt-1">Flagged by {f.flagger?.name}</p>
                    </div>
                    <button type="button" onClick={() => resolveFlag(f.id)} className="btn btn-danger shrink-0">Resolve</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl mb-4">
              <FileText size={20} /> Pending documents
            </h2>
            {compliance.pending_documents?.length === 0 ? (
              <p className="text-[var(--ink-soft)]">No pending documents.</p>
            ) : (
              <div className="space-y-3">
                {compliance.pending_documents.map(d => (
                  <div key={d.id} className="sheet p-4 flex justify-between items-center gap-4">
                    <div>
                      <p className="font-semibold">{d.student?.user?.name}</p>
                      <p className="text-sm text-[var(--ink-soft)]">{d.type.replace('_', ' ')} ({d.original_name})</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => reviewDocument(d.id, 'approved')} className="btn btn-primary">Approve</button>
                      <button type="button" onClick={() => reviewDocument(d.id, 'rejected')} className="btn btn-danger">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
