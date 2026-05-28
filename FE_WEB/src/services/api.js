const hostname = window.location.hostname;
const protocol = window.location.protocol;
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'hung2004';
const KEYCLOAK_BASE_URL = import.meta.env.VITE_KEYCLOAK_URL
  || (hostname === 'localhost' ? 'http://localhost:9000' : `${protocol}//${hostname}`);

export const BASE_API_URL = import.meta.env.VITE_API_URL
  || (hostname === 'localhost' ? 'http://localhost:8080/api' : `${protocol}//${hostname}/api`);
export const KEYCLOAK_TOKEN_URL = import.meta.env.VITE_KEYCLOAK_TOKEN_URL
  || `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
export const KEYCLOAK_AUTH_URL = import.meta.env.VITE_KEYCLOAK_AUTH_URL
  || `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`;
export const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'graduation_thesis_ver2';

export const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const getAuthHeader = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.token) {
        return { 'Authorization': `Bearer ${user.token}` };
      }
    } catch (e) {
      // ignore
    }
  }
  return {};
};

export const apiFetch = async (endpoint, options = {}) => {
  const headers = {
    ...getAuthHeader(),
    ...options.headers
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errMsg = 'Có lỗi xảy ra!';
    let errData = null;
    try {
      errData = await response.json();
      errMsg = errData.message || errData.error || errMsg;
    } catch (e) {
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch (e2) {}
    }
    const error = new Error(errMsg);
    error.status = response.status;
    if (errData) {
      error.payload = errData;
      Object.assign(error, errData);
      error.conflicts = errData.conflicts || null;
      error.details = errData.details || null;
    }
    if (response.status === 401) {
      localStorage.removeItem('user');
      window.location.reload();
    }
    throw error;
  }

  // Handle empty or void responses (like HTTP 204 or delete responses)
  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch (e) {
    return null;
  }
};

export const keycloakLogin = async (username, password) => {
  const response = await fetch(KEYCLOAK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: KEYCLOAK_CLIENT_ID,
      username,
      password
    })
  });

  if (!response.ok) {
    let errorDescription = 'Đăng nhập Keycloak không thành công!';
    try {
      const errData = await response.json();
      errorDescription = errData.error_description || errorDescription;
    } catch (e) {}
    throw new Error(errorDescription);
  }

  const data = await response.json();
  const decoded = decodeJWT(data.access_token);
  if (!decoded) {
    throw new Error('Token JWT Keycloak không hợp lệ!');
  }

  let role = 'student';
  if (decoded.realm_access?.roles?.includes('admin')) {
    role = 'admin';
  } else if (decoded.realm_access?.roles?.includes('teacher')) {
    role = 'teacher';
  }

  const user = {
    id: decoded.sub,
    username: decoded.preferred_username,
    code: decoded.preferred_username,
    fullName: decoded.name || `${decoded.given_name || ''} ${decoded.family_name || ''}`.trim() || decoded.preferred_username,
    email: decoded.email || '',
    role,
    token: data.access_token
  };

  localStorage.setItem('user', JSON.stringify(user));
  return user;
};

export const keycloakExchangeCodeForToken = async (code) => {
  const response = await fetch(KEYCLOAK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KEYCLOAK_CLIENT_ID,
      code: code,
      redirect_uri: window.location.origin + '/'
    })
  });

  if (!response.ok) {
    let errorDescription = 'Trao đổi mã xác thực Keycloak không thành công!';
    try {
      const errData = await response.json();
      errorDescription = errData.error_description || errorDescription;
    } catch (e) {}
    throw new Error(errorDescription);
  }

  const data = await response.json();
  const decoded = decodeJWT(data.access_token);
  if (!decoded) {
    throw new Error('Token JWT Keycloak không hợp lệ!');
  }

  let role = 'student';
  if (decoded.realm_access?.roles?.includes('admin')) {
    role = 'admin';
  } else if (decoded.realm_access?.roles?.includes('teacher')) {
    role = 'teacher';
  }

  const user = {
    id: decoded.sub,
    username: decoded.preferred_username,
    code: decoded.preferred_username,
    fullName: decoded.name || `${decoded.given_name || ''} ${decoded.family_name || ''}`.trim() || decoded.preferred_username,
    email: decoded.email || '',
    role,
    token: data.access_token
  };

  localStorage.setItem('user', JSON.stringify(user));
  return user;
};

export const keycloakRegister = async ({ username, email, fullName, code, password, role }) => {
  const nameParts = fullName.trim().split(/\s+/);
  const lastName = nameParts.pop() || '';
  const firstName = nameParts.join(' ') || lastName;

  const signUpData = {
    username,
    password,
    email,
    firstName,
    lastName,
    role,
    studentCode: role === 'student' ? code : undefined,
    teacherCode: role === 'teacher' ? code : undefined
  };

  const endpoint = role === 'teacher'
    ? '/anonymous/sign-up-teacher'
    : '/anonymous/sign-up-student';

  // Call Spring Boot register which in turn registers the user in Keycloak and DB
  const response = await fetch(`${BASE_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(signUpData)
  });

  if (!response.ok) {
    let errMsg = 'Đăng ký không thành công!';
    try {
      const errData = await response.json();
      errMsg = errData.message || errMsg;
    } catch (e) {
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch (e2) {}
    }
    throw new Error(errMsg);
  }

  // Auto-login
  return await keycloakLogin(username, password);
};

