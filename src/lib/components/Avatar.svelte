<script lang="ts">
	import { avatarSrc, initialsOf } from '$lib/avatar';

	let {
		name,
		src = null,
		size = 40,
		class: className = ''
	}: { name: string; src?: string | null; size?: number; class?: string } = $props();

	// Which URL failed, rather than a flag. Google rotates avatar URLs when someone changes
	// their photo, so the old one 404s, and lh3 also throttles with a 429 under load. A flag
	// would latch on the first such failure and keep showing initials for the life of this
	// instance, even once a fresh URL arrives. Comparing against src re-tries on its own.
	let brokenSrc = $state<string | null>(null);

	const url = $derived(src && src !== brokenSrc ? avatarSrc(src, size * 2) : null);
</script>

{#if url}
	<!-- Every caller renders the person's name as text beside this, so the image and the
		 initials below are both decorative: labelling them would announce the name twice. -->
	<img
		src={url}
		alt=""
		width={size}
		height={size}
		loading="lazy"
		class="shrink-0 rounded-full bg-muted object-cover {className}"
		style="width: {size}px; height: {size}px"
		onerror={() => (brokenSrc = src)}
	/>
{:else}
	<span
		aria-hidden="true"
		class="flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary {className}"
		style="width: {size}px; height: {size}px; font-size: {Math.round(size * 0.36)}px"
	>
		{initialsOf(name)}
	</span>
{/if}
