import { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Square, Check } from 'lucide-react';

export default function WebcamCapture({
  onCapture,
  emptyLabel = 'Camera hiện tại đang tắt',
  startLabel = 'Mở Camera trực tiếp',
  captureLabel = 'Chụp ảnh tập thể',
  confirmLabel = 'Sử dụng ảnh này',
  previewBadge = 'PREVIEW CHỤP'
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [videoElement, setVideoElement] = useState(null);

  const setVideoRef = (node) => {
    videoRef.current = node;
    setVideoElement(node);
  };

  // Connect stream to video element when active and mounted
  useEffect(() => {
    if (videoElement && stream) {
      videoElement.srcObject = stream;
      videoElement.play().catch((err) => {
        console.error("Error starting video playback:", err);
      });
    }
  }, [videoElement, stream]);

  // Initialize webcam
  const startWebcam = async () => {
    setError(null);
    setCapturedImage(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false
      });
      setStream(mediaStream);
      setIsActive(true);
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Không thể truy cập camera. Vui lòng cấp quyền camera trong trình duyệt của bạn!");
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setIsActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Capture frame
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get Base64 image
      const dataUri = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUri);
      stopWebcam();
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startWebcam();
  };

  return (
    <div className="flex flex-col items-center justify-center bg-slate-900 rounded-xl p-4 text-white overflow-hidden shadow-inner relative min-h-[300px]">
      {error && (
        <div className="text-center p-6">
          <p className="text-rose-400 font-medium mb-3">{error}</p>
          <button
            onClick={startWebcam}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition font-medium"
          >
            Thử lại
          </button>
        </div>
      )}

      {!isActive && !capturedImage && !error && (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-4">{emptyLabel}</p>
          <button
            onClick={startWebcam}
            className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-xl shadow-lg shadow-primary/20 transition font-medium mx-auto"
          >
            <Camera className="w-5 h-5" />
            <span>{startLabel}</span>
          </button>
        </div>
      )}

      {/* Live Video Stream */}
      {isActive && !capturedImage && (
        <div className="relative w-full max-w-2xl rounded-lg overflow-hidden bg-black border border-slate-700">
          <video
            ref={setVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto object-cover transform -scale-x-100"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
            <button
              onClick={capturePhoto}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition"
            >
              <Camera className="w-4 h-4" />
              <span>{captureLabel}</span>
            </button>
            <button
              onClick={stopWebcam}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition"
            >
              <Square className="w-4 h-4" />
              <span>Tắt Camera</span>
            </button>
          </div>
        </div>
      )}

      {/* Captured Image Preview */}
      {capturedImage && (
        <div className="w-full max-w-2xl text-center">
          <div className="relative rounded-lg overflow-hidden bg-black border border-slate-700">
            <img src={capturedImage} alt="Captured preview" className="w-full h-auto object-cover transform -scale-x-100" />
            <div className="absolute top-3 left-3 bg-slate-900/80 px-3 py-1 rounded-full text-xs font-semibold font-mono tracking-wider text-emerald-400">
              {previewBadge}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-600/20"
            >
              <Check className="w-4 h-4" />
              <span>{confirmLabel}</span>
            </button>
            <button
              onClick={handleRetake}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Chụp lại</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden Canvas used for grabbing frames */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
