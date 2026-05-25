import React, { useState } from 'react';
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
    <div className="flex-1 flex items-center justify-center bg-slate-100 p-4 md:p-8 min-h-[calc(100vh-62px)]">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
        
        {/* Left Side: Dynamic Branding Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-primary via-slate-800 to-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full transform translate-x-20 -translate-y-20 blur-2xl" />
          
          <div className="flex items-center gap-2 z-10">
            <BookOpen className="w-6 h-6 text-primary-hover" />
            <span className="font-bold text-lg tracking-wider font-mono">BKHN CLASSROOM</span>
          </div>

          <div className="z-10 my-8">
            <h2 className="text-2xl md:text-3xl font-extrabold leading-tight mb-4">
              Điểm danh tự động & Quản lý lớp học thông minh
            </h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Hệ thống tích hợp trí tuệ nhân tạo (FastAPI FaceID) giúp tối ưu hóa điểm danh, theo dõi chuyên cần và quản lý bài kiểm tra trắc nghiệm tức thì.
            </p>
          </div>

          <div className="z-10 border-t border-white/10 pt-4 text-xs text-slate-400">
            Hạ tầng tích hợp: Keycloak OAuth2 • PostgreSQL • Spring Boot
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="md:col-span-7 p-6 md:p-10 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
              <KeyRound className="w-5 h-5 text-slate-400 ml-2" />
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mr-2">Keycloak SSO Server</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-3">
              {isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập hệ thống'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isRegister ? 'Đăng ký thông tin định danh dùng chung' : 'Nhập tài khoản Keycloak hoặc dùng tài khoản dùng thử nhanh'}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 mb-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-medium">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Họ và Tên</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Mã số (MSSV / MSCB)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="VD: SV2001 hoặc TC102"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition"
                  />
                </div>
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Địa chỉ Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu.vn"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Tên đăng nhập</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Mật khẩu</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Vai trò chính</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="teacher"
                      checked={role === 'teacher'}
                      onChange={() => setRole('teacher')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Giảng viên (Teacher)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={role === 'student'}
                      onChange={() => setRole('student')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Sinh viên (Student)</span>
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-xl font-bold shadow-md shadow-primary/10 transition duration-150 mt-2"
            >
              {isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              <span>{isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập SSO'}</span>
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
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                Đăng nhập nhanh sinh viên bằng
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin('google')}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm transition duration-150 border border-slate-200 shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 transform"
              >
                {socialLoading === 'google' ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] active:bg-[#1466D5] text-white font-bold rounded-xl text-sm transition duration-150 shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 transform border border-transparent"
              >
                {socialLoading === 'facebook' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                <span>Facebook</span>
              </button>
            </div>

            {socialLoading && (
              <div className="mt-3 text-center text-xs font-semibold animate-pulse text-[#34568B]">
                Đang thiết lập kết nối tới API {socialLoading === 'google' ? 'Google Sign-in' : 'Facebook Login'}...
              </div>
            )}
          </div>


        </div>

      </div>
    </div>
  );
}
