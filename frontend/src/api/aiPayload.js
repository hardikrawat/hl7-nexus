import { DEFAULT_CLOUD_MODEL } from '../config/models';

export function getSelectedModel(engineMode, systemConfig) {
  if (engineMode === 'local_ai') {
    return systemConfig.localModel || 'llama3';
  }
  return systemConfig.activeModel || DEFAULT_CLOUD_MODEL;
}

export function buildAiRequestConfig(engineMode, systemConfig) {
  return {
    engine_mode: engineMode,
    model: getSelectedModel(engineMode, systemConfig),
    cloud_provider: systemConfig.cloudProvider || 'gemini_direct',
    api_key: systemConfig.geminiApiKey || '',
    gemini_api_key: systemConfig.geminiApiKey || '',
    gateway_url: systemConfig.gatewayUrl || '',
    gateway_api_key: systemConfig.gatewayApiKey || '',
    ollama_url: systemConfig.ollamaUrl || 'http://localhost:11434',
  };
}
