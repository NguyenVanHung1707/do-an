import { useState, useEffect, useCallback } from 'react';
import Card from '../../components/Common/Card';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Send, RefreshCw, Award, User } from 'lucide-react';
import { apiFetch } from '../../services/api';

export default function GradeAssessment({ assessmentId, onBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubLoading, setIsSubLoading] = useState(false);

  // Grading states for selected submission
  const [essayGrades, setEssayGrades] = useState({}); // questionId -> { score, comment }
  const [overallFeedback, setOverallFeedback] = useState('');

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
    </div>
  );
}
