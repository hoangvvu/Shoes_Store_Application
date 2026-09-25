import axios from 'axios';

// Khi chạy trên máy thật, thay localhost bằng IP LAN của máy tính (ví dụ: 192.168.1.x)
const API_URL = 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
