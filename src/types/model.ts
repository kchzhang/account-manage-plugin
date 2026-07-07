export type ModelProvider = 'openai' | 'anthropic' | 'deepseek' | 'zhipu' | 'moonshot' | 'custom';

export interface ProviderPreset {
  key: ModelProvider;
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  baseUrl: string;
  modelName: string;
  apiKey: string;
}

export interface ModelConfigStore {
  models: ModelConfig[];
  activeModelId: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  { key: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  { key: 'anthropic', label: 'Anthropic', defaultBaseUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-sonnet-4-20250514' },
  { key: 'deepseek', label: 'DeepSeek', defaultBaseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat' },
  { key: 'zhipu', label: '智谱 AI', defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4' },
  { key: 'moonshot', label: 'Moonshot', defaultBaseUrl: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k' },
  { key: 'custom', label: '自定义', defaultBaseUrl: '', defaultModel: '' },
];

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function maskApiKey(key: string): string {
  if (!key || key.length <= 8) return '••••••••';
  return key.substring(0, 4) + '••••' + key.substring(key.length - 4);
}
