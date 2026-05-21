import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { LogOut, User, Menu, BookOpen } from 'lucide-react';

export default function Navbar({ onToggleSidebar }) {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu on Mobile */}
        {isAuthenticated && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-800 text-sm md:text-lg tracking-tight hidden sm:inline-block">
            Hệ thống quản lý lớp học & Điểm danh AI
          </span>
          <span className="font-bold text-slate-800 text-sm sm:hidden">
            BKHN-Attendance
          </span>
        </div>
      </div>

      {isAuthenticated && user && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-right">
            <div className="hidden md:block">
              <p className="font-medium text-slate-800 text-sm">{user.fullName}</p>
              <p className="text-xs text-slate-500 font-mono">
                {user.role === 'admin' ? 'Quản trị viên' : user.role === 'teacher' ? `Giảng viên - ${user.code}` : `Sinh viên - ${user.code}`}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="flex items-center justify-center p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition duration-150"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </nav>
  );
}
