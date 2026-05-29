import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../services/api';

// Fetch classes/courses with details for the current user
export const fetchClasses = createAsyncThunk(
  'classes/fetchClasses',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const role = state.auth.role || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).role : null);
      
      let courses = [];
      if (role === 'teacher') {
        courses = await apiFetch('/teacher/get-my-courses');
        
        // Enrich each course with students details
        const enrichedCourses = await Promise.all(
          courses.map(async (course) => {
            try {
              const students = await apiFetch(`/teacher/get-all-student-of-course?courseId=${course.id}`);
              
              // Map backend StudentInCourseDto to frontend format
              const formattedStudents = students.map((s) => ({
                id: s.id, // Database ID
                studentCode: s.studentCode,
                fullName: s.name,
                absences: s.numberOfAbsent || 0,
                presences: s.numberOfPresent || 0
              }));

              const totalPresences = formattedStudents.reduce((sum, s) => sum + s.presences, 0);
              const totalSessions = formattedStudents.reduce((sum, s) => sum + s.presences + s.absences, 0);
              const attendanceRate = totalSessions > 0 ? Math.round((totalPresences / totalSessions) * 100) : 100;

              return {
                ...course,
                studentsCount: formattedStudents.length,
                attendanceRate,
                students: formattedStudents
              };
            } catch {
              return {
                ...course,
                studentsCount: 0,
                attendanceRate: 100,
                students: []
              };
            }
          })
        );
        return enrichedCourses;
      } else if (role === 'student') {
        courses = await apiFetch('/student/get-my-course');
        
        // Fetch absences/presences from attendance logs for student
        const enrichedCourses = await Promise.all(
          courses.map(async (course) => {
            try {
              const logs = await apiFetch(`/student/get-my-attendance-in-a-course?courseId=${course.id}`);
              const presences = logs.filter(l => l.isAttendance).length;
              const absences = logs.filter(l => !l.isAttendance).length;
              const total = logs.length;
              const attendanceRate = total > 0 ? Math.round((presences / total) * 100) : 100;
              
              const formattedLogs = logs.map((l) => {
                const dateObj = new Date(l.attendanceTime);
                return {
                  id: l.id,
                  date: dateObj.toLocaleDateString('vi-VN'),
                  time: dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                  type: 'Hệ thống',
                  location: null,
                  status: l.isAttendance ? 'present' : 'absent',
                  courseId: course.id
                };
              });

              return {
                ...course,
                attendanceRate,
                absences,
                presences,
                logs: formattedLogs
              };
            } catch {
              return {
                ...course,
                attendanceRate: 100,
                absences: 0,
                presences: 0,
                logs: []
              };
            }
          })
        );
        return enrichedCourses;
      }
      return [];
    } catch (err) {
      return rejectWithValue(err.message || 'Không thể lấy thông tin lớp học!');
    }
  }
);

// Add Class
export const addClass = createAsyncThunk(
  'classes/addClass',
  async ({ courseCode, subject, description, semesterId }, { dispatch, rejectWithValue }) => {
    try {
      await apiFetch('/teacher/create-course', {
        method: 'POST',
        body: JSON.stringify({ courseCode, subject, description, semesterId })
      });
      dispatch(fetchClasses());
      return true;
    } catch (err) {
      return rejectWithValue(err.message || 'Không thể tạo lớp học!');
    }
  }
);

// Edit Class
export const editClass = createAsyncThunk(
  'classes/editClass',
  async ({ id, courseCode, subject, description, semesterId }, { dispatch, rejectWithValue }) => {
    try {
      await apiFetch(`/teacher/update-course?courseId=${id}`, {
        method: 'PUT',
        body: JSON.stringify({ courseCode, subject, description, semesterId })
      });
      dispatch(fetchClasses());
      return true;
    } catch (err) {
      return rejectWithValue(err.message || 'Không thể chỉnh sửa lớp học!');
    }
  }
);

// Delete Class
export const deleteClass = createAsyncThunk(
  'classes/deleteClass',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await apiFetch(`/teacher/delete-course?courseId=${id}`, {
        method: 'DELETE'
      });
      dispatch(fetchClasses());
      return true;
    } catch (err) {
      return rejectWithValue(err.message || 'Không thể xóa lớp học!');
    }
  }
);

// Add Student to Class
export const addStudentToClass = createAsyncThunk(
  'classes/addStudentToClass',
  async ({ classId, studentId }, { dispatch, rejectWithValue }) => {
    try {
      await apiFetch(`/teacher/add-student-to-course?courseId=${classId}&studentId=${studentId}`, {
        method: 'POST'
      });
      dispatch(fetchClasses());
      return true;
    } catch (err) {
      return rejectWithValue({
        message: err.message || 'Không thể thêm sinh viên vào lớp!',
        status: err.status || null,
        conflicts: err.conflicts || null
      });
    }
  }
);

// Add Manual Attendance
export const addManualAttendance = createAsyncThunk(
  'classes/addManualAttendance',
  async ({ classId, studentId, status, lectureNumber }, { dispatch, rejectWithValue }) => {
    try {
      const attendanceLogDto = {
        studentId,
        courseId: classId,
        attendanceTime: new Date().toISOString(),
        isAttendance: status === 'present',
        lectureNumber: lectureNumber || 1
      };
      await apiFetch('/teacher/add-attendance', {
        method: 'POST',
        body: JSON.stringify(attendanceLogDto)
      });
      dispatch(fetchClasses());
      return true;
    } catch (err) {
      return rejectWithValue(err.message || 'Không thể điểm danh sinh viên!');
    }
  }
);

const classSlice = createSlice({
  name: 'classes',
  initialState: {
    classesList: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchClasses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClasses.fulfilled, (state, action) => {
        state.loading = false;
        state.classesList = action.payload;
        state.error = null;
      })
      .addCase(fetchClasses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Lỗi khi lấy dữ liệu lớp học!';
      });
  }
});

export default classSlice.reducer;
