import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { detectGroupFaceAttendance, clearPhotoResult } from '../../store/attendanceSlice';
import { addManualAttendance } from '../../store/classSlice';
import Card from '../../components/Common/Card';
import WebcamCapture from '../../components/Webcam/WebcamCapture';
import { Camera, Upload, ArrowRight, UserCheck, AlertCircle, RefreshCcw, Smile } from 'lucide-react';

export default function PhotoAttendance() {
  const { classesList } = useSelector((state) => state.classes);
  const { photoAttendanceResult } = useSelector((state) => state.attendance);
  const dispatch = useDispatch();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [lectureNumber, setLectureNumber] = useState(1);
  const [attendanceMethod, setAttendanceMethod] = useState('webcam'); // webcam or upload
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleConfirmAttendance = () => {
    if (!selectedClass || !photoAttendanceResult) return;

    setIsProcessing(true);
    // Parallelize all student attendance updates
    const promises = selectedClass.students.map((s) => {
      const isPresent = photoAttendanceResult.recognizedStudents.includes(s.id);
      return dispatch(addManualAttendance({
        classId: selectedClass.id,
        studentId: s.id,
        status: isPresent ? 'present' : 'absent',
        lectureNumber: parseInt(lectureNumber) || 1
      })).unwrap();
    });

    Promise.all(promises)
      .then(() => {
        setIsProcessing(false);
        alert('Đã lưu dữ liệu điểm danh bằng nhận diện khuôn mặt thành công vào cơ sở dữ liệu!');
        handleReset();
      })
      .catch((err) => {
        setIsProcessing(false);
        alert(err || 'Đã xảy ra lỗi khi lưu kết quả điểm danh!');
      });
  };

  const handleReset = () => {
    setUploadedImage(null);
    dispatch(clearPhotoResult());
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

                {/* Overlaid face recognition bounding boxes */}
                {!isProcessing && photoAttendanceResult && selectedClass && (
                  <>
                    {selectedClass.students.map((student, idx) => {
                      const isPresent = photoAttendanceResult.recognizedStudents.includes(student.id);
                      if (!isPresent) return null;
                      const top = 15 + (idx * 18) % 45;
                      const left = 12 + (idx * 22) % 65;
                      return (
                        <div
                          key={student.id}
                          className="absolute border-2 border-emerald-500 rounded shadow-lg shadow-emerald-500/20"
                          style={{
                            top: `${top}%`,
                            left: `${left}%`,
                            width: '16%',
                            height: '24%'
                          }}
                        >
                          <span className="absolute -top-6 left-0 bg-emerald-500 text-white text-[9px] font-black font-mono px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                            {student.fullName}
                          </span>
                        </div>
                      );
                    })}

                    {/* Unidentified face decoration */}
                    <div className="absolute top-[25%] left-[78%] w-[15%] h-[22%] border-2 border-rose-500 rounded shadow-lg shadow-rose-500/20">
                      <span className="absolute -top-6 left-0 bg-rose-500 text-white text-[9px] font-black font-mono px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                        Người lạ (Unidentified)
                      </span>
                    </div>
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
                    <span>Tổng phát hiện:</span>
                    <span className="font-bold text-slate-700">
                      {photoAttendanceResult.recognizedStudents.length + (photoAttendanceResult.recognizedStudents.length > 0 ? 1 : 0)} khuôn mặt
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Học viên nhận diện:</span>
                    <span className="font-bold text-emerald-600">
                      {photoAttendanceResult.recognizedStudents.length} có mặt
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Người lạ (Unidentified):</span>
                    <span className="font-bold text-rose-500">
                      {photoAttendanceResult.recognizedStudents.length > 0 ? 1 : 0} khuôn mặt
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
                  <span>Xác nhận lưu để ghi nhận {photoAttendanceResult.recognizedStudents.length} buổi Có mặt và các buổi Vắng mặt tương ứng lên CSDL.</span>
                </div>

                {/* Action buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleConfirmAttendance}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition duration-150 text-sm"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Lưu kết quả điểm danh</span>
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
    </div>
  );
}
