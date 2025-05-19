import { ChatHistory } from '$lib/hooks/chat-history.svelte';
import { SelectedModel } from '$lib/hooks/selected-model.svelte';
import { SelectedCollections } from '$lib/hooks/selected-collections.svelte';
import type { Transport } from '@sveltejs/kit';

export const transport: Transport = {
	SelectedModel: {
		encode: (value) => value instanceof SelectedModel && value.value,
		decode: (value) => new SelectedModel(value)
	},
	SelectedCollections: {
		encode: (value) => value instanceof SelectedCollections && value.value,
		decode: (value) => new SelectedCollections(value)
	},
	ChatHistory: {
		encode: (value) => value instanceof ChatHistory && value.chats,
		decode: (value) => new ChatHistory(value)
	}
};