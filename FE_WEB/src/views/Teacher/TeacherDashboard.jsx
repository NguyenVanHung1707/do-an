import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Card from '../../components/Common/Card';
import BarChart from '../../components/Charts/BarChart';
import { getSemesters } from '../../services/api';
import { 
  GraduationCap, 
  Users, 
  Calendar, 
  TrendingUp, 
  History
} from 'lucide-react';

export default function TeacherDashboard() {
  const { classesList } = useSelector((state) => state.classes);
  const { user } = useSelector((state) => state.auth);

  // Semester filtering states
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [loadingSemesters, setLoadingSemesters] = useState(false);

  useEffect(() => {
    setLoadingSemesters(true);
    getSemesters()
      .then(data => {
        setSemesters(data || []);
        const activeSem = data?.find(s => s.isActive);
        if (activeSem) {
          setSelectedSemesterId(activeSem.id);
        } else if (data?.length > 0) {
          setSelectedSemesterId(data[0].id);
        }
      })
      .catch(err => console.error("Lỗi lấy danh sách học kỳ:", err))
      .finally(() => setLoadingSemesters(false));
  }, []);

  // Filter classes by selected semester
  const filteredClasses = selectedSemesterId
    ? classesList.filter(c => c.semester?.id === parseInt(selectedSemesterId))
    : classesList;

  // Compute stats based on filtered classes
  const totalClasses = filteredClasses.length;
  const totalStudents = filteredClasses.reduce((sum, c) => sum + c.studentsCount, 0);
  const avgAttendance = totalClasses > 0
    ? Math.round(filteredClasses.reduce((sum, c) => sum + c.attendanceRate, 0) / totalClasses)
    : 0;

  // Prepare chart datasets based on filtered classes
  const studentsChartData = filteredClasses.map((c) => ({
    label: c.courseCode,
    value: c.studentsCount
  }));

  const attendanceChartData = filteredClasses.map((c) => ({
    label: c.courseCode,
    value: c.attendanceRate
  }));

  return (
    <div className="space-y-6 py-4">
      {/* Welcome Banner and Filter Row */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">
            Xin chào, {user?.fullName || 'Giảng viên'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Chào mừng bạn đến với Hệ thống hỗ trợ điểm danh học tập và Quản lý lớp chuyên nghiệp.
          </p>
        </div>
        
        {/* Semester Selection Dropdown */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shrink-0">
          <History className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Học Kỳ Báo Cáo</span>
            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              disabled={loadingSemesters}
              className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 outline-none cursor-pointer mt-1 focus:ring-0"
            >
              {loadingSemesters ? (
                <option>Đang tải...</option>
              ) : semesters.length === 0 ? (
                <option>Không có học kỳ</option>
              ) : (
                <>
                  <option value="">Tất cả học kỳ</option>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      Học kỳ {s.code} {s.isActive ? '(Hiện hành)' : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Lớp học học kỳ này</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalClasses}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Tổng số Sinh viên</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalStudents}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Tỷ lệ Chuyên cần</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{avgAttendance}%</p>
          </div>
        </div>
      </div>

      {/* Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Số lượng học sinh trong các lớp" subtitle="Thống kê sĩ số học tập trên từng lớp phụ trách">
          {totalClasses > 0 ? (
            <BarChart data={studentsChartData} yLabel="Sinh viên" maxVal={60} suffix="" />
          ) : (
            <div className="text-center py-12 text-slate-400">
              Không có dữ liệu lớp học để hiển thị biểu đồ trong học kỳ đã chọn!
            </div>
          )}
        </Card>

        <Card title="Tỷ lệ chuyên cần trung bình (%)" subtitle="Thống kê tỷ lệ điểm danh có mặt thực tế">
          {totalClasses > 0 ? (
            <BarChart data={attendanceChartData} yLabel="Tỷ lệ (%)" maxVal={100} suffix="%" />
          ) : (
            <div className="text-center py-12 text-slate-400">
              Không có dữ liệu lớp học để hiển thị biểu đồ trong học kỳ đã chọn!
            </div>
          )}
        </Card>
      </div>

      {/* Upcoming Tasks Info */}
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-4">
        <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <h4 className="font-bold text-slate-700 text-sm">Gợi ý tác vụ giảng dạy nhanh</h4>
          <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
            Giảng viên có thể truy cập **"Chụp ảnh điểm danh"** để thực hiện quét camera nhận dạng khuôn mặt cho cả lớp trực tiếp, hoặc **"Tạo Form trắc nghiệm"** để tạo mã Code điểm danh thông minh qua các câu hỏi trắc nghiệm nhanh 15 phút.
          </p>
        </div>
      </div>
    </div>
  );
}
