import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Book, FolderOpen, Zap, Star, LogOut } from 'lucide-react';
import api from '../axios';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ active }) => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const items = [
    { to: '/student', label: <><Home size={18} /> Find Slots</> },
    { to: '/student/applications', label: <><ClipboardList size={18} /> My Applications</> },
    { to: '/student/logbook', label: <><Book size={18} /> Logbook</> },
    { to: '/student/documents', label: <><FolderOpen size={18} /> Documents</> },
    { to: '/student/match', label: <><Zap size={18} /> Smart Match</> },
    { to: '/student/evaluation', label: <><Star size={18} /> Rate Company</> },
  ];
  return (
    <div className="w-64 bg-[var(--color-primary-dark)] text-white p-6 flex flex-col flex-shrink-0">
      <h1 className="text-xl font-bold mb-8">InduTrack KE</h1>
      <nav className="flex-1 space-y-1">
        {items.map(item => (
          <Link key={item.to} to={item.to} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${active === item.to ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-primary)] text-white/90'}`}>{item.label}</Link>
        ))}
      </nav>
      <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-4 py-2 rounded-lg text-red-300 hover:bg-red-500/20 mt-4 text-sm transition"><LogOut size={18} /> Logout</button>
    </div>
  );
};

export default function StudentDocuments() {
  const { role, context, logout } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ type: 'intro_letter', file: null });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = () => {
    setLoading(true);
    api.get('/documents')
      .then(res => setDocuments(res.data))
      .catch(() => setError('Could not load documents.'))
      .finally(() => setLoading(false));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file) return alert('Please select a file');

    const formData = new FormData();
    formData.append('type', form.type);
    formData.append('file', form.file);

    setUploading(true);
    try {
      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm({ type: 'intro_letter', file: null });
      fetchDocuments();
      alert('Document uploaded successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      <Sidebar active="/student/documents" />
      <div className="flex-1 flex gap-0">
        
        {/* Upload Form */}
        <div className="w-96 flex-shrink-0 p-6 border-r border-[var(--color-border)]">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Upload Document</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Document Type</label>
              <select 
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm"
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
              >
                <option value="intro_letter">Introduction Letter</option>
                <option value="medical_cert">Medical Certificate</option>
                <option value="insurance_cert">Insurance Certificate</option>
                <option value="acceptance_letter">Acceptance Letter</option>
                <option value="cv">CV / Resume</option>
                <option value="transcript">Transcript</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">File (PDF, JPG, PNG)</label>
              <input 
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png"
                className="w-full text-sm"
                onChange={e => setForm({...form, file: e.target.files[0]})}
                required
              />
            </div>
            <button type="submit" disabled={uploading} className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white py-2 rounded-lg font-medium text-sm transition disabled:opacity-60">
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        </div>

        {/* Document List */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-primary-dark)]">Student Portal</h2>
          <div className="text-sm font-medium text-[var(--color-text-secondary)]">{context}</div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">My Documents</h2>
          {loading && <p className="text-[var(--color-text-secondary)]">Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}

          <div className="space-y-4">
            {documents.map(doc => (
              <div key={doc.id} className="bg-[var(--color-surface)] p-5 rounded-xl border border-[var(--color-border)] shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[var(--color-text-primary)] capitalize">{doc.type.replace('_', ' ')}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">{doc.original_name}</p>
                  {doc.status === 'rejected' && doc.rejection_reason && (
                    <p className="text-xs text-red-500 mt-1">Reason: {doc.rejection_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusColors[doc.status]}`}>
                    {doc.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
            {!loading && documents.length === 0 && !error && (
              <p className="text-[var(--color-text-secondary)]">No documents uploaded yet.</p>
            )}
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}
