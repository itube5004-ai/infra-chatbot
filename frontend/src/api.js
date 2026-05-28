const hostname = window.location.hostname;
export const API_URL = (hostname === 'localhost' || hostname === '127.0.0.1')
  ? 'http://localhost:8000'
  : (import.meta.env.VITE_API_URL || 'https://infra-chatbot-aptw.onrender.com');
