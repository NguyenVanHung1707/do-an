const BASE_API_URL = 'http://localhost:8080/api';
const KEYCLOAK_TOKEN_URL = 'http://localhost:9000/realms/hung2004/protocol/openid-connect/token';

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
    try {
      const errData = await response.json();
      errMsg = errData.message || errData.error || errMsg;
    } catch (e) {
      try {
        const text = await response.text();
        errMsg = text || errMsg;
      } catch (e2) {}
    }
    throw new Error(errMsg);
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
  // If user requests mock teacher/student bypass but we want real connection,
  // we can map 'teacher1' -> 'te0003' and 'student1' -> 'st0005'
  let realUsername = username;
  let realPassword = password;
  if (username === 'teacher1') {
    realUsername = 'te0003';
    realPassword = 'te0003';
  } else if (username === 'student1') {
    realUsername = 'st0005';
    realPassword = 'st0005';
  }

  const response = await fetch(KEYCLOAK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'graduation_thesis_ver2',
      client_secret: 'Tj5zNU17UX9Ak1d4lLulx9VcXSSdHJwC',
      username: realUsername,
      password: realPassword
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

  const role = decoded.realm_access?.roles?.includes('teacher') ? 'teacher' : 'student';

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
