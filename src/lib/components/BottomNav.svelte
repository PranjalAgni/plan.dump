<script lang="ts">
	import { ClipboardList, LayoutGrid, User, Users } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	// `as const` keeps the paths as literal types, which is what lets resolve() check them
	// against the route tree at build time.
	const items = [
		{ href: '/feed', label: 'Feed', icon: LayoutGrid },
		{ href: '/friends', label: 'Friends', icon: Users },
		{ href: '/plans', label: 'Plans', icon: ClipboardList },
		{ href: '/me', label: 'Profile', icon: User }
	] as const;
</script>

<nav
	class="sticky bottom-0 z-20 flex border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]"
	aria-label="Primary"
>
	{#each items as item (item.href)}
		{@const active = page.url.pathname.startsWith(item.href)}
		<a
			href={resolve(item.href)}
			aria-current={active ? 'page' : undefined}
			class="flex flex-1 flex-col items-center gap-1 pt-2 pb-2.5"
		>
			<span
				class="flex h-9 w-19 items-center justify-center rounded-full transition-colors
					{active ? 'bg-primary-tint text-primary' : 'text-ink-label'}"
			>
				<item.icon size={23} strokeWidth={2.25} />
			</span>
			<span class="text-xs font-bold {active ? 'text-primary' : 'text-ink-label'}">
				{item.label}
			</span>
		</a>
	{/each}
</nav>
