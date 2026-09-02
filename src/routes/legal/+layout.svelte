<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ArrowLeft } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	let { children }: { children: Snippet } = $props();
</script>

<div class="min-h-dvh bg-bg">
	<header
		class="flex items-center gap-2 border-b border-line px-4 pt-[env(safe-area-inset-top)] pb-3"
	>
		<a
			href={resolve('/auth')}
			aria-label="Back"
			class="-ml-2 flex size-11 items-center justify-center rounded-full text-ink"
		>
			<ArrowLeft size={22} />
		</a>
		<span class="font-display text-lg font-bold text-primary">PlanDump</span>
	</header>

	<!-- prose-ish typography kept local: these are the only long-form pages in the app. -->
	<article
		class="mx-auto max-w-prose px-6 py-8 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink [&_li]:mt-2 [&_li]:text-[0.9375rem] [&_li]:leading-relaxed [&_li]:text-ink-label [&_p]:mt-3 [&_p]:text-[0.9375rem] [&_p]:leading-relaxed [&_p]:text-ink-label [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
	>
		{@render children()}
	</article>
</div>
