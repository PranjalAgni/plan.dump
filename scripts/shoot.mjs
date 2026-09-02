/**
 * Dev-only helper: screenshots routes at the design viewport so implementation can be
 * compared side by side with the mockups.
 *
 *   node scripts/shoot.mjs /auth /feed
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = 'screenshots';
const routes = process.argv.slice(2);

if (routes.length === 0) {
	console.error('usage: node scripts/shoot.mjs <route> [route...]');
	process.exit(1);
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
// Matches the 451x1024 mockups so diffs are meaningful.
const context = await browser.newContext({
	viewport: { width: 451, height: 1024 },
	deviceScaleFactor: 2,
	isMobile: true,
	hasTouch: true
});

for (const route of routes) {
	const page = await context.newPage();
	const messages = [];
	page.on('console', (m) => m.type() === 'error' && messages.push(m.text()));
	page.on('pageerror', (e) => messages.push(String(e)));

	await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);

	const name = route.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'root';
	const file = `${OUT}/${name}.png`;
	await page.screenshot({ path: file, fullPage: false });
	console.log(
		`${route} -> ${file}${messages.length ? `\n  errors: ${messages.join('\n  ')}` : ''}`
	);
	await page.close();
}

await browser.close();
