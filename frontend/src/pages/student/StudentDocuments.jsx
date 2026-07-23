import { useState, useEffect } from 'react';
import api from '../../axios';
import { useAuth } from '../../context/AuthContext';

export default function StudentDocuments() {
  const { role, context } = useAuth();

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
    <div className="flex-1 flex flex-col lg:flex-row gap-0 animate-in fade-in duration-300 w-full h-[calc(100vh-4rem)]">
      {/* Upload Form */}
      <div className="w-full lg:w-96 flex-shrink-0 p-margin-desktop border-r border-[var(--color-border)] overflow-y-auto">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Upload Document</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Document Type</label>
            <select 
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-surface"
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
      <div className="flex-1 p-margin-desktop overflow-y-auto bg-surface-container-lowest">
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
  );
}
