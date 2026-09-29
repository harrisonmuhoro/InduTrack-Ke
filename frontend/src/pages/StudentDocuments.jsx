import { useState, useEffect } from 'react';
import api from '../axios';
import AppShell, { PageHeader, Stamp } from '../components/AppShell';

export default function StudentDocuments() {
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

  return (
    <AppShell portal="student" pad={false}>
      <div className="flex flex-col lg:flex-row h-full min-h-0">
        <div className="lg:w-[22rem] shrink-0 p-6 border-b lg:border-b-0 lg:border-r border-[var(--rule)] bg-[var(--sheet)]">
          <p className="page-kicker">File</p>
          <h2 className="font-display text-2xl mb-4">Upload</h2>
          <form onSubmit={handleUpload} className="space-y-3">
            <label className="block text-sm">
              Type
              <select className="input mt-1" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="intro_letter">Introduction letter</option>
                <option value="medical_cert">Medical certificate</option>
                <option value="insurance_cert">Insurance</option>
                <option value="acceptance_letter">Acceptance letter</option>
                <option value="cv">CV</option>
                <option value="transcript">Transcript</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block text-sm">
              File (PDF, JPG, PNG)
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-1 text-sm w-full" onChange={e => setForm({ ...form, file: e.target.files[0] })} required />
            </label>
            <button type="submit" disabled={uploading} className="btn btn-primary w-full">
              {uploading ? 'Uploading…' : 'Add to file'}
            </button>
          </form>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10">
          <PageHeader kicker="Folder" title="Your documents" subtitle="The same papers the liaison office used to keep in a manila envelope." />
          {loading && <p className="text-[var(--ink-soft)]">Loading…</p>}
          {error && <p className="text-[var(--stamp)]">{error}</p>}
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="sheet px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg capitalize">{doc.type.replace('_', ' ')}</h3>
                  <p className="text-sm text-[var(--ink-soft)]">{doc.original_name}</p>
                  {doc.status === 'rejected' && doc.rejection_reason && (
                    <p className="text-xs text-[var(--stamp)] mt-1">Reason: {doc.rejection_reason}</p>
                  )}
                </div>
                <Stamp tone={doc.status}>{doc.status}</Stamp>
              </div>
            ))}
            {!loading && documents.length === 0 && !error && (
              <p className="text-[var(--ink-soft)]">Folder is empty.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
