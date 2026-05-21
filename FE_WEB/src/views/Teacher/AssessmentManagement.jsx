import React, { useState, useEffect } from 'react';
import Card from '../../components/Common/Card';
import { Plus, Check, Clock, Calendar, FileText, Trash2, Eye, Award, ExternalLink, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../services/api';

export default function AssessmentManagement({ classId, onSelectSubmission }) {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states for new assessment
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('ASSIGNMENT'); // QUIZ, MID_TERM, FINAL_EXAM, ASSIGNMENT
  const [maxScore, setMaxScore] = useState(10.0);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [deadline, setDeadline] = useState('');
  const [scoreReleaseMode, setScoreReleaseMode] = useState('AUTOMATIC'); // AUTOMATIC, MANUAL
  const [questions, setQuestions] = useState([]);

  // Load assessments
  const fetchAssessments = async () => {
    setIsLoading(true);
    try {
      // Students and teachers call endpoints, we use teacher specific view but we can fetch course assessments
      const res = await apiFetch(`/courses/${classId}/assessments`);
      if (res) {
        setAssessments(res);
      }
    } catch (e) {
      console.error(e);
      alert('Không thể tải danh sách bài tập & bài thi: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [classId]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        type: 'MULTIPLE_CHOICE', // MULTIPLE_CHOICE, SHORT_ANSWER, ESSAY
        content: '',
        score: 1.0,
        choices: [
          { key: 'A', text: '' },
          { key: 'B', text: '' },
          { key: 'C', text: '' },
          { key: 'D', text: '' }
        ],
        correctChoice: 'A',
        keywords: '',
        caseSensitive: false
      }
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx, field, value) => {
    const updated = [...questions];
    updated[idx][field] = value;
    setQuestions(updated);
  };

  const handleChoiceChange = (qIdx, cIdx, text) => {
    const updated = [...questions];
    updated[qIdx].choices[cIdx].text = text;
    setQuestions(updated);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề!');
      return;
    }
    if (questions.length === 0) {
      alert('Vui lòng thêm ít nhất một câu hỏi!');
      return;
    }

    const payloadQuestions = questions.map((q, idx) => {
      let meta = {};
      if (q.type === 'MULTIPLE_CHOICE') {
        meta = {
          choices: q.choices.map(c => ({ key: c.key, text: c.text })),
          correct_choice: q.correctChoice
        };
      } else if (q.type === 'SHORT_ANSWER') {
        meta = {
          keywords: q.keywords.split(',').map(k => k.trim()),
          case_sensitive: q.caseSensitive
        };
      } else {
        meta = { min_words: 10, max_words: 1000 };
      }

      return {
        type: q.type,
        content: q.content,
        score: q.score,
        orderIndex: idx + 1,
        metadata: JSON.stringify(meta)
      };
    });

    const payload = {
      courseId: classId,
      title,
      description,
      type,
      maxScore,
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      scoreReleaseMode,
      isPublished: true,
      questions: payloadQuestions
    };

    try {
      const res = await apiFetch('/teacher/assessments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res) {
        alert('Tạo bài thi / bài tập mới thành công!');
        setIsCreateOpen(false);
        // Reset states
        setTitle('');
        setDescription('');
        setType('ASSIGNMENT');
        setDurationMinutes('');
        setDeadline('');
        setQuestions([]);
        fetchAssessments();
      }
    } catch (e) {
      console.error(e);
      alert('Không thể tạo bài tập: ' + e.message);
    }
  };

  const handleReleaseScores = async (assessmentId) => {
    if (!confirm('Bạn có chắc chắn muốn công bố điểm thi cho cả lớp ngay lập tức?')) return;
    try {
      await apiFetch(`/teacher/assessments/${assessmentId}/release-scores`, {
        method: 'PUT'
      });
      alert('Công bố điểm thành công!');
      fetchAssessments();
    } catch (e) {
      alert('Có lỗi xảy ra: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Quản lý Bài thi & Bài tập</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchAssessments}
            className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 transition"
            title="Làm mới"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Tạo bài tập / Đề thi
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : assessments.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400">
          <FileText className="w-12 h-12 mx-auto stroke-[1.5] mb-3" />
          <p className="font-medium text-sm">Chưa có bài kiểm tra hoặc bài tập nào cho lớp học này.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assessments.map((a) => (
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
                <span className="text-xs text-slate-400 font-medium">
                  {a.questions?.length || 0} câu hỏi | Tối đa {a.maxScore}đ
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-3 line-clamp-2">
                {a.description || 'Không có mô tả.'}
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
                    <span>Thời hạn nộp: {new Date(a.deadline).toLocaleString('vi-VN')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5" />
                  <span>Công bố điểm: {a.scoreReleaseMode === 'AUTOMATIC' ? 'Tự động hiển thị' : 'Chờ GV duyệt'}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => onSelectSubmission(a.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-all text-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Xem bài nộp
                </button>
                {a.scoreReleaseMode === 'MANUAL' && (
                  <button
                    onClick={() => handleReleaseScores(a.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-all text-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Công bố điểm
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 animate-scaleIn">
            <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
              Tạo bài đánh giá mới
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tiêu đề bài thi / bài tập</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Kiểm tra trắc nghiệm Chương 1"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Phân loại bài đánh giá</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                  >
                    <option value="QUIZ">Kiểm tra ngắn (Quiz)</option>
                    <option value="MID_TERM">Kiểm tra giữa kỳ (Mid-term)</option>
                    <option value="FINAL_EXAM">Thi cuối kỳ (Final Exam)</option>
                    <option value="ASSIGNMENT">Bài tập lớn (Assignment)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Mô tả chi tiết</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ghi chú thêm về yêu cầu đề bài..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Thời gian (Phút - Trống nếu không tính giờ)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="Không giới hạn"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Hạn chót nộp bài (Deadline)</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Công bố kết quả</label>
                  <select
                    value={scoreReleaseMode}
                    onChange={(e) => setScoreReleaseMode(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                  >
                    <option value="AUTOMATIC">Tự động sau khi nộp</option>
                    <option value="MANUAL">Giảng viên duyệt thủ công</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-800 text-sm">Danh sách Câu hỏi ({questions.length})</h4>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm câu hỏi
                  </button>
                </div>

                <div className="space-y-6">
                  {questions.map((q, qIdx) => (
                    <div key={q.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl relative space-y-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 transition"
                        title="Xóa câu hỏi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nội dung câu hỏi {qIdx + 1}</label>
                          <input
                            type="text"
                            required
                            placeholder="Nhập đề bài..."
                            value={q.content}
                            onChange={(e) => handleQuestionChange(qIdx, 'content', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-primary/20 focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Điểm số</label>
                          <input
                            type="number"
                            step="0.5"
                            required
                            value={q.score}
                            onChange={(e) => handleQuestionChange(qIdx, 'score', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-primary/20 focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Loại câu hỏi</label>
                          <select
                            value={q.type}
                            onChange={(e) => handleQuestionChange(qIdx, 'type', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-primary/20 focus:border-primary focus:outline-none bg-white"
                          >
                            <option value="MULTIPLE_CHOICE">Trắc nghiệm (4 lựa chọn)</option>
                            <option value="SHORT_ANSWER">Trả lời ngắn / Điền từ</option>
                            <option value="ESSAY">Tự luận (Chấm tay)</option>
                          </select>
                        </div>

                        {q.type === 'MULTIPLE_CHOICE' && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Đáp án đúng</label>
                            <select
                              value={q.correctChoice}
                              onChange={(e) => handleQuestionChange(qIdx, 'correctChoice', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-primary/20 focus:border-primary focus:outline-none bg-white"
                            >
                              <option value="A">Đáp án A</option>
                              <option value="B">Đáp án B</option>
                              <option value="C">Đáp án C</option>
                              <option value="D">Đáp án D</option>
                            </select>
                          </div>
                        )}

                        {q.type === 'SHORT_ANSWER' && (
                          <div className="flex items-center gap-6 pt-5">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 select-none cursor-pointer">
                              <input
                                type="checkbox"
                                checked={q.caseSensitive}
                                onChange={(e) => handleQuestionChange(qIdx, 'caseSensitive', e.target.checked)}
                                className="w-4 h-4 text-primary focus:ring-primary border-slate-200 rounded"
                              />
                              So khớp nhạy chữ hoa/thường
                            </label>
                          </div>
                        )}
                      </div>

                      {q.type === 'MULTIPLE_CHOICE' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 border-l-2 border-primary/20">
                          {q.choices.map((c, cIdx) => (
                            <div key={c.key} className="flex items-center gap-2">
                              <span className="text-xs font-black text-primary font-mono">{c.key}.</span>
                              <input
                                type="text"
                                required
                                placeholder={`Lựa chọn ${c.key}...`}
                                value={c.text}
                                onChange={(e) => handleChoiceChange(qIdx, cIdx, e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-primary/20 focus:border-primary focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'SHORT_ANSWER' && (
                        <div className="pl-4 border-l-2 border-primary/20">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Các từ khóa đáp án đúng (Phân cách bằng dấu phẩy)</label>
                          <input
                            type="text"
                            required
                            placeholder="VD: java, java runtime, jdk"
                            value={q.keywords}
                            onChange={(e) => handleQuestionChange(qIdx, 'keywords', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-primary/20 focus:border-primary focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-semibold text-sm transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/95 shadow-md shadow-primary/20 transition-all text-sm"
                >
                  Lưu bài thi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
