
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
  Calendar,
  X
} from 'lucide-react';

export default function Sidebar({ currentView, onViewChange, isOpen, onClose }) {
  const { user, role } = useSelector((state) => state.auth);

  const teacherItems = [
    { id: 'dashboard', label: 'Bảng thống kê', icon: LayoutDashboard },
    { id: 'class-management', label: 'Quản lý lớp học', icon: BookOpen },
    { id: 'teacher-timetable', label: 'Thời khóa biểu', icon: Calendar },
    { id: 'photo-attendance', label: 'Chụp ảnh điểm danh', icon: Camera },
    { id: 'create-form', label: 'Tạo Form trắc nghiệm', icon: FileSpreadsheet },
    { id: 'profile', label: 'Thông tin cá nhân', icon: User }
  ];

  const studentItems = [
    { id: 'my-courses', label: 'Lớp học của tôi', icon: BookOpen },
    { id: 'student-timetable', label: 'Thời khóa biểu tuần', icon: Calendar },
    { id: 'grades-attendance', label: 'Kết quả học tập', icon: Award },
    { id: 'face-upload', label: 'Upload khuôn mặt', icon: Smile },
    { id: 'answer-form', label: 'Trả lời điểm danh', icon: ShieldCheck },
    { id: 'profile', label: 'Thông tin cá nhân', icon: User }
  ];

  const adminItems = [
    { id: 'admin-dashboard', label: 'Dashboard Hệ thống', icon: LayoutDashboard },
    { id: 'teacher-approval', label: 'Phê duyệt tài khoản', icon: ShieldCheck },
    { id: 'semester-management', label: 'Quản lý Học kỳ', icon: History },
    { id: 'profile', label: 'Thông tin cá nhân', icon: User }
  ];

  let menuItems = studentItems;
  if (role === 'admin') {
    menuItems = adminItems;
  } else if (role === 'teacher') {
    menuItems = teacherItems;
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4">
      {/* Mobile Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 md:hidden">
        <span className="font-headline font-bold text-slate-850 dark:text-slate-100 text-sm tracking-tight">Menu chức năng</span>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Profile Badge */}
      <div className="pb-4 pt-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 bg-slate-50/70 dark:bg-slate-800/10 p-3 rounded-lg border border-slate-100/50 dark:border-slate-800/50 shadow-subtle">
          <div className="w-10 h-10 rounded-md bg-primary text-white flex items-center justify-center font-headline font-bold shadow-subtle">
            {role === 'admin' ? 'AD' : role === 'teacher' ? 'GV' : 'SV'}
          </div>
          <div>
            <p className="font-headline font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{user?.fullName || 'Người dùng'}</p>
            <p className="text-[11px] font-mono font-bold text-secondary mt-0.5 uppercase tracking-wide">
              {role === 'admin' ? 'Admin' : role === 'teacher' ? 'Teacher' : 'Student'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
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
              className={`w-full flex items-center gap-3 px-4 py-2.5 font-inter text-[14px] font-medium transition-all duration-150 group border-l-2 ${
                isActive
                  ? 'border-primary bg-[#EFF6FF] dark:bg-blue-950/20 text-primary dark:text-blue-400 rounded-r-md'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 rounded-md'
              }`}
              style={{ height: '40px' }}
            >
              <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 duration-150 ${isActive ? 'text-primary dark:text-blue-400' : 'text-slate-500 dark:text-slate-450 group-hover:text-primary'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Version footer */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-wider">
          BKHN-CLASSROOM V1.0.0
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="w-[280px] hidden md:block shrink-0 h-[calc(100vh-62px)] sticky top-[62px] z-30">
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
        className={`fixed top-0 bottom-0 left-0 w-[280px] z-50 md:hidden transition-transform duration-300 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
