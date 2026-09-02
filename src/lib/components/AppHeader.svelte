<script lang="ts">
	import { Bell, Menu } from '@lucide/svelte';
</script>

<header
	class="sticky top-0 z-20 flex h-16 items-center justify-between bg-bg px-4 pt-[env(safe-area-inset-top)]"
>
	<button type="button" class="-ml-2 rounded-full p-2 text-ink-label" aria-label="Open menu">
		<Menu size={26} strokeWidth={2.25} />
	</button>

	<span class="font-display text-[1.75rem] leading-none font-bold tracking-tight text-primary">
		PlanDump
	</span>

	<button type="button" class="-mr-2 rounded-full p-2 text-ink-label" aria-label="Notifications">
		<Bell size={24} strokeWidth={2.25} />
	</button>
</header>
