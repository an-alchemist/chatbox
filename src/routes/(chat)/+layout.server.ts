import { chatModels, DEFAULT_CHAT_MODEL } from '$lib/ai/models';
import { COLLECTIONS } from '$env/static/private'; // Add this line

export async function load({ cookies, locals }) {
	const { user } = locals;
	const sidebarCollapsed = cookies.get('sidebar:state') !== 'true';

	let modelId = cookies.get('selected-model');
	if (!modelId || !chatModels.find((model) => model.id === modelId)) {
		modelId = DEFAULT_CHAT_MODEL;
		cookies.set('selected-model', modelId, {
			path: '/',
			expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
			httpOnly: true,
			sameSite: 'lax'
		});
	}

	// Initialize selected collections cookie if it doesn't exist
	let selectedCollections = cookies.get('selected-collections');
	if (selectedCollections === undefined) {
		selectedCollections = '';
		cookies.set('selected-collections', selectedCollections || '', {
			path: '/',
			expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
			httpOnly: true,
			sameSite: 'lax'
		});
	}

	return {
		user,
		sidebarCollapsed,
		selectedChatModel: modelId,
		selectedCollections: selectedCollections || '',
		collections: (COLLECTIONS || '').split(',').filter(Boolean) // Add this line
	};
}