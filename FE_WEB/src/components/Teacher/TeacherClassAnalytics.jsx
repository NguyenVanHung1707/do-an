import React, { useState, useEffect } from 'react';
import { getTeacherClassAnalyticsSummary } from '../../services/api';
import { Award, Calendar, CheckCircle2, AlertTriangle, Users, BarChart3, ArrowDownAZ, GraduationCap } from 'lucide-react';

export default function TeacherClassAnalytics({ classId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClassAnalytics();
  }, [classId]);

  const fetchClassAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await getTeacherClassAnalyticsSummary(classId);
      setData(summary);
    } catch (err) {
      console.error('Error fetching teacher class analytics:', err);
      setError('Không thể tải dữ liệu phân tích của lớp học này.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] shadow-sm transition">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-4">Đang tính toán phân phối điểm và chuyên cần lớp học...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-8 text-center text-rose-500 max-w-md mx-auto shadow-sm">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-rose-500 animate-pulse" />
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Gặp sự cố tải phân tích</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{error || 'Không có dữ liệu.'}</p>
        <button
          onClick={fetchClassAnalytics}
          className="mt-4 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-md"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const { totalStudents, averageAttendance, gradeDistribution = {}, studentStats = [] } = data;

  // Grade labels and counts
  const grades = [
    { label: 'Yếu (<4.0)', count: gradeDistribution.weak || 0, color: 'from-rose-450 to-rose-600' },
    { label: 'Trung bình (4.0-6.0)', count: gradeDistribution.average || 0, color: 'from-amber-400 to-amber-600' },
    { label: 'Khá (6.0-8.0)', count: gradeDistribution.good || 0, color: 'from-blue-400 to-blue-600' },
    { label: 'Giỏi (8.0-10.0)', count: gradeDistribution.excellent || 0, color: 'from-emerald-450 to-emerald-600' }
  ];

  const maxCount = Math.max(...grades.map(g => g.count), 1);

  // Filter students based on search query
  const filteredStudents = studentStats.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Visual Analytics KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-500" />
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng số học viên</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">{totalStudents} sinh viên</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl shadow-inner">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Điểm danh trung bình lớp</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">{averageAttendance}% chuyên cần</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-indigo-500" />
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl shadow-inner">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Học lực nổi bật</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">
              {gradeDistribution.excellent > 0 ? `${gradeDistribution.excellent} xuất sắc` : 'Ổn định'}
            </p>
          </div>
        </div>
      </div>

      {/* Distribution visual SVG / Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Grade Distribution Bar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Biểu đồ phân phối học lực lớp (GPA)</h3>
            </div>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full font-mono uppercase">
              Histogram
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {grades.map((g, idx) => {
              const barWidth = `${(g.count / maxCount) * 100}%`;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                    <span>{g.label}</span>
                    <span className="font-mono font-black">{g.count} sinh viên ({totalStudents > 0 ? Math.round((g.count / totalStudents) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-200/40 dark:border-slate-700/50">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${g.color} transition-all duration-500`}
                      style={{ width: barWidth }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weak / Low attendance warning block */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Cảnh báo chuyên cần yếu (&lt;80%)</h3>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {studentStats.filter(s => s.attendanceRate < 80).length > 0 ? (
                studentStats.filter(s => s.attendanceRate < 80).map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/30 dark:border-rose-900/20 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{s.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">MSSV: {s.studentCode}</span>
                    </div>
                    <span className="text-xs font-black text-rose-600 dark:text-rose-450">{s.attendanceRate}%</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-450 dark:text-slate-500 text-xs italic">
                  Không ghi nhận sinh viên nào có chuyên cần dưới 80%.
                </div>
              )}
            </div>
          </div>

          <div className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/30 dark:border-emerald-900/20 rounded-xl p-3.5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-450 leading-relaxed">
              Tỷ lệ chuyên cần tốt giúp tăng hiệu quả tiếp thu kiến thức và kết quả làm bài tập trung thực nhất.
            </p>
          </div>
        </div>

      </div>

      {/* Searchable and Sortable Student Details Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Chi tiết kết quả từng học viên</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Bảng theo dõi liên thông chuyên cần và điểm số tích lũy</p>
          </div>
          
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã sinh viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl text-xs focus:border-primary outline-none text-slate-700 dark:text-slate-300 w-full sm:w-64 transition"
          />
        </div>

        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-slate-450 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Mã sinh viên</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4 text-center">Tỷ lệ chuyên cần</th>
                <th className="py-3 px-4 text-right">Điểm trung bình (GPA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition">
                    <td className="py-3.5 px-4 font-mono font-bold">{s.studentCode}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{s.name}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        s.attendanceRate >= 80 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                          : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                      }`}>
                        {s.attendanceRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm">{s.averageGrade}</span>
                      <span className="text-[10px] text-slate-400">/10đ</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-slate-400 dark:text-slate-600 italic">
                    Không tìm thấy sinh viên nào trùng khớp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
