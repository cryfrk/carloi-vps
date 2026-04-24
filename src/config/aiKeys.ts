const deepSeekApiKey = String(
  process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || '',
).trim();
const openAIApiKey = String(
  process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
).trim();

export const aiKeys = {
  deepSeek: {
    apiKey: deepSeekApiKey,
    model: String(process.env.EXPO_PUBLIC_DEEPSEEK_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat'),
    endpoint: String(
      process.env.EXPO_PUBLIC_DEEPSEEK_ENDPOINT ||
        process.env.DEEPSEEK_ENDPOINT ||
        'https://api.deepseek.com/chat/completions',
    ),
  },
  openAI: {
    apiKey: openAIApiKey,
    model: String(process.env.EXPO_PUBLIC_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-5'),
    endpoint: String(
      process.env.EXPO_PUBLIC_OPENAI_ENDPOINT ||
        process.env.OPENAI_ENDPOINT ||
        'https://api.openai.com/v1/responses',
    ),
  },
} as const;

export const hasDeepSeekKey = () => aiKeys.deepSeek.apiKey.length > 0;

export const hasOpenAIKey = () => aiKeys.openAI.apiKey.length > 0;
