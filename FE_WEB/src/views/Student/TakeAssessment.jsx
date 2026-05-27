import React, { useState, useEffect, useRef } from 'react';
import Card from '../../components/Common/Card';
import { ArrowLeft, Clock, Save, Wifi, WifiOff, AlertTriangle, ChevronLeft, ChevronRight, HelpCircle, Send, MapPin } from 'lucide-react';
import { apiFetch } from '../../services/api';

export default function TakeAssessment({ assessmentId, submissionId, courseId, onBack }) {
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({}); // questionId -> { selectedChoice, answerText }
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [autoSaveStatus, setAutoSaveStatus] = useState('Đang đồng bộ...');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debouncing refs
  const saveTimeoutRef = useRef({});

  // Timer Ref
  const timerRef = useRef(null);

  // Synchronize offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setAutoSaveStatus('Đang đồng bộ dữ liệu ngoại tuyến...');
      syncOfflineAnswers();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setAutoSaveStatus('Đang ngoại tuyến - Đã lưu nháp vào bộ nhớ máy');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [answers, submissionId]);

  // Load assessment metadata and existing session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const detail = await apiFetch(`/submissions/${submissionId}/grades`);
        if (detail) {
          // Initialize answers from existing sub
          const ansMap = {};
          detail.answers?.forEach(ans => {
            ansMap[ans.questionId] = {
              selectedChoice: ans.selectedChoice || '',
              answerText: ans.answerText || ''
            };
          });
          setAnswers(ansMap);
        }

        // Let's load the assessment details by fetching from the course's assessments list
        const assDetail = await apiFetch(`/courses/${courseId}/assessments`);
        // Let's search by ID
        const matched = assDetail?.find(a => a.id === assessmentId);
        if (matched) {
          setAssessment(matched);
          
          // Setup countdown timer
          if (matched.durationMinutes && detail) {
            // Started time is detail.startedAt
            const startInstant = new Date(detail.startedAt).getTime();
            const durationMillis = matched.durationMinutes * 60 * 1000;
            const expiryTime = startInstant + durationMillis;
            
            const updateTimer = () => {
              const now = Date.now();
              const diff = expiryTime - now;
              if (diff <= 0) {
                setTimeLeft(0);
                clearInterval(timerRef.current);
                handleAutoSubmit();
              } else {
                setTimeLeft(Math.floor(diff / 1000));
              }
            };

            updateTimer();
            timerRef.current = setInterval(updateTimer, 1000);
          }
        } else {
          throw new Error('Không tìm thấy thông tin bài thi này trong khóa học.');
        }
      } catch (e) {
        console.error('Lỗi khi tải phiên làm bài:', e);
        alert(e.message || 'Có lỗi xảy ra khi tải đề thi.');
        onBack();
      }
    };
    loadSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [assessmentId, submissionId, courseId]);

  // Sync offline answers stored in localStorage
  const syncOfflineAnswers = async () => {
    const offlineKey = `submission:offline:${submissionId}`;
    const stored = localStorage.getItem(offlineKey);
    if (!stored) {
      setAutoSaveStatus('Đã lưu mọi thay đổi.');
      return;
    }

    try {
      const storedAnswers = JSON.parse(stored);
      for (const qId of Object.keys(storedAnswers)) {
        await apiFetch(`/submissions/${submissionId}/save-draft`, {
          method: 'POST',
          body: JSON.stringify({
            questionId: parseInt(qId),
            selectedChoice: storedAnswers[qId].selectedChoice,
            answerText: storedAnswers[qId].answerText
          })
        });
      }
      localStorage.removeItem(offlineKey);
      setAutoSaveStatus('Đã đồng bộ thành công lên máy chủ!');
    } catch (e) {
      console.error(e);
      setAutoSaveStatus('Có lỗi đồng bộ: Chờ kết nối tốt hơn...');
    }
  };

  // Perform debounced save to backend
  const triggerAutoSave = (questionId, selectedChoice, answerText) => {
    setAutoSaveStatus('Đang tự động lưu nháp...');

    // Save to LocalStorage first (safety net)
    const offlineKey = `submission:offline:${submissionId}`;
    const localStored = localStorage.getItem(offlineKey);
    const offlineMap = localStored ? JSON.parse(localStored) : {};
    offlineMap[questionId] = { selectedChoice, answerText };
    localStorage.setItem(offlineKey, JSON.stringify(offlineMap));

    // Clear previous timeout for this question
    if (saveTimeoutRef.current[questionId]) {
      clearTimeout(saveTimeoutRef.current[questionId]);
    }

    if (navigator.onLine) {
      saveTimeoutRef.current[questionId] = setTimeout(async () => {
        try {
          await apiFetch(`/submissions/${submissionId}/save-draft`, {
            method: 'POST',
            body: JSON.stringify({
              questionId,
              selectedChoice,
              answerText
            })
          });
          
          // Remove from offline list upon successful backend save
          const currentOffline = localStorage.getItem(offlineKey);
          if (currentOffline) {
            const map = JSON.parse(currentOffline);
            delete map[questionId];
            if (Object.keys(map).length === 0) {
              localStorage.removeItem(offlineKey);
            } else {
              localStorage.setItem(offlineKey, JSON.stringify(map));
            }
          }

          setAutoSaveStatus(`Đã tự động lưu nháp lúc ${new Date().toLocaleTimeString('vi-VN')}`);
        } catch (e) {
          console.error(e);
          setAutoSaveStatus('Lỗi kết nối. Bài thi đang được bảo lưu tại thiết bị.');
        }
      }, 2000); // 2-second debounce
    } else {
      setAutoSaveStatus('Đang ngoại tuyến. Bài thi được tự động lưu tạm trên máy.');
    }
  };

  const handleChoiceSelect = (qId, choiceKey) => {
    const currentAns = answers[qId] || { selectedChoice: '', answerText: '' };
    const updated = {
      ...answers,
      [qId]: { ...currentAns, selectedChoice: choiceKey }
    };
    setAnswers(updated);
    triggerAutoSave(qId, choiceKey, currentAns.answerText);
  };

  const handleTextChange = (qId, text) => {
    const currentAns = answers[qId] || { selectedChoice: '', answerText: '' };
    const updated = {
      ...answers,
      [qId]: { ...currentAns, answerText: text }
    };
    setAnswers(updated);
    triggerAutoSave(qId, currentAns.selectedChoice, text);
  };

  const getCurrentBrowserLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ lấy vị trí GPS.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      }),
      () => reject(new Error('Vui lòng cấp quyền vị trí để tiếp tục.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  const handleManualSubmit = async () => {
    if (!confirm('Bạn có chắc chắn muốn nộp bài thi ngay lập tức? Sau khi nộp sẽ không thể chỉnh sửa!')) return;
    executeSubmit();
  };

  const handleAutoSubmit = () => {
    setIsSubmitting(true);
    setAutoSaveStatus('HẾT GIỜ! Đang tự động nộp bài...');
    executeSubmit(true);
  };

  const executeSubmit = async (isAuto = false) => {
    setIsSubmitting(true);
    try {
      const options = { method: 'POST' };
      if (assessment?.isLocationRequired) {
        const location = await getCurrentBrowserLocation();
        options.body = JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          mockLocationDetected: false
        });
      }
      const res = await apiFetch(`/submissions/${submissionId}/submit`, options);
      if (res) {
        alert(isAuto ? 'Hết giờ làm bài! Hệ thống đã tự động khóa và nộp bài thi của bạn.' : 'Nộp bài thi thành công!');
        onBack();
      }
    } catch (e) {
      alert('Không thể nộp bài: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    if (secs === null) return 'Đang tính';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!assessment) {
    return (
      <div className="flex flex-col justify-center items-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-slate-400 text-sm">Đang tải đề thi và đồng bộ phiên làm bài...</p>
      </div>
    );
  }

  const currentQuestion = assessment.questions?.[currentQIdx];
  const totalQuestions = assessment.questions?.length || 0;

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">{assessment.title}</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Phân loại: {assessment.type} | Số câu: {totalQuestions}</p>
          {assessment.isLocationRequired && (
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Yêu cầu vị trí trong bán kính {assessment.allowedRadiusMeters || 100}m khi nộp bài</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Network Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${
            isOffline ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
          }`}>
            {isOffline ? (
              <>
                <WifiOff className="w-4 h-4" /> Ngoại tuyến
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" /> Trực tuyến
              </>
            )}
          </div>

          {/* Countdown Clock */}
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-sm ${
              timeLeft < 300 ? 'border-rose-200 bg-rose-50 text-rose-600 animate-pulse' : 'border-primary/20 bg-primary/5 text-primary'
            }`}>
              <Clock className="w-4 h-4" />
              <span>CÒN LẠI: {formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* SIDEBAR: QUESTION NAVIGATOR */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Sơ đồ Câu hỏi">
            <div className="grid grid-cols-5 gap-2.5">
              {assessment.questions?.map((q, idx) => {
                const isAnswered = answers[q.id]?.selectedChoice || answers[q.id]?.answerText;
                const isCurrent = idx === currentQIdx;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQIdx(idx)}
                    className={`h-10 rounded-xl font-bold font-mono text-xs transition-all flex items-center justify-center ${
                      isCurrent
                        ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/20'
                        : isAnswered
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {(idx + 1).toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-semibold space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block"></span>
                <span>Màu xanh: Câu hỏi đã lưu nháp</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block"></span>
                <span>Màu xám: Câu hỏi chưa trả lời</span>
              </div>
            </div>

            <button
              onClick={handleManualSubmit}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 mt-6 px-4 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 text-xs"
            >
              <Send className="w-4 h-4" />
              NỘP BÀI THI
            </button>
          </Card>
        </div>

        {/* QUESTION PANEL */}
        <div className="lg:col-span-3 space-y-4">
          {currentQuestion ? (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase font-mono">
                  Câu hỏi {(currentQIdx + 1).toString().padStart(2, '0')}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  [ Loại bài: {currentQuestion.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : currentQuestion.type === 'SHORT_ANSWER' ? 'Trả lời ngắn' : 'Tự luận'} | Điểm: {currentQuestion.score} ]
                </span>
              </div>

              {/* Question Content */}
              <div className="text-sm font-bold text-slate-800 leading-relaxed">
                {currentQuestion.content}
              </div>

              {/* Answers Inputs */}
              {currentQuestion.type === 'MULTIPLE_CHOICE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    try {
                      const meta = JSON.parse(currentQuestion.metadata || '{}');
                      return meta.choices?.map((c) => {
                        const isSelected = answers[currentQuestion.id]?.selectedChoice === c.key;
                        return (
                          <button
                            key={c.key}
                            onClick={() => handleChoiceSelect(currentQuestion.id, c.key)}
                            className={`flex items-center gap-4 px-5 py-4 rounded-xl border text-left text-xs font-bold transition-all duration-200 ${
                              isSelected
                                ? 'border-primary bg-primary/5 text-primary scale-[1.01] shadow-md shadow-primary/5'
                                : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black font-mono border text-xs ${
                              isSelected ? 'bg-primary border-primary text-white' : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}>
                              {c.key}
                            </span>
                            <span>{c.text}</span>
                          </button>
                        );
                      });
                    } catch (e) {
                      return <p className="text-rose-500 text-xs">Lỗi hiển thị đáp án câu hỏi.</p>;
                    }
                  })()}
                </div>
              )}

              {currentQuestion.type === 'SHORT_ANSWER' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Nhập câu trả lời ngắn của bạn tại đây</label>
                  <input
                    type="text"
                    placeholder="Nhập đáp án ngắn..."
                    value={answers[currentQuestion.id]?.answerText || ''}
                    onChange={(e) => handleTextChange(currentQuestion.id, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold"
                  />
                </div>
              )}

              {currentQuestion.type === 'ESSAY' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Trình bày bài giải tự luận của bạn tại đây</label>
                  <textarea
                    rows={8}
                    placeholder="Viết bài giải chi tiết..."
                    value={answers[currentQuestion.id]?.answerText || ''}
                    onChange={(e) => handleTextChange(currentQuestion.id, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm leading-relaxed"
                  />
                </div>
              )}

              {/* Bottom save feedback bar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[10px] font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  {autoSaveStatus}
                </span>

                <div className="flex gap-2">
                  <button
                    disabled={currentQIdx === 0}
                    onClick={() => setCurrentQIdx(currentQIdx - 1)}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-30 rounded-lg transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={currentQIdx === totalQuestions - 1}
                    onClick={() => setCurrentQIdx(currentQIdx + 1)}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-30 rounded-lg transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-12 text-center text-slate-400">
              <HelpCircle className="w-16 h-16 mx-auto stroke-[1] mb-4 text-slate-300" />
              <p className="font-bold text-sm">Không tìm thấy câu hỏi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
