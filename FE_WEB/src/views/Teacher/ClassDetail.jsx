import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addStudentToClass, addManualAttendance, fetchClasses } from '../../store/classSlice';
import Card from '../../components/Common/Card';
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  FileEdit,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Search,
  MessageSquare,
  Calendar,
  Clock,
  Trash2,
  Plus,
  Check,
  Loader2,
  Tag,
  FileSpreadsheet,
  Download,
  Upload
} from 'lucide-react';
import {
  apiFetch,
  getCourseSchedules,
  setCourseSchedules,
  downloadStudentImportTemplate,
  importStudentsFromExcel
} from '../../services/api';
import DiscussionBoard from '../../components/Common/DiscussionBoard';
import AssessmentManagement from './AssessmentManagement';
import GradeAssessment from './GradeAssessment';
import ClassDocuments from '../../components/Common/ClassDocuments';
import TeacherClassAnalytics from '../../components/Teacher/TeacherClassAnalytics';

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

  // Weekly Recurring Schedules States
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [savingSchedules, setSavingSchedules] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(null);
  const [scheduleError, setScheduleError] = useState(null);

  // Excel Import States
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [excelError, setExcelError] = useState(null);
  const [excelReport, setExcelReport] = useState(null); // { successCount, duplicateCount, notFoundCodes, successfullyAdded }

  // Conflict Resolution States
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  useEffect(() => {
    if (activeTab === 'timetable') {
      setLoadingSchedules(true);
      setScheduleSuccess(null);
      setScheduleError(null);
      getCourseSchedules(classId)
        .then(data => {
          const mapped = (data || []).map(s => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime.substring(0, 5), // 'hh:mm:ss' -> 'hh:mm'
            endTime: s.endTime.substring(0, 5),
            roomName: s.roomName || ''
          }));
          setSchedules(mapped);
        })
        .catch(err => {
          console.error("Lỗi lấy thời khóa biểu:", err);
          setScheduleError(err.message || 'Không thể lấy thời khóa biểu của lớp.');
        })
        .finally(() => setLoadingSchedules(false));
    }
  }, [activeTab, classId]);

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
        if (err && err.status === 409 && err.conflicts) {
          closeAddStudentModal();
          setConflictData(err);
          setIsConflictOpen(true);
        } else {
          alert(err.message || err || 'Không thể thêm sinh viên vào lớp!');
        }
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

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadStudentImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Không thể tải file mẫu Excel');
    }
  };

  const handleExcelImportSubmit = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      setExcelError('Vui lòng chọn file Excel trước!');
      return;
    }

    setImportingExcel(true);
    setExcelError(null);
    setExcelReport(null);

    try {
      const report = await importStudentsFromExcel(classId, excelFile);
      setExcelReport(report);
      // Refresh redux state to show new student list & attendance metrics!
      dispatch(fetchClasses());
    } catch (err) {
      console.error(err);
      if (err && err.status === 409 && err.conflicts) {
        setIsExcelImportOpen(false);
        setExcelFile(null);
        setExcelError(null);
        setConflictData(err);
        setIsConflictOpen(true);
        dispatch(fetchClasses());
      } else {
        setExcelError(err.message || 'Nhập danh sách học sinh từ file Excel thất bại.');
      }
    } finally {
      setImportingExcel(false);
    }
  };

  const closeExcelImportModal = () => {
    setIsExcelImportOpen(false);
    setExcelFile(null);
    setExcelError(null);
    setExcelReport(null);
  };

  const handleAddScheduleSlot = () => {
    setSchedules([...schedules, { dayOfWeek: 1, startTime: '06:45', endTime: '08:25', roomName: '' }]);
  };

  const handleRemoveScheduleSlot = (index) => {
    const updated = [...schedules];
    updated.splice(index, 1);
    setSchedules(updated);
  };

  const handleUpdateScheduleSlot = (index, field, value) => {
    const updated = [...schedules];
    updated[index] = {
      ...updated[index],
      [field]: field === 'dayOfWeek' ? parseInt(value) || 1 : value
    };
    setSchedules(updated);
  };

  const handleSaveSchedules = async () => {
    setSavingSchedules(true);
    setScheduleSuccess(null);
    setScheduleError(null);

    // Validate slots
    for (const s of schedules) {
      if (!s.dayOfWeek || !s.startTime || !s.endTime) {
        setScheduleError('Vui lòng điền đầy đủ Thứ, Giờ bắt đầu và Giờ kết thúc cho tất cả các ca học!');
        setSavingSchedules(false);
        return;
      }
      if (s.startTime >= s.endTime) {
        setScheduleError('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!');
        setSavingSchedules(false);
        return;
      }
    }

    try {
      const payload = schedules.map(s => ({
        dayOfWeek: parseInt(s.dayOfWeek),
        startTime: s.startTime + ':00', // 'hh:mm' -> 'hh:mm:ss'
        endTime: s.endTime + ':00',
        roomName: s.roomName || ''
      }));
      await setCourseSchedules(classId, payload);
      setScheduleSuccess('Đã lưu thời khóa biểu định kỳ thành công!');
    } catch (err) {
      setScheduleError(err.message || 'Không thể lưu thời khóa biểu.');
    } finally {
      setSavingSchedules(false);
    }
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
        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition duration-200 ${
            activeTab === 'analytics'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Phân tích học lực
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition duration-200 ${
            activeTab === 'timetable'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Thời khóa biểu định kỳ
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
                  onClick={() => setIsExcelImportOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Nhập từ Excel</span>
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
      ) : activeTab === 'timetable' ? (
        <div className="space-y-6">
          <Card
            title="Cấu hình lịch học định kỳ"
            subtitle="Cài đặt lịch ca học định kỳ trong tuần của môn học này"
            icon={<Calendar className="w-5 h-5 text-primary" />}
            action={
              <button
                onClick={handleAddScheduleSlot}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm ca học
              </button>
            }
          >
            {scheduleSuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{scheduleSuccess}</span>
              </div>
            )}

            {scheduleError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{scheduleError}</span>
              </div>
            )}

            {loadingSchedules ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <p className="text-slate-400 text-xs">Đang tải lịch học định kỳ...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold">Chưa thiết lập ca học định kỳ nào</p>
                <p className="text-xs text-slate-400 mt-1">Bấm nút "Thêm ca học" ở góc trên bên phải để bắt đầu thiết lập lịch học.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {schedules.map((slot, index) => (
                    <div key={index} className="p-4 border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 rounded-xl transition flex flex-col gap-3 relative shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                        <span className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-primary" />
                          Ca học số {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveScheduleSlot(index)}
                          className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition shrink-0"
                          title="Xóa ca học"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thứ trong tuần</label>
                          <select
                            value={slot.dayOfWeek}
                            onChange={(e) => handleUpdateScheduleSlot(index, 'dayOfWeek', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-700 bg-white"
                          >
                            <option value="1">Thứ 2</option>
                            <option value="2">Thứ 3</option>
                            <option value="3">Thứ 4</option>
                            <option value="4">Thứ 5</option>
                            <option value="5">Thứ 6</option>
                            <option value="6">Thứ 7</option>
                            <option value="7">Chủ Nhật</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phòng học</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: A1-401"
                            value={slot.roomName}
                            onChange={(e) => handleUpdateScheduleSlot(index, 'roomName', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-700 bg-white placeholder-slate-400 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Giờ học bắt đầu</label>
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => handleUpdateScheduleSlot(index, 'startTime', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-700 bg-white outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Giờ học kết thúc</label>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => handleUpdateScheduleSlot(index, 'endTime', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-700 bg-white outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end border-t border-slate-100 pt-4 mt-6">
                  <button
                    onClick={handleSaveSchedules}
                    disabled={savingSchedules}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    {savingSchedules ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Lưu lịch học định kỳ
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : activeTab === 'discussion' ? (
        <DiscussionBoard courseId={classId} />
      ) : activeTab === 'documents' ? (
        <ClassDocuments classId={classId} isTeacher={true} />
      ) : activeTab === 'analytics' ? (
        <TeacherClassAnalytics classId={classId} />
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

      {/* Excel Import Modal */}
      {isExcelImportOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-base">Nhập danh sách sinh viên từ Excel</h3>
              </div>
              <button onClick={closeExcelImportModal} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* File Template Instructions Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-700 text-sm">Cấu trúc file Excel mẫu</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      File Excel tải lên cần định dạng cột đúng thứ tự sau. Cột **Mã sinh viên** là bắt buộc để khớp thông tin sinh viên đã đăng ký tài khoản trong hệ thống.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition border border-emerald-200 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file mẫu</span>
                  </button>
                </div>

                {/* Simulated table preview of Excel template */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2 px-3">STT</th>
                        <th className="py-2 px-3 border-l border-slate-200">Mã sinh viên *</th>
                        <th className="py-2 px-3 border-l border-slate-200">Họ và tên</th>
                        <th className="py-2 px-3 border-l border-slate-200">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-600">
                      <tr>
                        <td className="py-1.5 px-3">1</td>
                        <td className="py-1.5 px-3 border-l border-slate-200 font-mono font-bold text-slate-700">st0001</td>
                        <td className="py-1.5 px-3 border-l border-slate-200">Nguyễn Văn A</td>
                        <td className="py-1.5 px-3 border-l border-slate-200">nva@example.com</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3">2</td>
                        <td className="py-1.5 px-3 border-l border-slate-200 font-mono font-bold text-slate-700">st0002</td>
                        <td className="py-1.5 px-3 border-l border-slate-200">Trần Thị B</td>
                        <td className="py-1.5 px-3 border-l border-slate-200">ttb@example.com</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Lưu ý: Chỉ những sinh viên đã đăng ký tài khoản trên hệ thống mới được thêm vào lớp học.</span>
                </div>
              </div>

              {/* Upload drag & drop zone */}
              <form onSubmit={handleExcelImportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Chọn tệp Excel tệp nguồn (.xlsx)</label>
                  <div
                    onClick={() => document.getElementById('excelFileInput').click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                      excelFile
                        ? 'border-emerald-500 bg-emerald-50/30'
                        : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="file"
                      id="excelFileInput"
                      className="hidden"
                      accept=".xlsx, .xls"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setExcelFile(e.target.files[0]);
                          setExcelError(null);
                          setExcelReport(null);
                        }
                      }}
                    />

                    {excelFile ? (
                      <>
                        <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                        <div>
                          <p className="text-sm font-bold text-slate-700 max-w-[300px] truncate">{excelFile.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{(excelFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExcelFile(null);
                          }}
                          className="mt-1 px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold rounded-lg transition"
                        >
                          Chọn tệp khác
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-slate-400" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-600">Nhấp để chọn tệp hoặc kéo & thả vào đây</p>
                          <p className="text-xs text-slate-400">Hỗ trợ tệp định dạng .xlsx, .xls</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {excelError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span className="font-semibold">{excelError}</span>
                  </div>
                )}

                {/* Import Report Result visualization */}
                {excelReport && (
                  <div className="space-y-3.5 border-t border-slate-100 pt-4">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Kết quả nhập danh sách</h4>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                        <div className="text-lg font-black text-emerald-700">{excelReport.successCount || 0}</div>
                        <div className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">Thành công</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                        <div className="text-lg font-black text-amber-700">{excelReport.duplicateCount || 0}</div>
                        <div className="text-[10px] font-bold text-amber-600 uppercase mt-0.5">Đã ở trong lớp</div>
                      </div>
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                        <div className="text-lg font-black text-rose-700">{excelReport.notFoundCodes?.length || 0}</div>
                        <div className="text-[10px] font-bold text-rose-600 uppercase mt-0.5">Lỗi mã số</div>
                      </div>
                    </div>

                    {/* Successfully added students chips */}
                    {excelReport.successfullyAdded && excelReport.successfullyAdded.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">Thêm mới thành công ({excelReport.successfullyAdded.length}):</div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 border border-slate-100 rounded-lg">
                          {excelReport.successfullyAdded.map((name, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Errors warnings on not found codes */}
                    {excelReport.notFoundCodes && excelReport.notFoundCodes.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-rose-500 uppercase flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Sinh viên không tồn tại trong hệ thống ({excelReport.notFoundCodes.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-rose-50/50 border border-rose-100 rounded-lg">
                          {excelReport.notFoundCodes.map((code, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 bg-rose-100 text-rose-800 text-xs font-mono font-bold rounded-full">
                              {code}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500 italic">
                          * Hãy yêu cầu các sinh viên này đăng ký tài khoản trên hệ thống trước khi thêm vào lớp.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={closeExcelImportModal}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
                  >
                    {excelReport ? 'Đóng' : 'Hủy'}
                  </button>
                  {!excelReport && (
                    <button
                      type="submit"
                      disabled={!excelFile || importingExcel}
                      className={`flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-xs transition ${
                        excelFile && !importingExcel
                          ? 'bg-primary hover:bg-primary-hover text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {importingExcel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{importingExcel ? 'Đang nhập...' : 'Nhập danh sách'}</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Resolver Modal */}
      {isConflictOpen && conflictData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-rose-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="px-6 py-5 bg-rose-50 border-b border-rose-100 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Phát Hiện Trùng Lịch Học!</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {conflictData.successCount > 0
                    ? `Phát hiện ${conflictData.conflicts.length} sinh viên có thời khóa biểu bị xung đột. ${conflictData.successCount} sinh viên hợp lệ đã được thêm vào lớp.`
                    : `Phát hiện ${conflictData.conflicts.length} sinh viên có thời khóa biểu bị xung đột trong Học kỳ này. Thao tác thêm học viên đã bị chặn để bảo đảm lịch học.`}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
              {(conflictData.successCount > 0 || conflictData.duplicateCount > 0 || conflictData.notFoundCodes?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-emerald-700">{conflictData.successCount || 0}</div>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">Đã thêm</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-amber-700">{conflictData.duplicateCount || 0}</div>
                    <div className="text-[10px] font-bold text-amber-600 uppercase mt-0.5">Đã có trong lớp</div>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-rose-700">{conflictData.notFoundCodes?.length || 0}</div>
                    <div className="text-[10px] font-bold text-rose-600 uppercase mt-0.5">Không tìm thấy</div>
                  </div>
                </div>
              )}
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Chi tiết các ca trùng lịch:
              </div>

              <div className="space-y-3">
                {conflictData.conflicts.map((conflict, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-sm">{conflict.studentName}</span>
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md font-mono text-[10px] font-bold">
                          {conflict.studentCode}
                        </span>
                      </div>

                      {/* Conflict details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                          <span>Lớp định thêm: <strong className="text-slate-700">{conflict.newSubject}</strong></span>
                        </div>
                        <div className="text-slate-400 pl-3.5 sm:pl-0 font-medium">
                          Lịch học mới: <span className="font-semibold text-slate-600">{conflict.newSchedule}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-rose-500 font-medium">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span>Bị trùng với môn: <strong className="text-rose-700">{conflict.existingSubject}</strong></span>
                        </div>
                        <div className="text-rose-500 pl-3.5 sm:pl-0 font-semibold">
                          Lịch học hiện tại: {conflict.existingSchedule}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-100 flex items-center gap-1">
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>Chặn đăng ký</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Lưu ý:</strong> Để đảm bảo tính toàn vẹn của dữ liệu và tránh việc sinh viên đăng ký học hai lớp trong cùng một thời điểm, hệ thống không cho phép xếp lịch trùng. Vui lòng liên hệ với sinh viên hoặc điều chỉnh lịch ca học.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => {
                  setIsConflictOpen(false);
                  setConflictData(null);
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition"
              >
                Đóng và Điều chỉnh
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
