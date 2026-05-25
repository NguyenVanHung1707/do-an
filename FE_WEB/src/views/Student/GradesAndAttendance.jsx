import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  BookOpen, 
  Calendar, 
  Award, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Percent, 
  Frown, 
  Smile, 
  ListOrdered,
  History
} from 'lucide-react';
import Card from '../../components/Common/Card';
import { getMyCourses, getMyAttendance, getCourseAssessments, getSemesters } from '../../services/api';
import StudentAnalytics from '../../components/Student/StudentAnalytics';

export default function GradesAndAttendance() {
  const { user } = useSelector((state) => state.auth);
  
  // State management
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Performance and detailed states per course
  const [courseDetails, setCourseDetails] = useState({});
  // Track which course accordion is expanded
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  // Track active tab for each course: { [courseId]: 'grades' | 'absences' }
  const [courseActiveTabs, setCourseActiveTabs] = useState({});

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

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all student's enrolled courses
      const courseList = await getMyCourses();
      setCourses(courseList);

      if (courseList.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Fetch attendance logs and assessments for each course concurrently
      const details = {};
      let totalAbsCount = 0;
      let totalRateSum = 0;

      await Promise.all(
        courseList.map(async (course) => {
          try {
            // Fetch attendance
            const attendanceLogs = await getMyAttendance(course.id) || [];
            // Fetch assessments (grades)
            const assessmentsList = await getCourseAssessments(course.id) || [];

            // Calculate attendance metrics
            const totalSessions = attendanceLogs.length;
            const presences = attendanceLogs.filter(log => log.isAttendance).length;
            const absences = attendanceLogs.filter(log => !log.isAttendance).length;
            const rate = totalSessions > 0 ? Math.round((presences / totalSessions) * 100) : 100;

            totalAbsCount += absences;
            totalRateSum += rate;

            // Filter out absent log details
            const absentLogs = attendanceLogs.filter(log => !log.isAttendance).map(log => {
              const d = new Date(log.attendanceTime);
              return {
                id: log.id,
                date: d.toLocaleDateString('vi-VN'),
                time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                lectureNumber: log.lectureNumber || 1
              };
            });

            details[course.id] = {
              attendanceLogs,
              absentLogs,
              assessments: assessmentsList,
              attendanceRate: rate,
              presences,
              absences,
              loadingDetails: false
            };
          } catch (err) {
            console.error(`Lỗi tải dữ liệu cho lớp học ${course.id}:`, err);
            details[course.id] = {
              attendanceLogs: [],
              absentLogs: [],
              assessments: [],
              attendanceRate: 100,
              presences: 0,
              absences: 0,
              loadingDetails: false
            };
          }
        })
      );

      setCourseDetails(details);

      // Initialize default active tabs
      const initialTabs = {};
      courseList.forEach(course => {
        initialTabs[course.id] = 'grades';
      });
      setCourseActiveTabs(initialTabs);

    } catch (err) {
      console.error("Lỗi khi tải kết quả học tập:", err);
      setError("Không thể tải kết quả học tập của bạn. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandCourse = (courseId) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
    } else {
      setExpandedCourseId(courseId);
    }
  };

  const setTabForCourse = (courseId, tab) => {
    setCourseActiveTabs(prev => ({
      ...prev,
      [courseId]: tab
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500 mt-4">Đang tải kết quả học tập và chuyên cần...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700 max-w-lg mx-auto">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-3" />
        <h3 className="font-bold text-lg mb-1">Đã xảy ra lỗi</h3>
        <p className="text-sm mb-4">{error}</p>
        <button 
          onClick={fetchInitialData}
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition"
        >
          Tải lại dữ liệu
        </button>
      </div>
    );
  }

  // Filter courses by selected semester
  const filteredCourses = selectedSemesterId
    ? courses.filter(c => c.semesterId === parseInt(selectedSemesterId))
    : courses;

  // Dynamically calculate overall statistics for selected semester
  const totalClasses = filteredCourses.length;
  
  let totalAbsCount = 0;
  let totalRateSum = 0;
  filteredCourses.forEach(c => {
    const detail = courseDetails[c.id];
    if (detail) {
      totalAbsCount += detail.absences || 0;
      totalRateSum += detail.attendanceRate || 100;
    }
  });
  const averageAttendance = totalClasses > 0 ? Math.round(totalRateSum / totalClasses) : 100;
  const totalAbsences = totalAbsCount;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-155 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Kết quả học tập & Chuyên cần</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Xin chào sinh viên <strong className="text-primary font-semibold">{user?.fullName}</strong>. Dưới đây là thống kê điểm số và chuyên cần chi tiết của tất cả các môn học bạn tham gia.
          </p>
        </div>

        {/* Semester Selection Dropdown */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl shrink-0">
          <History className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Học Kỳ</span>
            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              disabled={loadingSemesters}
              className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer mt-1 focus:ring-0"
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

      {filteredCourses.length > 0 && <StudentAnalytics semesterId={selectedSemesterId} />}

      {filteredCourses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-sm">
          <BookOpen className="w-12 h-12 stroke-[1.5] mx-auto text-slate-300" />
          <p className="font-semibold text-slate-500 text-lg">Bạn chưa tham gia lớp học nào</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">Vui lòng liên hệ với giảng viên phụ trách học phần để được thêm vào danh sách lớp.</p>
        </div>
      ) : (
        <>
          {/* Dashboard Summary Rows */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Stat Card 1: Total Classes */}
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-500" />
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shadow-inner">
                {totalClasses}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Số lớp học tham gia</p>
                <p className="text-lg font-black text-slate-800 mt-1">Học phần</p>
              </div>
            </div>

            {/* Stat Card 2: Avg Attendance */}
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shadow-inner">
                {averageAttendance}%
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Chuyên cần trung bình</p>
                <p className="text-lg font-black text-slate-800 mt-1">
                  {averageAttendance >= 90 ? 'Xuất sắc' : averageAttendance >= 80 ? 'Khá tốt' : 'Cần lưu ý'}
                </p>
              </div>
            </div>

            {/* Stat Card 3: Total Absences */}
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-rose-500" />
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xl shadow-inner">
                {totalAbsences}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng số buổi nghỉ</p>
                <p className="text-lg font-black text-slate-800 mt-1">Buổi nghỉ học</p>
              </div>
            </div>
          </div>

          {/* Enrolled Courses Accordion List */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Danh sách môn học chi tiết</h2>

            {filteredCourses.map((course) => {
              const detail = courseDetails[course.id] || {
                attendanceRate: 100,
                absences: 0,
                presences: 0,
                absentLogs: [],
                assessments: []
              };
              const isExpanded = expandedCourseId === course.id;
              const activeTab = courseActiveTabs[course.id] || 'grades';

              // Attendance progress color class
              const rateColor = detail.attendanceRate >= 90 ? 'text-emerald-600' : detail.attendanceRate >= 80 ? 'text-amber-500' : 'text-rose-600';
              const rateBgColor = detail.attendanceRate >= 90 ? 'bg-emerald-50' : detail.attendanceRate >= 80 ? 'bg-amber-50' : 'bg-rose-50';
              const progressColor = detail.attendanceRate >= 90 ? 'bg-emerald-500' : detail.attendanceRate >= 80 ? 'bg-amber-500' : 'bg-rose-500';

              return (
                <div 
                  key={course.id} 
                  className={`bg-white border rounded-2xl shadow-sm transition-all duration-200 overflow-hidden ${
                    isExpanded ? 'border-primary/40 shadow-md ring-1 ring-primary/5' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Collapsible Card Header Button */}
                  <button
                    onClick={() => toggleExpandCourse(course.id)}
                    className="w-full p-5 flex flex-col md:flex-row md:items-center justify-between text-left gap-4 hover:bg-slate-50/50 transition duration-150"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl text-xs font-black font-mono tracking-wide">
                          {course.courseCode}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                          <BookOpen className="w-3.5 h-3.5 text-slate-300" />
                          <span>Học phần chính</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base md:text-lg group-hover:text-primary leading-tight">
                          {course.subject}
                        </h3>
                        <p className="text-slate-400 text-xs mt-1 font-medium">{course.description || "Không có mô tả môn học."}</p>
                      </div>
                    </div>

                    {/* Attendance rate visual badge */}
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chuyên cần:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${rateBgColor} ${rateColor}`}>
                            {detail.attendanceRate}%
                          </span>
                        </div>
                        <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                          <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${detail.attendanceRate}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Vắng {detail.absences} / {detail.absences + detail.presences} buổi học
                        </p>
                      </div>

                      {/* Accordion trigger icon */}
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Collapsible Card Details Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/30 p-5 space-y-6">
                      {/* Tabs Controller */}
                      <div className="flex items-center gap-2 border-b border-slate-200">
                        <button
                          onClick={() => setTabForCourse(course.id, 'grades')}
                          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-extrabold border-b-2 transition duration-150 uppercase tracking-wider ${
                            activeTab === 'grades'
                              ? 'border-primary text-primary'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <Award className="w-4 h-4" />
                          Bảng điểm chi tiết
                        </button>
                        <button
                          onClick={() => setTabForCourse(course.id, 'absences')}
                          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-extrabold border-b-2 transition duration-150 uppercase tracking-wider ${
                            activeTab === 'absences'
                              ? 'border-primary text-primary'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                          Chi tiết buổi nghỉ học ({detail.absences})
                        </button>
                      </div>

                      {/* TAB 1: BẢNG ĐIỂM CHI TIẾT */}
                      {activeTab === 'grades' && (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          {detail.assessments.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 space-y-2">
                              <FileText className="w-12 h-12 stroke-[1.5] mx-auto text-slate-300" />
                              <p className="font-semibold text-slate-500">Chưa có bài thi hay bài tập</p>
                              <p className="text-xs text-slate-400">Không có bài thi hay cột điểm nào được thiết lập trong môn học này.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    <th className="py-4 px-5">Tên bài thi / Bài tập</th>
                                    <th className="py-4 px-5">Loại học phần</th>
                                    <th className="py-4 px-5">Trạng thái bài làm</th>
                                    <th className="py-4 px-5 text-right">Điểm số đạt được</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                  {detail.assessments.map((a) => (
                                    <tr key={a.id} className="hover:bg-slate-50/40 transition">
                                      <td className="py-4 px-5">
                                        <div className="flex flex-col">
                                          <span className="font-bold text-slate-800">{a.title}</span>
                                          {a.description && (
                                            <span className="text-xs font-medium text-slate-400 mt-0.5 line-clamp-1">
                                              {a.description}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-4 px-5">
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase ${
                                          a.type === 'QUIZ' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                          a.type === 'MID_TERM' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                          a.type === 'FINAL_EXAM' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                          'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        }`}>
                                          {a.type === 'QUIZ' ? 'Kiểm tra Quiz' :
                                           a.type === 'MID_TERM' ? 'Giữa kỳ' :
                                           a.type === 'FINAL_EXAM' ? 'Cuối kỳ' :
                                           'Bài tập về nhà'}
                                        </span>
                                      </td>
                                      <td className="py-4 px-5">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                          a.submissionStatus === 'GRADED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                          a.submissionStatus === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                          a.submissionStatus === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                          'bg-slate-100 text-slate-500'
                                        }`}>
                                          {a.submissionStatus === 'GRADED' ? 'Đã chấm điểm' :
                                           a.submissionStatus === 'SUBMITTED' ? 'Đã nộp bài' :
                                           a.submissionStatus === 'IN_PROGRESS' ? 'Đang làm dở' :
                                           'Chưa nộp bài'}
                                        </span>
                                      </td>
                                      <td className="py-4 px-5 text-right">
                                        {a.submissionStatus === 'GRADED' && a.studentScore !== null ? (
                                          <div className="flex items-center justify-end gap-1.5">
                                            <span className="font-extrabold text-emerald-600 text-base">{a.studentScore}</span>
                                            <span className="text-slate-400 text-xs">/ {a.maxScore}đ</span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 font-semibold italic text-xs">-- / {a.maxScore}đ</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 2: CHI TIẾT BUỔI NGHỈ HỌC */}
                      {activeTab === 'absences' && (
                        <div className="space-y-4">
                          {detail.absences === 0 ? (
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 flex flex-col items-center text-center space-y-2">
                              <Smile className="w-12 h-12 text-emerald-500 stroke-[1.5]" />
                              <h4 className="font-extrabold text-emerald-800 text-sm">Chuyên cần xuất sắc!</h4>
                              <p className="text-xs text-emerald-600 max-w-md">
                                Chúc mừng bạn! Bạn có tỷ lệ chuyên cần đạt **100%** tuyệt đối. Bạn không nghỉ hay bỏ lỡ bất cứ buổi học nào của học phần này.
                              </p>
                            </div>
                          ) : (
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                      <th className="py-4 px-5">Buổi học thứ</th>
                                      <th className="py-4 px-5">Ngày học</th>
                                      <th className="py-4 px-5">Giờ điểm danh hệ thống</th>
                                      <th className="py-4 px-5 text-right">Trạng thái ghi nhận</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                                    {detail.absentLogs.map((log, idx) => (
                                      <tr key={log.id} className="hover:bg-rose-50/10 transition">
                                        <td className="py-4 px-5">
                                          <div className="flex items-center gap-2">
                                            <ListOrdered className="w-4 h-4 text-slate-400" />
                                            <span>Buổi số {log.lectureNumber}</span>
                                          </div>
                                        </td>
                                        <td className="py-4 px-5">
                                          <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span>{log.date}</span>
                                          </div>
                                        </td>
                                        <td className="py-4 px-5">
                                          <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            <span className="font-mono font-bold text-slate-600">{log.time}</span>
                                          </div>
                                        </td>
                                        <td className="py-4 px-5 text-right">
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-wide">
                                            Vắng mặt
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
