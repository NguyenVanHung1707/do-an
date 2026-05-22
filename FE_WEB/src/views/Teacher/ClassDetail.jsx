import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addStudentToClass, addManualAttendance } from '../../store/classSlice';
import Card from '../../components/Common/Card';
import { ArrowLeft, UserPlus, FileEdit, GraduationCap, CheckCircle2, AlertTriangle, Search, MessageSquare } from 'lucide-react';
import { apiFetch } from '../../services/api';
import DiscussionBoard from '../../components/Common/DiscussionBoard';
import AssessmentManagement from './AssessmentManagement';
import GradeAssessment from './GradeAssessment';
import ClassDocuments from '../../components/Common/ClassDocuments';

export default function ClassDetail({ classId, onBack }) {
  const { classesList } = useSelector((state) => state.classes);
  const dispatch = useDispatch();

  const currentClass = classesList.find((c) => c.id === classId);

  // Tabs visibility
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'discussion' or 'assessment'
  const [assessmentViewState, setAssessmentViewState] = useState('list'); // 'list' or 'grading'
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);

  // Modals visibility
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isManualAttendanceOpen, setIsManualAttendanceOpen] = useState(false);

  // Add student form state
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');

  // Autocomplete student search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudentDbId, setSelectedStudentDbId] = useState(null);

  // Manual attendance form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('present'); // present or absent

  if (!currentClass) {
    return (
      <div className="py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm">
        <p>Không tìm thấy thông tin lớp học!</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl">Quay lại</button>
      </div>
    );
  }

  const handleSearchChange = async (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await apiFetch(`/teacher/search-student?name=${encodeURIComponent(val)}`);
      if (response && Array.isArray(response)) {
        setSearchResults(response);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudentDbId(student.id);
    setStudentId(student.studentCode);
    setStudentName(student.name);
    setSearchResults([]);
    setSearchQuery('');
  };

  const closeAddStudentModal = () => {
    setIsAddStudentOpen(false);
    setStudentId('');
    setStudentName('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedStudentDbId(null);
  };

  const handleAddStudentSubmit = (e) => {
    e.preventDefault();
    if (!studentId.trim() || !studentName.trim() || !selectedStudentDbId) {
      alert('Vui lòng tìm và chọn sinh viên từ hệ thống!');
      return;
    }
    dispatch(addStudentToClass({ classId, studentId: selectedStudentDbId }))
      .unwrap()
      .then(() => {
        closeAddStudentModal();
      })
      .catch((err) => {
        alert(err || 'Không thể thêm sinh viên vào lớp!');
      });
  };

  const handleManualAttendanceSubmit = (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert('Vui lòng chọn sinh viên cần ghi nhận điểm danh!');
      return;
    }
    dispatch(addManualAttendance({ classId, studentId: selectedStudentId, status: attendanceStatus }));
    setIsManualAttendanceOpen(false);
    setSelectedStudentId('');
  };

  return (
    <div className="space-y-6 py-4">
      {/* Header and Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition"
          title="Quay lại danh sách"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-xs font-bold text-primary font-mono bg-primary/10 px-2.5 py-1 rounded-full uppercase">
            {currentClass.courseCode}
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 mt-1">
            {currentClass.subject}
          </h1>
        </div>
      </div>

      {/* Class Meta Description Card */}
      <Card title="Thông tin chi tiết lớp học">
        <p className="text-sm text-slate-600 leading-relaxed">
          {currentClass.description || 'Không có mô tả chi tiết cho lớp học này.'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400 font-medium">Sĩ số hiện tại</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{currentClass.students.length} học viên</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Tỷ lệ đi học</p>
            <p className="text-lg font-black text-emerald-600 mt-0.5">{currentClass.attendanceRate}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Hình thức điểm danh</p>
            <p className="text-sm font-bold text-slate-800 mt-1">Nhận dạng AI / Trắc nghiệm</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Phụ trách chính</p>
            <p className="text-sm font-bold text-slate-800 mt-1">BKHN Server</p>
          </div>
        </div>
      </Card>
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition duration-200 ${
            activeTab === 'attendance'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Thành viên & Chuyên cần
        </button>
        <button
          onClick={() => setActiveTab('discussion')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition duration-200 ${
            activeTab === 'discussion'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Thảo luận lớp học
        </button>
        <button
          onClick={() => setActiveTab('assessment')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition duration-200 ${
            activeTab === 'assessment'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Bài thi & Bài tập
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition duration-200 ${
            activeTab === 'documents'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Tài liệu lớp học
        </button>
      </div>

      {activeTab === 'attendance' ? (
        /* Student List and Tools Grid */
        <div className="grid grid-cols-1 gap-6">
          <Card
            title="Danh sách thành viên & Điểm danh"
            subtitle="Theo dõi và ghi nhận chuyên cần chi tiết từng thành viên"
            action={
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsAddStudentOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Thêm sinh viên</span>
                </button>
                <button
                  onClick={() => setIsManualAttendanceOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Điểm danh thủ công</span>
                </button>
              </div>
            }
          >
            {currentClass.students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Mã sinh viên</th>
                      <th className="py-3 px-4">Họ và Tên</th>
                      <th className="py-3 px-4 text-center">Buổi đi học</th>
                      <th className="py-3 px-4 text-center">Buổi vắng mặt</th>
                      <th className="py-3 px-4 text-right">Tỷ lệ chuyên cần</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentClass.students.map((student) => {
                      const total = student.presences + student.absences;
                      const rate = total > 0 ? Math.round((student.presences / total) * 100) : 100;
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4 font-bold text-slate-700 font-mono text-sm">
                            {student.id}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800 text-sm">
                            {student.fullName}
                          </td>
                          <td className="py-3 px-4 text-center text-sm font-medium text-emerald-600">
                            {student.presences}
                          </td>
                          <td className="py-3 px-4 text-center text-sm font-medium text-rose-500">
                            {student.absences}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`text-xs font-black ${rate >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                {rate}%
                              </span>
                              <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                <div
                                  style={{ width: `${rate}%` }}
                                  className={`h-full rounded-full ${rate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium">Chưa có sinh viên nào đăng ký tham gia lớp học này.</p>
                <p className="text-xs text-slate-400 mt-1">Bấm nút "Thêm sinh viên" phía trên để điền danh sách.</p>
              </div>
            )}
          </Card>
        </div>
      ) : activeTab === 'discussion' ? (
        <DiscussionBoard courseId={classId} />
      ) : activeTab === 'documents' ? (
        <ClassDocuments classId={classId} isTeacher={true} />
      ) : (
        <div>
          {assessmentViewState === 'list' ? (
            <AssessmentManagement
              classId={classId}
              onSelectSubmission={(id) => {
                setSelectedAssessmentId(id);
                setAssessmentViewState('grading');
              }}
            />
          ) : (
            <GradeAssessment
              assessmentId={selectedAssessmentId}
              onBack={() => setAssessmentViewState('list')}
            />
          )}
        </div>
      )}

      {/* Add Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Thêm sinh viên vào lớp</h3>
              <button onClick={closeAddStudentModal} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                &times;
              </button>
            </div>
            <form onSubmit={handleAddStudentSubmit} className="p-6 space-y-4">
              {/* Autocomplete Search input */}
              <div className="relative pb-3 border-b border-slate-100">
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  Tìm kiếm sinh viên (Nhập tên hoặc MSSV)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Nhập tên hoặc MSSV để tìm..."
                    className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary focus:bg-white outline-none transition"
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  {isSearching && (
                    <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* Autocomplete suggestions list */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleSelectStudent(student)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition flex flex-col"
                      >
                        <span className="font-bold text-slate-800 text-xs">{student.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">MSSV: {student.studentCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Mã số sinh viên *</label>
                <input
                  type="text"
                  required
                  readOnly
                  value={studentId}
                  placeholder="Chọn sinh viên từ tìm kiếm phía trên"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-sm text-slate-600 outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Họ và Tên sinh viên *</label>
                <input
                  type="text"
                  required
                  readOnly
                  value={studentName}
                  placeholder="Chọn sinh viên từ tìm kiếm phía trên"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-sm text-slate-600 outline-none cursor-not-allowed"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeAddStudentModal}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudentDbId}
                  className={`px-5 py-2 rounded-xl font-bold text-xs transition ${
                    selectedStudentDbId
                      ? 'bg-primary hover:bg-primary-hover text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Xác nhận thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Attendance Modal */}
      {isManualAttendanceOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Ghi nhận điểm danh thủ công</h3>
              <button onClick={() => setIsManualAttendanceOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                &times;
              </button>
            </div>
            <form onSubmit={handleManualAttendanceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Chọn Sinh viên *</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary focus:bg-white outline-none transition"
                >
                  <option value="">-- Chọn thành viên lớp --</option>
                  {currentClass.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} - {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Trạng thái điểm danh</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAttendanceStatus('present')}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-xs font-bold transition duration-150 ${
                      attendanceStatus === 'present'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>ĐI HỌC (PRESENT)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceStatus('absent')}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-xs font-bold transition duration-150 ${
                      attendanceStatus === 'absent'
                        ? 'bg-rose-50 border-rose-500 text-rose-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>VẮNG MẶT (ABSENT)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsManualAttendanceOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs transition"
                >
                  Ghi nhận điểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
