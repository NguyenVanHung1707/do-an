import { useState, useEffect, useCallback } from 'react';
import { getPendingTeachers, approveTeacher, rejectTeacher } from '../../services/api';
import Card from '../../components/Common/Card';
import { 
  Search, 
  Check, 
  X, 
  AlertCircle, 
  Mail, 
  Calendar, 
  UserCheck, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';

export default function TeacherApproval() {
  const [teachers, setTeachers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingTeacher, setRejectingTeacher] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Hồ sơ đăng ký chưa đầy đủ thông tin hoặc không chính xác.');

  // Handle search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0); // Reset page on search
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPendingTeachers(page, 5, debouncedSearch);
      if (data) {
        setTeachers(data.content || []);
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || 0);
      }
    } catch (err) {
      setError(err.message || 'Không thể lấy danh sách giáo viên đang chờ duyệt.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleApprove = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn PHÊ DUYỆT tài khoản giảng viên này?')) return;
    
    setSubmittingId(id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await approveTeacher(id);
      if (res && res.success) {
        setSuccessMsg(res.message || 'Đã phê duyệt tài khoản thành công!');
        fetchTeachers();
      }
    } catch (err) {
      setError(err.message || 'Phê duyệt tài khoản thất bại.');
    } finally {
      setSubmittingId(null);
    }
  };

  const openRejectModal = (teacher) => {
    setRejectingTeacher(teacher);
    setRejectionReason('Hồ sơ đăng ký thiếu bằng chứng xác thực giảng viên hoặc thông tin mã số không đúng.');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingTeacher) return;

    const id = rejectingTeacher.id;
    setSubmittingId(id);
    setShowRejectModal(false);
    setError(null);
    setSuccessMsg(null);
    
    try {
      const res = await rejectTeacher(id, rejectionReason);
      if (res && res.success) {
        setSuccessMsg(res.message || 'Đã từ chối tài khoản thành công!');
        fetchTeachers();
      }
    } catch (err) {
      setError(err.message || 'Từ chối tài khoản thất bại.');
    } finally {
      setSubmittingId(null);
      setRejectingTeacher(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Duyệt Hồ Sơ Giảng Viên</h1>
        <p className="text-sm text-slate-500 mt-1">Xác thực và kích hoạt tài khoản đăng ký mới của Giáo viên trên hệ thống</p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fadeIn">
          <Check className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main card controller */}
      <Card 
        title={`Danh sách đang chờ duyệt (${totalElements})`} 
        subtitle="Hồ sơ tài khoản giáo viên đăng ký từ cổng chung"
        action={
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, email, mã số..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl text-xs w-full transition duration-150"
            />
          </div>
        }
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Đang tải danh sách...</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
            <UserCheck className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-600">Không có hồ sơ nào</h4>
            <p className="text-xs mt-1 text-slate-400">Không có tài khoản giáo viên nào đang trong trạng thái chờ phê duyệt.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* List block */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase">
                    <th className="py-3 px-4">Giảng viên</th>
                    <th className="py-3 px-4">Thông tin cá nhân</th>
                    <th className="py-3 px-4">Mã số GV</th>
                    <th className="py-3 px-4">Ngày đăng ký</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {teachers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-base uppercase border border-primary/10">
                            {t.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">{t.name}</span>
                            <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full ml-2 uppercase">PENDING</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col text-slate-600">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs">{t.teacherCode}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : '---'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(t.id)}
                            disabled={submittingId !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200/50 rounded-xl text-xs font-bold transition"
                          >
                            {submittingId === t.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Phê duyệt
                          </button>
                          
                          <button
                            onClick={() => openRejectModal(t)}
                            disabled={submittingId !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 border border-rose-200/50 rounded-xl text-xs font-bold transition"
                          >
                            <X className="w-3.5 h-3.5" />
                            Từ chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                <span>Hiển thị trang {page + 1} / {totalPages} (Tổng cộng {totalElements} bản ghi)</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(p - 1, 0))}
                    disabled={page === 0}
                    className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 rounded-lg text-slate-600 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
                    disabled={page === totalPages - 1}
                    className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 rounded-lg text-slate-600 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Reject Modal */}
      {showRejectModal && rejectingTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50 text-rose-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base md:text-lg">Từ Chối Phê Duyệt</h3>
              </div>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                <span className="text-xs text-slate-400 font-semibold block">Tài khoản từ chối:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{rejectingTeacher.name}</span>
                <span className="text-xs text-slate-500 font-mono block mt-0.5">{rejectingTeacher.email}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Lý do từ chối phê duyệt</label>
                <textarea
                  required
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ghi rõ lý do tại sao không thể phê duyệt..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                <span className="text-[10px] text-slate-400 leading-tight block">Lý do từ chối này sẽ được gửi trực tiếp đến hòm thư điện tử đăng ký của giáo viên dưới dạng thông báo tự động từ hệ thống.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
