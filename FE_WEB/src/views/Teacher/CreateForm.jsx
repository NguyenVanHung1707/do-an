import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createAttendanceForm } from '../../store/attendanceSlice';
import { apiFetch } from '../../services/api';
import {
  Plus,
  Trash2,
  Clipboard,
  Check,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Users,
  BookOpen,
  Award,
  Settings,
  Clock,
  MapPin
} from 'lucide-react';
import Card from '../../components/Common/Card';

export default function CreateForm() {
  const dispatch = useDispatch();
  const classesList = useSelector((state) => state.classes.classesList);

  // Local state for the form
  const [selectedClassId, setSelectedClassId] = useState(classesList[0]?.id || '');
  const [lectureNumber, setLectureNumber] = useState(1);
  const [expiryMinutes, setExpiryMinutes] = useState(15);
  const [questions, setQuestions] = useState([
    { id: 1, text: '', correctAnswer: 'true' }
  ]);

  // State to store generated code and show success state
  const [generatedCode, setGeneratedCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // States for multiple forms
  const [sessionForms, setSessionForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [minFormsRequired, setMinFormsRequired] = useState(1);
  const [expandedFormId, setExpandedFormId] = useState(null);
  const [ruleFeedback, setRuleFeedback] = useState('');

  // Fetch all forms for the selected class and session number
  const fetchForms = async (classId, lecNum) => {
    if (!classId || !lecNum) return;
    setLoadingForms(true);
    try {
      const data = await apiFetch(`/teacher/get-forms-by-session?courseId=${classId}&lectureNumber=${lecNum}`);
      setSessionForms(data || []);
      // Adjust minFormsRequired if it exceeds new count
      if (data && data.length > 0 && minFormsRequired > data.length) {
        setMinFormsRequired(data.length);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách form:', err);
    } finally {
      setLoadingForms(false);
    }
  };

  // Add question to list
  const handleAddQuestion = () => {
    const nextId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    setQuestions([...questions, { id: nextId, text: '', correctAnswer: 'true' }]);
  };

  // Remove question
  const handleRemoveQuestion = (id) => {
    if (questions.length === 1) {
      setErrorMsg('Phải có ít nhất 1 câu hỏi trắc nghiệm để điểm danh.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    setQuestions(questions.filter(q => q.id !== id));
  };

  // Change question text
  const handleQuestionTextChange = (id, text) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
  };

  // Change question correct answer
  const handleQuestionAnswerChange = (id, correctAnswer) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, correctAnswer } : q));
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-select first class when list loads
  React.useEffect(() => {
    if (classesList.length > 0 && !selectedClassId) {
      setSelectedClassId(classesList[0].id);
    }
  }, [classesList, selectedClassId]);

  // Fetch forms when class or session changes
  React.useEffect(() => {
    if (selectedClassId && lectureNumber) {
      fetchForms(selectedClassId, lectureNumber);
    }
  }, [selectedClassId, lectureNumber]);

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validations
    if (!selectedClassId) {
      setErrorMsg('Vui lòng chọn một lớp học.');
      return;
    }
    if (questions.some(q => !q.text.trim())) {
      setErrorMsg('Vui lòng điền nội dung câu hỏi cho tất cả các hàng.');
      return;
    }

    const selectedClass = classesList.find(c => String(c.id) === String(selectedClassId));

    // Request GPS location if available or default to null
    const proceedWithLocation = (lat = null, lng = null) => {
      dispatch(createAttendanceForm({
        classId: selectedClassId,
        lectureNumber: parseInt(lectureNumber),
        expiryMinutes: parseInt(expiryMinutes),
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          correctAnswer: q.correctAnswer
        })),
        latitude: lat,
        longitude: lng
      }))
        .unwrap()
        .then((res) => {
          setGeneratedCode(res.code);
          setErrorMsg('');
          // Refresh session forms list immediately!
          fetchForms(selectedClassId, lectureNumber);
        })
        .catch((err) => {
          setErrorMsg(err || 'Không thể tạo buổi điểm danh trên máy chủ!');
        });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          proceedWithLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          proceedWithLocation(null, null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      proceedWithLocation(null, null);
    }
  };

  // Apply overall session attendance rule
  const handleApplyRule = async () => {
    if (!selectedClassId || !lectureNumber) return;
    try {
      await apiFetch(`/teacher/apply-attendance-rule?courseId=${selectedClassId}&lectureNumber=${lectureNumber}&minFormsRequired=${minFormsRequired}`, {
        method: 'POST'
      });
      setRuleFeedback(`Áp dụng thành công! SV cần làm đúng ít nhất ${minFormsRequired}/${sessionForms.length} form.`);
      setTimeout(() => setRuleFeedback(''), 4000);
      // Refresh lists
      fetchForms(selectedClassId, lectureNumber);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể áp dụng quy tắc chuyên cần!');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Delete specific form by ID
  const handleDeleteForm = async (formId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa form điểm danh này? Tất cả lịch sử nộp bài của sinh viên cho form này cũng sẽ bị xóa.')) return;
    try {
      await apiFetch(`/teacher/delete-form?formId=${formId}`, {
        method: 'DELETE'
      });
      fetchForms(selectedClassId, lectureNumber);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể xóa form điểm danh!');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const resetForm = () => {
    setGeneratedCode(null);
    setQuestions([{ id: 1, text: '', correctAnswer: 'true' }]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            <span>Tạo & Quản lý Form điểm danh trắc nghiệm</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Cấu hình câu hỏi trắc nghiệm nhanh, theo dõi danh sách sinh viên hoàn thành real-time và thiết lập quy tắc chuyên cần.</p>
        </div>
      </div>

      {/* Top Configuration selectors */}
      <Card title="Cấu hình Buổi học và Lớp học" className="shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lớp học */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-700 text-sm font-semibold">Chọn lớp học</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setGeneratedCode(null);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            >
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.courseCode} - {c.subject}
                </option>
              ))}
            </select>
          </div>

          {/* Buổi học */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-700 text-sm font-semibold">Buổi học số</label>
            <input
              type="number"
              min="1"
              max="30"
              value={lectureNumber}
              onChange={(e) => {
                setLectureNumber(e.target.value);
                setGeneratedCode(null);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              required
            />
          </div>
        </div>
      </Card>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Create Form Section (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {generatedCode ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-center space-y-6 animate-scaleIn">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800">Tạo form thành công!</h2>
                <p className="text-slate-500 text-xs mt-1">Cung cấp mã CODE sau để sinh viên điểm danh trực tuyến.</p>
              </div>

              {/* Glowing code design */}
              <div className="relative group bg-slate-55 p-5 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center">
                <span className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase">MÃ ĐIỂM DANH</span>
                <div className="font-mono text-4xl font-extrabold tracking-widest text-primary my-1 select-all select-none">
                  {generatedCode}
                </div>
                <div className="text-[10px] font-semibold text-primary mt-1 bg-primary/10 px-2.5 py-0.5 rounded-full">
                  Hạn dùng: {expiryMinutes} phút | {questions.length} câu T/F
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCopyCode}
                  className={`flex-1 text-xs font-semibold px-3 py-2 rounded-xl border flex items-center justify-center gap-1.5 transition duration-200 ${
                    copied
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Sao chép mã</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 bg-primary hover:bg-[#0056b3] active:bg-[#004080] text-white text-xs font-semibold px-3 py-2 rounded-xl transition duration-200 shadow-md shadow-primary/10"
                >
                  Tạo Form tiếp theo
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card title="Thiết lập Form trắc nghiệm mới" className="shadow-sm">
                <div className="space-y-4">
                  {/* Thời gian hết hạn */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-700 text-xs font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Thời gian hết hạn (phút)</span>
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={expiryMinutes}
                      onChange={(e) => setExpiryMinutes(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      required
                    />
                  </div>

                  {/* Danh sách câu hỏi */}
                  <div className="space-y-3 pt-2">
                    <label className="text-slate-700 text-xs font-semibold block">Nội dung câu hỏi Đúng/Sai:</label>
                    
                    {questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-3 relative group transition hover:border-slate-200"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-200/60 text-slate-700 flex items-center justify-center font-bold text-xs">
                            {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(question.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="Xóa câu hỏi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <input
                          type="text"
                          placeholder="Nhập câu hỏi Đúng / Sai..."
                          value={question.text}
                          onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition w-full"
                          required
                        />

                        {/* Answers radio group */}
                        <div className="flex justify-end gap-3 bg-white border border-slate-150 p-1 rounded-xl">
                          <label className="flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg text-xs font-bold transition hover:bg-slate-50">
                            <input
                              type="radio"
                              name={`correctAnswer-${question.id}`}
                              value="true"
                              checked={question.correctAnswer === 'true'}
                              onChange={() => handleQuestionAnswerChange(question.id, 'true')}
                              className="accent-primary w-3.5 h-3.5"
                            />
                            <span className="text-emerald-600">ĐÚNG</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg text-xs font-bold transition hover:bg-slate-50">
                            <input
                              type="radio"
                              name={`correctAnswer-${question.id}`}
                              value="false"
                              checked={question.correctAnswer === 'false'}
                              onChange={() => handleQuestionAnswerChange(question.id, 'false')}
                              className="accent-primary w-3.5 h-3.5"
                            />
                            <span className="text-rose-600">SAI</span>
                          </label>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="w-full flex items-center justify-center gap-1 border border-dashed border-slate-300 hover:border-primary/50 text-slate-600 hover:text-primary py-2 rounded-xl text-xs font-semibold transition duration-200 bg-slate-50/50 hover:bg-primary/5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm câu hỏi Đúng/Sai</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-[#0056b3] active:bg-[#004080] text-white text-sm font-semibold py-3 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-md shadow-primary/10"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Tạo Form & Phát mã PIN</span>
                  </button>
                </div>
              </Card>
            </form>
          )}
        </div>

        {/* RIGHT COLUMN: Created Forms & Rules Configuration Panel (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card title={`Các Form trong buổi ${lectureNumber}`} className="shadow-sm">
            {loadingForms ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-primary animate-spin" />
                <span className="text-xs font-semibold">Đang tải danh sách form...</span>
              </div>
            ) : sessionForms.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-400 space-y-3">
                <BookOpen className="w-10 h-10 mx-auto text-slate-350" />
                <div>
                  <p className="text-sm font-bold text-slate-700">Chưa có form nào cho buổi học này</p>
                  <p className="text-xs text-slate-400 mt-1">Hãy thiết lập câu hỏi và bấm tạo ở cột bên trái</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {sessionForms.map((form, index) => {
                  const isExpanded = expandedFormId === form.id;
                  const isExpired = new Date(form.expiredAt) < new Date();
                  return (
                    <div
                      key={form.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-200"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-lg font-bold text-primary select-all">
                              {form.code}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                isExpired
                                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}
                            >
                              {isExpired ? 'Hết hạn' : 'Hoạt động'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-medium">
                            <span>Form #{index + 1}</span>
                            <span>•</span>
                            <span>{form.questions?.length || 0} câu hỏi</span>
                            <span>•</span>
                            <span>Tạo lúc: {new Date(form.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {(form.latitude || form.longitude) && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-semibold">
                              <MapPin className="w-3 h-3" />
                              <span>Định vị GPS được bật</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setExpandedFormId(isExpanded ? null : form.id)}
                            className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl border transition ${
                              isExpanded
                                ? 'bg-primary/5 text-primary border-primary/20'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{form.successfulStudents?.length || 0} SV</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          <button
                            onClick={() => handleDeleteForm(form.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                            title="Xóa form"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable successful students list */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5 animate-slideDown">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Sinh viên hoàn thành đúng ({form.successfulStudents?.length || 0}):
                            </span>
                          </div>

                          {form.successfulStudents && form.successfulStudents.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                              {form.successfulStudents.map((sv) => (
                                <div
                                  key={sv.id}
                                  className="flex items-center gap-2 bg-emerald-50/50 border border-emerald-100/50 px-3 py-2 rounded-xl transition hover:bg-emerald-50"
                                >
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  <div className="text-xs font-semibold text-slate-700 truncate">
                                    <span className="text-slate-900 font-extrabold font-mono mr-1">
                                      {sv.studentCode}
                                    </span>
                                    - {sv.name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-1 pl-1">Chưa có sinh viên nào trả lời đúng form này.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* ATTENDANCE RULE CONFIG PANEL */}
          {sessionForms.length > 0 && !loadingForms && (
            <Card className="shadow-sm border-primary/20 bg-gradient-to-br from-white to-slate-50/30 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none select-none">
                <Settings className="w-24 h-24 text-primary" />
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-xl text-primary">
                    <Award className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Thiết lập chuyên cần buổi học</h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Tính chuyên cần tổng hợp cho <strong>buổi học số {lectureNumber}</strong>. Sinh viên phải hoàn thành chính xác số form tối thiểu bên dưới để được hệ thống tính là <strong>Có mặt</strong> cho cả buổi học.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white border border-slate-100 p-3 rounded-2xl">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Số lượng Form tối thiểu
                    </label>
                    <select
                      value={minFormsRequired}
                      onChange={(e) => setMinFormsRequired(parseInt(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition w-full cursor-pointer"
                    >
                      {Array.from({ length: sessionForms.length }, (_, i) => i + 1).map((val) => (
                        <option key={val} value={val}>
                          Đúng ít nhất {val} / {sessionForms.length} form
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleApplyRule}
                    className="bg-primary hover:bg-[#0056b3] active:bg-[#004080] text-white text-xs font-bold px-5 py-3 rounded-xl transition duration-200 shadow-md shadow-primary/10 flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-end"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Áp dụng quy tắc</span>
                  </button>
                </div>

                {ruleFeedback && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-semibold animate-fadeIn shadow-sm">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>{ruleFeedback}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
