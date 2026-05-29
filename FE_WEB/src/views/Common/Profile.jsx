import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Card from '../../components/Common/Card';
import { User, Mail, Shield, UserCheck, Key, Landmark, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { changeUserPassword } from '../../services/api';

export default function Profile() {
  const { user } = useSelector((state) => state.auth);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!user) return null;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Vui lòng điền đầy đủ tất cả các trường!');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không khớp!');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu hiện tại!');
      return;
    }

    setLoading(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      setSuccessMsg('Mật khẩu của bạn đã được cập nhật thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Thay đổi mật khẩu thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-primary to-slate-800 text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full transform translate-x-20 -translate-y-20 blur-2xl" />
        
        <div className="flex flex-col sm:flex-row items-center gap-6 z-10 relative">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center font-extrabold text-3xl border border-white/20 uppercase">
            {user.fullName.charAt(0)}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl md:text-2xl font-bold">{user.fullName}</h2>
            <p className="text-sm text-slate-300 font-mono mt-1">
              Mã tài khoản: {user.code}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider">
                {user.role === 'admin' ? 'Quản trị viên' : user.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-semibold">
                OAuth2 Keycloak Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left column: Profile card */}
        <div className="md:col-span-7">
          <Card title="Hồ sơ tài khoản" subtitle="Chi tiết định danh trên cơ sở dữ liệu chung">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-3 text-slate-600">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Tên đăng nhập</span>
                </div>
                <span className="text-sm font-bold text-slate-800 font-mono">{user.username}</span>
              </div>

              <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Địa chỉ Email</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">{user.email}</span>
              </div>

              <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-3 text-slate-600">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Mã số cá nhân</span>
                </div>
                <span className="text-sm font-bold text-slate-800 font-mono">{user.code}</span>
              </div>

              <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-3 text-slate-600">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Quyền hạn hệ thống</span>
                </div>
                <span className="text-sm font-bold text-slate-800 capitalize">{user.role}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column: Single Sign-On stats */}
        <div className="md:col-span-5">
          <Card title="Trạng thái Keycloak SSO" subtitle="Thông tin tích hợp phiên đăng nhập">
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-600 uppercase">Access Token (JWT)</span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 break-all leading-tight bg-white p-2 rounded-lg border border-slate-200">
                  eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJmR2ZzM...2026_thesis_attendance_token_keycloak_sub_{user.code}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-600 uppercase">Realm Server</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Realm ID:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200">bkhn-realm</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mt-2">
                  <span>Client ID:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200">attendance-web-app</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="grid grid-cols-1 gap-6">
        <div className="md:col-span-12">
          <Card title="Đổi mật khẩu tài khoản" subtitle="Cập nhật mật khẩu bảo mật mới trên hệ thống Keycloak SSO">
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-2xl">
              {successMsg && (
                <div className="p-4 bg-emerald-550/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-start gap-3 animate-fadeIn">
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-start gap-3 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition duration-200 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Cập nhật mật khẩu'
                  )}
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
