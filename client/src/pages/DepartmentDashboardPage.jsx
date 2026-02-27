import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOfficialStore, useToastStore } from '../store';
import { officialApi } from '../services/api';

// ─── Status badge component ────────────────────────────────────────
function StatusBadge({ status }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    rejected: 'bg-red-100 text-red-800',
  };
  const labels = {
    pending: 'Pending',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    rejected: 'Rejected',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

// ─── Progress bar ───────────────────────────────────────────────────
function ProgressBar({ value }) {
  const color = value >= 100 ? 'bg-green-500' : value >= 70 ? 'bg-indigo-500' : value >= 40 ? 'bg-blue-500' : 'bg-yellow-500';
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${value}%` }} />
    </div>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-5 ${color} shadow-sm`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

export default function DepartmentDashboardPage() {
  const navigate = useNavigate();
  const { official, token, isAuthenticated, logout } = useOfficialStore();
  const { addToast } = useToastStore();

  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [selectedOfficer, setSelectedOfficer] = useState('');

  useEffect(() => {
    if (!isAuthenticated || official?.role !== 'department_head') {
      navigate('/official-login');
    }
  }, [isAuthenticated, official, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, complaintsRes, officersRes] = await Promise.all([
        officialApi.getDepartmentStats(),
        officialApi.getDepartmentComplaints({ status: statusFilter, page, limit: 15 }),
        officialApi.getDepartmentOfficers(),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (complaintsRes.success) {
        setComplaints(complaintsRes.data);
        setPagination(complaintsRes.pagination);
      }
      if (officersRes.success) setOfficers(officersRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/official-login');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, logout, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssign = async () => {
    if (!selectedComplaint || !selectedOfficer) {
      addToast('Select an officer', 'error');
      return;
    }
    try {
      const res = await officialApi.assignOfficer(selectedComplaint._id, selectedOfficer);
      if (res.success) {
        addToast(res.message, 'success');
        setAssignModalOpen(false);
        setSelectedComplaint(null);
        setSelectedOfficer('');
        fetchData();
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Assignment failed', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/official-login');
  };

  if (!isAuthenticated || official?.role !== 'department_head') return null;

  const deptName = official?.departmentCode?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Department';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{deptName}</h1>
            <p className="text-sm text-gray-500">Welcome, {official?.name}</p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total" value={stats.total} color="bg-white border" />
            <StatCard label="Pending" value={stats.pending} color="bg-yellow-50 text-yellow-900" />
            <StatCard label="Assigned" value={stats.assigned} color="bg-blue-50 text-blue-900" />
            <StatCard label="In Progress" value={stats.inProgress} color="bg-indigo-50 text-indigo-900" />
            <StatCard label="Resolved" value={stats.resolved} color="bg-green-50 text-green-900" />
            <StatCard label="Overdue" value={stats.overdue} color="bg-red-50 text-red-900" />
          </div>
        )}

        {/* Officers */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Officers ({officers.length})</h2>
          <div className="flex flex-wrap gap-3">
            {officers.map((o) => {
              // Find rating from stats if available
              const ratingInfo = stats?.officerRatings?.find(r => r.officerId === o._id);
              return (
                <div key={o._id} className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                    {o.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.name}</p>
                    <p className="text-xs text-gray-500">
                      {o.email}
                      {ratingInfo && (
                        <span className="ml-1 text-yellow-600 font-medium">⭐ {ratingInfo.avgRating} ({ratingInfo.totalRatings})</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
            {officers.length === 0 && <p className="text-sm text-gray-400">No officers assigned yet</p>}
          </div>
        </div>

        {/* Officer Ratings Leaderboard */}
        {stats?.officerRatings && stats.officerRatings.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Officer Ratings Leaderboard</h2>
            <div className="space-y-3">
              {stats.officerRatings.map((officer, index) => (
                <div key={officer.officerId} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-700' : 'bg-blue-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{officer.name}</p>
                    <p className="text-xs text-gray-500">{officer.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={`text-sm ${star <= Math.round(officer.avgRating) ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{officer.avgRating}</span>
                    <span className="text-xs text-gray-500">({officer.totalRatings})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Filter:</label>
          {['', 'pending', 'assigned', 'in_progress', 'resolved'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'
              }`}
            >
              {s === '' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Complaints Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading…</div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No complaints found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Progress</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Officer</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {complaints.map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{c.complaintId}</td>
                      <td className="px-4 py-3 text-gray-700">{c.category}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 w-32"><ProgressBar value={c.progress || 0} /></td>
                      <td className="px-4 py-3 text-gray-600">{c.assignedTo?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {['pending', 'assigned'].includes(c.status) && (
                          <button
                            onClick={() => { setSelectedComplaint(c); setAssignModalOpen(true); }}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
                          >
                            Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-white transition">Prev</button>
                <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-white transition">Next</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Assign Officer</h3>
            <p className="text-sm text-gray-500 mb-4">Complaint: {selectedComplaint?.complaintId}</p>

            <select
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select officer…</option>
              {officers.map((o) => (
                <option key={o._id} value={o._id}>{o.name} ({o.email})</option>
              ))}
            </select>

            <div className="flex gap-3">
              <button onClick={() => { setAssignModalOpen(false); setSelectedOfficer(''); }} className="flex-1 py-2.5 border rounded-xl text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleAssign} disabled={!selectedOfficer} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
