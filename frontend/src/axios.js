import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true, // Required for Sanctum cookie-based authentication
  withXSRFToken: true // axios >= 1.6.2: required to send X-XSRF-TOKEN on cross-origin requests
});

export default api;
