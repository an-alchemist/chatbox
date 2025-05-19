<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import { SidebarInset, SidebarProvider } from '$lib/components/ui/sidebar';
	import { ChatHistory } from '$lib/hooks/chat-history.svelte.js';
	import { SelectedModel } from '$lib/hooks/selected-model.svelte.js';
	import { SelectedCollections } from '$lib/hooks/selected-collections.svelte.js';

	let { data, children } = $props();

	const chatHistory = new ChatHistory(data.chats);
	chatHistory.setContext();

	// Create instances and set context
	const selectedModel = new SelectedModel(data.selectedChatModel);
	selectedModel.setContext();

	const selectedCollections = new SelectedCollections(data.selectedCollections);
	selectedCollections.setContext();
</script>

<SidebarProvider open={!data.sidebarCollapsed}>
	<AppSidebar user={data.user} />
	<SidebarInset>{@render children?.()}</SidebarInset>
</SidebarProvider>
