import React, { useState, useEffect } from 'react';
import { getStudentAnalyticsSummary } from '../../services/api';
import { Award, Calendar, CheckCircle2, AlertTriangle, TrendingUp, BarChart3, Activity } from 'lucide-react';

export default function StudentAnalytics({ semesterId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [semesterId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await getStudentAnalyticsSummary(semesterId);
      setData(summary);
    } catch (err) {
      console.error('Error fetching student analytics:', err);
      setError('Không thể tải dữ liệu phân tích học tập.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] shadow-sm transition">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-4">Đang phân tích dữ liệu học lực & chuyên cần...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-8 text-center text-rose-500 max-w-md mx-auto shadow-sm">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-rose-500 animate-pulse" />
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Gặp sự cố phân tích</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{error || 'Không có dữ liệu.'}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-md"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const { totalCourses, averageAttendance, totalAbsences, gpaProgress = [], absencesBreakdown = [] } = data;

  // Let's compute some custom SVG values for the GPA progress line chart
  const hasGpa = gpaProgress.length > 0;
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 20;

  // X points
  const pointsCount = gpaProgress.length;
  const stepX = pointsCount > 1 ? (chartWidth - paddingX * 2) / (pointsCount - 1) : 0;
  
  // Y points scaled to max GPA (10.0)
  const getCoordinates = () => {
    return gpaProgress.map((item, idx) => {
      const x = paddingX + idx * stepX;
      // Invert Y coordinate since SVG (0,0) is top-left
      // Max score is 10, min is 0
      const score = item.averageGrade || 0;
      const y = chartHeight - paddingY - (score / 10) * (chartHeight - paddingY * 2);
      return { x, y, label: item.courseCode, score };
    });
  };

  const points = getCoordinates();
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="space-y-6">
      {/* Visual Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Phân tích học lực & Tiến trình chuyên cần</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Báo cáo trực quan kết quả cá nhân tự động cập nhật</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left side: SVG GPA progress line chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Biểu đồ tiến trình điểm số (GPA hệ 10)</h3>
            </div>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full font-mono">
              Trực quan hóa
            </span>
          </div>

          <div className="relative w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {hasGpa ? (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[450px] overflow-visible">
                {/* Y Axis Grid lines */}
                {[0, 2.5, 5.0, 7.5, 10.0].map((gridVal, i) => {
                  const y = chartHeight - paddingY - (gridVal / 10) * (chartHeight - paddingY * 2);
                  return (
                    <g key={i} className="opacity-40 dark:opacity-25">
                      <line 
                        x1={paddingX} 
                        y1={y} 
                        x2={chartWidth - paddingX} 
                        y2={y} 
                        stroke="#94a3b8" 
                        strokeWidth="1" 
                        strokeDasharray="4 4" 
                      />
                      <text 
                        x={paddingX - 10} 
                        y={y + 4} 
                        fontSize="9" 
                        textAnchor="end" 
                        fill="#64748b" 
                        className="font-bold font-mono"
                      >
                        {gridVal}
                      </text>
                    </g>
                  );
                })}

                {/* Line Path */}
                {points.length > 1 && (
                  <>
                    {/* Shadow Area below the line */}
                    <path
                      d={`M ${points[0].x} ${chartHeight - paddingY} ${points.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} ${chartHeight - paddingY} Z`}
                      fill="url(#gpaGradient)"
                      className="opacity-15 dark:opacity-10"
                    />
                    <polyline
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polylinePoints}
                      className="drop-shadow-[0_4px_8px_rgba(99,102,241,0.25)]"
                    />
                  </>
                )}

                {/* Points & Labels */}
                {points.map((p, idx) => (
                  <g key={idx} className="group">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="5.5"
                      fill="#ffffff"
                      stroke="#4f46e5"
                      strokeWidth="3"
                      className="transition cursor-pointer hover:r-7"
                    />
                    {/* Score Bubble Text */}
                    <text
                      x={p.x}
                      y={p.y - 12}
                      fontSize="9.5"
                      textAnchor="middle"
                      fontWeight="900"
                      fill="#4f46e5"
                      className="font-mono bg-white dark:bg-slate-900 px-1 rounded border dark:fill-indigo-400"
                    >
                      {p.score.toFixed(1)}
                    </text>
                    {/* Course Code under X Axis */}
                    <text
                      x={p.x}
                      y={chartHeight - 4}
                      fontSize="8"
                      textAnchor="middle"
                      fontWeight="bold"
                      fill="#64748b"
                      className="dark:fill-slate-400 font-mono"
                    >
                      {p.label}
                    </text>
                  </g>
                ))}

                {/* Gradients definition */}
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <linearGradient id="gpaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs">
                Chưa có dữ liệu điểm học phần nào để lập biểu đồ.
              </div>
            )}
          </div>
        </div>

        {/* Right side: Absence breakdown heatmap/monthly stats */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-500" />
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Thống kê số buổi nghỉ tháng</h3>
              </div>
              <span className="text-[10px] bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold px-2 py-0.5 rounded-full uppercase">
                Gần đây
              </span>
            </div>

            {absencesBreakdown.length > 0 ? (
              <div className="space-y-3.5 mt-2">
                {absencesBreakdown.map((item, idx) => {
                  const maxAbs = Math.max(...absencesBreakdown.map(i => i.absences), 1);
                  const barWidth = `${Math.min((item.absences / maxAbs) * 100, 100)}%`;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                        <span>{item.month}</span>
                        <span className="text-rose-600 dark:text-rose-400 font-mono font-black">{item.absences} buổi nghỉ</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200/40 dark:border-slate-700/50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-300"
                          style={{ width: barWidth }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-xs italic">
                Chưa ghi nhận buổi nghỉ học nào.
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase tracking-wider block">Tỷ lệ chuyên cần chung</span>
              <span className="text-base font-black text-slate-800 dark:text-slate-200">{averageAttendance}% đi học</span>
            </div>
            <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
              averageAttendance >= 90 
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
            }`}>
              {averageAttendance >= 90 ? 'An toàn' : 'Cảnh báo'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
