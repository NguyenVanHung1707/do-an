import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch, getAuthHeader } from '../services/api';

// Helper to convert base64 data URL to File object
const dataURLtoFile = (dataurl, filename) => {
  let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
};

// 1. Fetch Student Registered Face Image (GET /student/get-my-image)
export const fetchStudentFace = createAsyncThunk(
  'attendance/fetchStudentFace',
  async (_, { rejectWithValue }) => {
    try {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const baseUrl = hostname === 'localhost' ? 'http://localhost:8080' : `${protocol}//${hostname}`;
      const response = await fetch(`${baseUrl}/api/student/get-my-image`, {
        headers: getAuthHeader()
      });
      if (response.status === 204) {
        return null;
      }
      if (!response.ok) {
        throw new Error('Chưa đăng ký ảnh khuôn mặt');
      }
      const blob = await response.blob();
      if (blob.size === 0) {
        return null;
      }
      return URL.createObjectURL(blob);
    } catch (err) {
      return rejectWithValue(err.message || 'Lỗi lấy hình ảnh!');
    }
  }
);

// 2. Upload/Register Student Face Image (POST /student/upload-my-image)
export const uploadStudentFace = createAsyncThunk(
  'attendance/uploadStudentFace',
  async ({ image }, { dispatch, rejectWithValue }) => {
    try {
      const formData = new FormData();
      let file;
      if (typeof image === 'string' && image.startsWith('data:')) {
        file = dataURLtoFile(image, 'face.jpg');
      } else {
        file = image;
      }
      formData.append('file', file);

      await apiFetch('/student/upload-my-image', {
        method: 'POST',
        body: formData
      });

      // Fetch the newly uploaded face image to update state
      dispatch(fetchStudentFace());
      return true;
    } catch (err) {
      return rejectWithValue(err.message || 'Lỗi khi đăng ký hình ảnh!');
    }
  }
);

// 3. Create Attendance Quiz Form (POST /teacher/create-form?courseId=X)
export const createAttendanceForm = createAsyncThunk(
  'attendance/createAttendanceForm',
  async ({ classId, lectureNumber, expiryMinutes, questions, latitude, longitude }, { rejectWithValue }) => {
    try {
      const formattedQuestions = questions.map((q) => ({
        content: q.text,
        answers: [
          { content: 'Đúng', isTrue: q.correctAnswer === 'true' },
          { content: 'Sai', isTrue: q.correctAnswer === 'false' }
        ]
      }));

      const formDto = {
        timeOfPeriod: expiryMinutes * 60, // Convert to seconds
        lectureNumber: parseInt(lectureNumber),
        latitude: latitude || null,
        longitude: longitude || null,
        questions: formattedQuestions
      };

      // apiFetch returns the unique code string
      const code = await apiFetch(`/teacher/create-form?courseId=${classId}`, {
        method: 'POST',
        body: JSON.stringify(formDto)
      });

      return {
        code,
        classId,
        lectureNumber,
        expiryMinutes,
        questions
      };
    } catch (err) {
      return rejectWithValue(err.message || 'Lỗi khi tạo biểu mẫu!');
    }
  }
);

// 4. Fetch Active Quiz Form by PIN Code (GET /student/get-form-by-code?code=X)
export const fetchFormByCode = createAsyncThunk(
  'attendance/fetchFormByCode',
  async (code, { rejectWithValue }) => {
    try {
      const form = await apiFetch(`/student/get-form-by-code?code=${code}`);
      return form;
    } catch (err) {
      return rejectWithValue(err.message || 'Không tìm thấy form hoặc form đã hết hạn!');
    }
  }
);

