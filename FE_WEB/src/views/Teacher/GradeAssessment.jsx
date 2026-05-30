import { useState, useEffect, useCallback } from 'react';
import Card from '../../components/Common/Card';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Send, RefreshCw, Award, User, ShieldAlert, Clock, Video, X } from 'lucide-react';
import { apiFetch, BASE_API_URL } from '../../services/api';

export default function GradeAssessment({ assessmentId, onBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubLoading, setIsSubLoading] = useState(false);

  // Grading states for selected submission
  const [essayGrades, setEssayGrades] = useState({}); // questionId -> { score, comment }
  const [overallFeedback, setOverallFeedback] = useState('');

  // AI Proctoring logs states
  const [isProctorLogsOpen, setIsProctorLogsOpen] = useState(false);
  const [proctorLogs, setProctorLogs] = useState([]);
  const [isProctorLogsLoading, setIsProctorLogsLoading] = useState(false);
  const [activeLog, setActiveLog] = useState(null);

  const handleOpenProctorLogs = async () => {
    if (!selectedSub) return;
    setIsProctorLogsOpen(true);
    setIsProctorLogsLoading(true);
    try {
      const examId = selectedSub.assessmentId;
      const studentCode = selectedSub.studentCode || selectedSub.studentId;
      const res = await apiFetch(`/proctor/violations?examId=${examId}&studentId=${studentCode}`);
      if (res && res.logs) {
        setProctorLogs(res.logs);
        if (res.logs.length > 0) {
          setActiveLog(res.logs[0]);
        } else {
          setActiveLog(null);
        }
      } else {
        setProctorLogs([]);
        setActiveLog(null);
      }
    } catch (e) {
      console.error(e);
      alert('Không thể tải nhật ký giám thị: ' + e.message);
    } finally {
      setIsProctorLogsLoading(false);
    }
  };

  const getFullVideoUrl = (videoUrl) => {
    if (!videoUrl) return '';
    const relativePath = videoUrl.startsWith('/api') ? videoUrl.substring(4) : videoUrl;
    return `${BASE_API_URL}${relativePath}`;
  };

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/teacher/assessments/${assessmentId}/submissions`);
      if (res) {
        setSubmissions(res);
      }
    } catch (e) {
      alert('Không thể tải bài nộp: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleSelectSubmission = async (sub) => {
    setIsSubLoading(true);
    try {
      // In our API design, GET /teacher/submissions/{subId}/grade-detail gets full details
      // We can use GET /submissions/{subId}/grades or directly get details.
      // Since getSubmissionDto returns answers, we can use the submission object from the list directly!
      // But let's fetch to make sure we have latest DB values
      const res = await apiFetch(`/submissions/${sub.id}/grades`);
      if (res) {
        setSelectedSub(res);
        setOverallFeedback(res.teacherFeedback || '');
        // Initialize essay grades
        const grades = {};
        res.answers?.forEach(ans => {
          grades[ans.questionId] = {
            score: ans.score !== null ? ans.score : 0,
            comment: ans.teacherComment || ''
          };
        });
        setEssayGrades(grades);
      }
    } catch (e) {
      alert('Không thể tải chi tiết bài làm: ' + e.message);
    } finally {
      setIsSubLoading(false);
    }
  };

  const handleGradeChange = (questionId, field, value) => {
    setEssayGrades({
      ...essayGrades,
      [questionId]: {
        ...essayGrades[questionId],
        [field]: value
      }
    });
  };

  const handleSaveGrades = async (e) => {
    e.preventDefault();
    if (!selectedSub) return;

    const answersPayload = Object.keys(essayGrades).map(qId => ({
      questionId: parseInt(qId),
      score: parseFloat(essayGrades[qId].score),
      comment: essayGrades[qId].comment
    }));

    const payload = {
      feedback: overallFeedback,
      answers: answersPayload
    };

    try {
      const res = await apiFetch(`/teacher/submissions/${selectedSub.id}/grade`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (res) {
        alert('Ghi nhận điểm thi thành công!');
        fetchSubmissions();
        setSelectedSub(res); // Refresh view
      }
    } catch (e) {
      alert('Lỗi chấm điểm: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition"
          title="Quay lại"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Chấm điểm bài làm</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Danh sách học sinh đã nộp bài đánh giá</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* SUBMISSION LIST PANEL */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Danh sách Sinh viên">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-slate-400 font-bold">{submissions.length} Bài nộp</span>
              <button
                onClick={fetchSubmissions}
                className="p-1 hover:bg-slate-100 rounded text-slate-500"
                title="Làm mới"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : submissions.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">Chưa có sinh viên nào nộp bài.</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {submissions.map((sub) => {
                  const isActive = selectedSub?.id === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleSelectSubmission(sub)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 ${
                        isActive
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 scale-[1.02]'
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          sub.status === 'GRADED' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{sub.studentName || 'Sinh viên'}</p>
                          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString('vi-VN') : 'Đang làm'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase ${
                          sub.status === 'GRADED' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {sub.status === 'GRADED' ? 'Đã chấm' : 'Chờ chấm'}
                        </span>
                        {sub.finalScore !== null && (
                          <p className="text-xs font-black text-slate-800 mt-1">{sub.finalScore}đ</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* DETAILED GRADING SPACE */}
        <div className="lg:col-span-2">
          {isSubLoading ? (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-12 text-center flex flex-col justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-slate-400 text-sm">Đang tải bài làm chi tiết của sinh viên...</p>
            </div>
          ) : !selectedSub ? (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-12 text-center text-slate-400">
              <Award className="w-16 h-16 mx-auto stroke-[1] mb-4 text-slate-300" />
              <p className="font-bold text-sm">Không gian chấm điểm</p>
              <p className="text-xs mt-1 text-slate-400">Vui lòng chọn một sinh viên ở danh sách bên trái để bắt đầu chấm bài.</p>
            </div>
          ) : (
            <form onSubmit={handleSaveGrades} className="space-y-6">
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      Bài làm của: {selectedSub.studentName || selectedSub.studentId}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Bắt đầu: {new Date(selectedSub.startedAt).toLocaleString('vi-VN')} | Nộp: {selectedSub.submittedAt ? new Date(selectedSub.submittedAt).toLocaleString('vi-VN') : 'Tự động khóa'}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        type="button"
                        onClick={handleOpenProctorLogs}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 hover:border-rose-200 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all shadow-sm active:scale-95"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                        Nhật ký AI Giám thị
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-50 px-4 py-2 rounded-xl text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng điểm</p>
                    <p className="text-lg font-black text-primary">{selectedSub.finalScore || 0}đ</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {selectedSub.answers?.map((ans, idx) => {
                    const qId = ans.questionId;
                    const grade = essayGrades[qId] || { score: 0, comment: '' };

                    return (
                      <div key={qId} className="p-5 border border-slate-100 rounded-2xl space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-xs font-black text-primary font-mono uppercase bg-primary/5 px-2 py-0.5 rounded-md mr-2">
                              Câu {idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">
                              (Chỉ định câu hỏi ID: {qId})
                            </span>
                          </div>
                          {ans.isCorrect === true && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Tự động đúng
                            </span>
                          )}
                          {ans.isCorrect === false && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" /> Tự động sai
                            </span>
                          )}
                          {ans.isCorrect === null && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> Chờ chấm điểm
                            </span>
                          )}
                        </div>

                        {/* Student Answer Detail */}
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-400 font-bold uppercase mb-2">Bài làm của sinh viên:</p>
                          {ans.selectedChoice ? (
                            <p className="text-sm font-bold text-slate-800">
                              Lựa chọn đã chọn: <span className="font-mono text-primary bg-primary/10 px-2 py-1 rounded">{ans.selectedChoice}</span>
                            </p>
                          ) : ans.answerText ? (
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {ans.answerText}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Không có câu trả lời nào được lưu.</p>
                          )}
                        </div>

                        {/* Grading Controls (Only editable for ESSAY or when modifying score) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Điểm câu hỏi</label>
                            <input
                              type="number"
                              step="0.5"
                              value={grade.score}
                              onChange={(e) => handleGradeChange(qId, 'score', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-primary/20 focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nhận xét câu hỏi</label>
                            <input
                              type="text"
                              placeholder="Nhận xét riêng cho câu hỏi này..."
                              value={grade.comment}
                              onChange={(e) => handleGradeChange(qId, 'comment', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-primary/20 focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overall Feedback and Action */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nhận xét tổng quát toàn bài thi</label>
                  <textarea
                    rows={3}
                    placeholder="Viết nhận xét tổng thể để học sinh nắm rõ lỗi sai..."
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
                  >
                    <Send className="w-4 h-4" />
                    Xác nhận điểm & Phản hồi
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* AI Proctoring logs modal */}
      {isProctorLogsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">
                    Nhật ký Giám thị AI - Thí sinh: {selectedSub?.studentName || selectedSub?.studentId}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    Mã số: {selectedSub?.studentCode || 'N/A'} | Đề thi: {selectedSub?.assessmentId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsProctorLogsOpen(false);
                  setActiveLog(null);
                }}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              {/* Timeline list (Left panel) */}
              <div className="lg:col-span-5 border-r border-slate-800 flex flex-col max-h-[65vh] lg:max-h-[70vh] bg-slate-900/40">
                <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Lịch sử vi phạm ({proctorLogs.length})
                  </span>
                  {proctorLogs.length > 0 && (
                    <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 uppercase animate-pulse">
                      Phát hiện nghi vấn
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isProctorLogsLoading ? (
                    <div className="flex flex-col justify-center items-center py-20 space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                      <p className="text-xs text-slate-400 font-medium">Đang tải nhật ký từ máy chủ AI...</p>
                    </div>
                  ) : proctorLogs.length === 0 ? (
                    <div className="flex flex-col justify-center items-center py-20 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-200">Không phát hiện vi phạm</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                          Hệ thống AI không ghi nhận hành vi bất thường nào của thí sinh trong suốt thời gian làm bài.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {proctorLogs.map((log, index) => {
                        const isActive = activeLog?.timestamp === log.timestamp;
                        
                        const formatTimestamp = (ts) => {
                          if (!ts || ts.length < 15) return ts;
                          const year = ts.substring(0, 4);
                          const month = ts.substring(4, 6);
                          const day = ts.substring(6, 8);
                          const hour = ts.substring(9, 11);
                          const min = ts.substring(11, 13);
                          const sec = ts.substring(13, 15);
                          return `${hour}:${min}:${sec} - ${day}/${month}/${year}`;
                        };

                        return (
                          <button
                            type="button"
                            key={index}
                            onClick={() => setActiveLog(log)}
                            className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex gap-3.5 items-start ${
                              isActive
                                ? 'bg-rose-500/10 border-rose-500/30 shadow-md shadow-rose-950/20 scale-[1.01]'
                                : 'bg-slate-950/20 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-800'
                            }`}
                          >
                            <div className="mt-1">
                              <span className={`flex h-2.5 w-2.5 rounded-full ${isActive ? 'bg-rose-500 animate-ping' : 'bg-rose-600'}`} />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-300 font-mono">
                                  LẦN {proctorLogs.length - index}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-1 font-sans">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {formatTimestamp(log.timestamp)}
                                </span>
                              </div>
                              <p className="text-[11px] font-bold text-slate-100 leading-snug">
                                {log.details}
                              </p>
                              {log.videoUrl && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-rose-400 uppercase mt-1">
                                  <Video className="w-3 h-3" /> Click xem video vi phạm
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Video Player (Right panel) */}
              <div className="lg:col-span-7 bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-300 max-h-[65vh] lg:max-h-[70vh]">
                {activeLog && activeLog.videoUrl ? (
                  <div className="w-full h-full flex flex-col justify-between space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <Video className="w-4 h-4 text-rose-500" /> Video bằng chứng vi phạm
                      </span>
                      <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 uppercase font-sans">
                        Đang phát
                      </span>
                    </div>

                    <div className="flex-1 relative bg-black border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center min-h-[300px]">
                      <video
                        key={activeLog.timestamp}
                        src={getFullVideoUrl(activeLog.videoUrl)}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="bg-slate-900/60 p-4 border border-slate-850 rounded-xl">
                      <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider font-sans">Mô tả hành vi:</p>
                      <p className="text-xs font-semibold text-slate-300 mt-1 leading-relaxed">
                        {activeLog.details}
                      </p>
                      <p className="text-[9px] font-semibold text-slate-500 mt-2 font-mono italic">
                        Đường dẫn lưu trữ máy chủ: {activeLog.video_path}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4 p-8">
                    <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-850 flex items-center justify-center mx-auto text-slate-500">
                      <Video className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-200">Video Bằng Chứng</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
                        Vui lòng chọn một phiên vi phạm từ danh sách bên trái để phát lại video bằng chứng ghi nhận hành vi thí sinh.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
