const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');
const ApiError = require('../utils/apiError');

class AIService {
  async generateText({ prompt, input = {}, model }) {
    const content = `Task:\n${prompt}\n\nInput data (JSON):\n${JSON.stringify(input)}\n\nReturn only the requested result, without claiming external actions were performed.`;

    if (config.ai.openrouterApiKey) {
      try {
        const openRouterModel = !model || model.startsWith('gemini')
          ? 'openai/gpt-4o-mini'
          : model.toLowerCase().includes('claude')
            ? 'anthropic/claude-3.5-sonnet'
            : model.startsWith('gpt')
              ? `openai/${model}`
              : model;
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
          model: openRouterModel,
          messages: [{ role: 'user', content }],
          temperature: 0.2,
        }, {
          headers: { Authorization: `Bearer ${config.ai.openrouterApiKey}` },
          timeout: 30000,
        });
        const result = response.data?.choices?.[0]?.message?.content;
        if (result) return { result, model: response.data.model || openRouterModel };
      } catch (error) {
        if (!config.ai.geminiApiKey) throw this._providerError(error);
      }
    }

    if (config.ai.geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
        const selectedModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-flash' });
        const response = await selectedModel.generateContent(content);
        return { result: response.response.text(), model: model || 'gemini-1.5-flash' };
      } catch (error) {
        throw this._providerError(error);
      }
    }

    throw ApiError.unprocessable('AI node execution requires OPENROUTER_API_KEY or GEMINI_API_KEY', 'AI_PROVIDER_NOT_CONFIGURED');
  }

  _providerError(error) {
    const status = error.response?.status;
    if (status === 429) return new (require('../utils/apiError'))(429, 'AI provider rate limit exceeded', 'RATE_LIMIT');
    return ApiError.unprocessable('AI provider request failed', 'AI_PROVIDER_FAILURE', { status: status || null });
  }
}

module.exports = new AIService();
