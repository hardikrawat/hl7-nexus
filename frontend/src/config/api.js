// M-01: Centralized API configuration
// All API URLs are defined here instead of being hardcoded throughout components.

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const API = {
  // Algorithm endpoints
  ALGO_PROCESS: `${API_BASE_URL}/api/v1/algo/process`,
  ALGO_GENERATE: `${API_BASE_URL}/api/v1/algo/generate`,

  // Engine endpoints
  ENGINE_NL_PARSE: `${API_BASE_URL}/api/v1/engine/nl_parse`,
  ENGINE_GEMINI_MODELS: `${API_BASE_URL}/api/v1/engine/gemini/models`,

  // Health
  HEALTH: `${API_BASE_URL}/api/v1/health`,

  // WebSocket
  WS_EVENTBUS: `${WS_BASE_URL}/ws/eventbus`,
};

export default API;
