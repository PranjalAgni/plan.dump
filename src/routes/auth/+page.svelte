<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import GoogleMark from '$lib/components/GoogleMark.svelte';
	import logo from '$lib/assets/logo.svg';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let signingIn = $state(false);

	const errorMessage = $derived(form?.message ?? data.callbackError);
</script>

<svelte:head>
	<title>PlanDump</title>
	<meta name="description" content="Spontaneous plans with friends start here." />
</svelte:head>

<main
	class="flex min-h-dvh flex-col items-center bg-bg px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
>
	<div class="flex w-full max-w-sm flex-col items-center pt-[22vh]">
		<div
			class="flex size-25 items-center justify-center rounded-full bg-surface ring-1 ring-primary-soft"
		>
			<!-- Sized generously because the placeholder mark carries padding inside its own
				 viewBox; a tight-cropped export will want this smaller. -->
			<img src={logo} alt="" class="size-18" />
		</div>

		<h1
			class="mt-11 font-display text-[2.625rem] leading-none font-bold tracking-tight text-primary"
		>
			PlanDump
		</h1>
		<p class="mt-6 max-w-[16.25rem] text-center text-[1.0625rem] leading-snug text-ink-label">
			Spontaneous plans with friends start here.
		</p>

		<form
			method="POST"
			action="?/google"
			class="mt-16 w-full"
			use:enhance={() => {
				signingIn = true;
				return async ({ update }) => {
					await update();
					signingIn = false;
				};
			}}
		>
			<input type="hidden" name="returnTo" value={data.returnTo} />
			<button
				type="submit"
				disabled={signingIn}
				class="flex h-14 w-full items-center justify-center gap-3 rounded-field border border-line bg-surface text-base font-bold text-ink shadow-xs transition active:scale-[0.99] disabled:opacity-60"
			>
				<GoogleMark />
				{signingIn ? 'Opening Google…' : 'Continue with Google'}
			</button>
		</form>

		{#if errorMessage}
			<p role="alert" class="mt-6 text-center text-sm text-recording">{errorMessage}</p>
		{/if}
	</div>

	<p class="mt-auto max-w-[14.75rem] pb-6 text-center text-xs leading-relaxed text-ink-muted">
		By continuing, you agree to our
		<a href={resolve('/legal/terms')} class="underline">Terms of Service</a>
		and <a href={resolve('/legal/privacy')} class="underline">Privacy Policy</a>.
	</p>
</main>
