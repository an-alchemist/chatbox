export const DEFAULT_CHAT_MODEL: string = 'chat-model';

// Import the public environment variable for client-side use
import { PUBLIC_CUSTOM_MODELS } from '$env/static/public';

interface ChatModel {
	id: string;
	name: string;
	description: string;
}

// Default models
const defaultModels: Array<ChatModel> = [
	{
		id: 'chat-model',
		name: 'Chat model',
		description: 'Primary model for all-purpose chat'
	},
	{
		id: 'chat-model-reasoning',
		name: 'Reasoning model',
		description: 'Uses advanced reasoning'
	}
];

// Parse custom models from the PUBLIC_CUSTOM_MODELS env variable
const customModelsList = PUBLIC_CUSTOM_MODELS ? PUBLIC_CUSTOM_MODELS.split(',').filter(Boolean) : ['native'];

// Create custom model entries
const customModels = customModelsList.map(modelId => ({
	id: modelId,
	name: modelId.charAt(0).toUpperCase() + modelId.slice(1).replace('_', ' '), // Format name nicely
	description: 'Custom API model'
}));

// Combine default and custom models
export const chatModels: Array<ChatModel> = [...defaultModels, ...customModels];