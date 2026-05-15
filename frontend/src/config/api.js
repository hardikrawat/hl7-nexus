// M-01: Centralized API configuration
// All API URLs are defined here instead of being hardcoded throughout components.

const getDefaultApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8000';
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${window.location.hostname}:8000`;
};

const getDefaultWsBaseUrl = () => {
  if (typeof window === 'undefined') return 'ws://127.0.0.1:8000';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:8000`;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || getDefaultApiBaseUrl();
const WS_BASE_URL = import.meta.env.VITE_WS_URL || getDefaultWsBaseUrl();

export const API = {
  // Algorithm endpoints
  ALGO_PROCESS: `${API_BASE_URL}/api/v1/algo/process`,
  ALGO_GENERATE: `${API_BASE_URL}/api/v1/algo/generate`,

  // Engine endpoints
  ENGINE_NL_PARSE: `${API_BASE_URL}/api/v1/engine/nl_parse`,
  ENGINE_AI_PROCESS: `${API_BASE_URL}/api/v1/engine/process`,
  ENGINE_GEMINI_MODELS: `${API_BASE_URL}/api/v1/engine/gemini/models`,
  ENGINE_GATEWAY_MODELS: `${API_BASE_URL}/api/v1/engine/gateway/models`,
  ENGINE_STATUS: `${API_BASE_URL}/api/v1/engine/status`,

  // Assistant endpoints
  CHAT_MESSAGE: `${API_BASE_URL}/api/v1/chat/message`,

  // Health
  HEALTH: `${API_BASE_URL}/api/v1/health`,

  // Auth & audit
  AUTH_LOGIN: `${API_BASE_URL}/api/v1/auth/login`,
  AUTH_LOGOUT: `${API_BASE_URL}/api/v1/auth/logout`,
  AUTH_ME: `${API_BASE_URL}/api/v1/auth/me`,
  AUDIT: `${API_BASE_URL}/api/v1/audit`,

  // WebSocket (append ?token=JWT after login)
  WS_EVENTBUS: `${WS_BASE_URL}/ws/eventbus`,
};

export default API;
