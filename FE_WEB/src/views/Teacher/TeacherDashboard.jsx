import React from 'react';
import { useSelector } from 'react-redux';
import Card from '../../components/Common/Card';
import BarChart from '../../components/Charts/BarChart';
import { GraduationCap, Users, Calendar, TrendingUp } from 'lucide-react';

export default function TeacherDashboard() {
  const { classesList } = useSelector((state) => state.classes);
  const { user } = useSelector((state) => state.auth);

  // Compute stats
  const totalClasses = classesList.length;
  const totalStudents = classesList.reduce((sum, c) => sum + c.studentsCount, 0);
  const avgAttendance = totalClasses > 0
    ? Math.round(classesList.reduce((sum, c) => sum + c.attendanceRate, 0) / totalClasses)
    : 0;

  // Prepare chart datasets
  const studentsChartData = classesList.map((c) => ({
    label: c.courseCode,
    value: c.studentsCount
  }));

  const attendanceChartData = classesList.map((c) => ({
    label: c.courseCode,
    value: c.attendanceRate
  }));

  return (
    <div className="space-y-6 py-4">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">
            Xin chào, {user?.fullName || 'Giảng viên'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Chào mừng bạn đến với Hệ thống hỗ trợ điểm danh học tập và Quản lý lớp chuyên nghiệp.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg w-fit font-mono">
          Cập nhật: {new Date().toLocaleDateString('vi-VN')}
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Tổng số Lớp học</p>
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
              Không có dữ liệu lớp học để hiển thị biểu đồ!
            </div>
          )}
        </Card>

        <Card title="Tỷ lệ chuyên cần trung bình (%)" subtitle="Thống kê tỷ lệ điểm danh có mặt thực tế">
          {totalClasses > 0 ? (
            <BarChart data={attendanceChartData} yLabel="Tỷ lệ (%)" maxVal={100} suffix="%" />
          ) : (
            <div className="text-center py-12 text-slate-400">
              Không có dữ liệu lớp học để hiển thị biểu đồ!
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
