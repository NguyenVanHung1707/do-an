import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createAttendanceForm } from '../../store/attendanceSlice';
import { Plus, Trash2, Clipboard, Check, Sparkles, AlertCircle } from 'lucide-react';
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

  // Generate a random 6-character code (uppercase letters and numbers)
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Auto-select first class when list loads
  React.useEffect(() => {
    if (classesList.length > 0 && !selectedClassId) {
      setSelectedClassId(classesList[0].id);
    }
  }, [classesList, selectedClassId]);

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
          // Fallback if permission denied or unavailable
          proceedWithLocation(null, null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      proceedWithLocation(null, null);
    }
  };

  const resetForm = () => {
    setGeneratedCode(null);
    setQuestions([{ id: 1, text: '', correctAnswer: 'true' }]);
    setLectureNumber(prev => parseInt(prev) + 1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tạo Form điểm danh trắc nghiệm</h1>
        <p className="text-slate-500 text-sm mt-1">Cấu hình thời gian, nội dung trắc nghiệm nhanh Đúng/Sai và sinh mã PIN điểm danh real-time.</p>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {!generatedCode ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card title="1. Thông tin cấu hình buổi học" className="shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Lớp học */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 text-sm font-semibold">Chọn lớp học</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
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
                  onChange={(e) => setLectureNumber(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  required
                />
              </div>

              {/* Thời gian hết hạn */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 text-sm font-semibold">Hết hạn sau (phút)</label>
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
            </div>
          </Card>

          <Card title="2. Danh sách câu hỏi trắc nghiệm Đúng / Sai" className="shadow-sm">
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-50 border border-slate-100 p-4 rounded-xl relative group transition hover:border-slate-200"
                >
                  {/* Số thứ tự */}
                  <div className="w-8 h-8 rounded-full bg-slate-200/60 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {index + 1}
                  </div>

                  {/* Nội dung câu hỏi */}
                  <div className="flex-1 w-full flex flex-col gap-1.5">
                    <input
                      type="text"
                      placeholder="Nhập nội dung câu hỏi trắc nghiệm nhanh..."
                      value={question.text}
                      onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition w-full"
                      required
                    />
                  </div>

                  {/* Đáp án chuẩn Đúng/Sai */}
                  <div className="flex items-center gap-4 shrink-0 bg-white border border-slate-200 p-1.5 rounded-xl">
                    <label className="flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-lg text-sm font-semibold transition hover:bg-slate-50">
                      <input
                        type="radio"
                        name={`correctAnswer-${question.id}`}
                        value="true"
                        checked={question.correctAnswer === 'true'}
                        onChange={() => handleQuestionAnswerChange(question.id, 'true')}
                        className="accent-primary"
                      />
                      <span className="text-emerald-600">ĐÚNG</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-lg text-sm font-semibold transition hover:bg-slate-50">
                      <input
                        type="radio"
                        name={`correctAnswer-${question.id}`}
                        value="false"
                        checked={question.correctAnswer === 'false'}
                        onChange={() => handleQuestionAnswerChange(question.id, 'false')}
                        className="accent-primary"
                      />
                      <span className="text-rose-600">SAI</span>
                    </label>
                  </div>

                  {/* Nút xóa câu hỏi */}
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(question.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl shrink-0 transition"
                    title="Xóa câu hỏi"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-primary/50 text-slate-600 hover:text-primary py-3 rounded-xl font-semibold transition duration-200 bg-slate-50/50 hover:bg-primary/5"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm câu hỏi Đúng/Sai mới</span>
              </button>
            </div>
          </Card>

          <div className="flex justify-end gap-4">
            <button
              type="submit"
              className="bg-primary hover:bg-[#0056b3] active:bg-[#004080] text-white font-semibold px-8 py-3 rounded-xl transition duration-200 flex items-center gap-2 shadow-md shadow-primary/10"
            >
              <Sparkles className="w-5 h-5" />
              <span>Tạo buổi điểm danh & Phát sinh mã Code</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center space-y-6 animate-scaleIn">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800">Khởi tạo buổi điểm danh thành công!</h2>
            <p className="text-slate-500 text-sm mt-1">Gửi mã CODE sau cho sinh viên lớp học để tiến hành điểm danh trực tuyến.</p>
          </div>

          {/* Giao diện mã code glowing cực nổi bật */}
          <div className="relative group bg-slate-55 p-6 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">MÃ ĐIỂM DANH</span>
            <div className="font-mono text-5xl font-extrabold tracking-widest text-primary my-2 select-all drop-shadow-sm select-none">
              {generatedCode}
            </div>
            <div className="text-xs font-semibold text-primary mt-1 bg-primary/10 px-3 py-1 rounded-full">
              Hạn dùng: {expiryMinutes} phút | {questions.length} câu hỏi T/F
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleCopyCode}
              className={`flex-1 font-semibold px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 transition duration-200 ${
                copied
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-4 h-4" />
                  <span>Sao chép mã Code</span>
                </>
              )}
            </button>
            <button
              onClick={resetForm}
              className="flex-1 bg-primary hover:bg-[#0056b3] active:bg-[#004080] text-white font-semibold px-4 py-2.5 rounded-xl transition duration-200 shadow-md shadow-primary/10"
            >
              Tạo buổi học mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
