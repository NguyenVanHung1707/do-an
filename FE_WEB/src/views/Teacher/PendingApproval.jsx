import { useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { 
  ShieldAlert, 
  Clock, 
  LogOut, 
  Mail, 
  HelpCircle,
  AlertOctagon
} from 'lucide-react';

export default function PendingApproval({ teacherData }) {
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  const isRejected = teacherData?.accountStatus === 'REJECTED';

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xl max-w-lg w-full overflow-hidden transition-all duration-300 hover:shadow-2xl">
        
        {/* Glow ambient header card */}
        <div className={`p-8 text-center text-white relative overflow-hidden bg-gradient-to-br ${
          isRejected ? 'from-rose-500 to-rose-700' : 'from-amber-500 to-amber-600'
        }`}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full transform translate-x-12 -translate-y-12 blur-2xl" />
          
          <div className="flex justify-center mb-4 z-10 relative">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 animate-pulse">
              {isRejected ? (
                <AlertOctagon className="w-12 h-12 text-white" />
              ) : (
                <Clock className="w-12 h-12 text-white" />
              )}
            </div>
          </div>
          
          <h2 className="text-xl md:text-2xl font-black z-10 relative">
            {isRejected ? 'Yêu Cầu Bị Từ Chối' : 'Tài Khoản Chờ Phê Duyệt'}
          </h2>
          <p className="text-xs text-white/80 font-medium mt-1.5 z-10 relative uppercase tracking-wider font-mono">
            {isRejected ? 'Registration Rejected' : 'Account Verification Pending'}
          </p>
        </div>

        {/* Text Details Area */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-slate-700 text-sm md:text-base font-semibold leading-relaxed">
              Chào <strong className="text-slate-800 font-bold">{teacherData?.name || 'Giảng viên'}</strong>,
            </p>
            
            {isRejected ? (
              <div className="space-y-4">
                <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                  Rất tiếc, hồ sơ đăng ký giảng viên của bạn (Mã số: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">{teacherData?.teacherCode}</code>) đã bị từ chối phê duyệt bởi quản trị viên hệ thống.
                </p>
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-left">
                  <div className="flex gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-rose-800 uppercase block tracking-wide">Lý do từ chối:</span>
                      <p className="text-xs text-rose-700 font-medium mt-1 leading-relaxed">
                        {teacherData?.rejectionReason || 'Thông tin tài khoản đăng ký chưa chính xác hoặc không đủ bằng chứng xác thực giảng viên.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                Yêu cầu đăng ký tài khoản giảng viên của bạn (Mã số: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">{teacherData?.teacherCode}</code>) đang trong hàng đợi phê duyệt. Để đảm bảo an toàn học thuật, ban quản trị đang xác minh mã số và tên tuổi giảng viên của bạn.
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-3.5">
            <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <span>Kết quả duyệt sẽ được gửi tự động tới hòm thư: <strong className="text-slate-800 font-semibold">{teacherData?.email}</strong></span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <HelpCircle className="w-4 h-4 text-primary shrink-0" />
              <span>Nếu cần duyệt khẩn cấp hoặc có thắc mắc, vui lòng gửi email về: <strong className="text-slate-800 font-semibold">admin@thuvienso.io.vn</strong></span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
            >
              Tải lại trang
            </button>
            
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-rose-600/10"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất ngay
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
