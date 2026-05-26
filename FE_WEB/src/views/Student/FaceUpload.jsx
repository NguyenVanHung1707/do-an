import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadStudentFace, fetchStudentFace } from '../../store/attendanceSlice';
import { UploadCloud, CheckCircle2, User, RefreshCw, Trash2, Camera, ShieldCheck } from 'lucide-react';
import Card from '../../components/Common/Card';
import WebcamCapture from '../../components/Webcam/WebcamCapture';

export default function FaceUpload() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const registeredFaceUrl = useSelector((state) => state.attendance.registeredFaceUrl);
  const loading = useSelector((state) => state.attendance.loading);

  const [imagePreview, setImagePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [captureMode, setCaptureMode] = useState('camera');

  useEffect(() => {
    dispatch(fetchStudentFace());
  }, [dispatch]);

  useEffect(() => {
    if (registeredFaceUrl) {
      setImagePreview(registeredFaceUrl);
      setSuccessMsg('Khuôn mặt đã được xác thực thành công trên cơ sở dữ liệu hệ thống.');
    }
  }, [registeredFaceUrl]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  // Convert file to base64
  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
      setSuccessMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (dataUri) => {
    setImagePreview(dataUri);
    setSuccessMsg('');
  };

  // Drag and drop events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Dispatch action to Redux store
  const handleRegisterFace = () => {
    setIsScanning(true);
    dispatch(uploadStudentFace({
      image: imagePreview
    }))
      .unwrap()
      .then(() => {
        setIsScanning(false);
        setSuccessMsg('Đăng ký khuôn mặt thành công! Hệ thống đã học đặc trưng sinh trắc học của bạn.');
      })
      .catch((err) => {
        setIsScanning(false);
        // Error is set in state, but we can also handle here if needed
      });
  };

  // Reset uploader
  const handleReset = () => {
    setImagePreview(null);
    setSuccessMsg('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Cấu hình nhận diện khuôn mặt</h1>
        <p className="text-slate-500 text-sm mt-1">
          Khai báo ảnh chân dung sinh trắc học cá nhân giúp hệ thống điểm danh tự động bằng Camera tại lớp học.
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3.5 rounded-xl flex items-start gap-3 shadow-sm animate-scaleIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">{successMsg}</p>
            <p className="text-xs text-emerald-600/80 mt-0.5">Trạng thái: Đặc trưng khuôn mặt đã sẵn sàng điểm danh AI.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left Side Instructions */}
        <div className="md:col-span-2 space-y-4">
          <Card title="Yêu cầu hình ảnh mẫu" className="shadow-sm">
            <ul className="text-xs text-slate-500 space-y-3 font-semibold">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">1</span>
                <span>Ảnh chụp thẳng mặt, cận cảnh, nhìn rõ mắt, mũi, miệng.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">2</span>
                <span>Độ sáng đầy đủ, nền trung tính (tường trắng/xanh).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">3</span>
                <span>Không đeo kính râm, mũ bảo hiểm, khẩu trang che mặt.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">4</span>
                <span>Độ phân giải tối thiểu 400x400 px, định dạng JPG/PNG.</span>
              </li>
            </ul>
          </Card>

          {registeredFaceUrl && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center gap-3 text-white">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Bảo mật dữ liệu</p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Hình ảnh sinh trắc học của bạn được mã hóa hoàn toàn và chỉ sử dụng cho mục đích kiểm tra điểm danh trên lớp.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Uploader */}
        <div className="md:col-span-3">
          <Card title="Khu vực đăng ký ảnh chân dung" className="shadow-sm h-full flex flex-col justify-between">
            {!imagePreview && (
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setCaptureMode('camera')}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    captureMode === 'camera'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp bằng camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureMode('upload')}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    captureMode === 'upload'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Tải ảnh lên</span>
                </button>
              </div>
            )}
            {!imagePreview ? (
              captureMode === 'camera' ? (
                <WebcamCapture
                  onCapture={handleCameraCapture}
                  emptyLabel="Camera đang tắt"
                  startLabel="Mở camera để chụp khuôn mặt"
                  captureLabel="Chụp ảnh khuôn mặt"
                  confirmLabel="Dùng ảnh này"
                  previewBadge="ẢNH KHUÔN MẶT"
                />
              ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center min-h-[300px] transition duration-200 cursor-pointer select-none ${
                  dragActive
                    ? 'border-primary bg-primary/5 scale-[0.99]'
                    : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  id="face-image-input"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="face-image-input" className="cursor-pointer space-y-4 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner group-hover:scale-110 transition duration-300">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-slate-700 font-bold text-sm">Kéo thả ảnh hoặc Nhấp để chọn file</p>
                    <p className="text-slate-400 text-xs mt-1">Hỗ trợ các định dạng PNG, JPG, JPEG dung lượng &lt; 5MB</p>
                  </div>
                  <span className="inline-block bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#0056b3] transition duration-150 shadow-md shadow-primary/10">
                    Chọn file ảnh từ thiết bị
                  </span>
                </label>
              </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                {/* Circular scanner overlay simulator */}
                <div className="relative w-52 h-52 rounded-full overflow-hidden border-4 border-primary bg-slate-100 flex items-center justify-center shadow-lg group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-full"
                  />
                  
                  {/* Neon laser scan bar overlay when scanning */}
                  {isScanning && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#22d3ee] animate-scan-laser top-0" />
                  )}
                  
                  {/* Soft scanner grid overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-primary/10 mix-blend-overlay" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm">Xem trước ảnh chân dung</h4>
                  <p className="text-slate-400 text-xs font-mono">MSSV: {user.code} | {user.fullName}</p>
                </div>

                <div className="flex gap-3 w-full max-w-sm pt-2">
                  <button
                    onClick={handleReset}
                    disabled={isScanning}
                    className="flex-1 font-semibold px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>Hủy ảnh</span>
                  </button>
                  <button
                    onClick={handleRegisterFace}
                    disabled={isScanning}
                    className="flex-1 bg-primary hover:bg-[#0056b3] active:bg-[#004080] text-white font-semibold px-4 py-2.5 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-md shadow-primary/10 disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang phân tích...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Đăng ký sinh trắc</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
