import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, registerUser, clearError } from '../../store/authSlice';
import { LogIn, UserPlus, ShieldAlert, KeyRound, BookOpen } from 'lucide-react';
import { KEYCLOAK_AUTH_URL, KEYCLOAK_CLIENT_ID } from '../../services/api';

export default function LoginRegister() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState('teacher'); // default for register

  const dispatch = useDispatch();
  const { error } = useSelector((state) => state.auth);
  const [socialLoading, setSocialLoading] = useState(null); // 'google' | 'facebook' | null

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(clearError());
    if (isRegister) {
      if (!username || !email || !fullName || !code || !password) {
        alert('Vui lòng nhập đầy đủ các trường thông tin!');
        return;
      }
      dispatch(registerUser({ username, email, fullName, code, password, role }));
    } else {
      if (!username || !password) {
        alert('Vui lòng nhập tên đăng nhập và mật khẩu!');
        return;
      }
      dispatch(login({ username, password }));
    }
  };


  const handleSocialLogin = (provider) => {
    dispatch(clearError());
    setSocialLoading(provider);

    const redirectUri = window.location.origin + '/';

    const params = new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid',
      kc_idp_hint: provider
    });

    // Redirect browser to Keycloak Identity Provider broker
    window.location.href = `${KEYCLOAK_AUTH_URL}?${params.toString()}`;
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19] p-4 md:p-8 min-h-[calc(100vh-62px)] transition-colors duration-300">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-md shadow-large border border-slate-100 dark:border-slate-800 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
        
        {/* Left Side: Dynamic Branding Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-primary via-indigo-900 to-secondary text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full transform translate-x-20 -translate-y-20 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#7C3AED]/10 rounded-full transform -translate-x-10 translate-y-10 blur-2xl" />
          
          <div className="flex items-center gap-2 z-10">
            <BookOpen className="w-6 h-6 text-white" />
            <span className="font-headline font-extrabold text-lg tracking-wider">BKHN CLASSROOM</span>
          </div>

          <div className="z-10 my-8">
            <h2 className="font-headline text-2xl md:text-3xl font-extrabold leading-tight mb-4 tracking-tight">
              Điểm danh tự động & Quản lý lớp học thông minh
            </h2>
            <p className="font-inter text-slate-300 text-sm md:text-[14px] leading-relaxed font-light">
              Hệ thống tích hợp trí tuệ nhân tạo (FastAPI FaceID) giúp tối ưu hóa điểm danh, theo dõi chuyên cần và quản lý bài kiểm tra trắc nghiệm tức thì.
            </p>
          </div>

          <div className="z-10 border-t border-white/10 pt-4 text-xs font-mono text-slate-400">
            Hạ tầng tích hợp: Keycloak OAuth2 • PostgreSQL • Spring Boot
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="md:col-span-7 p-6 md:p-10 flex flex-col justify-center bg-white dark:bg-slate-900">
          <div className="mb-6">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 px-2 rounded-md w-fit">
              <KeyRound className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Keycloak SSO Server</span>
            </div>
            <h1 className="font-headline text-2xl font-bold text-slate-800 dark:text-slate-100 mt-3 tracking-tight">
              {isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập hệ thống'}
            </h1>
            <p className="font-inter text-[13px] text-slate-500 dark:text-slate-400 mt-1">
              {isRegister ? 'Đăng ký thông tin định danh dùng chung' : 'Nhập tài khoản Keycloak hoặc dùng tài khoản dùng thử nhanh'}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 mb-4 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-450 border border-rose-100 dark:border-rose-900/50 rounded-md text-sm font-medium">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-inter text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Họ và Tên</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-[#E4E4E7] dark:border-slate-800 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition duration-150"
                  />
                </div>
                <div>
                  <label className="block font-inter text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Mã số (MSSV / MSCB)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="VD: SV2001 hoặc TC102"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-[#E4E4E7] dark:border-slate-800 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition duration-150"
                  />
                </div>
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block font-inter text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Địa chỉ Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu.vn"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-[#E4E4E7] dark:border-slate-800 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition duration-150"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-inter text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Tên đăng nhập</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-[#E4E4E7] dark:border-slate-800 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition duration-150"
                />
              </div>
              <div>
                <label className="block font-inter text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Mật khẩu</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-[#E4E4E7] dark:border-slate-800 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition duration-150"
                />
              </div>
            </div>

            {isRegister && (
              <div className="py-1">
                <label className="block font-inter text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Vai trò chính</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-350 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="teacher"
                      checked={role === 'teacher'}
                      onChange={() => setRole('teacher')}
                      className="w-4 h-4 text-primary focus:ring-primary border-slate-300 dark:border-slate-700"
                    />
                    <span>Giảng viên (Teacher)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-350 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={role === 'student'}
                      onChange={() => setRole('student')}
                      className="w-4 h-4 text-primary focus:ring-primary border-slate-300 dark:border-slate-700"
                    />
                    <span>Sinh viên (Student)</span>
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-[38px] flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-md font-bold shadow-subtle hover:shadow-medium transition-all duration-150 mt-2"
            >
              {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              <span className="text-sm">{isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập SSO'}</span>
            </button>
          </form>

          {/* Toggle form button */}
          <div className="text-center mt-4">
            <button
              onClick={() => {
                dispatch(clearError());
                setIsRegister(!isRegister);
              }}
              className="text-primary hover:underline font-semibold text-sm"
            >
              {isRegister ? 'Bạn đã có tài khoản? Đăng nhập ngay' : 'Bạn chưa có tài khoản? Tạo mới tại đây'}
            </button>
          </div>

          {/* Social login buttons */}
          <div className="mt-6">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink mx-4 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Đăng nhập nhanh sinh viên bằng
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin('google')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-200 font-bold rounded-md text-sm transition-all duration-150 border border-[#E4E4E7] dark:border-slate-800 shadow-subtle hover:shadow-medium disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ height: '38px' }}
              >
                {socialLoading === 'google' ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.05,3.1v2.58h3.31c1.94,-1.78 3.06,-4.41 3.06,-7.48c0,-0.61 -0.06,-1.2 -0.16,-1.72Z" fill="#4285f4" />
                    <path d="M12,20.62c2.43,0 4.47,-0.81 5.96,-2.18l-3.31,-2.58c-0.92,0.62 -2.1,0.98 -3.65,0.98c-2.35,0 -4.34,-1.59 -5.05,-3.72H2.52v2.66c1.49,2.96 4.54,4.84 8.01,4.84Z" fill="#34a853" />
                    <path d="M6.95,13.12c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7c0,-0.59 0.1,-1.16 0.28,-1.7V7.06H2.52c-0.61,1.22 -0.95,2.6 -0.95,4.06c0,1.46 0.35,2.83 0.95,4.06l4.43,-3.06Z" fill="#fbbc05" />
                    <path d="M12,5.92c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.22 14.42,2.38 12,2.38c-3.47,0 -6.52,1.88 -8.01,4.84l4.43,3.06C9.13,7.56 11.12,5.92 12,5.92Z" fill="#ea4335" />
                  </svg>
                )}
                <span>Google</span>
              </button>
              
              <button
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin('facebook')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold rounded-md text-sm transition-all duration-150 shadow-subtle hover:shadow-medium disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ height: '38px' }}
              >
                {socialLoading === 'facebook' ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                <span>Facebook</span>
              </button>
            </div>

            {socialLoading && (
              <div className="mt-3 text-center text-xs font-mono font-semibold animate-pulse text-primary">
                Đang thiết lập kết nối tới API {socialLoading === 'google' ? 'Google Sign-in' : 'Facebook Login'}...
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
