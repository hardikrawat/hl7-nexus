export const DEFAULT_GEMINI_MODELS = [
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', isFree: false, rateLimit: 'Gemini API' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', isFree: true, rateLimit: 'Gemini API' },
];

export const DEFAULT_GATEWAY_MODELS = [
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', isFree: false, rateLimit: 'Gateway' },
  { id: 'gpt-4.1', name: 'GPT-4.1', isFree: false, rateLimit: 'Gateway' },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', isFree: false, rateLimit: 'Gateway' },
  { id: 'gpt-4o', name: 'GPT-4o', isFree: false, rateLimit: 'Gateway' },
  { id: 'o3-mini', name: 'o3 Mini', isFree: false, rateLimit: 'Gateway' },
  { id: 'gpt-5.1-CIO', name: 'GPT-5.1 CIO', isFree: false, rateLimit: 'Gateway' },
  { id: 'gpt-5.2-CIO', name: 'GPT-5.2 CIO', isFree: false, rateLimit: 'Gateway' },
  { id: 'anthropic.claude-sonnet-4', name: 'Claude Sonnet 4', isFree: false, rateLimit: 'Gateway' },
  { id: 'amazon.nova-micro-v1:0', name: 'Amazon Nova Micro', isFree: false, rateLimit: 'Gateway' },
  { id: 'amazon.nova-2-lite-v1:0', name: 'Amazon Nova 2 Lite', isFree: false, rateLimit: 'Gateway' },
  { id: 'amazon.nova-lite-v1:0', name: 'Amazon Nova Lite', isFree: false, rateLimit: 'Gateway' },
];

export const DEFAULT_CLOUD_MODEL = 'gemini-2.5-flash-lite';
