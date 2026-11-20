import { useState, useEffect } from 'react';
import { Building, Calendar, Clock, MapPin, CheckCircle, XCircle, FileText } from 'lucide-react';
import api from '../../axios';

export default function SupervisorFieldVisits() {
  const [visits, setVisits] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);

  const [scheduleForm, setScheduleForm] = useState({ placement_id: '', visit_date: '', visit_time: '' });
  const [reportForm, setReportForm] = useState({
    status: 'completed',
    company_environment_notes: '',
    student_performance_notes: '',
    recommendations: '',
    gps_latitude: '',
    gps_longitude: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitsRes, placementsRes] = await Promise.all([
        api.get('/field-visits'),
        api.get('/supervisors/students'),
      ]);
      setVisits(visitsRes.data);
      setPlacements(placementsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    try {
      await api.post('/field-visits', scheduleForm);
      fetchData();
      setShowScheduleModal(false);
      setScheduleForm({ placement_id: '', visit_date: '', visit_time: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule visit');
    }
  };

  const openReportModal = (visit) => {
    setSelectedVisit(visit);
    setReportForm({
      status: visit.status === 'scheduled' ? 'completed' : visit.status,
      company_environment_notes: visit.company_environment_notes || '',
      student_performance_notes: visit.student_performance_notes || '',
      recommendations: visit.recommendations || '',
      gps_latitude: visit.gps_latitude || '',
      gps_longitude: visit.gps_longitude || '',
    });
    setShowReportModal(true);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;

    try {
      const payload = {
        status: reportForm.status,
        company_environment_notes: reportForm.company_environment_notes || null,
        student_performance_notes: reportForm.student_performance_notes || null,
        recommendations: reportForm.recommendations || null,
        gps_latitude: reportForm.gps_latitude ? parseFloat(reportForm.gps_latitude) : null,
        gps_longitude: reportForm.gps_longitude ? parseFloat(reportForm.gps_longitude) : null,
      };

      await api.put(`/field-visits/${selectedVisit.id}`, payload);
      fetchData();
      setShowReportModal(false);
      setSelectedVisit(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit field visit report');
    }
  };

  return (
    <div className="flex-1 p-margin-desktop w-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Field Visits & Observations</h2>
          <p className="text-on-surface-variant">Schedule visits and record on-site observation reports.</p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Schedule Visit
        </button>
      </div>

      {loading ? (
        <p className="text-on-surface-variant">Loading field visits...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visits.map((visit) => (
            <div key={visit.id} className="bg-surface p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-on-surface">{visit.placement?.student?.user?.name}</h3>
                    <p className="flex items-center gap-1 text-sm text-on-surface-variant">
                      <Building size={14} /> {visit.placement?.company?.name}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      visit.status === 'completed'
                        ? 'bg-primary-subtle text-primary'
                        : visit.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {visit.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4 text-sm text-on-surface-variant border-y border-border py-3">
                  <p className="flex items-center gap-1">
                    <Calendar size={14} /> <strong>Date:</strong> {visit.visit_date}
                  </p>
                  {visit.visit_time && (
                    <p className="flex items-center gap-1">
                      <Clock size={14} /> <strong>Time:</strong> {visit.visit_time}
                    </p>
                  )}
                  {visit.gps_latitude && visit.gps_longitude && (
                    <p className="flex items-center gap-1 text-xs">
                      <MapPin size={12} /> GPS: {visit.gps_latitude}, {visit.gps_longitude}
                    </p>
                  )}
                </div>

                {visit.student_performance_notes && (
                  <div className="mb-4 text-xs bg-gray-50 p-3 rounded-lg border">
                    <p className="font-bold text-gray-700">Observation Notes:</p>
                    <p className="text-gray-600 line-clamp-3">{visit.student_performance_notes}</p>
                  </div>
                )}
              </div>

              <div>
                {visit.status === 'scheduled' ? (
                  <button
                    onClick={() => openReportModal(visit)}
                    className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition flex items-center justify-center gap-1"
                  >
                    <FileText size={16} /> Record Report / Complete
                  </button>
                ) : (
                  <button
                    onClick={() => openReportModal(visit)}
                    className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1"
                  >
                    <FileText size={16} /> View Full Report
                  </button>
                )}
              </div>
            </div>
          ))}
          {visits.length === 0 && <p className="text-on-surface-variant col-span-full">No field visits scheduled.</p>}
        </div>
      )}

      {/* Modal: Schedule Visit */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl shadow-xl p-6 w-full max-w-md border border-border">
            <h3 className="text-xl font-bold mb-4 text-on-surface">Schedule Field Visit</h3>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Student Placement</label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  value={scheduleForm.placement_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, placement_id: e.target.value })}
                  required
                >
                  <option value="">Select Student Placement...</option>
                  {placements.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.student?.user?.name} at {p.company?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  value={scheduleForm.visit_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, visit_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Time (Optional)</label>
                <input
                  type="time"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  value={scheduleForm.visit_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, visit_time: e.target.value })}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg font-bold transition"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record/View Field Visit Report */}
      {showReportModal && selectedVisit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl p-6 w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2 text-on-surface">Field Visit Report</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Student: <strong>{selectedVisit.placement?.student?.user?.name}</strong> at{' '}
              <strong>{selectedVisit.placement?.company?.name}</strong>
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Visit Status</label>
                <select
                  disabled={selectedVisit.status === 'completed' || selectedVisit.status === 'cancelled'}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                  value={reportForm.status}
                  onChange={(e) => setReportForm({ ...reportForm, status: e.target.value })}
                  required
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Company Environment & Facilities
                </label>
                <textarea
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  rows="3"
                  placeholder="Observations regarding work environment, equipment, safety, supervision quality..."
                  value={reportForm.company_environment_notes}
                  onChange={(e) => setReportForm({ ...reportForm, company_environment_notes: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Student Technical & Professional Performance
                </label>
                <textarea
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  rows="3"
                  placeholder="Feedback from company mentor, student progress, alignment with syllabus..."
                  value={reportForm.student_performance_notes}
                  onChange={(e) => setReportForm({ ...reportForm, student_performance_notes: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Recommendations & Next Steps</label>
                <textarea
                  className="w-full border border-border rounded-lg p-2 text-sm"
                  rows="2"
                  placeholder="Action items for student, follow-up schedule, or grade impact..."
                  value={reportForm.recommendations}
                  onChange={(e) => setReportForm({ ...reportForm, recommendations: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">GPS Latitude (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full border border-border rounded-lg px-3 py-1.5 text-sm"
                    placeholder="-1.286389"
                    value={reportForm.gps_latitude}
                    onChange={(e) => setReportForm({ ...reportForm, gps_latitude: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">GPS Longitude (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full border border-border rounded-lg px-3 py-1.5 text-sm"
                    placeholder="36.817223"
                    value={reportForm.gps_longitude}
                    onChange={(e) => setReportForm({ ...reportForm, gps_longitude: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low rounded-lg transition"
                >
                  Close
                </button>
                {selectedVisit.status === 'scheduled' && (
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg font-bold transition"
                  >
                    Save Report
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
