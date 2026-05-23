import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { LogOut, Menu, BookOpen, Sun, Moon } from 'lucide-react';

export default function Navbar({ onToggleSidebar }) {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Premium HSL Theme state management
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-4 py-3 shadow-sm flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu on Mobile */}
        {isAuthenticated && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-lg tracking-tight hidden sm:inline-block">
            Hệ thống quản lý lớp học & Điểm danh AI
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:hidden">
            BKHN-Attendance
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* HSL Premium Theme Switcher */}
        <button
          onClick={() => setIsDarkMode(prev => !prev)}
          title={isDarkMode ? "Chuyển sang Chế độ Sáng" : "Chuyển sang Chế độ Tối"}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-150"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {isAuthenticated && user && (
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 text-right">
              <div className="hidden md:block">
                <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">{user.fullName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {user.role === 'admin' ? 'Quản trị viên' : user.role === 'teacher' ? `Giảng viên - ${user.code}` : `Sinh viên - ${user.code}`}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="flex items-center justify-center p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition duration-150"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
