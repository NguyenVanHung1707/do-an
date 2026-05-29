import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  getSemesters,
  getSemesterWeeks,
  getTimetable
} from '../../services/api';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  History,
  Info,
  Loader2
} from 'lucide-react';

export default function Timetable() {
  const { role } = useSelector((state) => state.auth);

  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [loadingSemesters, setLoadingSemesters] = useState(false);

  const [weeks, setWeeks] = useState([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(-1); // Index in the weeks array
  const [loadingWeeks, setLoadingWeeks] = useState(false);

  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const [error, setError] = useState(null);

  // 1. Initial Load: Fetch Semesters and active semester
  useEffect(() => {
    const initSemesters = async () => {
      setLoadingSemesters(true);
      setError(null);
      try {
        const semestersData = await getSemesters();
        setSemesters(semestersData || []);
        
        // Find active semester
        const activeSem = semestersData.find(s => s.isActive);
        if (activeSem) {
          setSelectedSemesterId(activeSem.id);
        } else if (semestersData.length > 0) {
          setSelectedSemesterId(semestersData[0].id);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách học kỳ:", err);
        setError("Không thể tải danh sách học kỳ từ hệ thống.");
      } finally {
        setLoadingSemesters(false);
      }
    };
    initSemesters();
  }, []);

  // 2. Load Weeks when Semester changes
  useEffect(() => {
    if (!selectedSemesterId) return;

    const loadWeeks = async () => {
      setLoadingWeeks(true);
      setWeeks([]);
      setSelectedWeekIndex(-1);
      try {
        const weeksData = await getSemesterWeeks(selectedSemesterId);
        const sortedWeeks = (weeksData || []).sort((a, b) => a.weekNumber - b.weekNumber);
        setWeeks(sortedWeeks);
        
        // Auto-select week that contains today's date, or default to Week 1
        if (sortedWeeks.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          let currentWeekIdx = sortedWeeks.findIndex(w => {
            const start = new Date(w.startDate);
            const end = new Date(w.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return today >= start && today <= end;
          });

          if (currentWeekIdx === -1) {
            currentWeekIdx = 0; // Default to week 1 if today is out of semester range
          }
          setSelectedWeekIndex(currentWeekIdx);
        }
      } catch (err) {
        console.error("Lỗi tải cấu hình tuần:", err);
        setError("Không thể tải cấu hình tuần cho học kỳ đã chọn.");
      } finally {
        setLoadingWeeks(false);
      }
    };

    loadWeeks();
  }, [selectedSemesterId]);

  // 3. Load timetable from backend when semester/week changes
  useEffect(() => {
    if (!selectedSemesterId || selectedWeekIndex < 0 || !weeks[selectedWeekIndex]) return;

    const loadTimetable = async () => {
      setLoadingSchedules(true);
      setSchedules([]);
      try {
        const activeWeek = weeks[selectedWeekIndex];
        const response = await getTimetable({
          semesterId: selectedSemesterId,
          weekNumber: activeWeek.weekNumber
        });
        const mappedSchedules = (response?.items || []).map((slot) => ({
          id: slot.scheduleId,
          dayOfWeek: slot.dayOfWeek,
          date: slot.date,
          startTime: slot.startTime?.substring(0, 5),
          endTime: slot.endTime?.substring(0, 5),
          roomName: slot.roomName || 'Chưa xếp phòng',
          courseCode: slot.courseCode,
          subject: slot.subject,
          courseId: slot.courseId,
          teacherName: slot.teacherName,
          status: slot.status
        }));
        setSchedules(mappedSchedules);
      } catch (err) {
        console.error("Lỗi tải thời khóa biểu:", err);
        setError("Không thể tải danh sách thời khóa biểu môn học.");
      } finally {
        setLoadingSchedules(false);
      }
    };

    loadTimetable();
  }, [selectedSemesterId, selectedWeekIndex, weeks]);

  // Handle navigating week index
  const handlePrevWeek = () => {
    if (selectedWeekIndex > 0) {
      setSelectedWeekIndex(selectedWeekIndex - 1);
    }
  };

  const handleNextWeek = () => {
    if (selectedWeekIndex < weeks.length - 1) {
      setSelectedWeekIndex(selectedWeekIndex + 1);
    }
  };

  const getWeekTypeBadge = (type) => {
    switch (type) {
      case 'STUDY':
        return <span className="bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200/50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Tuần Học</span>;
      case 'MIDTERM_EXAM':
        return <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Thi Giữa Kỳ</span>;
      case 'FINAL_EXAM':
        return <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Thi Cuối Kỳ</span>;
      case 'HOLIDAY':
        return <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Nghỉ Lễ</span>;
      default:
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">{type}</span>;
    }
  };

  // Helper: Format day dates using base start date of the week
  const getDayFormattedDate = (baseStr, offsetDays) => {
    if (!baseStr) return '';
    const date = new Date(baseStr);
    date.setDate(date.getDate() + offsetDays);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const activeWeek = selectedWeekIndex >= 0 && selectedWeekIndex < weeks.length ? weeks[selectedWeekIndex] : null;

  // Days mapping: index 0 = Thứ 2 (offset 0), index 6 = Chủ nhật (offset 6)
  const daysOfWeek = [
    { num: 1, label: 'Thứ Hai', offset: 0 },
    { num: 2, label: 'Thứ Ba', offset: 1 },
    { num: 3, label: 'Thứ Tư', offset: 2 },
    { num: 4, label: 'Thứ Năm', offset: 3 },
    { num: 5, label: 'Thứ Sáu', offset: 4 },
    { num: 6, label: 'Thứ Bảy', offset: 5 },
    { num: 7, label: 'Chủ Nhật', offset: 6 }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Thời khóa biểu tuần</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Xem lịch học định kỳ, phòng học, ca học chi tiết sắp xếp trực quan theo từng tuần học kỳ.
          </p>
        </div>
        
        {/* Semester Selection Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <History className="w-4 h-4 text-slate-400" />
          <select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            disabled={loadingSemesters}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20 transition cursor-pointer"
          >
            {loadingSemesters ? (
              <option>Đang nạp học kỳ...</option>
            ) : semesters.length === 0 ? (
              <option>Không có học kỳ</option>
            ) : (
              semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  Học kỳ {s.code} {s.isActive ? '(Hiện tại)' : ''}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-450 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Week Selector Controls */}
      {weeks.length > 0 && activeWeek && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl shadow-sm flex items-center justify-between gap-4">
          <button
            onClick={handlePrevWeek}
            disabled={selectedWeekIndex <= 0}
            className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 rounded-xl text-slate-600 dark:text-slate-350 transition shrink-0"
            title="Tuần trước"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2">
              <select
                value={activeWeek.weekNumber}
                onChange={(event) => {
                  const nextWeekNumber = Number(event.target.value);
                  const nextIndex = weeks.findIndex((week) => week.weekNumber === nextWeekNumber);
                  if (nextIndex >= 0) {
                    setSelectedWeekIndex(nextIndex);
                  }
                }}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20"
              >
                {weeks.map((week) => (
                  <option key={week.weekNumber} value={week.weekNumber}>
                    Tuần {week.weekNumber}
                  </option>
                ))}
              </select>
              {getWeekTypeBadge(activeWeek.weekType)}
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Từ {new Date(activeWeek.startDate).toLocaleDateString('vi-VN')} đến {new Date(activeWeek.endDate).toLocaleDateString('vi-VN')}
            </p>
          </div>

          <button
            onClick={handleNextWeek}
            disabled={selectedWeekIndex >= weeks.length - 1}
            className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 rounded-xl text-slate-600 dark:text-slate-350 transition shrink-0"
            title="Tuần sau"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Weekly Grid Calendar */}
      {loadingWeeks || loadingSchedules ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Đang đồng bộ thời khóa biểu biểu tuần...</p>
        </div>
      ) : activeWeek ? (
        <div className="space-y-4">
          {/* Legend Banner if Holiday */}
          {activeWeek.weekType === 'HOLIDAY' && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-emerald-800 dark:text-emerald-450 text-sm">Tuần Nghỉ Lễ</h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-500/90 leading-relaxed mt-0.5">
                  Theo kế hoạch đào tạo của trường, tuần học này là tuần Nghỉ Lễ. Bạn được nghỉ học tất cả các ca học trên lớp. Chúc bạn có kỳ nghỉ vui vẻ và ý nghĩa!
                </p>
              </div>
            </div>
          )}

          {/* Timetable Grid Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
            {daysOfWeek.map((day) => {
              // Find schedule slots for this specific day of week
              const daySchedules = schedules.filter(s => s.dayOfWeek === day.num);
              const dayDateFormatted = getDayFormattedDate(activeWeek.startDate, day.offset);
              
              // Highlight today
              const todayStr = new Date().toLocaleDateString('vi-VN');
              const activeWeekStartDate = new Date(activeWeek.startDate);
              const dayDateObj = new Date(activeWeekStartDate);
              dayDateObj.setDate(activeWeekStartDate.getDate() + day.offset);
              const isToday = dayDateObj.toLocaleDateString('vi-VN') === todayStr;

              return (
                <div 
                  key={day.num}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl flex flex-col p-4 shadow-sm min-h-[220px] transition-all duration-200 ${
                    isToday 
                      ? 'border-primary dark:border-primary/80 ring-2 ring-primary/10 dark:ring-primary/5 bg-primary/5 dark:bg-slate-900/30' 
                      : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-350 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Day Header */}
                  <div className="border-b border-slate-100 dark:border-slate-800/80 pb-2 flex justify-between items-center gap-1.5">
                    <span className={`text-xs font-black uppercase tracking-wider whitespace-nowrap ${isToday ? 'text-primary' : 'text-slate-800 dark:text-slate-200'}`}>
                      {day.label}
                    </span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                      isToday 
                        ? 'bg-primary text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {dayDateFormatted}
                    </span>
                  </div>

                  {/* Day Schedule Content */}
                  <div className="flex-1 flex flex-col gap-3 mt-3">
                    {activeWeek.weekType === 'HOLIDAY' ? (
                      <div className="flex-1 flex items-center justify-center text-center p-4">
                        <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-lg uppercase">Nghỉ Lễ</span>
                      </div>
                    ) : daySchedules.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-center p-4">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">Không có lịch</span>
                      </div>
                    ) : (
                      daySchedules.map((slot) => (
                        <div 
                          key={slot.id} 
                          className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm rounded-xl transition duration-150 flex flex-col gap-2 relative group overflow-hidden"
                        >
                          {/* Accent Side bar */}
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary/40 group-hover:bg-primary transition" />
                          
                          <div className="pl-1 space-y-1">
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 font-mono tracking-wide uppercase block">
                              {slot.courseCode}
                            </span>
                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-primary transition leading-tight line-clamp-2">
                              {slot.subject}
                            </h4>
                          </div>

                          <div className="pl-1 pt-1 border-t border-slate-100/50 dark:border-slate-800/50 space-y-1 text-[10px] font-semibold text-slate-500 dark:text-slate-450">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-mono">{slot.startTime} - {slot.endTime}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="line-clamp-1">{slot.roomName}</span>
                            </div>
                            {slot.teacherName && role === 'student' && (
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="line-clamp-1">{slot.teacherName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-400">
          <Calendar className="w-12 h-12 stroke-[1.5] mx-auto text-slate-300 mb-3" />
          <h4 className="font-extrabold text-slate-600 dark:text-slate-450 text-base">Không tìm thấy tuần học nào</h4>
          <p className="text-xs text-slate-450 mt-1">Học kỳ hiện tại chưa được định cấu hình tuần học từ Admin.</p>
        </div>
      )}
    </div>
  );
}
