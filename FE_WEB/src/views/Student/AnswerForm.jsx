import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { submitStudentAttendance, fetchFormByCode } from '../../store/attendanceSlice';
import { ShieldCheck, MapPin, CheckCircle2, ChevronRight, Lock, HelpCircle, Navigation, Info, Camera, RefreshCw } from 'lucide-react';
import Card from '../../components/Common/Card';
import WebcamCapture from '../../components/Webcam/WebcamCapture';

const dataURLtoFile = (dataUrl, filename) => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(arr[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
};

const getDetectFaceUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  return hostname === 'localhost'
    ? 'http://localhost:8888/attendance'
    : `${protocol}//${hostname}/detect-face/attendance`;
};

export default function AnswerForm() {
  const dispatch = useDispatch();

  // Flow states
  const [step, setStep] = useState(1); // Step 1: Input Code, Step 2: Answer Questions & Location
  const [pinCode, setPinCode] = useState('');
  const [selectedForm, setSelectedForm] = useState(null);
  
  // Quiz answers state: mapping questionId -> 'true' or 'false'
  const [answers, setAnswers] = useState({});
  
  // Geolocation states
  const [coords, setCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [faceImageBase64, setFaceImageBase64] = useState(null);
  const [isFaceCaptureOpen, setIsFaceCaptureOpen] = useState(false);
  const [isFaceProcessing, setIsFaceProcessing] = useState(false);
  const [faceRecognitionResult, setFaceRecognitionResult] = useState(null);
  const [faceRecognitionError, setFaceRecognitionError] = useState('');

  // Success screen state
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch location automatically only when the form requires geofencing
  useEffect(() => {
    if (step === 2 && selectedForm?.isLocationRequired) {
      fetchLocation();
    }
  }, [step, selectedForm?.isLocationRequired]);

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Trình duyệt của bạn không hỗ trợ định vị địa lý (GPS).');
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Quyền truy cập vị trí bị từ chối. Vui lòng cho phép trình duyệt truy cập GPS để điểm danh.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Không thể xác định vị trí hiện tại. Vui lòng kiểm tra GPS của thiết bị.');
            break;
          case error.TIMEOUT:
            setLocationError('Yêu cầu định vị quá thời gian phản hồi. Hãy nhấp tải lại vị trí.');
            break;
          default:
            setLocationError('Lỗi định vị vị trí không xác định.');
        }
      },
      options
    );
  };

  // Step 1 check PIN code
  const handleVerifyCode = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (pinCode.trim().length !== 8) {
      setErrorMsg('Mã PIN điểm danh phải có độ dài chính xác 8 ký tự.');
      return;
    }

    const codeTrimmed = pinCode.trim();
    
    dispatch(fetchFormByCode(codeTrimmed))
      .unwrap()
      .then((form) => {
        setSelectedForm(form);
        setCoords(null);
        setLocationError('');
        setFaceImageBase64(null);
        setIsFaceCaptureOpen(false);
        setIsFaceProcessing(false);
        setFaceRecognitionResult(null);
        setFaceRecognitionError('');
        // Initialize empty answers
        const initialAnswers = {};
        form.questions.forEach(q => {
          initialAnswers[q.id] = '';
        });
        setAnswers(initialAnswers);
        setStep(2);
      })
      .catch((err) => {
        setErrorMsg(err || 'Mã PIN điểm danh không tồn tại, đã hết hạn hoặc không chính xác.');
      });
  };

  // Answer selection
  const handleSelectAnswer = (qId, option) => {
    setAnswers({
      ...answers,
      [qId]: option
    });
  };

  const handleFaceCapture = async (image) => {
    setFaceImageBase64(image);
    setIsFaceCaptureOpen(false);
    setFaceRecognitionResult(null);
    setFaceRecognitionError('');

    if (!selectedForm?.studentId) {
      setFaceRecognitionError('Không tìm thấy thông tin sinh viên để đối chiếu khuôn mặt.');
      return;
    }

    setIsFaceProcessing(true);
    try {
      const formData = new FormData();
      formData.append('image_file', dataURLtoFile(image, 'attendance_face.jpg'));
      formData.append('image_ids', String(selectedForm.studentId));

      const response = await fetch(getDetectFaceUrl(), {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Máy chủ AI không xử lý được ảnh khuôn mặt.');
      }

      const data = await response.json();
      const attendance = Array.isArray(data) ? data : (data.attendance || []);
      const faces = Array.isArray(data) ? [] : (data.faces || []);
      const isVerified = attendance.some((item) => Number(item.id) === Number(selectedForm.studentId) && item.isAttendance);

      setFaceRecognitionResult({
        faces,
        isVerified,
        studentName: selectedForm.studentName || 'Sinh viên'
      });

      if (!isVerified) {
        setFaceRecognitionError('AI chưa xác thực được khuôn mặt chính chủ. Vui lòng chụp lại ảnh rõ mặt hơn.');
      }
    } catch (err) {
      setFaceRecognitionError(err.message || 'Không thể kết nối máy chủ AI để xác thực khuôn mặt.');
    } finally {
      setIsFaceProcessing(false);
    }
  };

  // Submit form
  const handleSubmitAttendance = (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Verify all questions are answered
    if (Object.values(answers).some(ans => ans === '')) {
      setErrorMsg('Vui lòng hoàn thành đầy đủ tất cả câu hỏi trắc nghiệm.');
      return;
    }

    if (selectedForm?.isLocationRequired && !coords) {
      setErrorMsg('Hệ thống yêu cầu tọa độ GPS để xác minh bạn đang ở phòng học. Hãy nhấp cho phép lấy vị trí.');
      return;
    }

    if (selectedForm?.isFaceVerificationRequired && !faceImageBase64) {
      setErrorMsg('Vui lòng chụp ảnh khuôn mặt để xác thực chính chủ trước khi nộp điểm danh.');
      return;
    }

    if (selectedForm?.isFaceVerificationRequired && isFaceProcessing) {
      setErrorMsg('Hệ thống đang xử lý ảnh khuôn mặt. Vui lòng chờ hoàn tất trước khi nộp điểm danh.');
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('vi-VN');
    const formattedTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // Dispatch attendance submit to Redux
    dispatch(submitStudentAttendance({
      code: selectedForm.code,
      answers,
      latitude: coords?.lat || null,
      longitude: coords?.lng || null,
      mockLocationDetected: false,
      faceImageBase64
    }))
      .unwrap()
      .then(() => {
        setSuccessData({
          subject: selectedForm.subject || 'Lớp học trực tuyến',
          lectureNumber: selectedForm.lectureNumber,
          time: formattedTime,
          date: formattedDate,
          coords
        });
      })
      .catch((err) => {
        setErrorMsg(err || 'Nộp bài điểm danh thất bại!');
      });
  };

  const handleReset = () => {
    setStep(1);
    setPinCode('');
    setSelectedForm(null);
    setAnswers({});
    setCoords(null);
    setFaceImageBase64(null);
    setIsFaceCaptureOpen(false);
    setIsFaceProcessing(false);
    setFaceRecognitionResult(null);
    setFaceRecognitionError('');
    setSuccessData(null);
    setErrorMsg('');
  };

  if (successData) {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center space-y-6 animate-scaleIn">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-8 h-8 stroke-[3]" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-800">Điểm danh trắc nghiệm thành công!</h2>
          <p className="text-slate-500 text-sm mt-1">Thông tin chuyên cần của bạn đã được ghi nhận trên hệ thống lớp học.</p>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-left space-y-3 font-semibold text-xs text-slate-600">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
            <span>Môn học:</span>
            <span className="text-slate-800 font-bold">{successData.subject}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
            <span>Buổi học:</span>
            <span className="text-slate-800 font-bold">Buổi số {successData.lectureNumber}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
            <span>Thời gian:</span>
            <span className="text-slate-800 font-bold font-mono">{successData.time} - {successData.date}</span>
          </div>
          {successData.coords && (
            <div className="flex justify-between items-start">
              <span>Tọa độ xác thực:</span>
              <span className="text-primary font-mono text-right">
                Lat: {successData.coords.lat.toFixed(6)}<br />
                Lon: {successData.coords.lng.toFixed(6)}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleReset}
          className="w-full bg-primary hover:bg-[#0056b3] active:bg-[#004080] text-white font-semibold py-3 rounded-xl transition duration-200 shadow-md shadow-primary/10"
        >
          Trở lại màn hình nhập mã
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Trả lời Form điểm danh</h1>
        <p className="text-slate-500 text-sm mt-1">Nhập mã PIN trắc nghiệm lớp học và xác thực vị trí lớp học thời gian thực.</p>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm animate-shake">
          <Info className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {step === 1 ? (
        <Card title="Xác minh mã PIN buổi học" className="shadow-sm">
          <form onSubmit={handleVerifyCode} className="space-y-6 py-4 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2 max-w-sm">
              <h3 className="font-bold text-slate-700 text-base">Nhập mã 6 ký tự do giảng viên cung cấp</h3>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Mã Code có giá trị trong thời gian giới hạn của buổi học hiện tại nhằm chống gian lận điểm danh.
              </p>
            </div>

            {/* Giant Input Code Box */}
            <div className="w-full max-w-xs pt-4">
              <input
                type="text"
                maxLength="8"
                placeholder="VD: WUtpvpYH"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full text-center font-mono text-2xl font-extrabold tracking-[0.2em] bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 text-slate-700 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-lg"
                required
              />
            </div>

            <button
              type="submit"
              className="mt-6 w-full max-w-xs bg-primary hover:bg-[#0056b3] active:bg-[#004080] text-white font-semibold py-3 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-md shadow-primary/10"
            >
              <span>Tiến hành điểm danh</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>
        </Card>
      ) : (
        <form onSubmit={handleSubmitAttendance} className="space-y-6">
          {/* Active Session Info */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-0.5 rounded-full">
                FORM ĐANG MỞ
              </span>
              <h3 className="font-bold text-slate-800 text-lg mt-1.5 leading-snug">{selectedForm.subject}</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">Buổi học số {selectedForm.lectureNumber}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block">MÃ XÁC THỰC</span>
              <span className="font-mono text-xl font-black text-primary tracking-wider">{selectedForm.code}</span>
            </div>
          </div>

          {/* Location Verification Box */}
          <Card title="Xác thực vị trí hiện tại (GPS)" className="shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-1">
              <div className="flex gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  coords ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 text-sm">Định vị địa lý sinh viên</h4>
                  {coords ? (
                    <p className="text-xs text-emerald-600 font-mono font-bold mt-0.5">
                      Đã ghi nhận tọa độ GPS: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                    </p>
                  ) : !selectedForm?.isLocationRequired ? (
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Form này không bắt buộc kiểm tra vị trí.
                    </p>
                  ) : locationLoading ? (
                    <p className="text-xs text-slate-400 font-medium animate-pulse mt-0.5">
                      Đang kết nối vệ tinh GPS để lấy vị trí hiện tại...
                    </p>
                  ) : locationError ? (
                    <p className="text-xs text-rose-500 font-semibold mt-0.5 leading-relaxed">{locationError}</p>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Chưa định vị được tọa độ. Yêu cầu bật định vị trình duyệt.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={fetchLocation}
                disabled={locationLoading}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl transition duration-150 flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <Navigation className={`w-3.5 h-3.5 ${locationLoading ? 'animate-spin' : ''}`} />
                <span>{coords ? 'Tải lại vị trí' : 'Lấy vị trí'}</span>
              </button>
            </div>
          </Card>

          {selectedForm?.isFaceVerificationRequired && (
            <Card title="Xác thực khuôn mặt chính chủ" className="shadow-sm">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      faceImageBase64 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-700 text-sm">Ảnh khuôn mặt sinh viên</h4>
                      {faceImageBase64 ? (
                        <p className="text-xs text-emerald-600 font-bold mt-0.5">
                          Đã chụp ảnh khuôn mặt. Bạn có thể chụp lại nếu ảnh chưa rõ.
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 font-semibold mt-0.5">
                          Form này yêu cầu chụp ảnh khuôn mặt trước khi nộp điểm danh.
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFaceCaptureOpen(true);
                      setFaceRecognitionResult(null);
                      setFaceRecognitionError('');
                    }}
                    className={`border font-semibold text-xs px-4 py-2 rounded-xl transition duration-150 flex items-center gap-1.5 shrink-0 shadow-sm ${
                      faceImageBase64
                        ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        : 'bg-primary border-primary text-white hover:bg-[#0056b3]'
                    }`}
                  >
                    {faceImageBase64 ? <RefreshCw className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                    <span>{faceImageBase64 ? 'Chụp lại' : 'Chụp ảnh khuôn mặt'}</span>
                  </button>
                </div>

                {faceImageBase64 && !isFaceCaptureOpen && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-black max-w-md">
                    <img
                      src={faceImageBase64}
                      alt="Ảnh khuôn mặt đã chụp"
                      className="w-full aspect-video object-cover transform -scale-x-100 opacity-95"
                    />
                    {!isFaceProcessing && faceRecognitionResult?.faces?.map((face, idx) => {
                      const [left, top, width, height] = face.box;
                      const identified = Boolean(face.identified);
                      const label = identified
                        ? (face.studentName || faceRecognitionResult.studentName)
                        : 'Chưa xác thực';
                      return (
                        <div
                          key={idx}
                          className={`absolute border-2 rounded shadow-lg ${
                            identified ? 'border-emerald-500 shadow-emerald-500/20' : 'border-rose-500 shadow-rose-500/20'
                          }`}
                          style={{
                            left: `${100 - left - width}%`,
                            top: `${top}%`,
                            width: `${width}%`,
                            height: `${height}%`
                          }}
                        >
                          <span className={`absolute -top-6 left-0 text-white text-[9px] font-black font-mono px-1.5 py-0.5 rounded shadow whitespace-nowrap ${
                            identified ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                    {isFaceProcessing && (
                      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center text-center px-4">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
                        <p className="text-sm font-semibold text-slate-100">Đang xử lý ảnh khuôn mặt...</p>
                        <p className="text-xs text-slate-300 mt-1">AI đang phát hiện khuôn mặt và đối chiếu với hồ sơ của bạn</p>
                      </div>
                    )}
                  </div>
                )}

                {faceRecognitionResult && !isFaceProcessing && (
                  <div className={`text-xs font-bold px-3 py-2 rounded-xl border ${
                    faceRecognitionResult.isVerified
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                    {faceRecognitionResult.isVerified
                      ? `Đã xác thực khuôn mặt: ${faceRecognitionResult.studentName}`
                      : 'Chưa xác thực được khuôn mặt chính chủ'}
                  </div>
                )}

                {faceRecognitionError && (
                  <div className="text-xs font-semibold px-3 py-2 rounded-xl border bg-amber-50 border-amber-200 text-amber-700">
                    {faceRecognitionError}
                  </div>
                )}

                {isFaceCaptureOpen && (
                  <WebcamCapture
                    onCapture={handleFaceCapture}
                    emptyLabel="Camera xác thực khuôn mặt đang tắt"
                    startLabel="Mở camera để chụp khuôn mặt"
                    captureLabel="Chụp ảnh khuôn mặt"
                    confirmLabel="Dùng ảnh này"
                    previewBadge="ẢNH XÁC THỰC"
                  />
                )}
              </div>
            </Card>
          )}

          {/* Quiz list */}
          <Card title="Câu hỏi trắc nghiệm kiểm tra nhanh" className="shadow-sm">
            <div className="space-y-6">
              {selectedForm.questions.map((q, index) => (
                <div key={q.id} className="space-y-3 pb-5 border-b border-slate-100 last:border-b-0 last:pb-0">
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <h4 className="font-bold text-slate-700 text-sm leading-relaxed">
                      {q.content || q.text}
                    </h4>
                  </div>

                  {/* True/False Choices */}
                  <div className="flex items-center gap-4 pl-7 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSelectAnswer(q.id, 'true')}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 border px-6 py-2 rounded-xl font-bold text-xs transition duration-200 ${
                        answers[q.id] === 'true'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm shadow-emerald-50'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>ĐÚNG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAnswer(q.id, 'false')}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 border px-6 py-2 rounded-xl font-bold text-xs transition duration-200 ${
                        answers[q.id] === 'false'
                          ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm shadow-rose-50'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4 text-rose-600" />
                      <span>SAI</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-xl transition duration-150 shadow-sm"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={isFaceProcessing}
              className="bg-primary hover:bg-[#0056b3] active:bg-[#004080] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition duration-200 flex items-center gap-2 shadow-md shadow-primary/10"
            >
              {isFaceProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              <span>Nộp kết quả điểm danh</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