// ==========================================
// ADMIN DASHBOARD & SYSTEM MONITORING APIS
// ==========================================

export const getPendingTeachers = async (page = 0, size = 5, search = '') => {
  return await apiFetch(`/admin/teachers/pending?page=${page}&size=${size}&search=${encodeURIComponent(search)}`);
};

export const approveTeacher = async (id) => {
  return await apiFetch(`/admin/teachers/${id}/approve`, {
    method: 'PUT'
  });
};

export const rejectTeacher = async (id, reason) => {
  return await apiFetch(`/admin/teachers/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason })
  });
};

export const getTrafficMetrics = async (period = 'day') => {
  return await apiFetch(`/admin/metrics/traffic?period=${period}`);
};

export const getPerformanceMetrics = async () => {
  return await apiFetch(`/admin/metrics/performance`);
};

export const getTeacherProfile = async () => {
  return await apiFetch('/teacher/profile');
};

export const getStudentProfile = async () => {
  return await apiFetch('/student/profile');
};

export const completeStudentProfile = async (payload) => {
  return await apiFetch('/student/complete-profile', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const getMyCourses = async () => {
  return await apiFetch('/student/get-my-course');
};

export const getMyAttendance = async (courseId) => {
  return await apiFetch(`/student/get-my-attendance-in-a-course?courseId=${courseId}`);
};

export const getCourseAssessments = async (courseId) => {
  return await apiFetch(`/courses/${courseId}/assessments`);
};

// ==========================================
// CLASSROOM DOCUMENT MANAGEMENT APIS (MINI-DRIVE)
// ==========================================

export const getClassDocuments = async (classId, parentFolderId = null) => {
  const query = parentFolderId ? `?parentFolderId=${parentFolderId}` : '';
  return await apiFetch(`/documents/class/${classId}${query}`);
};

export const uploadClassDocument = async (courseId, parentFolderId, file) => {
  const formData = new FormData();
  formData.append('courseId', courseId);
  if (parentFolderId) {
    formData.append('parentFolderId', parentFolderId);
  }
  formData.append('file', file);
  return await apiFetch(`/documents/upload`, {
    method: 'POST',
    body: formData
  });
};

export const createClassFolder = async (courseId, parentFolderId, folderName) => {
  return await apiFetch(`/documents/folder`, {
    method: 'POST',
    body: JSON.stringify({
      courseId,
      parentFolderId,
      folderName
    })
  });
};

export const downloadClassDocument = async (docId) => {
  const response = await fetch(`${BASE_API_URL}/documents/download/${docId}`, {
    headers: getAuthHeader()
  });
  if (!response.ok) {
    throw new Error('Không thể tải tài liệu về');
  }
  return await response.blob();
};

export const deleteClassDocument = async (docId) => {
  return await apiFetch(`/documents/${docId}`, {
    method: 'DELETE'
  });
};

export const getClassStudentPermissions = async (classId) => {
  return await apiFetch(`/documents/class/${classId}/permissions`);
};

export const updateStudentPermissions = async (classId, studentId, canUpload, canDownload) => {
  return await apiFetch(`/documents/class/${classId}/permissions/student/${studentId}`, {
    method: 'POST',
    body: JSON.stringify({
      canUpload,
      canDownload
    })
  });
};

export const updateClassPermissionsBulk = async (classId, canUpload, canDownload) => {
  return await apiFetch(`/documents/class/${classId}/permissions/bulk`, {
    method: 'POST',
    body: JSON.stringify({
      canUpload,
      canDownload
    })
  });
};

export const getMyClassPermission = async (classId) => {
  return await apiFetch(`/documents/class/${classId}/my-permissions`);
};

export const getStudentAnalyticsSummary = async (semesterId = null) => {
  const query = semesterId ? `?semesterId=${semesterId}` : '';
  return await apiFetch(`/analytics/student/summary${query}`);
};

export const getTeacherClassAnalyticsSummary = async (courseId) => {
  return await apiFetch(`/analytics/teacher/class/${courseId}`);
};

// ==========================================
// ACADEMIC SEMESTER & TIME TABLE MANAGEMENT APIS
// ==========================================

export const getSemesters = async () => {
  return await apiFetch('/semesters');
};

export const getActiveSemester = async () => {
  return await apiFetch('/semesters/active');
};

export const getSemesterWeeks = async (semesterId) => {
  return await apiFetch(`/semesters/${semesterId}/weeks`);
};

export const getTimetable = async ({ semesterId = null, weekNumber = null } = {}) => {
  const params = new URLSearchParams();
  if (semesterId) {
    params.set('semester_id', semesterId);
  }
  if (weekNumber) {
    params.set('week_number', weekNumber);
  }
  const query = params.toString();
  return await apiFetch(`/timetable${query ? `?${query}` : ''}`);
};

export const registerDeviceToken = async ({ fcmToken, deviceType = 'ANDROID', deviceId = null }) => {
  return await apiFetch('/users/device-token', {
    method: 'POST',
    body: JSON.stringify({ fcmToken, deviceType, deviceId })
  });
};

export const deleteDeviceToken = async ({ fcmToken }) => {
  return await apiFetch('/users/device-token', {
    method: 'DELETE',
    body: JSON.stringify({ fcmToken })
  });
};

export const createSemester = async (payload) => {
  return await apiFetch('/admin/semesters', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const updateSemester = async (id, payload) => {
  return await apiFetch(`/admin/semesters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const setActiveSemester = async (id) => {
  return await apiFetch(`/admin/semesters/${id}/active`, {
    method: 'POST'
  });
};

export const getCourseSchedules = async (courseId) => {
  return await apiFetch(`/teacher/courses/${courseId}/schedules`);
};

export const setCourseSchedules = async (courseId, schedules) => {
  return await apiFetch(`/teacher/courses/${courseId}/schedules`, {
    method: 'POST',
    body: JSON.stringify(schedules)
  });
};

export const downloadStudentImportTemplate = async () => {
  const response = await fetch(`${BASE_API_URL}/teacher/courses/import-template`, {
    headers: getAuthHeader()
  });
  if (!response.ok) {
    throw new Error('Không thể tải file mẫu Excel');
  }
  return await response.blob();
};

export const importStudentsFromExcel = async (courseId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return await apiFetch(`/teacher/courses/${courseId}/import-students`, {
    method: 'POST',
    body: formData
  });
};

export const downloadQuestionsTemplate = async () => {
  const response = await fetch(`${BASE_API_URL}/teacher/assessments/questions-template`, {
    headers: getAuthHeader()
  });
  if (!response.ok) {
    throw new Error('Không thể tải file mẫu Excel');
  }
  return await response.blob();
};

export const importQuestionsFromExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return await apiFetch(`/teacher/assessments/import-questions`, {
    method: 'POST',
    body: formData
  });
};
