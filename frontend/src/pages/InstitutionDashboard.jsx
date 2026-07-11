import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart, GraduationCap, Building, MapPin, AlertTriangle, FileText, MessageSquare } from 'lucide-react';
import api from '../axios';

export default function InstitutionDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const verifyCompany = async (id) => {
    if (!window.confirm('Verify this company?')) return;
    try {
      await api.put(`/admin/companies/${id}/verify`);
      fetchData();
    } catch (err) {
      alert('Error verifying company');
    }
  };

  const approvePlacement = async (id) => {
    if (!window.confirm('Approve this placement?')) return;
    try {
      await api.put(`/admin/placements/${id}/approve`);
      fetchData();
    } catch (err) {
      alert('Error approving placement');
    }
  };

  const resolveFlag = async (id) => {
    if (!window.confirm('Resolve this flag?')) return;
    try {
      await api.put(`/admin/flags/${id}/resolve`);
      fetchData();
    } catch (err) {
      alert('Error resolving flag');
    }
  };

  const reviewDocument = async (id, status) => {
    try {
      await api.put(`/admin/documents/${id}/review`, { status, rejection_reason: status === 'rejected' ? 'Invalid document' : null });
      fetchData();
    } catch (err) {
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
    { id: 'dashboard', label: <span className="flex items-center gap-2"><BarChart size={16} /> Dashboard</span> },
    { id: 'students', label: <span className="flex items-center gap-2"><GraduationCap size={16} /> Students</span> },
    { id: 'companies', label: <span className="flex items-center gap-2"><Building size={16} /> Companies</span> },
    { id: 'placements', label: <span className="flex items-center gap-2"><MapPin size={16} /> Placements</span> },
    { id: 'compliance', label: <span className="flex items-center gap-2"><AlertTriangle size={16} /> Compliance</span> },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-[var(--color-primary-dark)]">Institution Portal</h1>
          <nav className="flex gap-1">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.id ? 'bg-[var(--color-primary)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-500">{localStorage.getItem('context')}</span>
          <Link to="/messages" className="text-sm font-medium text-blue-500 hover:text-blue-700 flex items-center gap-1">
            <MessageSquare size={16} /> Messages
          </Link>
          <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-700">Logout</button>
        </div>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        {loading && <p className="text-gray-500">Loading...</p>}
        
        {!loading && activeTab === 'dashboard' && metrics && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Analytics Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border shadow-sm"><p className="text-sm text-gray-500">Total Students</p><p className="text-3xl font-bold text-blue-600">{metrics.totalStudents}</p></div>
              <div className="bg-white p-6 rounded-xl border shadow-sm"><p className="text-sm text-gray-500">Active Placements</p><p className="text-3xl font-bold text-green-600">{metrics.activePlacements}</p></div>
              <div className="bg-white p-6 rounded-xl border shadow-sm"><p className="text-sm text-gray-500">Placement Rate</p><p className="text-3xl font-bold text-purple-600">{metrics.placementRate}%</p></div>
              <div className="bg-white p-6 rounded-xl border shadow-sm"><p className="text-sm text-gray-500">Flagged Students</p><p className="text-3xl font-bold text-red-600">{metrics.flaggedStudents}</p></div>
            </div>
            
            <div className="mt-8 flex gap-4">
              <button onClick={() => handleDownload('placements')} className="bg-blue-100 hover:bg-blue-200 transition text-blue-800 px-4 py-2 rounded-lg font-medium text-sm">Download Placements CSV</button>
              <button onClick={() => handleDownload('compliance')} className="bg-red-100 hover:bg-red-200 transition text-red-800 px-4 py-2 rounded-lg font-medium text-sm">Download Compliance CSV</button>
            </div>
          </div>
        )}

        {!loading && activeTab === 'students' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Students Directory</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="p-4">Name</th><th className="p-4">Reg No</th><th className="p-4">Department</th><th className="p-4">Status</th></tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="border-b">
                      <td className="p-4 font-medium">{s.user?.name}</td>
                      <td className="p-4 text-gray-600">{s.reg_number}</td>
                      <td className="p-4 text-gray-600">{s.department}</td>
                      <td className="p-4">
                        {s.placements?.length > 0 ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Placed</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold">Unplaced</span>
                        )}
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
            <h2 className="text-2xl font-bold mb-6">Companies Directory</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="p-4">Company Name</th><th className="p-4">Email</th><th className="p-4">Status</th><th className="p-4">Action</th></tr>
                </thead>
                <tbody>
                  {companies.map(c => (
                    <tr key={c.id} className="border-b">
                      <td className="p-4 font-medium">{c.name}</td>
                      <td className="p-4 text-gray-600">{c.email}</td>
                      <td className="p-4">
                        {c.is_verified ? (
                          <span className="text-green-600 font-bold">Verified</span>
                        ) : (
                          <span className="text-yellow-600 font-bold">Pending</span>
                        )}
                      </td>
                      <td className="p-4">
                        {!c.is_verified && (
                          <button onClick={() => verifyCompany(c.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Verify</button>
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
            <h2 className="text-2xl font-bold mb-6">Placement Approvals</h2>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="p-4">Student</th><th className="p-4">Company</th><th className="p-4">Status</th><th className="p-4">Action</th></tr>
                </thead>
                <tbody>
                  {placements.map(p => (
                    <tr key={p.id} className="border-b">
                      <td className="p-4 font-medium">{p.student?.user?.name}</td>
                      <td className="p-4 text-gray-600">{p.company?.name}</td>
                      <td className="p-4 font-bold uppercase text-xs">{p.status}</td>
                      <td className="p-4">
                        {p.status === 'pending' && (
                          <button onClick={() => approvePlacement(p.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs">Approve</button>
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
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4 text-red-600">
                <AlertTriangle size={20} /> Active Flags
              </h2>
              {compliance.flagged_students?.length === 0 ? <p className="text-gray-500">No active flags.</p> : (
                <div className="space-y-3">
                  {compliance.flagged_students.map(f => (
                    <div key={f.id} className="bg-red-50 p-4 rounded-lg border border-red-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-red-900">{f.placement?.student?.user?.name} at {f.placement?.company?.name}</p>
                        <p className="text-sm text-red-700">Reason: {f.reason} - {f.details}</p>
                        <p className="text-xs text-red-500 mt-1">Flagged by: {f.flagger?.name}</p>
                      </div>
                      <button onClick={() => resolveFlag(f.id)} className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium">Resolve</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4 text-yellow-600">
                <FileText size={20} /> Pending Documents
              </h2>
              {compliance.pending_documents?.length === 0 ? <p className="text-gray-500">No pending documents.</p> : (
                <div className="space-y-3">
                  {compliance.pending_documents.map(d => (
                    <div key={d.id} className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-yellow-900">{d.student?.user?.name}</p>
                        <p className="text-sm text-yellow-800">Document: {d.type.replace('_', ' ')} ({d.original_name})</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => reviewDocument(d.id, 'approved')} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium">Approve</button>
                        <button onClick={() => reviewDocument(d.id, 'rejected')} className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
