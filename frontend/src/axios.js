import axios from 'axios';

export const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true, // Required for Sanctum cookie-based authentication
  withXSRFToken: true // Send X-XSRF-TOKEN for cross-origin SPA requests
});

// Sanctum's CSRF endpoint is registered outside Laravel's /api route group.
export const initializeCsrf = () => axios.get(`${API_URL}/sanctum/csrf-cookie`, {
  withCredentials: true,
});

export default api;
