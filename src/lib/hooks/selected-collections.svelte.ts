import { SynchronizedCookie } from '$lib/utils/reactivity.svelte';

export class SelectedCollections extends SynchronizedCookie {
    constructor(value: string) {
        super('selected-collections', value);
    }

    static fromContext(): SelectedCollections {
        return super.fromContext('selected-collections');
    }
}