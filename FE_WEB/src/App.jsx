import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchClasses } from './store/classSlice';

// Common Components
import Navbar from './components/Common/Navbar';
import Sidebar from './components/Common/Sidebar';

// Common Views
import LoginRegister from './views/Common/LoginRegister';
import Profile from './views/Common/Profile';

// Teacher Views
import TeacherDashboard from './views/Teacher/TeacherDashboard';
import ClassManagement from './views/Teacher/ClassManagement';
import ClassDetail from './views/Teacher/ClassDetail';
import PhotoAttendance from './views/Teacher/PhotoAttendance';
import CreateForm from './views/Teacher/CreateForm';
import PendingApproval from './views/Teacher/PendingApproval';

// Admin Views
import AdminDashboard from './views/Admin/AdminDashboard';
import TeacherApproval from './views/Admin/TeacherApproval';
import SemesterManagement from './views/Admin/SemesterManagement';

// Student Views
import MyCourses from './views/Student/MyCourses';
import GradesAndAttendance from './views/Student/GradesAndAttendance';
import FaceUpload from './views/Student/FaceUpload';
import AnswerForm from './views/Student/AnswerForm';
import CompleteProfile from './views/Student/CompleteProfile';
import Timetable from './views/Student/Timetable';

// API
import { getTeacherProfile, getStudentProfile, keycloakExchangeCodeForToken } from './services/api';
import { loginSuccess } from './store/authSlice';

