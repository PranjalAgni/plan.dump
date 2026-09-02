/**
 * Dev-only helper: drives the Recorder from idle through recording to review and screenshots
 * both states, which is otherwise only reachable by speaking into a real device.
 *
 * The microphone is Chromium's fake capture device, and the recognition service is stubbed,
 * so this exercises the real transcription wiring without depending on a network service.
 * It drives the /dev preview route, which mounts the Recorder for exactly this reason.
 *
 *   node scripts/shoot-recorder.mjs
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = 'screenshots';

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
	args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
});

// Matches the 451x1024 mockups, as scripts/shoot.mjs does.
const context = await browser.newContext({
	viewport: { width: 451, height: 1024 },
	deviceScaleFactor: 2,
	isMobile: true,
	hasTouch: true,
	permissions: ['microphone']
});

await context.addInitScript(() => {
	/**
	 * Each frame is one `onresult` payload, in the shape the real API uses: settled results
	 * first, then the pending tail. The last frame leaves words pending and `stop()` ends
	 * without finalising them, which is the case that used to drop the end of a sentence.
	 *
	 * The wording appears in no fixture, so waiting on it cannot match a feed card instead.
	 */
	const FRAMES = [
		[['kite flying on the', false]],
		[
			['kite flying on the roof', true],
			['bring snacks', false]
		],
		[
			['kite flying on the roof', true],
			['bring snacks and a spare reel', false]
		]
	];

	class FakeRecognition {
		lang = '';
		continuous = false;
		interimResults = false;
		maxAlternatives = 1;
		onresult = null;
		onerror = null;
		onend = null;
		timers = [];

		start() {
			FRAMES.forEach((frame, i) => {
				this.timers.push(
					setTimeout(
						() => {
							const results = frame.map(([transcript, isFinal]) => ({
								isFinal,
								length: 1,
								0: { transcript }
							}));
							if (this.onresult) this.onresult({ results });
						},
						300 + i * 400
					)
				);
			});
		}

		stop() {
			this.timers.forEach(clearTimeout);
			if (this.onend) this.onend();
		}

		abort() {
			this.timers.forEach(clearTimeout);
			if (this.onend) this.onend();
		}
	}

	// Both names, forcibly: Chromium already exposes the real interface, which would otherwise
	// win the lookup and then return nothing, having none of Google's API keys.
	for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) {
		Object.defineProperty(window, name, {
			value: FakeRecognition,
			configurable: true,
			writable: true
		});
	}
});

const page = await context.newPage();
const problems = [];
page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
page.on('pageerror', (e) => problems.push(String(e)));

await page.goto(`${BASE}/dev`, { waitUntil: 'networkidle' });

const recorder = page.locator('section').filter({ hasText: 'Voice Dump' }).first();

await page.getByLabel('Record a voice note').click();

// Waits on the words rather than a fixed sleep: acquiring the fake microphone takes over a
// second in headless, long enough to stop before anything has been heard.
await recorder.getByText('bring snacks and a spare reel').waitFor({ timeout: 20_000 });
await page.screenshot({ path: `${OUT}/recorder-recording.png` });

await page.getByLabel('Stop recording').click();
await page.waitForSelector('#transcript', { timeout: 10_000 });

await page.screenshot({ path: `${OUT}/recorder-review.png` });

console.log(`transcript: ${JSON.stringify(await page.locator('#transcript').inputValue())}`);
console.log(`errors: ${problems.length ? problems.join('\n  ') : 'none'}`);

await browser.close();
