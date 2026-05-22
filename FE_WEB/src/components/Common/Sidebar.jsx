import React from 'react';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  BookOpen,
  Camera,
  FileSpreadsheet,
  User,
  History,
  Smile,
  ShieldCheck,
  Award,
  X
} from 'lucide-react';

export default function Sidebar({ currentView, onViewChange, isOpen, onClose }) {
  const { user, role } = useSelector((state) => state.auth);

  const teacherItems = [
    { id: 'dashboard', label: 'Bảng thống kê', icon: LayoutDashboard },
    { id: 'class-management', label: 'Quản lý lớp học', icon: BookOpen },
    { id: 'photo-attendance', label: 'Chụp ảnh điểm danh', icon: Camera },
    { id: 'create-form', label: 'Tạo Form trắc nghiệm', icon: FileSpreadsheet },
    { id: 'profile', label: 'Thông tin cá nhân', icon: User }
  ];

  const studentItems = [
    { id: 'my-courses', label: 'Lớp học của tôi', icon: BookOpen },
    { id: 'grades-attendance', label: 'Kết quả học tập', icon: Award },
    { id: 'face-upload', label: 'Upload khuôn mặt', icon: Smile },
    { id: 'answer-form', label: 'Trả lời điểm danh', icon: ShieldCheck },
    { id: 'profile', label: 'Thông tin cá nhân', icon: User }
  ];

  const adminItems = [
    { id: 'admin-dashboard', label: 'Dashboard Hệ thống', icon: LayoutDashboard },
    { id: 'teacher-approval', label: 'Phê duyệt tài khoản', icon: ShieldCheck },
    { id: 'profile', label: 'Thông tin cá nhân', icon: User }
  ];

  let menuItems = studentItems;
  if (role === 'admin') {
    menuItems = adminItems;
  } else if (role === 'teacher') {
    menuItems = teacherItems;
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 md:hidden">
        <span className="font-bold text-slate-800">Menu chức năng</span>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Profile Badge */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-md shadow-primary/20">
            {role === 'admin' ? 'AD' : role === 'teacher' ? 'GV' : 'SV'}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{user?.fullName || 'Người dùng'}</p>
            <p className="text-xs font-medium text-primary mt-0.5 capitalize">
              {role === 'admin' ? 'Quản trị viên' : role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.id);
                onClose(); // Close drawer on mobile
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 duration-200 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-primary'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Version footer */}
      <div className="p-4 border-t border-slate-100 text-center">
        <span className="text-[10px] text-slate-400 font-mono tracking-wider">
          BKHN-CLASSROOM V1.0.0
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="w-64 hidden md:block shrink-0 h-[calc(100vh-62px)] sticky top-[62px] z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Mobile Drawer (Slide in) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 max-w-[80vw] z-50 md:hidden transition-transform duration-300 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
