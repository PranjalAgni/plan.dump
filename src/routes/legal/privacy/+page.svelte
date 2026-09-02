<!--
	PLACEHOLDER. This describes what the app as built actually does with data, which is the
	honest starting point, but it is not legal advice and has not been reviewed. Replace the
	text and fill in the contact address before inviting real users, and note that Google
	OAuth verification requires this page to be publicly reachable.
-->
<svelte:head>
	<title>Privacy Policy · PlanDump</title>
	<meta name="robots" content="index" />
</svelte:head>

<h1 class="text-2xl font-bold text-ink">Privacy Policy</h1>
<p class="text-sm text-ink-muted">Last updated: 2 September 2026</p>

<h2>What we collect</h2>
<p>
	When you sign in with Google, we receive and store your name, email address and profile picture
	URL. We do not receive your Google password, and we ask Google for nothing beyond basic profile
	information.
</p>
<p>Beyond that, we store only what you create in the app:</p>
<ul>
	<li>The text of plans you post</li>
	<li>Voice recordings you choose to attach, and a summary of their loudness over time</li>
	<li>A text transcript of those recordings, produced by your browser</li>
	<li>Which plans you have joined</li>
	<li>The time you were last active, used to show whether you are around</li>
</ul>

<h2>Who can see it</h2>
<p>
	Plans you post publicly are visible to everyone signed in to PlanDump. Plans you mark private are
	visible only to you. Your name and profile picture are visible to other signed-in users. You can
	hide your activity status at any time from your profile screen.
</p>
<p>We do not sell your data, and we do not use it for advertising.</p>

<h2>Where it is stored</h2>
<p>
	Plans, profiles and recordings are stored using Supabase, and the app is served by Vercel. Both
	act as processors on our behalf.
</p>

<h2>Voice transcription</h2>
<p>
	While you record a voice note, your browser transcribes it so the plan can carry text as well as
	audio. That transcription is performed by your browser's own speech service rather than by us:
	Chrome and Edge send the audio to Google, and Safari sends it to Apple. We are not party to that
	exchange and cannot control how those companies handle it, so their privacy policies govern it.
</p>
<p>
	The resulting text is shown to you before you post, and you can edit or clear it. Browsers with no
	speech service simply attach no transcript, and your recording is unaffected either way.
</p>

<h2>Deleting your data</h2>
<p>
	You can delete any plan you created, along with its recording, from the Plans screen. To delete
	your account and everything attached to it, contact us and we will remove it.
</p>

<h2>Contact</h2>
<p>
	<!-- TODO: replace with a real contact address before launch. -->
	Questions about this policy: <em>add a contact address here</em>.
</p>
