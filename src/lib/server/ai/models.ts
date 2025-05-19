import { createXai } from '@ai-sdk/xai';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import { XAI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY, CUSTOM_API_KEY, CUSTOM_API_URL, CUSTOM_MODELS } from '$env/static/private';

const xai = createXai({ apiKey: XAI_API_KEY });
const groq = createGroq({ apiKey: GROQ_API_KEY });
const openai = createOpenAI({ apiKey: OPENAI_API_KEY });

// Create the custom "native" provider with OpenAI-compatible API
const native = createOpenAI({
	apiKey: CUSTOM_API_KEY,
	baseURL: CUSTOM_API_URL,
});

// Get custom models from environment variable (server-side only)
const customModelsList = CUSTOM_MODELS ? CUSTOM_MODELS.split(',').filter(Boolean) : ['native'];

// Start with the standard language models
const languageModels = {
	'chat-model': openai('gpt-4o'),
	'chat-model-reasoning': wrapLanguageModel({
		model: openai('gpt-4o'),
		middleware: extractReasoningMiddleware({ tagName: 'think' })
	}),
	'title-model': openai('gpt-3.5-turbo'),
	'artifact-model': openai('gpt-4o-vision'),
	'xai-chat-model': xai('grok-2-1212'),
};

// Add all custom models dynamically
customModelsList.forEach(modelId => {
	languageModels[modelId] = native(modelId);
});

export const myProvider = customProvider({
	languageModels,
	imageModels: {
		'small-model': openai.image('dall-e-3'),
	}
});