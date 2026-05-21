import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { BookOpen, Calendar, MapPin, CheckCircle, XCircle, ArrowLeft, Award, Clock, FileText, CheckCircle2, AlertTriangle, Eye, ArrowRight, Play } from 'lucide-react';
import Card from '../../components/Common/Card';
import DiscussionBoard from '../../components/Common/DiscussionBoard';
import TakeAssessment from './TakeAssessment';
import { apiFetch } from '../../services/api';

export default function MyCourses() {
  const { user } = useSelector((state) => state.auth);
  const classesList = useSelector((state) => state.classes.classesList);

  const [selectedClass, setSelectedClass] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'discussion', or 'assessment'
  const [assessments, setAssessments] = useState([]);
  const [isAssessmentsLoading, setIsAssessmentsLoading] = useState(false);
  const [activeAssessmentSession, setActiveAssessmentSession] = useState(null);
  const [viewingGradedSubmission, setViewingGradedSubmission] = useState(null);
  const [isSubmissionLoading, setIsSubmissionLoading] = useState(false);

  const fetchClassAssessments = async () => {
    if (!selectedClass) return;
    setIsAssessmentsLoading(true);
    try {
      const res = await apiFetch(`/courses/${selectedClass.id}/assessments`);
      if (res) {
        setAssessments(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAssessmentsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass && activeTab === 'assessment') {
      fetchClassAssessments();
    }
  }, [selectedClass, activeTab]);

  const handleStartResumeAssessment = async (assessmentId) => {
    try {
      const sub = await apiFetch(`/assessments/${assessmentId}/start`, {
        method: 'POST'
      });
      if (sub) {
        setActiveAssessmentSession({
          assessmentId,
          submissionId: sub.id
        });
      }
    } catch (e) {
      alert('Không thể bắt đầu làm bài: ' + e.message);
    }
  };

  const handleViewGradedSubmission = async (subId) => {
    setIsSubmissionLoading(true);
    try {
      const detail = await apiFetch(`/submissions/${subId}/grades`);
      if (detail) {
        setViewingGradedSubmission(detail);
      }
    } catch (e) {
      alert('Không thể tải chi tiết điểm thi: ' + e.message);
    } finally {
      setIsSubmissionLoading(false);
    }
  };

  // Filter classes where this student is enrolled
  const myClasses = classesList.filter((c) =>
    c && Array.isArray(c.students) ? c.students.some((s) => s && s.studentCode === user?.code) : true
  );

  // Get class statistics for the student
  const getClassStats = (clazz) => {
    const studentInfo = clazz.students?.find((s) => s.studentCode === user?.code);
    const absences = studentInfo ? studentInfo.absences : (clazz.absences || 0);
    const presences = studentInfo ? studentInfo.presences : (clazz.presences || 0);
    const total = absences + presences;
    const rate = total > 0 ? Math.round((presences / total) * 100) : 100;
    return { absences, presences, rate };
  };

  // Filter attendance logs for the selected class
  const classAttendanceLogs = selectedClass?.logs || [];

  if (selectedClass) {
    if (activeAssessmentSession) {
      return (
        <TakeAssessment
          assessmentId={activeAssessmentSession.assessmentId}
          submissionId={activeAssessmentSession.submissionId}
          courseId={selectedClass.id}
          onBack={() => {
            setActiveAssessmentSession(null);
            fetchClassAssessments();
          }}
        />
      );
    }

    const stats = getClassStats(selectedClass);

    return (
      <div className="space-y-6 animate-scaleIn">
        {/* Header with back button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedClass(null); setActiveTab('attendance'); setAssessments([]); }}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition"
              title="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                Chi tiết chuyên cần: {selectedClass.subject}
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Mã môn học: {selectedClass.courseCode} | Giảng viên chủ nhiệm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white border border-slate-100 px-4 py-2.5 rounded-xl shadow-sm">
            <Award className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-slate-400 font-semibold leading-none">Chuyên cần</p>
              <p className="text-sm font-bold text-slate-700 mt-1">{stats.rate}%</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
              {stats.presences}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Số buổi đi học</p>
              <p className="text-lg font-extrabold text-slate-800 mt-1">Đầy đủ</p>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
              {stats.absences}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Số buổi vắng</p>
              <p className="text-lg font-extrabold text-slate-800 mt-1">Nghỉ học</p>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
              {stats.presences + stats.absences}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng số buổi đã học</p>
              <p className="text-lg font-extrabold text-slate-800 mt-1">Buổi học</p>
            </div>
          </div>
        </div>

        {/* Attendance Log Table */}
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
          Nhật ký chuyên cần
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
      </div>

      {activeTab === 'attendance' ? (
        /* Attendance Log Table */
        <Card title="Nhật ký điểm danh chi tiết" className="shadow-sm">
          {classAttendanceLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <Calendar className="w-12 h-12 stroke-[1.5] mx-auto text-slate-300" />
              <p className="font-semibold text-slate-500">Không tìm thấy dữ liệu điểm danh</p>
              <p className="text-xs text-slate-400">Buổi học hiện tại của môn học này chưa có bản ghi điểm danh nào của bạn.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-4">Ngày học</th>
                    <th className="py-4 px-4">Giờ điểm danh</th>
                    <th className="py-4 px-4">Phương thức</th>
                    <th className="py-4 px-4">Tọa độ địa lý</th>
                    <th className="py-4 px-4 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {classAttendanceLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{log.date}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className={log.time === '--:--' ? 'text-slate-400 font-normal' : 'font-mono'}>{log.time}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-semibold">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {log.location ? (
                          <div className="flex items-center gap-1.5 text-xs text-primary font-mono font-semibold">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Lat: {log.location.lat.toFixed(4)}, Lon: {log.location.lng.toFixed(4)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">--</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {log.status === 'present' ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100 shadow-sm shadow-emerald-50">
                            <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                            Có mặt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold border border-rose-100 shadow-sm shadow-rose-50">
                            <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                            Vắng mặt
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : activeTab === 'discussion' ? (
        <DiscussionBoard courseId={selectedClass.id} />
      ) : (
        /* Assessment listing view */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Bài thi & Bài tập học phần</h2>
            <button
              onClick={fetchClassAssessments}
              className="px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 transition text-xs font-bold"
            >
              Làm mới
            </button>
          </div>

          {isAssessmentsLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400">
              <FileText className="w-12 h-12 mx-auto stroke-[1.5] mb-3" />
              <p className="font-medium text-sm">Hiện tại không có bài thi hay bài tập nào hoạt động.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assessments.map((a) => {
                const isDeadlinePassed = a.deadline ? new Date(a.deadline) < new Date() : false;
                const canTake = a.submissionStatus === 'NOT_STARTED' || a.submissionStatus === 'IN_PROGRESS';
                
                return (
                  <Card key={a.id} title={a.title}>
                    <div className="flex justify-between items-start gap-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase ${
                        a.type === 'QUIZ' ? 'bg-indigo-50 text-indigo-600' :
                        a.type === 'MID_TERM' ? 'bg-orange-50 text-orange-600' :
                        a.type === 'FINAL_EXAM' ? 'bg-rose-50 text-rose-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {a.type === 'QUIZ' ? 'Kiểm tra Quiz' :
                         a.type === 'MID_TERM' ? 'Giữa kỳ' :
                         a.type === 'FINAL_EXAM' ? 'Cuối kỳ' :
                         'Bài tập'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        a.submissionStatus === 'GRADED' ? 'bg-emerald-100 text-emerald-800' :
                        a.submissionStatus === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                        a.submissionStatus === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {a.submissionStatus === 'GRADED' ? 'Đã chấm điểm' :
                         a.submissionStatus === 'SUBMITTED' ? 'Đã nộp bài' :
                         a.submissionStatus === 'IN_PROGRESS' ? 'Đang làm dở' :
                         'Chưa làm'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-500 mt-3 line-clamp-2">
                      {a.description || 'Không có mô tả chi tiết.'}
                    </p>

                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 font-semibold">
                      {a.durationMinutes && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Thời gian làm bài: {a.durationMinutes} phút</span>
                        </div>
                      )}
                      {a.deadline && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className={isDeadlinePassed ? 'text-rose-500' : ''}>
                            Hạn chót: {new Date(a.deadline).toLocaleString('vi-VN')} {isDeadlinePassed && '(Hết hạn)'}
                          </span>
                        </div>
                      )}
                      {a.submissionStatus === 'GRADED' && a.studentScore !== null && (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <Award className="w-3.5 h-3.5 font-bold" />
                          <span className="font-bold">Điểm đạt được: {a.studentScore} / {a.maxScore}đ</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                      {canTake && !isDeadlinePassed ? (
                        <button
                          onClick={() => handleStartResumeAssessment(a.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all text-xs"
                        >
                          <Play className="w-3.5 h-3.5" />
                          {a.submissionStatus === 'IN_PROGRESS' ? 'Làm tiếp' : 'Bắt đầu làm bài'}
                        </button>
                      ) : a.submissionStatus === 'GRADED' && a.submissionId ? (
                        <button
                          onClick={() => handleViewGradedSubmission(a.submissionId)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-all text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Xem chi tiết & Nhận xét
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-400 font-semibold rounded-xl text-xs cursor-not-allowed"
                        >
                          Không thể làm bài (Hết hạn / Đã nộp)
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW GRADED SUBMISSION DETAIL MODAL */}
      {viewingGradedSubmission && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 md:p-8 animate-scaleIn space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Chi tiết kết quả bài làm</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Bắt đầu: {new Date(viewingGradedSubmission.startedAt).toLocaleString('vi-VN')} | Nộp: {viewingGradedSubmission.submittedAt ? new Date(viewingGradedSubmission.submittedAt).toLocaleString('vi-VN') : 'Đang đồng bộ/Khóa tự động'}
                </p>
              </div>
              <button
                onClick={() => setViewingGradedSubmission(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng điểm đạt được</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {viewingGradedSubmission.finalScore !== null ? viewingGradedSubmission.finalScore : 0}đ
                </p>
              </div>
              {viewingGradedSubmission.teacherFeedback && (
                <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nhận xét của Giảng viên</p>
                  <p className="text-xs font-semibold text-slate-700 mt-1 italic whitespace-pre-wrap">
                    "{viewingGradedSubmission.teacherFeedback}"
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Chi tiết từng câu hỏi</h4>
              {viewingGradedSubmission.answers?.map((ans, idx) => (
                <div key={idx} className="p-4 border border-slate-100 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-primary font-mono bg-primary/5 px-2 py-0.5 rounded">
                      Câu hỏi {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {ans.isCorrect === true ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Đúng
                        </span>
                      ) : ans.isCorrect === false ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                          Sai
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          Tự luận
                        </span>
                      )}
                      <span className="font-bold text-slate-500">
                        {ans.score !== null ? `${ans.score}đ` : 'Chờ chấm'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
                    <p className="text-slate-400 font-bold uppercase mb-1">Bài làm của bạn:</p>
                    {ans.selectedChoice ? (
                      <p className="font-bold text-slate-800">
                        Lựa chọn: <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{ans.selectedChoice}</span>
                      </p>
                    ) : ans.answerText ? (
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed italic">{ans.answerText}</p>
                    ) : (
                      <p className="text-slate-400 italic">Không trả lời</p>
                    )}
                  </div>

                  {ans.teacherComment && (
                    <div className="text-xs text-slate-500 pl-3 border-l-2 border-amber-300">
                      <span className="font-bold text-slate-600">Nhận xét câu hỏi:</span> {ans.teacherComment}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setViewingGradedSubmission(null)}
                className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-700 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Lớp học của tôi</h1>
        <p className="text-slate-500 text-sm mt-1">
          Xin chào sinh viên <strong className="text-primary font-semibold">{user?.fullName}</strong>. Đây là danh sách các học phần bạn đã tham gia đăng ký trong kỳ học này.
        </p>
      </div>

      {myClasses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 space-y-3 shadow-sm">
          <BookOpen className="w-12 h-12 stroke-[1.5] mx-auto text-slate-300" />
          <p className="font-semibold text-slate-500 text-lg">Bạn chưa tham gia lớp học nào</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">Vui lòng liên hệ với phòng đào tạo hoặc giảng viên chủ nhiệm để được thêm vào danh sách lớp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myClasses.map((clazz) => {
            const stats = getClassStats(clazz);
            return (
              <div
                key={clazz.id}
                onClick={() => setSelectedClass(clazz)}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between hover:border-primary/30 relative overflow-hidden"
              >
                {/* Visual top border */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary/20 group-hover:bg-primary transition" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold font-mono">
                      {clazz.courseCode}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-bold ${stats.rate >= 90 ? 'text-emerald-600' : stats.rate >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                        Tỷ lệ: {stats.rate}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 text-base md:text-lg group-hover:text-primary transition duration-150 leading-snug">
                      {clazz.subject}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 font-semibold">Giảng viên phụ trách</p>
                  </div>

                  <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                    {clazz.description}
                  </p>
                </div>

                {/* Progress bar and details */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Đi học</span>
                      <span className="text-emerald-600 font-bold text-sm">{stats.presences}</span>
                    </div>
                    <div className="border-l border-slate-200 h-6" />
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Vắng mặt</span>
                      <span className="text-rose-600 font-bold text-sm">{stats.absences}</span>
                    </div>
                  </div>

                  <span className="text-primary font-bold text-xs group-hover:translate-x-1 transition duration-200 inline-flex items-center gap-1">
                    Xem nhật ký &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
