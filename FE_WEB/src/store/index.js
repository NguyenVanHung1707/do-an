import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import classReducer from './classSlice';
import attendanceReducer from './attendanceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    classes: classReducer,
    attendance: attendanceReducer,
  },
});
