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

// Student Views
import MyCourses from './views/Student/MyCourses';
import FaceUpload from './views/Student/FaceUpload';
import AnswerForm from './views/Student/AnswerForm';

export default function App() {
  const { isAuthenticated, role } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  
  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('');
  const [activeClassId, setActiveClassId] = useState(null);

  // Auto-set initial view and fetch classes based on role upon successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchClasses());
      setCurrentView(role === 'teacher' ? 'dashboard' : 'my-courses');
    } else {
      setCurrentView('');
    }
  }, [isAuthenticated, role, dispatch]);

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
    if (role === 'teacher') {
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-600">
      {/* Universal Header Navbar */}
      <Navbar onToggleSidebar={handleToggleSidebar} />

      {/* Main Body */}
      {!isAuthenticated ? (
        <div className="flex-1 flex flex-col justify-center">
          <LoginRegister />
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
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-[100vw] md:max-w-[calc(100vw-16rem)]">
            <div className="max-w-7xl mx-auto animate-fadeIn">
              {renderContent()}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
