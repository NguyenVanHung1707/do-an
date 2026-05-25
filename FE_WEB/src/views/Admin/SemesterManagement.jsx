import React, { useState, useEffect } from 'react';
import { 
  getSemesters, 
  createSemester, 
  setActiveSemester, 
  getSemesterWeeks,
  updateSemester
} from '../../services/api';
import Card from '../../components/Common/Card';
import { 
  Calendar, 
  Layers, 
  Plus, 
  Check, 
  AlertCircle, 
  Trash2, 
  CalendarDays, 
  ChevronRight, 
  CheckCircle, 
  Loader2, 
  Tag, 
  Clock, 
  Settings2,
  ListTodo
} from 'lucide-react';

export default function SemesterManagement() {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Creation Form State
  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [weekConfigs, setWeekConfigs] = useState([
    { startWeek: 1, endWeek: 7, type: 'STUDY' },
    { startWeek: 8, endWeek: 8, type: 'MIDTERM_EXAM' },
    { startWeek: 9, endWeek: 15, type: 'STUDY' },
    { startWeek: 16, endWeek: 16, type: 'FINAL_EXAM' },
    { startWeek: 17, endWeek: 18, type: 'HOLIDAY' }
  ]);

  // Detail / Weeks view
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [semesterWeeks, setSemesterWeeks] = useState([]);
  const [loadingWeeks, setLoadingWeeks] = useState(false);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSemesters();
  }, []);

  const fetchSemesters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSemesters();
      setSemesters(data || []);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách học kỳ.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    if (!code || !startDate || !endDate) {
      setError('Vui lòng điền đầy đủ Mã học kỳ, Ngày bắt đầu và Ngày kết thúc!');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      code,
      startDate,
      endDate,
      isActive,
      weekConfigs
    };

    try {
      const result = await createSemester(payload);
      if (result) {
        setSuccess(`Đã tạo học kỳ mới ${code} và cấu hình các tuần học thành công!`);
        // Reset form
        setCode('');
        setStartDate('');
        setEndDate('');
        setIsActive(false);
        fetchSemesters();
      }
    } catch (err) {
      setError(err.message || 'Tạo học kỳ thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (id, sCode) => {
    if (!window.confirm(`Bạn có chắc chắn muốn KÍCH HOẠT học kỳ ${sCode}?\nTất cả học kỳ khác sẽ tự động bị hủy kích hoạt.`)) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const res = await setActiveSemester(id);
      if (res && res.success) {
        setSuccess(`Đã kích hoạt học kỳ ${sCode} làm học kỳ hiện hành thành công!`);
        fetchSemesters();
        if (selectedSemester && selectedSemester.id === id) {
          setSelectedSemester({ ...selectedSemester, isActive: true });
        }
      }
    } catch (err) {
      setError(err.message || 'Không thể kích hoạt học kỳ.');
    }
  };

  const handleViewWeeks = async (semester) => {
    setSelectedSemester(semester);
    setLoadingWeeks(true);
    setSemesterWeeks([]);
    try {
      const weeks = await getSemesterWeeks(semester.id);
      setSemesterWeeks(weeks || []);
    } catch (err) {
      setError(err.message || 'Không thể tải cấu hình tuần của học kỳ này.');
    } finally {
      setLoadingWeeks(false);
    }
  };

  const calculateTotalWeeks = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    if (timeDiff < 0) return 0;
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    return Math.ceil(days / 7);
  };

  const addWeekConfig = () => {
    setWeekConfigs([...weekConfigs, { startWeek: 1, endWeek: 1, type: 'STUDY' }]);
  };

  const removeWeekConfig = (index) => {
    const updated = [...weekConfigs];
    updated.splice(index, 1);
    setWeekConfigs(updated);
  };

  const updateWeekConfig = (index, field, value) => {
    const updated = [...weekConfigs];
    updated[index] = {
      ...updated[index],
      [field]: field === 'type' ? value : parseInt(value) || 0
    };
    setWeekConfigs(updated);
  };

  const getWeekTypeBadge = (type) => {
    switch (type) {
      case 'STUDY':
        return <span className="bg-sky-50 text-sky-700 border border-sky-200/50 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">Tuần Học</span>;
      case 'MIDTERM_EXAM':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200/50 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">Thi Giữa Kỳ</span>;
      case 'FINAL_EXAM':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200/50 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">Thi Cuối Kỳ</span>;
      case 'HOLIDAY':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">Nghỉ Lễ</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 border border-slate-200/50 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Quản Lý Học Kỳ & Chu Kỳ Học</h1>
        <p className="text-sm text-slate-500 mt-1">Cấu hình thời gian bắt đầu, kết thúc, tag tuần hoạt động thi cử cho học kỳ mới</p>
      </div>

      {/* Notifications */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: List of Semesters */}
        <div className="lg:col-span-2 space-y-6">
          <Card 
            title="Danh sách Học kỳ Hệ thống" 
            subtitle="Danh sách học kỳ đã tạo và chu kỳ hoạt động"
            icon={<Layers className="w-5 h-5 text-primary" />}
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-slate-400 text-sm font-medium">Đang tải danh sách học kỳ...</p>
              </div>
            ) : semesters.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-600">Không tìm thấy học kỳ nào</h4>
                <p className="text-xs mt-1">Vui lòng sử dụng biểu mẫu bên phải để bắt đầu thiết lập học kỳ mới.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {semesters.map((s) => (
                  <div key={s.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/20 px-2 rounded-xl transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-sm border border-primary/10">
                        {s.code}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-base">Học kỳ {s.code}</span>
                          {s.isActive ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Kích Hoạt</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">Lưu Trữ</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(s.startDate).toLocaleDateString('vi-VN')} - {new Date(s.endDate).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleViewWeeks(s)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-200/50"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        Xem tuần
                      </button>
                      
                      {!s.isActive && (
                        <button
                          onClick={() => handleActivate(s.id, s.code)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-emerald-200/50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Kích hoạt
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Weeks Details view */}
          {selectedSemester && (
            <Card
              title={`Cấu hình tuần chi tiết - Học kỳ ${selectedSemester.code}`}
              subtitle={`Danh sách tuần học cụ thể từ ngày bắt đầu học kỳ`}
              icon={<ListTodo className="w-5 h-5 text-emerald-600" />}
            >
              {loadingWeeks ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-slate-400 text-xs">Đang nạp dữ liệu tuần...</p>
                </div>
              ) : semesterWeeks.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">Học kỳ này chưa có phân bổ tuần học.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {semesterWeeks.map((w) => (
                    <div key={w.id} className="p-3 border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 rounded-xl transition flex items-center justify-between gap-2 shadow-sm">
                      <div className="space-y-1">
                        <span className="font-extrabold text-slate-800 text-sm">Tuần {w.weekNumber}</span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(w.startDate).toLocaleDateString('vi-VN')} - {new Date(w.endDate).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                      <div>
                        {getWeekTypeBadge(w.weekType)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

        </div>

        {/* Right Column: Creation Form */}
        <div className="space-y-6">
          <Card
            title="Tạo Học Kỳ Mới"
            subtitle="Thiết lập học kỳ và tự động sinh tuần học định kỳ"
            icon={<Plus className="w-5 h-5 text-primary" />}
          >
            <form onSubmit={handleCreateSemester} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Mã học kỳ *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 2026.1"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl text-sm transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl transition"
                  />
                  <span className="text-[10px] text-slate-400 leading-none">Bắt buộc là Thứ 2</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Ngày kết thúc *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl transition"
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Tổng số tuần dự kiến:</span>
                  <span className="font-extrabold text-primary text-sm">{calculateTotalWeeks()} Tuần</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary/20 w-4 h-4"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer">Kích hoạt học kỳ này ngay</label>
              </div>

              {/* Tag configurations */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cấu hình thẻ tuần học</label>
                  <button
                    type="button"
                    onClick={addWeekConfig}
                    className="text-primary hover:text-primary-dark font-bold text-xs flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm cấu hình
                  </button>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {weekConfigs.map((config, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border border-slate-100 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span className="font-medium shrink-0">Tuần:</span>
                        <input
                          type="number"
                          required
                          min="1"
                          max="50"
                          value={config.startWeek}
                          onChange={(e) => updateWeekConfig(index, 'startWeek', e.target.value)}
                          className="w-10 px-1 py-0.5 border border-slate-200 rounded text-center text-slate-700 bg-white"
                        />
                        <span>-</span>
                        <input
                          type="number"
                          required
                          min="1"
                          max="50"
                          value={config.endWeek}
                          onChange={(e) => updateWeekConfig(index, 'endWeek', e.target.value)}
                          className="w-10 px-1 py-0.5 border border-slate-200 rounded text-center text-slate-700 bg-white"
                        />
                      </div>
                      
                      <select
                        value={config.type}
                        onChange={(e) => updateWeekConfig(index, 'type', e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded px-1 py-0.5 text-slate-700 bg-white"
                      >
                        <option value="STUDY">Học Bình Thường</option>
                        <option value="MIDTERM_EXAM">Thi Giữa Kỳ</option>
                        <option value="FINAL_EXAM">Thi Cuối Kỳ</option>
                        <option value="HOLIDAY">Nghỉ Lễ</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => removeWeekConfig(index)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-xl text-sm font-bold transition shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tạo học kỳ...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Lưu Học Kỳ
                    </>
                  )}
                </button>
              </div>

            </form>
          </Card>
        </div>

      </div>

    </div>
  );
}