// 5. Submit Quiz Form Attendance (POST /student/submit-answer)
export const submitStudentAttendance = createAsyncThunk(
  'attendance/submitStudentAttendance',
  async ({ code, answers, latitude, longitude }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const activeForm = state.attendance.activeForm;
      if (!activeForm) {
        throw new Error('Không tìm thấy thông tin form đang hiển thị!');
      }

      // Map question selections to option-level AnswerDto objects
      const answersPayload = [];
      activeForm.questions.forEach((q) => {
        const selected = answers[q.id]; // 'true' or 'false'
        const dungOption = q.answers.find((a) => a.content === 'Đúng');
        const saiOption = q.answers.find((a) => a.content === 'Sai');

        if (dungOption && saiOption) {
          if (selected === 'true') {
            answersPayload.push({ id: dungOption.id, isTrue: true });
            answersPayload.push({ id: saiOption.id, isTrue: false });
          } else {
            answersPayload.push({ id: dungOption.id, isTrue: false });
            answersPayload.push({ id: saiOption.id, isTrue: true });
          }
        }
      });

      const submitData = {
        code,
        latitude: latitude || null,
        longitude: longitude || null,
        answers: answersPayload
      };

      const result = await apiFetch('/student/submit-answer', {
        method: 'POST',
        body: JSON.stringify(submitData)
      });

      return result;
    } catch (err) {
      return rejectWithValue(err.message || 'Lỗi khi nộp bài điểm danh!');
    }
  }
);

// 6. Group Face Detection via FastAPI (POST http://localhost:8888/attendance)
export const detectGroupFaceAttendance = createAsyncThunk(
  'attendance/detectGroupFaceAttendance',
  async ({ classId, image, studentIds }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      let file;
      if (typeof image === 'string' && image.startsWith('data:')) {
        file = dataURLtoFile(image, 'class_picture.jpg');
      } else {
        file = image;
      }
      formData.append('image_file', file);
      formData.append('image_ids', studentIds.join(','));

      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const detectUrl = hostname === 'localhost' ? 'http://localhost:8888/attendance' : `${protocol}//${hostname}/detect-face/attendance`;
      const response = await fetch(detectUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('API FastAPI lỗi hoặc không nhận diện được!');
      }

      const results = await response.json();
      // results is list of {'id': studentId, 'isAttendance': true/false}
      const presentStudentIds = results.filter(r => r.isAttendance).map(r => r.id);

      return {
        classId,
        recognizedStudents: presentStudentIds,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
    } catch (err) {
      return rejectWithValue(err.message || 'Lỗi kết nối server AI FastAPI!');
    }
  }
);

const initialState = {
  activeForms: [], // Created forms (history for teacher)
  activeForm: null, // Active form loaded by student
  registeredFaceUrl: null, // Face image local URL
  photoAttendanceResult: null, // recognized students by FastAPI
  loading: false,
  error: null
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    clearPhotoResult: (state) => {
      state.photoAttendanceResult = null;
    },
    clearAttendanceError: (state) => {
      state.error = null;
    },
    resetActiveForm: (state) => {
      state.activeForm = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Face
      .addCase(fetchStudentFace.fulfilled, (state, action) => {
        state.registeredFaceUrl = action.payload;
      })
      .addCase(fetchStudentFace.rejected, (state) => {
        state.registeredFaceUrl = null;
      })
      // Upload Face
      .addCase(uploadStudentFace.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadStudentFace.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(uploadStudentFace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Form
      .addCase(createAttendanceForm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAttendanceForm.fulfilled, (state, action) => {
        state.loading = false;
        state.activeForms.push(action.payload);
      })
      .addCase(createAttendanceForm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Form by Code
      .addCase(fetchFormByCode.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.activeForm = null;
      })
      .addCase(fetchFormByCode.fulfilled, (state, action) => {
        state.loading = false;
        state.activeForm = action.payload;
      })
      .addCase(fetchFormByCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Submit Attendance
      .addCase(submitStudentAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitStudentAttendance.fulfilled, (state) => {
        state.loading = false;
        state.activeForm = null; // Clear active form on success
      })
      .addCase(submitStudentAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Detect Group Face
      .addCase(detectGroupFaceAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(detectGroupFaceAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.photoAttendanceResult = action.payload;
      })
      .addCase(detectGroupFaceAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearPhotoResult, clearAttendanceError, resetActiveForm } = attendanceSlice.actions;
export default attendanceSlice.reducer;
