import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { getStudentProfile, completeStudentProfile } from '../../services/api';
import { 
  UserCheck, 
  Hash, 
  Mail, 
  User, 
  LogOut, 
  ChevronRight, 
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function CompleteProfile({ onComplete }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    studentCode: '',
    name: '',
    email: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getStudentProfile();
        setForm({
          studentCode: data.studentCode || '',
          name: data.name || '',
          email: data.email || ''
        });
      } catch (e) {
        setError('Không thể kết nối máy chủ để tải thông tin tài khoản!');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentCode.trim()) {
      setError('Mã số sinh viên (MSSV) là trường bắt buộc.');
      return;
    }
    if (!form.name.trim()) {
      setError('Họ và tên là trường bắt buộc.');
      return;
    }

    // Basic MSSV regex check (at least 5 characters, alphanumeric)
    const mssvRegex = /^[a-zA-Z0-9]{5,20}$/;
    if (!mssvRegex.test(form.studentCode.trim())) {
      setError('Mã số sinh viên không hợp lệ (Độ dài từ 5 - 20 ký tự và không chứa ký tự đặc biệt).');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await completeStudentProfile({
        studentCode: form.studentCode.trim(),
        name: form.name.trim(),
        email: form.email.trim()
      });
      setSuccess(true);
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 1500);
    } catch (e) {
      setError(e.message || 'Cập nhật thông tin thất bại. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xl max-w-lg w-full overflow-hidden transition-all duration-300 hover:shadow-2xl">
        
        {/* Ambient Vibrant Banner Header */}
        <div className="p-8 text-center text-white relative overflow-hidden bg-gradient-to-br from-[#34568B] to-[#253f66]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full transform translate-x-12 -translate-y-12 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-500/10 rounded-full transform -translate-x-8 translate-y-8 blur-2xl" />
          
          <div className="flex justify-center mb-4 z-10 relative">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <UserCheck className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h2 className="text-xl md:text-2xl font-black z-10 relative">
            Hoàn Thiện Hồ Sơ Sinh Viên
          </h2>
          <p className="text-xs text-white/80 font-medium mt-1.5 z-10 relative uppercase tracking-wider font-mono">
            Fill in Mandatory University Credentials
          </p>
        </div>

        {/* Form Fields Area */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
          
          <div className="text-center">
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
              Bạn đang đăng nhập qua liên kết mạng xã hội (Google/Facebook). Để tham gia lớp học và ghi nhận điểm danh chính xác, vui lòng hoàn tất các thông tin định danh chính thức dưới đây.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700 text-xs md:text-sm font-medium animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-700 text-xs md:text-sm font-medium">
              <UserCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 animate-bounce" />
              <span>Cập nhật hồ sơ sinh viên thành công! Đang chuyển hướng...</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Email (Locked Field) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Địa chỉ Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={form.email}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 text-sm font-semibold cursor-not-allowed select-none"
                />
                <span className="absolute right-3 top-3 bg-slate-200/60 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Khóa
                </span>
              </div>
            </div>

            {/* Họ và tên (Editable) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#34568B]" /> Họ và Tên chính thức
              </label>
              <input
                type="text"
                placeholder="Nhập đầy đủ Họ và Tên"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full bg-white border border-slate-200 focus:border-[#34568B] focus:ring-1 focus:ring-[#34568B] rounded-xl px-4 py-3 text-slate-800 text-sm font-semibold outline-none transition"
              />
            </div>

            {/* Mã số sinh viên (MSSV - Required) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#34568B]" /> Mã số sinh viên (MSSV)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: B20DCCN123, SV9827..."
                value={form.studentCode}
                onChange={(e) => setForm({ ...form, studentCode: e.target.value.toUpperCase() })}
                required
                className="w-full bg-white border border-slate-200 focus:border-[#34568B] focus:ring-1 focus:ring-[#34568B] rounded-xl px-4 py-3 text-slate-800 text-sm font-semibold outline-none transition uppercase"
              />
              <p className="text-[10px] text-slate-400 font-medium">
                * Lưu ý: Mã số sinh viên là duy nhất và sẽ cố định cho tài khoản của bạn để giáo viên đối chiếu điểm danh.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold transition order-2 sm:order-1 sm:w-1/3"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              Đăng xuất
            </button>
            
            <button
              type="submit"
              disabled={submitting || success}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#34568B] hover:bg-[#253f66] disabled:bg-slate-400 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-blue-900/10 order-1 sm:order-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang hoàn tất...
                </>
              ) : (
                <>
                  Lưu thông tin
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
