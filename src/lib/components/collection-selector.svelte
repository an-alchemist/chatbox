<script lang="ts">
	import { Button } from './ui/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from './ui/dropdown-menu';
	import CheckCircleFillIcon from './icons/check-circle-fill.svelte';
	import ChevronDownIcon from './icons/chevron-down.svelte';
	import { cn } from '$lib/utils/shadcn';
	import type { ClassValue } from 'svelte/elements';
	import { SelectedCollections } from '$lib/hooks/selected-collections.svelte';

	let {
		class: c,
		collections = [] // Receive collections as a prop with default empty array
	}: {
		class: ClassValue;
		collections?: string[];
	} = $props();

	let open = $state(false);
	const selectedCollections = SelectedCollections.fromContext();

	// Track which collections are selected
	let selectedCollectionSet = $derived(
		new Set(selectedCollections.value.split(',').filter(Boolean))
	);

	// Toggle a collection's selection state
	function toggleCollection(collection: string) {
		const newSet = new Set(selectedCollectionSet);
		if (newSet.has(collection)) {
			newSet.delete(collection);
		} else {
			newSet.add(collection);
		}
		selectedCollections.value = Array.from(newSet).join(',');
	}
</script>

<DropdownMenu {open} onOpenChange={(val) => (open = val)}>
	<DropdownMenuTrigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				class={cn(
					'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground w-fit md:h-[34px] md:px-2',
					c
				)}
			>
				Collections {selectedCollectionSet.size > 0 ? `(${selectedCollectionSet.size})` : ''}
				<ChevronDownIcon />
			</Button>
		{/snippet}
	</DropdownMenuTrigger>
	<DropdownMenuContent align="start" class="min-w-[300px]">
		{#each collections as collection (collection)}
			<DropdownMenuItem
				onSelect={(e) => {
					e.preventDefault();
					toggleCollection(collection);
				}}
				class="group/item flex flex-row items-center justify-between gap-4"
				data-active={selectedCollectionSet.has(collection)}
			>
				<div class="flex flex-col items-start gap-1">
					<div>{collection}</div>
				</div>

				<div
					class="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100"
				>
					<CheckCircleFillIcon />
				</div>
			</DropdownMenuItem>
		{/each}
	</DropdownMenuContent>
</DropdownMenu>
