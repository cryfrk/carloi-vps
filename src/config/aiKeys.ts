// OpenAI ve DeepSeek anahtarlarınızı bu dosyaya ekleyin.
// Örnek: apiKey: 'sk-...'
export const aiKeys = {
  deepSeek: {
    apiKey: '',
    model: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/chat/completions',
  },
  openAI: {
    apiKey: '',
    model: 'gpt-5',
    endpoint: 'https://api.openai.com/v1/responses',
  },
} as const;

export const hasDeepSeekKey = () => aiKeys.deepSeek.apiKey.trim().length > 0;

export const hasOpenAIKey = () => aiKeys.openAI.apiKey.trim().length > 0;

