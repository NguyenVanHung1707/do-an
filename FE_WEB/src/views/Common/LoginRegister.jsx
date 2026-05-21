import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, registerUser, clearError } from '../../store/authSlice';
import { LogIn, UserPlus, ShieldAlert, KeyRound, Award, BookOpen } from 'lucide-react';

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

  const handleQuickLogin = (userRole) => {
    dispatch(clearError());
    if (userRole === 'teacher') {
      dispatch(login({ username: 'teacher1', password: 'password' }));
    } else {
      dispatch(login({ username: 'student1', password: 'password' }));
    }
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

          {/* Demo account quick bypass (highly helpful for reviewers) */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-3">
              Dùng thử tài khoản Demo nhanh
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickLogin('teacher')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition duration-150 border border-slate-200"
              >
                <Award className="w-4 h-4 text-amber-500" />
                <span>MOCK GIẢNG VIÊN</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('student')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition duration-150 border border-slate-200"
              >
                <Award className="w-4 h-4 text-primary" />
                <span>MOCK SINH VIÊN</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2 italic font-mono">
              Bypass Keycloak credentials (account: teacher1 / student1, password)
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
