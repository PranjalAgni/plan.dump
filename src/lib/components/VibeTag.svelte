<script lang="ts">
	import type { PlanVibe } from '$lib/database.types';
	import { vibe } from '$lib/vibes';

	let { id }: { id: PlanVibe } = $props();

	const meta = $derived(vibe(id));
</script>

<span class="rounded-full px-3 py-1 text-xs font-bold {meta.tint} {meta.ink}">
	#{meta.id}
</span>
