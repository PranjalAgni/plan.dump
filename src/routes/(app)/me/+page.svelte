<script lang="ts">
	import { LogOut } from '@lucide/svelte';
	import { invalidate } from '$app/navigation';
	import Avatar from '$lib/components/Avatar.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let saveError = $state<string | null>(null);

	const name = $derived(data.profile?.display_name ?? 'You');

	async function setPresence(show: boolean) {
		if (!data.profile) return;
		saveError = null;

		const { error } = await data.supabase
			.from('profiles')
			.update({ show_presence: show })
			.eq('id', data.profile.id);

		if (error) {
			saveError = error.message;
			return;
		}
		await invalidate('app:me');
	}
</script>

<svelte:head><title>Profile · PlanDump</title></svelte:head>

<div class="flex flex-col gap-5 px-6 pt-4 pb-28">
	<section class="flex items-center gap-4 rounded-card bg-surface p-4">
		<Avatar {name} src={data.profile?.avatar_url} size={56} />
		<div class="min-w-0">
			<p class="truncate text-base font-bold text-ink">{name}</p>
			{#if data.email}
				<p class="mt-0.5 truncate text-sm text-ink-muted">{data.email}</p>
			{/if}
		</div>
	</section>

	<section class="rounded-card bg-surface p-4">
		<h2 class="text-sm font-bold text-ink-label">Privacy</h2>

		<label class="mt-3 flex items-start gap-3">
			<input
				type="checkbox"
				checked={data.profile?.show_presence ?? true}
				onchange={(event) => setPresence(event.currentTarget.checked)}
				class="mt-0.5 size-5 shrink-0 accent-primary"
			/>
			<span>
				<span class="block text-[0.9375rem] font-bold text-ink">Show when I'm around</span>
				<span class="mt-1 block text-xs leading-relaxed text-ink-muted">
					Lets friends see that you're online and when you were last active. Turning this off hides
					it from everyone.
				</span>
			</span>
		</label>

		{#if saveError}
			<p class="mt-3 text-sm text-recording" role="alert">{saveError}</p>
		{/if}
	</section>

	<form method="POST" action="?/signout">
		<button
			type="submit"
			class="flex w-full items-center justify-center gap-2 rounded-card bg-surface p-4 text-[0.9375rem] font-bold text-ink-label"
		>
			<LogOut size={18} />
			Sign out
		</button>
	</form>

	{#if data.loadError}
		<p class="text-center text-sm text-ink-muted">
			Couldn't load your profile. Check your connection.
		</p>
	{/if}
</div>
