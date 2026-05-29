import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../services/api';
import Card from '../Common/Card';
import { Search, Loader2, Award, Download, Settings, X } from 'lucide-react';

export default function ClassGradebook({ classId }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [weightsState, setWeightsState] = useState({});
  const [isSavingWeights, setIsSavingWeights] = useState(false);

  const fetchGradebook = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/analytics/teacher/class/${classId}/gradebook`);
      if (res) {
        setData(res);
      }
    } catch (e) {
      console.error(e);
      alert('Không thể tải bảng điểm tổng hợp: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchGradebook();
  }, [fetchGradebook]);

  const handleExportCSV = () => {
    if (!data || !data.students) return;

    // Generate CSV content
    const headers = ['Mã sinh viên', 'Họ và tên'];
    data.assessments.forEach(ass => {
      headers.push(`${ass.title} (Tối đa ${ass.maxScore}đ)`);
    });
    headers.push('Điểm tổng kết (hệ 10)');

    const csvRows = [headers.join(',')];

    data.students.forEach(student => {
      const row = [
        `"${student.studentCode}"`,
        `"${student.name}"`
      ];
      data.assessments.forEach(ass => {
        const score = student.grades[ass.id];
        row.push(score !== undefined ? score : '');
      });
      row.push(student.averageGrade);
      csvRows.push(row.join(','));
    });

    const csvContent = "\uFEFF" + csvRows.join('\n'); // add BOM for Excel UTF-8 display support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bang_diem_lop_hoc_${classId}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleOpenWeightModal = () => {
    if (!data || !data.assessments) return;
    const initialWeights = {};
    data.assessments.forEach(ass => {
      initialWeights[ass.id] = ass.weight !== undefined ? ass.weight : 0.0;
    });
    setWeightsState(initialWeights);
    setIsWeightModalOpen(true);
  };

  const handleSaveWeights = async () => {
    setIsSavingWeights(true);
    try {
      const weightUpdates = Object.entries(weightsState).map(([assessmentId, weight]) => ({
        assessmentId: parseInt(assessmentId),
        weight: parseFloat(weight) || 0.0
      }));

      await apiFetch(`/analytics/teacher/class/${classId}/weights`, {
        method: 'PUT',
        body: JSON.stringify(weightUpdates)
      });

      alert('Cập nhật hệ số điểm thành công!');
      setIsWeightModalOpen(false);
      await fetchGradebook();
    } catch (e) {
      console.error(e);
      alert('Không thể lưu hệ số điểm: ' + e.message);
    } finally {
      setIsSavingWeights(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Đang tổng hợp bảng điểm lớp học...</p>
      </div>
    );
  }

  if (!data || !data.students || data.students.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-400">
        <Award className="w-12 h-12 stroke-[1.5] mx-auto text-slate-300 mb-3" />
        <h4 className="font-extrabold text-slate-600 dark:text-slate-450 text-base">Chưa có bảng điểm</h4>
        <p className="text-xs text-slate-450 mt-1">Lớp học hiện tại chưa có thành viên hoặc chưa có bài đánh giá nào được công bố.</p>
      </div>
    );
  }

  const filteredStudents = data.students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card
        title="Bảng điểm tổng hợp lớp học"
        subtitle="Thống kê toàn diện điểm thi, bài tập và điểm tổng kết môn học của tất cả học viên"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative shrink-0">
              <input
                type="text"
                placeholder="Tìm học viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-1.5 bg-slate-55 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 w-44 transition-all"
              />
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>
            <button
              onClick={handleOpenWeightModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold transition shadow-sm"
              title="Cấu hình hệ số điểm của các bài đánh giá"
            >
              <Settings className="w-3.5 h-3.5 animate-spin-slow" />
              <span>Cấu hình Hệ số</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm bg-emerald-600"
              title="Xuất bảng điểm ra CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel / CSV</span>
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-4 px-4 font-extrabold sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 w-[120px]">MSSV</th>
                <th className="py-4 px-4 font-extrabold sticky left-[120px] bg-slate-50 dark:bg-slate-900 z-10 w-[200px] border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Họ và Tên</th>
                {data.assessments.map(ass => (
                  <th key={ass.id} className="py-4 px-4 text-center border-r border-slate-100 dark:border-slate-800 max-w-[150px] truncate" title={ass.title}>
                    <p className="font-extrabold leading-normal truncate">{ass.title}</p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-[9px] text-slate-400 font-semibold">Tối đa {ass.maxScore}đ</span>
                      {ass.weight > 0 && (
                        <span className="text-[9px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-450 px-1 py-0.2 rounded font-extrabold">
                          h/s: {ass.weight}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="py-4 px-4 text-right font-extrabold bg-primary/5 dark:bg-primary/10 text-primary w-[140px]">Tổng kết (Môn)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-650 dark:text-slate-350 sticky left-0 bg-white dark:bg-slate-900 z-10">
                      {student.studentCode}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs sticky left-[120px] bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                      {student.name}
                    </td>
                    {data.assessments.map(ass => {
                      const score = student.grades[ass.id];
                      return (
                        <td key={ass.id} className="py-3 px-4 text-center border-r border-slate-100 dark:border-slate-800/50 font-semibold font-mono text-xs text-slate-600 dark:text-slate-400">
                          {score !== undefined ? (
                            <span className={score >= (ass.maxScore / 2.0) ? "text-slate-705 dark:text-slate-300" : "text-rose-500 font-bold"}>
                              {score}đ
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right bg-primary/5 dark:bg-primary/10">
                      <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-full ${
                        student.averageGrade >= 8.0 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450' 
                          : student.averageGrade >= 5.0
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-450'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450'
                      }`}>
                        {student.averageGrade} / 10
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={data.assessments.length + 3} className="text-center py-8 text-xs text-slate-400 italic">
                    Không tìm thấy học viên nào phù hợp với từ khóa tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* WEIGHTS CONFIGURATION MODAL */}
      {isWeightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-indigo-500 animate-spin-slow" />
                Cấu hình hệ số điểm (Weight)
              </h3>
              <button 
                onClick={() => setIsWeightModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
              Cài đặt tỷ trọng cho từng đầu điểm trong lớp. Tổng hệ số của tất cả các bài đánh giá bắt buộc phải bằng <span className="font-extrabold text-indigo-600 dark:text-indigo-400">1.0</span> (100%).
            </div>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {data.assessments.map(ass => (
                <div key={ass.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl hover:shadow-sm transition-all duration-150">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        ass.type === 'QUIZ' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                        ass.type === 'MID_TERM' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                        ass.type === 'FINAL_EXAM' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' :
                        'bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400'
                      }`}>
                        {ass.type === 'QUIZ' ? 'Trắc nghiệm' :
                         ass.type === 'MID_TERM' ? 'Giữa kỳ' :
                         ass.type === 'FINAL_EXAM' ? 'Cuối kỳ' :
                         'Bài tập/Lớn'}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Tối đa {ass.maxScore}đ</span>
                    </div>
                    <p className="text-xs font-bold text-slate-750 dark:text-slate-200 truncate" title={ass.title}>
                      {ass.title}
                    </p>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      placeholder="0.0"
                      value={weightsState[ass.id] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWeightsState(prev => ({
                          ...prev,
                          [ass.id]: val === '' ? '' : parseFloat(val)
                        }));
                      }}
                      className="w-24 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 text-right font-mono font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* REAL-TIME VALIDATION */}
            {(() => {
              const sum = Object.values(weightsState).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
              const roundedSum = Math.round(sum * 1000) / 1000;
              const isValidSum = Math.abs(roundedSum - 1.0) < 0.001;

              return (
                <>
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-550 dark:text-slate-400">Tổng hệ số hiện tại:</span>
                    <span className={isValidSum ? "text-emerald-600 dark:text-emerald-450 font-black text-sm" : "text-rose-500 dark:text-rose-400 font-black text-sm"}>
                      {roundedSum} / 1.0
                    </span>
                  </div>

                  {!isValidSum && (
                    <p className="text-[10px] text-rose-500 dark:text-rose-450 mt-1.5 text-right font-medium animate-pulse">
                      ⚠ Tổng các hệ số phải bằng 1.0 để lưu cấu hình.
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-150 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsWeightModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-750 dark:text-slate-450 dark:hover:text-slate-350 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-lg transition"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={!isValidSum || isSavingWeights}
                      onClick={handleSaveWeights}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingWeights && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Lưu thay đổi</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
