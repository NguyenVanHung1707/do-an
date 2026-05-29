import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { detectGroupFaceAttendance, clearPhotoResult } from '../../store/attendanceSlice';
import { apiFetch } from '../../services/api';
import Card from '../../components/Common/Card';
import WebcamCapture from '../../components/Webcam/WebcamCapture';
import {
  Camera,
  Upload,
  ArrowRight,
  UserCheck,
  AlertCircle,
  RefreshCcw,
  Smile,
  X,
  Users,
  Check
} from 'lucide-react';

export default function PhotoAttendance() {
  const { classesList } = useSelector((state) => state.classes);
  const { photoAttendanceResult } = useSelector((state) => state.attendance);
  const dispatch = useDispatch();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [lectureNumber, setLectureNumber] = useState(1);
  const [attendanceMethod, setAttendanceMethod] = useState('webcam'); // webcam or upload
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // States for Preview & Confirmation Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewStudents, setPreviewStudents] = useState([]);
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  const selectedClass = classesList.find((c) => String(c.id) === String(selectedClassId));

  const handleCapture = (imageData) => {
    setUploadedImage(imageData);
    processFaceRecognition(imageData);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result);
        processFaceRecognition(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processFaceRecognition = (image) => {
    if (!selectedClassId) {
      alert('Vui lòng chọn lớp học trước khi tiến hành nhận diện!');
      return;
    }
    const studentIds = selectedClass ? selectedClass.students.map(s => s.id) : [];
    if (studentIds.length === 0) {
      alert('Lớp học này chưa có sinh viên nào đăng ký để đối sánh!');
      return;
    }

    setIsProcessing(true);
    dispatch(detectGroupFaceAttendance({
      classId: selectedClassId,
      image,
      studentIds
    }))
      .unwrap()
      .then(() => {
        setIsProcessing(false);
      })
      .catch((err) => {
        setIsProcessing(false);
        alert(err || 'Không thể kết nối hoặc nhận diện qua máy chủ AI!');
      });
  };

  // Fetch changes and open review modal
  const handleOpenPreviewModal = async () => {
    if (!selectedClass || !photoAttendanceResult) return;

    setIsProcessing(true);
    try {
      const recognizedIds = photoAttendanceResult.recognizedStudents.length > 0
        ? photoAttendanceResult.recognizedStudents.join(',')
        : '-1';
      const data = await apiFetch(`/teacher/preview-attendance-face?courseId=${selectedClass.id}&lectureNumber=${lectureNumber}&recognizedStudentIds=${recognizedIds}`);
      
      // Filter to show only students whose status is changing (with robust array check)
      const changed = Array.isArray(data) ? data.filter(s => s.currentStatus !== s.proposedStatus) : [];
      setPreviewStudents(changed);
      setShowPreviewModal(true);
    } catch (err) {
      alert(err.message || 'Không thể lấy thông tin xem trước chuyên cần từ ảnh!');
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle proposed status inside preview popup
  const handleTogglePreviewStatus = (studentId) => {
    setPreviewStudents(prev => prev.map(s => {
      if (s.studentId === studentId) {
        return {
          ...s,
          proposedStatus: s.proposedStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT'
        };
      }
      return s;
    }));
  };

  // Confirm changes and save to CSDL
  const handleConfirmAttendance = async () => {
    if (!selectedClass) return;
    setIsSavingChanges(true);
    try {
      const payload = {
        courseId: parseInt(selectedClass.id),
        lectureNumber: parseInt(lectureNumber),
        changes: previewStudents.map(s => ({
          studentId: s.studentId,
          isAttendance: s.proposedStatus === 'PRESENT'
        }))
      };
      await apiFetch('/teacher/confirm-attendance-changes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setShowPreviewModal(false);
      alert(`Đã cập nhật chuyên cần thành công từ ảnh nhận dạng khuôn mặt cho ${previewStudents.length} sinh viên có thay đổi!`);
      handleReset();
    } catch (err) {
      alert(err.message || 'Đã xảy ra lỗi khi lưu kết quả điểm danh!');
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    dispatch(clearPhotoResult());
  };

  const translateStatus = (status) => {
    if (status === 'PRESENT') return 'Có mặt';
    if (status === 'ABSENT') return 'Vắng mặt';
    return 'Chưa điểm danh (N/A)';
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">Chụp ảnh điểm danh tập thể</h1>
        <p className="text-xs text-slate-500 mt-0.5">Sử dụng Camera trực tiếp hoặc tải ảnh lớp học lên để hệ thống tự động nhận diện AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Camera and Upload */}
        <div className="lg:col-span-8 space-y-6">
          <Card title="Cấu hình quét nhận diện" subtitle="Chọn lớp học và thiết lập phương thức chụp ảnh">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Chọn lớp học cần điểm danh *</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary outline-none transition"
                    disabled={!!uploadedImage}
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.courseCode} - {c.subject}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Buổi học số *</label>
                  <input
                    type="number"
                    min="1"
                    value={lectureNumber}
                    onChange={(e) => setLectureNumber(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary outline-none transition"
                    disabled={!!uploadedImage}
                  />
                </div>
              </div>

              {selectedClassId && !uploadedImage && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Phương thức chụp ảnh lớp học</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setAttendanceMethod('webcam')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition duration-150 ${
                        attendanceMethod === 'webcam'
                          ? 'bg-primary/5 border-primary text-primary'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      <span>Webcam trực tiếp</span>
                    </button>
                    <button
                      onClick={() => setAttendanceMethod('upload')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition duration-150 ${
                        attendanceMethod === 'upload'
                          ? 'bg-primary/5 border-primary text-primary'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>Tải ảnh từ máy tính</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Interactive Webcam or Upload panel */}
          {selectedClassId && !uploadedImage && (
            <div className="transition-all duration-300">
              {attendanceMethod === 'webcam' ? (
                <WebcamCapture onCapture={handleCapture} />
              ) : (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-10 bg-white text-center">
                  <Upload className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Kéo thả file ảnh lớp học vào đây</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Hỗ trợ định dạng JPG, PNG kích thước tối đa 10MB</p>
                  <label className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold cursor-pointer transition">
                    Chọn ảnh từ máy
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Face Boxes overlay view */}
          {uploadedImage && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white relative">
              <h3 className="font-bold text-sm text-slate-300 mb-3 font-mono tracking-widest uppercase">
                KẾT QUẢ AI RECOGNITION PREVIEW
              </h3>
              
              <div className="relative rounded-lg overflow-hidden border border-slate-800 mx-auto max-w-2xl bg-black">
                <img
                  src={uploadedImage}
                  alt="Recognition preview"
                  className="w-full h-auto object-cover opacity-90"
                />

                {/* Overlaid real face recognition bounding boxes */}
                {!isProcessing && photoAttendanceResult && photoAttendanceResult.detectedFaces && (
                  <>
                    {photoAttendanceResult.detectedFaces.map((face, idx) => {
                      const [left, top, width, height] = face.box;
                      const borderClass = face.identified ? 'border-emerald-500 shadow-emerald-500/20' : 'border-rose-500 shadow-rose-500/20';
                      const bgClass = face.identified ? 'bg-emerald-500' : 'bg-rose-500';
                      const label = face.identified ? face.studentName : 'Người lạ (Unidentified)';
                      return (
                        <div
                          key={idx}
                          className={`absolute border-2 rounded shadow-lg ${borderClass}`}
                          style={{
                            left: `${left}%`,
                            top: `${top}%`,
                            width: `${width}%`,
                            height: `${height}%`
                          }}
                        >
                          <span className={`absolute -top-6 left-0 text-white text-[9px] font-black font-mono px-1.5 py-0.5 rounded shadow whitespace-nowrap ${bgClass}`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Loading animation overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center text-center">
                    <RefreshCcw className="w-10 h-10 text-primary animate-spin mb-3" />
                    <p className="text-sm font-semibold text-slate-300">Đang quét nhận dạng bằng FastAPI FaceID...</p>
                    <p className="text-xs text-slate-500 mt-1">Đang đối sánh đặc trưng vector nhúng 128 chiều</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Analytics and Confirmation */}
        <div className="lg:col-span-4">
          <Card title="Kết quả nhận dạng" subtitle="Phân tích chi tiết bởi thuật toán FaceNet">
            {photoAttendanceResult && selectedClass ? (
              <div className="space-y-6">
                
                {/* Stats */}
                <div className="space-y-3 bg-slate-50 p-4 border border-slate-100 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Tổng sĩ số lớp:</span>
                    <span className="font-bold text-slate-700">
                      {selectedClass.students.length} học viên
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Nhận diện (Có mặt):</span>
                    <span className="font-bold text-emerald-600">
                      {photoAttendanceResult.recognizedStudents.length} học viên
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Vắng mặt (Chưa nhận diện):</span>
                    <span className="font-bold text-rose-500">
                      {selectedClass.students.length - photoAttendanceResult.recognizedStudents.length} học viên
                    </span>
                  </div>
                </div>

                {/* Recognized Students Checklist */}
                <div>
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">
                    Thành viên có mặt
                  </h4>
                  <div className="space-y-2">
                    {selectedClass.students.map((student) => {
                      const isPresent = photoAttendanceResult.recognizedStudents.includes(student.id);
                      return (
                        <div
                          key={student.id}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition ${
                            isPresent
                              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                              : 'bg-slate-50/50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Smile className={`w-4 h-4 ${isPresent ? 'text-emerald-500' : 'text-slate-400'}`} />
                            <div>
                              <p className="font-bold">{student.fullName}</p>
                              <p className="text-[10px] font-mono mt-0.5">{student.id}</p>
                            </div>
                          </div>
                          <span className={`font-black uppercase text-[9px] px-2 py-0.5 rounded ${
                            isPresent ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isPresent ? 'Present' : 'Absent'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] leading-relaxed text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Bạn bắt buộc phải nhấn nút dưới để rà soát thay đổi và phê duyệt kết quả điểm danh.</span>
                </div>

                {/* Action buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleOpenPreviewModal}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition duration-150 text-sm animate-pulse"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Lưu kết quả điểm danh khuôn mặt</span>
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition text-sm"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    <span>Chụp / Tải ảnh khác</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Smile className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
                <p className="text-sm font-semibold">Chờ nguồn hình ảnh quét</p>
                <p className="text-xs text-slate-400 leading-relaxed max-w-[200px] mx-auto mt-1">
                  Vui lòng chọn lớp học và mở camera hoặc tải ảnh lớp học lên để xem bảng phân tích.
                </p>
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* DETAILED INTERACTIVE PREVIEW & ADJUSTMENT DIALOG */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl p-6 relative overflow-hidden animate-scaleIn">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-primary/10 rounded-xl text-primary shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Rà soát thay đổi chuyên cần (Khuôn mặt)
              </h3>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Hệ thống phát hiện các sinh viên dưới đây có sự thay đổi về trạng thái chuyên cần dựa trên phân tích hình ảnh AI so với CSDL hiện tại. Bạn có thể điều chỉnh thủ công trực tiếp trước khi bấm <strong>Xác nhận</strong>.
            </p>

            {previewStudents.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 my-4 space-y-2">
                <Check className="w-8 h-8 mx-auto text-emerald-500" />
                <p className="text-sm font-semibold text-slate-700">Không có thay đổi nào!</p>
                <p className="text-xs text-slate-400">Trạng thái chuyên cần hiện tại của cả lớp đã trùng khớp hoàn toàn với kết quả nhận dạng khuôn mặt.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto pr-1 my-4 space-y-3">
                {previewStudents.map((student) => (
                  <div
                    key={student.studentId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 p-3.5 rounded-2xl transition hover:shadow-sm"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {student.name}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-450 mt-0.5">
                        Mã SV: {student.studentCode}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Current Status Badge */}
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase border ${
                        student.currentStatus === 'PRESENT'
                          ? 'bg-emerald-50/70 border-emerald-100 text-emerald-700'
                          : student.currentStatus === 'ABSENT'
                          ? 'bg-rose-50/70 border-rose-100 text-rose-700'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
                        {translateStatus(student.currentStatus)}
                      </span>

                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

                      {/* Interactive adjustment toggle */}
                      <button
                        onClick={() => handleTogglePreviewStatus(student.studentId)}
                        className={`text-xs font-extrabold px-4 py-2 rounded-xl transition duration-150 select-none shadow-sm ${
                          student.proposedStatus === 'PRESENT'
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10'
                            : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/10'
                        }`}
                      >
                        {translateStatus(student.proposedStatus)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="bg-white hover:bg-slate-50 text-slate-600 font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-xs transition duration-200"
              >
                Hủy
              </button>
              {previewStudents.length > 0 && (
                <button
                  onClick={handleConfirmAttendance}
                  disabled={isSavingChanges}
                  className="bg-primary hover:bg-[#0056b3] active:bg-[#004080] text-white font-bold px-6 py-2.5 rounded-xl text-xs transition duration-200 shadow-md shadow-primary/10 flex items-center gap-1.5"
                >
                  {isSavingChanges ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>Xác nhận cập nhật</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