export default function App() {
  const { isAuthenticated, role } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  
  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('');
  const [activeClassId, setActiveClassId] = useState(null);

  // Teacher Approval verification states
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Student Profile status verification states
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingStudentProfile, setLoadingStudentProfile] = useState(false);

  // Handle Keycloak OAuth2 callback (Google/Facebook code exchange)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      // Clean query parameters from address bar immediately to avoid multiple exchanges
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, '', newUrl);

      // Exchange authorization code for token
      keycloakExchangeCodeForToken(code)
        .then((user) => {
          dispatch(loginSuccess(user));
          // Fetch student classes if role is student
          if (user.role !== 'admin') {
            dispatch(fetchClasses());
            setCurrentView(user.role === 'teacher' ? 'dashboard' : 'my-courses');
          } else {
            setCurrentView('admin-dashboard');
          }
        })
        .catch((err) => {
          console.error("Lỗi trao đổi mã xác thực Social Login:", err);
          alert("Đăng nhập bằng tài khoản liên kết thất bại: " + err.message);
        });
    }
  }, [dispatch]);

  // Auto-set initial view and fetch classes based on role upon successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      if (role === 'admin') {
        setCurrentView('admin-dashboard');
      } else {
        dispatch(fetchClasses());
        setCurrentView(role === 'teacher' ? 'dashboard' : 'my-courses');
      }
    } else {
      setCurrentView('');
    }
  }, [isAuthenticated, role, dispatch]);

  // Load teacher profile if logged in as a teacher
  useEffect(() => {
    if (isAuthenticated && role === 'teacher') {
      setLoadingProfile(true);
      getTeacherProfile()
        .then(profile => {
          setTeacherProfile(profile);
        })
        .catch(err => {
          console.error("Lỗi lấy thông tin giáo viên:", err);
        })
        .finally(() => {
          setLoadingProfile(false);
        });
    } else {
      setTeacherProfile(null);
    }
  }, [isAuthenticated, role]);

  // Load student profile if logged in as a student
  useEffect(() => {
    if (isAuthenticated && role === 'student') {
      setLoadingStudentProfile(true);
      getStudentProfile()
        .then(profile => {
          setStudentProfile(profile);
        })
        .catch(err => {
          console.error("Lỗi lấy thông tin sinh viên:", err);
        })
        .finally(() => {
          setLoadingStudentProfile(false);
        });
    } else {
      setStudentProfile(null);
    }
  }, [isAuthenticated, role]);

  const handleProfileCompleted = () => {
    setLoadingStudentProfile(true);
    getStudentProfile()
      .then(profile => {
        setStudentProfile(profile);
        dispatch(fetchClasses());
        setCurrentView('my-courses');
      })
      .catch(err => {
        console.error("Lỗi tải lại hồ sơ sinh viên sau khi cập nhật:", err);
      })
      .finally(() => {
        setLoadingStudentProfile(false);
      });
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    // Reset secondary states when changing views
    if (view !== 'class-detail') {
      setActiveClassId(null);
    }
  };

  // Render content based on current view and role
  const renderContent = () => {
    if (role === 'admin') {
      switch (currentView) {
        case 'admin-dashboard':
          return <AdminDashboard />;
        case 'teacher-approval':
          return <TeacherApproval />;
        case 'semester-management':
          return <SemesterManagement />;
        case 'profile':
          return <Profile />;
        default:
          return <AdminDashboard />;
      }
    } else if (role === 'teacher') {
      switch (currentView) {
        case 'dashboard':
          return <TeacherDashboard />;
        case 'class-management':
          return (
            <ClassManagement
               onSelectClass={(id) => {
                 setActiveClassId(id);
                 setCurrentView('class-detail');
               }}
            />
          );
        case 'class-detail':
          return (
            <ClassDetail
               classId={activeClassId}
               onBack={() => setCurrentView('class-management')}
            />
          );
        case 'teacher-timetable':
          return <Timetable />;
        case 'photo-attendance':
          return <PhotoAttendance />;
        case 'create-form':
          return <CreateForm />;
        case 'profile':
          return <Profile />;
        default:
          return <TeacherDashboard />;
      }
    } else if (role === 'student') {
      switch (currentView) {
        case 'my-courses':
          return <MyCourses />;
        case 'student-timetable':
          return <Timetable />;
        case 'grades-attendance':
          return <GradesAndAttendance />;
        case 'face-upload':
          return <FaceUpload />;
        case 'answer-form':
          return <AnswerForm />;
        case 'profile':
          return <Profile />;
        default:
          return <MyCourses />;
      }
    }
    return null;
  };

  // If currently fetching the teacher verification state, show premium spinner
  if (isAuthenticated && role === 'teacher' && (loadingProfile || !teacherProfile)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans antialiased text-slate-600 dark:text-slate-350 transition-colors duration-300">
        <Navbar onToggleSidebar={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Đang tải thông tin tài khoản...</p>
          </div>
        </div>
      </div>
    );
  }

  // If currently fetching the student profile state, show premium spinner
  if (isAuthenticated && role === 'student' && (loadingStudentProfile || !studentProfile)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans antialiased text-slate-600 dark:text-slate-350 transition-colors duration-300">
        <Navbar onToggleSidebar={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Đang tải thông tin tài khoản...</p>
          </div>
        </div>
      </div>
    );
  }

  const isTeacherPending = teacherProfile && (teacherProfile.accountStatus === 'PENDING' || teacherProfile.accountStatus === 'REJECTED');
  const isStudentIncomplete = studentProfile && !studentProfile.profileCompleted;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans antialiased text-slate-600 dark:text-slate-350 transition-colors duration-300">
      {/* Universal Header Navbar */}
      <Navbar onToggleSidebar={handleToggleSidebar} />

      {/* Main Body */}
      {!isAuthenticated ? (
        <div className="flex-1 flex flex-col justify-center">
          <LoginRegister />
        </div>
      ) : isTeacherPending ? (
        <div className="flex-1 flex flex-col justify-center bg-slate-50 dark:bg-slate-950">
          <PendingApproval teacherData={teacherProfile} />
        </div>
      ) : isStudentIncomplete ? (
        <div className="flex-1 flex flex-col justify-center bg-slate-50 dark:bg-slate-950">
          <CompleteProfile onComplete={handleProfileCompleted} />
        </div>
      ) : (
        <div className="flex-1 flex relative">
          {/* Side Drawer Component */}
          <Sidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Core View Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-[100vw] md:max-w-[calc(100vw-280px)]">
            <div className="max-w-7xl mx-auto animate-fadeIn">
              {renderContent()}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
